import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { SupabaseService } from '../supabase/supabase.service.js';
import { ServicesService } from '../services/services.service.js';
import { TrackingService } from '../tracking/tracking.service.js';
import { AuditService } from '../audit/audit.service.js';
import {
  generateSecureStorageKey,
  parseAndValidateBase64,
  sanitizeFilename,
  validateUploadedFile,
} from '../common/utils/file-validator.js';
import { isInMemoryFallbackAllowed } from '../common/utils/supabase.utils.js';
import type {
  ApplicationSubmissionResult,
  OpdUnitEntity,
  SubmitApplicationPayload,
  UploadedDocumentInput,
} from './applications.types.js';

const DEFAULT_OPD_UNITS: OpdUnitEntity[] = [
  { id: 'c1111111-1111-1111-1111-111111111111', code: 'DISKOMINFO', name: 'Dinas Komunikasi dan Informatika', is_active: true },
  { id: 'c2222222-2222-2222-2222-222222222222', code: 'BAPENDA', name: 'Badan Pendapatan Daerah', is_active: true },
  { id: 'c3333333-3333-3333-3333-333333333333', code: 'BKPSDM', name: 'Badan Kepegawaian dan Pengembangan Sumber Daya Manusia', is_active: true },
  { id: 'c4444444-4444-4444-4444-444444444444', code: 'DINKES', name: 'Dinas Kesehatan', is_active: true },
  { id: 'c5555555-5555-5555-5555-555555555555', code: 'DISDIK', name: 'Dinas Pendidikan', is_active: true },
  { id: 'c6666666-6666-6666-6666-666666666666', code: 'DINSOS', name: 'Dinas Sosial', is_active: true },
  { id: 'c7777777-7777-7777-7777-777777777777', code: 'SETDA', name: 'Sekretariat Daerah', is_active: true },
  { id: 'c8888888-8888-8888-8888-888888888888', code: 'BAPPERIDA', name: 'Badan Perencanaan Pembangunan, Riset dan Inovasi Daerah', is_active: true },
  { id: 'c9999999-9999-9999-9999-999999999999', code: 'INSPEKTORAT', name: 'Inspektorat Daerah', is_active: true },
  { id: 'caaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', code: 'DPUTR', name: 'Dinas Pekerjaan Umum dan Tata Ruang', is_active: true },
  { id: 'cbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', code: 'DISDUKCAPIL', name: 'Dinas Kependudukan dan Pencatatan Sipil', is_active: true },
  { id: 'cccccccc-cccc-cccc-cccc-cccccccccccc', code: 'DISHUB', name: 'Dinas Perhubungan', is_active: true },
  { id: 'cddddddd-dddd-dddd-dddd-dddddddddddd', code: 'SATPOLPP', name: 'Satuan Polisi Pamong Praja', is_active: true },
];

interface IdempotencyCacheEntry {
  result: ApplicationSubmissionResult;
  createdAt: number;
}

const IDEMPOTENCY_TTL_MS = 10 * 60 * 1000; // 10 menit
const MAX_IDEMPOTENCY_ENTRIES = 1000;

@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger(ApplicationsService.name);

  // In-memory application store for idempotency and fallback testing
  private inMemoryApplications: Map<string, ApplicationSubmissionResult> = new Map();
  private inMemoryIdempotencyKeys: Map<string, IdempotencyCacheEntry> = new Map();

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly servicesService: ServicesService,
    @Optional() private readonly trackingService?: TrackingService,
    @Optional() private readonly auditService?: AuditService,
  ) {}

  /**
   * Membersihkan entri cache idempotency yang sudah melewati TTL 10 menit
   */
  private cleanupExpiredIdempotencyKeys(now = Date.now()): void {
    for (const [key, entry] of this.inMemoryIdempotencyKeys.entries()) {
      if (now - entry.createdAt > IDEMPOTENCY_TTL_MS) {
        this.inMemoryIdempotencyKeys.delete(key);
      }
    }
  }

  /**
   * Menyimpan entri ke cache idempotency dengan TTL 10 menit dan batas maksimal 1000 entri (FIFO eviction)
   */
  private setIdempotencyKey(key: string, result: ApplicationSubmissionResult): void {
    const now = Date.now();
    this.cleanupExpiredIdempotencyKeys(now);
    if (this.inMemoryIdempotencyKeys.size >= MAX_IDEMPOTENCY_ENTRIES) {
      const oldestKey = this.inMemoryIdempotencyKeys.keys().next().value;
      if (oldestKey !== undefined) {
        this.inMemoryIdempotencyKeys.delete(oldestKey);
      }
    }
    this.inMemoryIdempotencyKeys.set(key, {
      result,
      createdAt: now,
    });
  }

  /**
   * Mengambil entri dari cache idempotency, mengembalikan null jika tidak ada atau kedaluwarsa
   */
  private getIdempotencyKey(key: string): ApplicationSubmissionResult | null {
    const entry = this.inMemoryIdempotencyKeys.get(key);
    if (!entry) {
      return null;
    }
    if (Date.now() - entry.createdAt > IDEMPOTENCY_TTL_MS) {
      this.inMemoryIdempotencyKeys.delete(key);
      return null;
    }
    return entry.result;
  }

  /**
   * Helper pengujian: Mengembalikan jumlah entri cache idempotency
   */
  getIdempotencyCacheSize(): number {
    return this.inMemoryIdempotencyKeys.size;
  }

  /**
   * Helper pengujian: Mengosongkan cache idempotency
   */
  clearIdempotencyCache(): void {
    this.inMemoryIdempotencyKeys.clear();
  }

  /**
   * Helper pengujian: Mengembalikan jumlah in-memory applications
   */
  getInMemoryApplicationsCount(): number {
    return this.inMemoryApplications.size;
  }

  /**
   * Mengambil daftar OPD unit aktif untuk dropdown pemohon.
   */
  async getOpdUnits(): Promise<OpdUnitEntity[]> {
    try {
      const client = this.supabaseService.getClient();
      const { data, error } = await client
        .from('opd_units')
        .select('id, code, name, is_active')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (!error && data && data.length > 0) {
        return data as OpdUnitEntity[];
      }
    } catch {
      // Fallback
    }

    return DEFAULT_OPD_UNITS.filter((o) => o.is_active);
  }

  /**
   * Alur lengkap submisi permohonan publik.
   */
  async submitApplication(
    payload: SubmitApplicationPayload,
    documents: UploadedDocumentInput[] = [],
  ): Promise<ApplicationSubmissionResult> {
    // 1. Idempotency Check (hanya membaca jika key disediakan)
    if (payload.idempotency_key && payload.idempotency_key.trim()) {
      const key = payload.idempotency_key.trim();
      const existing = this.getIdempotencyKey(key);
      if (existing) {
        return existing;
      }
    }

    // 2. Validasi Layanan
    if (!payload.service_id) {
      throw new BadRequestException('Layanan harus dipilih.');
    }
    const service = await this.servicesService.getPublicServiceBySlugOrId(
      payload.service_id,
    );

    // 3. Validasi OPD Unit
    if (!payload.opd_unit_id) {
      throw new BadRequestException('Unit kerja OPD pemohon wajib dipilih.');
    }
    const opdUnits = await this.getOpdUnits();
    const opd = opdUnits.find((o) => o.id === payload.opd_unit_id);
    if (!opd) {
      throw new BadRequestException(
        `Unit kerja OPD dengan ID "${payload.opd_unit_id}" tidak valid atau tidak aktif.`,
      );
    }

    // 4. Validasi Data Pemohon
    if (!payload.applicant_name || payload.applicant_name.trim().length < 3) {
      throw new BadRequestException('Nama lengkap pemohon wajib diisi (minimal 3 karakter).');
    }
    if (payload.applicant_name.trim().length > 150) {
      throw new BadRequestException('Nama pemohon melebihi batas maksimum 150 karakter.');
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!payload.applicant_email || !emailRegex.test(payload.applicant_email.trim())) {
      throw new BadRequestException('Alamat email pemohon tidak valid.');
    }
    if (payload.applicant_email.trim().length > 150) {
      throw new BadRequestException('Email pemohon melebihi batas maksimum 150 karakter.');
    }
    const rawPhone = payload.applicant_phone ? payload.applicant_phone.trim() : '';
    const phoneAllowedCharsRegex = /^[0-9+\-\s()]{8,30}$/;
    if (!rawPhone || !phoneAllowedCharsRegex.test(rawPhone)) {
      throw new BadRequestException(
        'Nomor telepon pemohon tidak valid. Harus terdiri dari 8 hingga 30 karakter dan hanya boleh memuat angka, spasi, +, -, serta tanda kurung.',
      );
    }
    if (!payload.applicant_position || payload.applicant_position.trim().length < 2) {
      throw new BadRequestException('Jabatan pemohon di OPD wajib diisi.');
    }
    if (payload.applicant_position.trim().length > 100) {
      throw new BadRequestException('Jabatan pemohon melebihi batas maksimum 100 karakter.');
    }

    // 5. Validasi Rincian Permohonan
    if (!payload.title || payload.title.trim().length < 5) {
      throw new BadRequestException('Judul permohonan wajib diisi (minimal 5 karakter).');
    }
    if (payload.title.trim().length > 200) {
      throw new BadRequestException('Judul usulan melebihi batas maksimum 200 karakter.');
    }
    if (!payload.background || payload.background.trim().length < 10) {
      throw new BadRequestException('Latar belakang permohonan wajib diisi (minimal 10 karakter).');
    }
    if (payload.background.trim().length > 5000) {
      throw new BadRequestException('Uraian usulan melebihi batas maksimum 5000 karakter.');
    }
    if (!payload.problem_statement || payload.problem_statement.trim().length < 10) {
      throw new BadRequestException('Rumusan masalah wajib diisi (minimal 10 karakter).');
    }
    if (payload.problem_statement.trim().length > 5000) {
      throw new BadRequestException('Uraian usulan melebihi batas maksimum 5000 karakter.');
    }
    if (!payload.objective || payload.objective.trim().length < 10) {
      throw new BadRequestException('Maksud dan tujuan wajib diisi (minimal 10 karakter).');
    }
    if (payload.objective.trim().length > 5000) {
      throw new BadRequestException('Uraian usulan melebihi batas maksimum 5000 karakter.');
    }
    if (!payload.scope || payload.scope.trim().length < 10) {
      throw new BadRequestException('Ruang lingkup sistem wajib diisi (minimal 10 karakter).');
    }
    if (payload.scope.trim().length > 5000) {
      throw new BadRequestException('Uraian usulan melebihi batas maksimum 5000 karakter.');
    }
    if (!payload.expected_output || payload.expected_output.trim().length < 5) {
      throw new BadRequestException('Keluaran (output) yang diharapkan wajib diisi.');
    }
    if (payload.expected_output.trim().length > 5000) {
      throw new BadRequestException('Uraian usulan melebihi batas maksimum 5000 karakter.');
    }
    if ((payload as any).description && (payload as any).description.trim().length > 5000) {
      throw new BadRequestException('Deskripsi usulan melebihi batas maksimum 5000 karakter.');
    }
    if (payload.additional_notes && payload.additional_notes.trim().length > 2000) {
      throw new BadRequestException('Catatan melebihi batas maksimum 2000 karakter.');
    }

    // Jika layanan peningkatan/enhancement, wajib ada informasi aplikasi eksisting
    if (service.type === 'ENHANCEMENT') {
      if (!payload.existing_application_name || payload.existing_application_name.trim().length < 2) {
        throw new BadRequestException(
          'Nama aplikasi eksisting wajib diisi untuk permohonan Pengembangan Aplikasi.',
        );
      }
    }

    // 6. Validasi Syarat & Ketentuan (Terms & Conditions)
    if (!payload.terms_accepted) {
      throw new BadRequestException(
        'Pemohon wajib menyetujui syarat dan ketentuan SPBE Pemerintah Daerah Kabupaten Bandung.',
      );
    }
    if (!payload.terms_version || !payload.terms_version.trim()) {
      throw new BadRequestException('Versi syarat dan ketentuan (terms_version) wajib disertakan.');
    }

    // 7. Validasi Dokumen Persyaratan
    if (documents.length > 10) {
      throw new BadRequestException(
        'Jumlah dokumen yang diunggah melebihi batas maksimum (maksimal 10 dokumen per permohonan).',
      );
    }

    // Larang duplikasi requirement_id
    const seenReqIds = new Set<string>();
    for (const doc of documents) {
      if (doc.requirement_id) {
        if (seenReqIds.has(doc.requirement_id)) {
          throw new BadRequestException(
            'Terdapat persyaratan dokumen ganda. Setiap persyaratan hanya boleh diunggah satu dokumen.',
          );
        }
        seenReqIds.add(doc.requirement_id);
      }
    }

    const serviceReqs = service.requirements || [];
    const requiredDocumentReqs = serviceReqs.filter(
      (r) => r.is_required && r.type === 'DOCUMENT',
    );

    // Pastikan setiap dokumen wajib memiliki file terunggah
    for (const req of requiredDocumentReqs) {
      const hasUploaded = documents.some((doc) => doc.requirement_id === req.id);
      if (!hasUploaded) {
        throw new BadRequestException(
          `Dokumen wajib "${req.name}" belum dilampirkan.`,
        );
      }
    }

    // Validasi tipe berkas, ekstensi, magic bytes, buffer biner, dan batasan total ukuran (maks 35 MB)
    const MAX_TOTAL_DECODE_BYTES = 35 * 1024 * 1024; // 35 MB
    let totalDecodedBytes = 0;

    for (const doc of documents) {
      let buf = doc.buffer;
      if (!buf && doc.base64_data !== undefined) {
        buf = parseAndValidateBase64(doc.base64_data, doc.original_filename);
        doc.buffer = buf;
      }

      if (!buf || buf.length === 0) {
        throw new BadRequestException({
          code: 'DOCUMENT_INVALID_TYPE',
          message: `Berkas "${doc.original_filename || 'Dokumen'}" wajib memiliki data konten biner (base64_data) yang valid dan tidak kosong. Dokumen metadata-only tidak diizinkan.`,
        });
      }

      totalDecodedBytes += buf.length;
    }

    if (totalDecodedBytes > MAX_TOTAL_DECODE_BYTES) {
      throw new BadRequestException(
        'Total ukuran seluruh dokumen yang diunggah melebihi batas maksimum 35 MB.',
      );
    }

    for (const doc of documents) {
      const associatedReq = serviceReqs.find((r) => r.id === doc.requirement_id);
      validateUploadedFile(
        {
          original_filename: doc.original_filename,
          mime_type: doc.mime_type,
          size_bytes: doc.size_bytes,
          buffer: doc.buffer,
        },
        associatedReq
          ? {
              name: associatedReq.name,
              allowed_file_types: Array.isArray(associatedReq.allowed_file_types)
                ? associatedReq.allowed_file_types.join(',')
                : associatedReq.allowed_file_types,
              max_file_size_mb: associatedReq.max_file_size_mb,
            }
          : undefined,
      );
    }

    // 8. Generate Ticket Number & Tracking Credential
    // [IMPLEMENTATION ASSUMPTION] Format sementara hingga regulasi SOP Diskominfo resmi
    const randomSuffix = crypto.randomInt(100000, 999999).toString();
    const currentYear = new Date().getFullYear();
    const ticketNumber = `SIM-${currentYear}-${randomSuffix}`;

    // Generate random secret tracking credential (128-bit cryptographic entropy = 16 bytes = 32 hex chars)
    const trackingSecret = `TRK-${crypto.randomBytes(16).toString('hex').toUpperCase()}`;
    const trackingCodeHash = crypto
      .createHash('sha256')
      .update(trackingSecret)
      .digest('hex');

    const applicationId = crypto.randomUUID();
    const applicantId = crypto.randomUUID();
    const submissionTime = new Date().toISOString();

    // 9. Persistensi ke Database Supabase
    const client = this.supabaseService.getClient();

    // Fallback in-memory hanya diizinkan bila secara eksplisit diaktifkan untuk automated test/offline dev
    const isExplicitFallbackAllowed = isInMemoryFallbackAllowed();

    let applicantInserted = false;
    let applicationInserted = false;
    const uploadedStoragePaths: string[] = [];
    const insertedDocumentIds: string[] = [];
    let statusHistoryInserted = false;

    try {
      // a. Simpan Applicant
      const { error: applicantError } = await client.from('applicants').insert({
        id: applicantId,
        opd_unit_id: payload.opd_unit_id,
        full_name: payload.applicant_name.trim(),
        employee_id: payload.applicant_employee_id?.trim() || null,
        position: payload.applicant_position.trim(),
        email: payload.applicant_email.trim(),
        phone: payload.applicant_phone.trim(),
      });

      if (applicantError) {
        this.logger.error(
          `Gagal menyimpan data pemohon ke Supabase: ${applicantError.message} (code: ${applicantError.code})`,
        );
        if (applicantError.code === '23503') {
          throw new BadRequestException(
            `Unit kerja OPD dengan ID "${payload.opd_unit_id}" tidak valid atau belum terdaftar di basis data.`,
          );
        }
        throw new InternalServerErrorException(
          `Gagal menyimpan data pemohon ke basis data: ${applicantError.message}`,
        );
      }
      applicantInserted = true;

      // b. Simpan Application
      const { error: appError } = await client.from('applications').insert({
        id: applicationId,
        ticket_number: ticketNumber,
        tracking_code_hash: trackingCodeHash,
        service_id: service.id,
        applicant_id: applicantId,
        applicant_name: payload.applicant_name.trim(),
        applicant_employee_id: payload.applicant_employee_id?.trim() || null,
        applicant_position: payload.applicant_position.trim(),
        applicant_email: payload.applicant_email.trim(),
        applicant_phone: payload.applicant_phone.trim(),
        title: payload.title.trim(),
        background: payload.background.trim(),
        problem_statement: payload.problem_statement.trim(),
        objective: payload.objective.trim(),
        scope: payload.scope.trim(),
        expected_output: payload.expected_output.trim(),
        existing_application_name: payload.existing_application_name?.trim() || null,
        requested_deadline: payload.requested_deadline || null,
        additional_notes: payload.additional_notes?.trim() || null,
        terms_accepted_at: submissionTime,
        terms_version: payload.terms_version.trim(),
        submitted_at: submissionTime,
        current_status: 'SUBMITTED',
        ...(payload.idempotency_key && payload.idempotency_key.trim()
          ? { idempotency_key: payload.idempotency_key.trim() }
          : {}),
      });

      if (appError) {
        this.logger.error(
          `Gagal menyimpan data permohonan ke Supabase: ${appError.message} (code: ${appError.code})`,
        );
        if (appError.code === '23503') {
          throw new BadRequestException(
            `Layanan SPBE dengan ID "${service.id}" tidak valid atau belum terdaftar di basis data.`,
          );
        }
        if (appError.code === '23505') {
          throw new ConflictException(
            'Nomor tiket atau idempotency key sudah pernah digunakan sebelumnya.',
          );
        }
        throw new InternalServerErrorException(
          `Gagal menyimpan permohonan ke basis data: ${appError.message}`,
        );
      }
      applicationInserted = true;

      // c. Simpan Dokumen
      for (const doc of documents) {
        const docId = crypto.randomUUID();
        const storagePath = generateSecureStorageKey(`applications/${ticketNumber}`, doc.original_filename);

        if (doc.buffer) {
          // Upload ke private bucket simantik-documents
          const { error: uploadError } = await client.storage
            .from('simantik-documents')
            .upload(storagePath, doc.buffer, {
              contentType: doc.mime_type,
              upsert: false,
            });

          if (uploadError) {
            this.logger.error(
              `Gagal mengunggah berkas ${doc.original_filename} ke storage: ${uploadError.message}`,
            );
            throw new InternalServerErrorException(
              `Gagal mengunggah berkas persyaratan "${doc.original_filename}" ke penyimpanan berkas.`,
            );
          }
          uploadedStoragePaths.push(storagePath);
        }

        const { error: docInsertError } = await client
          .from('application_documents')
          .insert({
            id: docId,
            application_id: applicationId,
            requirement_id: doc.requirement_id,
            original_filename: sanitizeFilename(doc.original_filename),
            storage_path: storagePath,
            mime_type: doc.mime_type,
            size_bytes: doc.size_bytes,
            version: 1,
            is_current: true,
            uploaded_at: submissionTime,
          });

        if (docInsertError) {
          this.logger.error(
            `Gagal menyimpan metadata berkas ${doc.original_filename}: ${docInsertError.message}`,
          );
          throw new InternalServerErrorException(
            `Gagal menyimpan metadata berkas persyaratan ke basis data: ${docInsertError.message}`,
          );
        }
        insertedDocumentIds.push(docId);
      }

      // d. Catat Status History Awal
      const { error: historyError } = await client
        .from('application_status_history')
        .insert({
          application_id: applicationId,
          from_status: null,
          to_status: 'SUBMITTED',
          note: 'Permohonan berhasil didaftarkan oleh pemohon OPD.',
          changed_at: submissionTime,
        });

      if (historyError) {
        this.logger.error(
          `Gagal mencatat status history permohonan: ${historyError.message}`,
        );
        throw new InternalServerErrorException(
          `Gagal mencatat riwayat status permohonan ke basis data: ${historyError.message}`,
        );
      }
      statusHistoryInserted = true;

      // e. Catat Event Audit: APPLICATION_SUBMITTED
      // Pemohon publik tidak memiliki akun profil internal Supabase, sehingga actor_profile_id bernilai null.
      // Metadata yang dicatat adalah metadata minimum non-sensitif (tanpa tracking_code, hash, password, atau payload file).
      if (this.auditService) {
        try {
          await this.auditService.record({
            actor_profile_id: null,
            application_id: applicationId,
            action: 'APPLICATION_SUBMITTED',
            entity_type: 'applications',
            entity_id: applicationId,
            old_data: null,
            new_data: {
              ticket_number: ticketNumber,
              service_id: service.id,
              service_name: service.name,
              opd_unit_id: payload.opd_unit_id,
              title: payload.title.trim(),
              documents_count: documents.length,
              terms_version: payload.terms_version.trim(),
              submitted_at: submissionTime,
            },
          });
        } catch (auditErr: any) {
          // Analisis kegagalan audit setelah data permohonan tersimpan:
          // Permohonan utama sudah sah dan terbit di 4 tabel domain.
          // Kegagalan penulisan audit log sekunder tidak boleh membatalkan submission pemohon
          // (karena akan memicu false failure, mendorong resubmission dan tiket duplikat).
          this.logger.error(
            `Gagal mencatat audit log APPLICATION_SUBMITTED untuk permohonan ${ticketNumber}: ${auditErr?.message || auditErr}`,
          );
        }
      }
    } catch (err: any) {
      // Jalankan kompensasi best-effort rollback untuk mencegah data parsial
      await this.rollbackPartialSubmission(client, {
        applicantId: applicantInserted ? applicantId : null,
        applicationId: applicationInserted ? applicationId : null,
        uploadedStoragePaths,
        insertedDocumentIds,
        statusHistoryInserted,
      });

      // Jika error berupa NestJS HttpException yang disengaja, langsung teruskan
      if (
        err instanceof BadRequestException ||
        err instanceof ConflictException ||
        err instanceof InternalServerErrorException
      ) {
        throw err;
      }

      // Jika fallback eksplisit tidak aktif, jangan pernah menelan error dan jangan return false success
      if (!isExplicitFallbackAllowed) {
        this.logger.error(
          `Kesalahan persistensi basis data: ${err?.message || err}`,
        );
        throw new InternalServerErrorException(
          'Gagal memproses permohonan ke basis data. Pastikan konfigurasi dan skema basis data telah mutakhir.',
        );
      }

      this.logger.warn(
        `Menggunakan in-memory fallback untuk pengujian lokal (ALLOW_IN_MEMORY_FALLBACK=true): ${err?.message}`,
      );
    }

    const result: ApplicationSubmissionResult = {
      id: applicationId,
      ticket_number: ticketNumber,
      tracking_code: trackingSecret,
      title: payload.title.trim(),
      service_name: service.name,
      applicant_name: payload.applicant_name.trim(),
      submitted_at: submissionTime,
      current_status: 'SUBMITTED',
      terms_version: payload.terms_version.trim(),
      documents_count: documents.length,
      format_note:
        '[IMPLEMENTATION ASSUMPTION] Format nomor tiket menggunakan format SIM-2026-XXXXXX sementara menunggu ketetapan resmi SOP Diskominfo.',
    };

    // Simpan di in-memory cache untuk idempotensi bila key disediakan
    if (payload.idempotency_key && payload.idempotency_key.trim()) {
      this.setIdempotencyKey(payload.idempotency_key.trim(), result);
    }

    // inMemoryApplications dan trackingService hanya ditulis jika fallback diperbolehkan (mode test)
    if (isExplicitFallbackAllowed) {
      this.inMemoryApplications.set(applicationId, result);
      if (this.trackingService) {
        this.trackingService.registerInMemoryApplication({
          id: applicationId,
          ticket_number: ticketNumber,
          tracking_code_hash: trackingCodeHash,
          title: payload.title.trim(),
          service_name: service.name,
          opd_name: opd?.name || 'Pemerintah Kabupaten Bandung',
          applicant_name: payload.applicant_name.trim(),
          applicant_email: payload.applicant_email.trim(),
          current_status: 'SUBMITTED',
          current_stage: 'ANALYSIS',
          submitted_at: submissionTime,
          updated_at: submissionTime,
          documents: documents.map((d) => ({
            requirement_name: 'Dokumen Persyaratan',
            original_filename: d.original_filename,
            size_bytes: d.size_bytes,
            uploaded_at: submissionTime,
          })),
          status_history: [
            {
              from_status: null,
              to_status: 'SUBMITTED',
              note: 'Permohonan berhasil didaftarkan oleh pemohon OPD.',
              changed_at: submissionTime,
            },
          ],
        });
      }
    }

    return result;
  }

  /**
   * Kompensasi best-effort untuk membersihkan data parsial jika langkah insert gagal di tengah alur.
   * Catatan: PostgREST REST client tidak mendukung multi-statement ACID transaction secara langsung.
   * Untuk transaksi atomik murni di level basis data, direkomendasikan Stored Procedure / RPC PostgreSQL.
   */
  private async rollbackPartialSubmission(
    client: any,
    state: {
      applicantId: string | null;
      applicationId: string | null;
      uploadedStoragePaths: string[];
      insertedDocumentIds: string[];
      statusHistoryInserted: boolean;
    },
  ): Promise<void> {
    try {
      if (state.uploadedStoragePaths.length > 0 && client?.storage) {
        await client.storage
          .from('simantik-documents')
          .remove(state.uploadedStoragePaths);
      }
    } catch (cleanupErr: any) {
      this.logger.warn(`Kompensasi storage gagal: ${cleanupErr?.message}`);
    }

    try {
      if (state.statusHistoryInserted && state.applicationId) {
        await client
          .from('application_status_history')
          .delete()
          .eq('application_id', state.applicationId);
      }
    } catch (cleanupErr: any) {
      this.logger.warn(`Kompensasi status history gagal: ${cleanupErr?.message}`);
    }

    try {
      if (state.insertedDocumentIds.length > 0 && state.applicationId) {
        await client
          .from('application_documents')
          .delete()
          .eq('application_id', state.applicationId);
      }
    } catch (cleanupErr: any) {
      this.logger.warn(`Kompensasi dokumen gagal: ${cleanupErr?.message}`);
    }

    try {
      if (state.applicationId) {
        await client
          .from('applications')
          .delete()
          .eq('id', state.applicationId);
      }
    } catch (cleanupErr: any) {
      this.logger.warn(`Kompensasi applications gagal: ${cleanupErr?.message}`);
    }

    try {
      if (state.applicantId) {
        await client
          .from('applicants')
          .delete()
          .eq('id', state.applicantId);
      }
    } catch (cleanupErr: any) {
      this.logger.warn(`Kompensasi applicants gagal: ${cleanupErr?.message}`);
    }
  }
}
