import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { SupabaseService } from '../supabase/supabase.service.js';
import { TrackingTokenService } from './tracking-token.service.js';
import { TrackingRateLimiter } from './tracking-rate-limiter.js';
import { validateUploadedFile } from '../common/utils/file-validator.js';
import type {
  ApplicationStage,
  ApplicationStatus,
  PublicDocumentItem,
  PublicTicketSummary,
  PublicTimelineMilestone,
  PublicTimelineResponse,
  SubmitRevisionDto,
  SubmitRevisionResult,
  TrackingSessionPayload,
  TrackingVerificationResult,
  VerifyTrackingDto,
} from './tracking.types.js';

interface InMemApplicationTrack {
  id: string;
  ticket_number: string;
  tracking_code_hash: string;
  title: string;
  service_name: string;
  opd_name: string;
  applicant_name: string;
  applicant_email: string;
  current_status: ApplicationStatus;
  current_stage: ApplicationStage | null;
  submitted_at: string;
  updated_at: string;
  revision_note?: string;
  documents: PublicDocumentItem[];
  status_history: {
    from_status: ApplicationStatus | null;
    to_status: ApplicationStatus;
    note: string | null;
    changed_at: string;
  }[];
}

@Injectable()
export class TrackingService {
  // In-memory application store for testing and fallback
  private inMemoryTrackRecords: Map<string, InMemApplicationTrack> = new Map();

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly tokenService: TrackingTokenService,
    private readonly rateLimiter: TrackingRateLimiter,
  ) {
    this.seedFallbackApplications();
  }

  /**
   * Helper untuk mendaftarkan data in-memory (berguna untuk testing integrasi dan fallback)
   */
  registerInMemoryApplication(record: InMemApplicationTrack): void {
    this.inMemoryTrackRecords.set(record.ticket_number.toUpperCase(), record);
  }

  private seedFallbackApplications() {
    // Seed default application untuk testing tracking
    const ticket = 'SIM-2026-000101';
    const plainCode = 'TRK-A1B2C3D4';
    const hash = crypto.createHash('sha256').update(plainCode).digest('hex');
    const now = new Date().toISOString();

    this.registerInMemoryApplication({
      id: 'a1000000-0000-0000-0000-000000000001',
      ticket_number: ticket,
      tracking_code_hash: hash,
      title: 'Pengembangan Integrasi API Simpatik dengan Bapenda',
      service_name: 'Pengembangan / Enhancement Aplikasi',
      opd_name: 'Badan Pendapatan Daerah',
      applicant_name: 'Drs. Agus Setiawan, M.Si',
      applicant_email: 'agus.setiawan@bandungkab.go.id',
      current_status: 'SUBMITTED',
      current_stage: 'ANALYSIS',
      submitted_at: now,
      updated_at: now,
      documents: [
        {
          requirement_name: 'Surat Permohonan Resmi OPD',
          original_filename: 'Surat_Permohonan_Bapenda.pdf',
          size_bytes: 512000,
          uploaded_at: now,
        },
      ],
      status_history: [
        {
          from_status: null,
          to_status: 'SUBMITTED',
          note: 'Permohonan berhasil didaftarkan ke sistem SIMANTIK.',
          changed_at: now,
        },
      ],
    });
  }

  /**
   * 1. Verifikasi kredensial pelacakan publik (Nomor Tiket + Kode Pelacakan).
   * Mencegah brute force dengan rate limiting.
   */
  async verifyCredential(
    dto: VerifyTrackingDto,
    clientIp: string = '127.0.0.1',
  ): Promise<TrackingVerificationResult> {
    const ticketNumber = dto.ticket_number ? dto.ticket_number.trim().toUpperCase() : '';
    const trackingCode = dto.tracking_code ? dto.tracking_code.trim() : '';

    if (!ticketNumber || !trackingCode) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'TRACKING_INVALID_CREDENTIAL',
        message: 'Nomor tiket dan kode pelacakan wajib diisi.',
      });
    }

    const rateLimitKey = `${clientIp}:${ticketNumber}`;
    // Periksa apakah sedang diblokir karena percobaan gagal sebelumnya
    this.rateLimiter.assertNotBlocked(rateLimitKey);

    // Hitung hash dari input kode pelacakan
    const inputHashExact = crypto
      .createHash('sha256')
      .update(trackingCode)
      .digest('hex');
    const inputHashUpper = crypto
      .createHash('sha256')
      .update(trackingCode.toUpperCase())
      .digest('hex');

    let appRecord: InMemApplicationTrack | null = null;

    // 1. Coba cari di Supabase
    try {
      const client = this.supabaseService.getClient();
      const { data, error } = await client
        .from('applications')
        .select(
          `id, ticket_number, tracking_code_hash, title, current_status, current_stage, submitted_at, updated_at,
           applicant_name, applicant_email,
           services ( name ),
           applicants ( opd_units ( name ) )`,
        )
        .eq('ticket_number', ticketNumber)
        .maybeSingle();

      if (!error && data) {
        const storedHash = String(data.tracking_code_hash || '').toLowerCase();
        const matches =
          this.safeHashCompare(storedHash, inputHashExact) ||
          this.safeHashCompare(storedHash, inputHashUpper);

        if (matches) {
          appRecord = {
            id: data.id,
            ticket_number: data.ticket_number,
            tracking_code_hash: data.tracking_code_hash,
            title: data.title,
            service_name: (data as any).services?.name || 'Layanan Aplikasi SPBE',
            opd_name:
              (data as any).applicants?.opd_units?.name ||
              'Pemerintah Kabupaten Bandung',
            applicant_name: data.applicant_name,
            applicant_email: data.applicant_email,
            current_status: data.current_status,
            current_stage: data.current_stage,
            submitted_at: data.submitted_at,
            updated_at: data.updated_at,
            documents: [],
            status_history: [],
          };
        }
      }
    } catch {
      // Supabase unavailable / fallback
    }

    // 2. Coba periksa in-memory fallback jika belum ditemukan
    if (!appRecord) {
      const mem = this.inMemoryTrackRecords.get(ticketNumber);
      if (mem) {
        const storedHash = mem.tracking_code_hash.toLowerCase();
        const matches =
          this.safeHashCompare(storedHash, inputHashExact) ||
          this.safeHashCompare(storedHash, inputHashUpper);
        if (matches) {
          appRecord = mem;
        }
      }
    }

    // Jika gagal verifikasi
    if (!appRecord) {
      this.rateLimiter.recordFailure(rateLimitKey);
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'TRACKING_INVALID_CREDENTIAL',
        message: 'Nomor tiket atau kode pelacakan tidak sesuai.',
      });
    }

    // Berhasil verifikasi: reset kegagalan rate limit
    this.rateLimiter.reset(rateLimitKey);

    // Hasilkan short-lived session token (15 menit)
    const session = this.tokenService.generateSessionToken(
      appRecord.ticket_number,
      appRecord.id,
    );

    return {
      tracking_token: session.token,
      expires_in: session.expires_in,
      expires_at: session.expires_at,
      ticket_number: appRecord.ticket_number,
    };
  }

  /**
   * 2. Proyeksi Aman Ringkasan Tiket Publik.
   * Melakukan data minimization dan menyembunyikan identitas internal.
   */
  async getPublicTicketSummary(
    ticketNumber: string,
    session: TrackingSessionPayload,
  ): Promise<PublicTicketSummary> {
    const normalizedTicket = ticketNumber.trim().toUpperCase();
    if (session.ticket_number.toUpperCase() !== normalizedTicket) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'TRACKING_INVALID_CREDENTIAL',
        message: 'Sesi pelacakan tidak sesuai dengan nomor tiket yang diminta.',
      });
    }

    const app = await this.findApplicationData(normalizedTicket);
    if (!app) {
      throw new NotFoundException({
        statusCode: 404,
        code: 'TICKET_NOT_FOUND',
        message: `Tiket dengan nomor [${normalizedTicket}] tidak ditemukan.`,
      });
    }

    // Masking data sensitif pemohon
    const applicantNameMasked = this.maskName(app.applicant_name);
    const applicantEmailMasked = this.maskEmail(app.applicant_email);

    // Deskripsi next-step informatif
    const nextStep = this.resolveNextStepAdvisory(app.current_status);

    // Ambil alasan revisi jika statusnya REVISION_REQUIRED
    let revisionReason: string | null = null;
    if (app.current_status === 'REVISION_REQUIRED') {
      revisionReason = app.revision_note || this.findLatestRevisionNote(app.status_history);
    }

    return {
      ticket_number: app.ticket_number,
      title: app.title,
      service_name: app.service_name,
      opd_name: app.opd_name,
      applicant_name_masked: applicantNameMasked,
      applicant_email_masked: applicantEmailMasked,
      current_status: app.current_status,
      status_label: this.resolveStatusLabel(app.current_status),
      current_stage: app.current_stage,
      stage_label: app.current_stage ? this.resolveStageLabel(app.current_stage) : null,
      submitted_at: app.submitted_at,
      updated_at: app.updated_at,
      next_step: nextStep,
      can_revise: app.current_status === 'REVISION_REQUIRED',
      revision_reason: revisionReason,
      documents: app.documents || [],
    };
  }

  /**
   * 3. Proyeksi Timeline Publik.
   * Proyeksi intensional yang aman, bukan raw dump log audit internal teknisi.
   */
  async getPublicTimeline(
    ticketNumber: string,
    session: TrackingSessionPayload,
  ): Promise<PublicTimelineResponse> {
    const normalizedTicket = ticketNumber.trim().toUpperCase();
    if (session.ticket_number.toUpperCase() !== normalizedTicket) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'TRACKING_INVALID_CREDENTIAL',
        message: 'Sesi pelacakan tidak valid.',
      });
    }

    const app = await this.findApplicationData(normalizedTicket);
    if (!app) {
      throw new NotFoundException({
        statusCode: 404,
        code: 'TICKET_NOT_FOUND',
        message: `Tiket [${normalizedTicket}] tidak ditemukan.`,
      });
    }

    const milestones = this.buildIntentionalPublicMilestones(
      app.current_status,
      app.status_history,
      app.submitted_at,
      app.updated_at,
    );

    return {
      ticket_number: app.ticket_number,
      current_status: app.current_status,
      milestones,
      last_updated: app.updated_at,
    };
  }

  /**
   * 4. Alur Tanggapan Revisi oleh Pemohon Publik.
   * Hanya diizinkan jika status tiket sedang dalam REVISION_REQUIRED.
   */
  async submitRevision(
    ticketNumber: string,
    session: TrackingSessionPayload,
    dto: SubmitRevisionDto,
  ): Promise<SubmitRevisionResult> {
    const normalizedTicket = ticketNumber.trim().toUpperCase();
    if (session.ticket_number.toUpperCase() !== normalizedTicket) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'TRACKING_INVALID_CREDENTIAL',
        message: 'Sesi pelacakan tidak valid.',
      });
    }

    const notes = dto.revision_notes ? dto.revision_notes.trim() : '';
    if (!notes) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'REVISION_NOTE_REQUIRED',
        message: 'Catatan penjelasan perbaikan/tanggapan revisi wajib diisi oleh pemohon.',
      });
    }

    const app = await this.findApplicationData(normalizedTicket);
    if (!app) {
      throw new NotFoundException({
        statusCode: 404,
        code: 'TICKET_NOT_FOUND',
        message: `Tiket [${normalizedTicket}] tidak ditemukan.`,
      });
    }

    // Validasi aturan bisnis: hanya boleh revisi jika status saat ini REVISION_REQUIRED
    if (app.current_status !== 'REVISION_REQUIRED') {
      throw new BadRequestException({
        statusCode: 400,
        code: 'REVISION_NOT_ALLOWED',
        message: `Permohonan tidak dapat direvisi karena status saat ini adalah [${app.current_status}], bukan REVISION_REQUIRED.`,
      });
    }

    // Validasi berkas lampiran tambahan jika ada
    if (dto.additional_documents && dto.additional_documents.length > 0) {
      for (const doc of dto.additional_documents) {
        validateUploadedFile({
          original_filename: doc.original_filename,
          mime_type: doc.mime_type,
          size_bytes: doc.size_bytes,
          buffer: doc.base64_data ? Buffer.from(doc.base64_data, 'base64') : undefined,
        });
      }
    }

    const now = new Date().toISOString();
    const previousStatus = app.current_status;
    const newStatus: ApplicationStatus = 'VERIFICATION';

    // 1. Perbarui Supabase jika terhubung
    try {
      const client = this.supabaseService.getClient();

      // Perbarui status aplikasi
      await client
        .from('applications')
        .update({
          current_status: newStatus,
          updated_at: now,
          ...(dto.updated_title ? { title: dto.updated_title.trim() } : {}),
          ...(dto.updated_background ? { background: dto.updated_background.trim() } : {}),
          ...(dto.updated_problem_statement ? { problem_statement: dto.updated_problem_statement.trim() } : {}),
          ...(dto.updated_objective ? { objective: dto.updated_objective.trim() } : {}),
          ...(dto.updated_scope ? { scope: dto.updated_scope.trim() } : {}),
          ...(dto.updated_expected_output ? { expected_output: dto.updated_expected_output.trim() } : {}),
        })
        .eq('id', app.id);

      // Catat di status history
      await client.from('application_status_history').insert({
        application_id: app.id,
        from_status: previousStatus,
        to_status: newStatus,
        note: `Tanggapan perbaikan dikirimkan oleh pemohon OPD: ${notes}`,
        changed_at: now,
      });

      // Catat pesan komunikasi publik
      await client.from('messages').insert({
        application_id: app.id,
        sender_type: 'PUBLIC_APPLICANT',
        sender_name: app.applicant_name,
        sender_email: app.applicant_email,
        visibility: 'PUBLIC',
        message: `[TANGGAPAN REVISI PEMOHON]: ${notes}`,
        created_at: now,
      });
    } catch {
      // Fallback
    }

    // 2. Perbarui in-memory record
    app.current_status = newStatus;
    app.updated_at = now;
    if (dto.updated_title) app.title = dto.updated_title.trim();
    app.revision_note = undefined; // reset catatan kebutuhan revisi setelah dijawab
    app.status_history.unshift({
      from_status: previousStatus,
      to_status: newStatus,
      note: `Tanggapan perbaikan dikirimkan oleh pemohon OPD: ${notes}`,
      changed_at: now,
    });

    if (dto.additional_documents && dto.additional_documents.length > 0) {
      for (const doc of dto.additional_documents) {
        app.documents.push({
          requirement_name: 'Dokumen Perbaikan Tambahan',
          original_filename: doc.original_filename,
          size_bytes: doc.size_bytes,
          uploaded_at: now,
        });
      }
    }

    this.inMemoryTrackRecords.set(normalizedTicket, app);

    return {
      ticket_number: app.ticket_number,
      previous_status: previousStatus,
      current_status: newStatus,
      message:
        'Tanggapan perbaikan berhasil dikirimkan. Permohonan Anda telah masuk kembali ke antrean verifikasi administrasi.',
      submitted_at: now,
    };
  }

  // ------------------------------------------------------------
  // PRIVATE HELPER METHODS
  // ------------------------------------------------------------

  private async findApplicationData(ticketNumber: string): Promise<InMemApplicationTrack | null> {
    // Coba Supabase
    try {
      const client = this.supabaseService.getClient();
      const { data, error } = await client
        .from('applications')
        .select(
          `id, ticket_number, tracking_code_hash, title, current_status, current_stage, submitted_at, updated_at,
           applicant_name, applicant_email,
           services ( name ),
           applicants ( opd_units ( name ) ),
           application_documents ( requirement_id, original_filename, size_bytes, uploaded_at ),
           application_status_history ( from_status, to_status, note, changed_at )`,
        )
        .eq('ticket_number', ticketNumber)
        .maybeSingle();

      if (!error && data) {
        const docs: PublicDocumentItem[] = ((data as any).application_documents || []).map(
          (d: any) => ({
            requirement_name: 'Dokumen Persyaratan',
            original_filename: d.original_filename,
            size_bytes: d.size_bytes,
            uploaded_at: d.uploaded_at,
          }),
        );

        const history = ((data as any).application_status_history || []).sort(
          (a: any, b: any) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime(),
        );

        return {
          id: data.id,
          ticket_number: data.ticket_number,
          tracking_code_hash: data.tracking_code_hash,
          title: data.title,
          service_name: (data as any).services?.name || 'Layanan Aplikasi SPBE',
          opd_name: (data as any).applicants?.opd_units?.name || 'Pemerintah Kabupaten Bandung',
          applicant_name: data.applicant_name,
          applicant_email: data.applicant_email,
          current_status: data.current_status,
          current_stage: data.current_stage,
          submitted_at: data.submitted_at,
          updated_at: data.updated_at,
          documents: docs,
          status_history: history,
        };
      }
    } catch {
      // Fallback
    }

    return this.inMemoryTrackRecords.get(ticketNumber) || null;
  }

  private maskName(name: string): string {
    if (!name) return 'Pemohon';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      const p = parts[0];
      return p.length > 2 ? `${p.slice(0, 2)}***` : `${p}***`;
    }
    // Tampilkan kata pertama dan inisial kata kedua + bintang
    const first = parts[0];
    const secondInitial = parts[1].charAt(0).toUpperCase();
    return `${first} ${secondInitial}***`;
  }

  private maskEmail(email?: string): string {
    if (!email || !email.includes('@')) return 'email***';
    const [user, domain] = email.split('@');
    const maskedUser = user.length > 2 ? `${user.slice(0, 2)}***` : `${user}***`;
    return `${maskedUser}@${domain}`;
  }

  private resolveStatusLabel(status: ApplicationStatus): string {
    switch (status) {
      case 'SUBMITTED':
        return 'Permohonan Diterima';
      case 'VERIFICATION':
        return 'Verifikasi Dokumen & Administrasi';
      case 'REVISION_REQUIRED':
        return 'Perlu Perbaikan / Revisi';
      case 'APPROVED':
        return 'Permohonan Disetujui';
      case 'REJECTED':
        return 'Permohonan Tidak Disetujui';
      case 'IN_PROGRESS':
        return 'Dalam Proses Pengerjaan Teknis';
      case 'COMPLETED':
        return 'Selesai & Serah Terima';
      case 'CLOSED':
        return 'Tiket Ditutup';
      case 'CANCELLED':
        return 'Permohonan Dibatalkan';
      default:
        return status;
    }
  }

  private resolveStageLabel(stage: ApplicationStage): string {
    switch (stage) {
      case 'ANALYSIS':
        return 'Analisis Kebutuhan SPBE';
      case 'PLANNING':
        return 'Perencanaan Proyek';
      case 'DESIGN':
        return 'Perancangan Arsitektur & UI/UX';
      case 'IMPLEMENTATION':
        return 'Pembangunan / Koding Sistem';
      case 'TESTING':
        return 'Uji Kelaikan Aplikasi';
      case 'MAINTENANCE':
        return 'Pemeliharaan Sistem';
      case 'EVALUATION':
        return 'Evaluasi Pasca-Implementasi';
      default:
        return stage;
    }
  }

  private resolveNextStepAdvisory(status: ApplicationStatus): string {
    switch (status) {
      case 'SUBMITTED':
        return 'Permohonan Anda telah terdaftar dan berada dalam antrean telaah awal oleh Diskominfo. Harap pantau perkembangan tiket secara berkala.';
      case 'VERIFICATION':
        return 'Tim Verifikator Diskominfo sedang memeriksa kelengkapan administrasi dan dokumen KAK. Jika diperlukan perbaikan dokumen, instruksi revisi akan diinformasikan pada halaman ini.';
      case 'REVISION_REQUIRED':
        return 'Permohonan memerlukan perbaikan kelengkapan atau penyesuaian dari instansi Anda. Silakan pelajari rincian catatan revisi dan kirimkan tanggapan perbaikan melalui formulir di bawah.';
      case 'APPROVED':
        return 'Permohonan telah disetujui secara substantif dan administratif. Tim Diskominfo sedang memproses penjadwalan dan penugasan teknisi pengembang.';
      case 'REJECTED':
        return 'Permohonan tidak dapat dilanjutkan. Silakan pelajari alasan penelaahan atau hubungi helpdesk jika memerlukan klarifikasi.';
      case 'IN_PROGRESS':
        return 'Aplikasi sedang dikerjakan secara teknis oleh tim pengembang sesuai tahapan siklus hidup SPBE.';
      case 'COMPLETED':
        return 'Seluruh tahapan pembangunan/pengembangan aplikasi telah rampung dan siap digunakan secara resmi.';
      case 'CLOSED':
        return 'Tiket permohonan telah selesai dan diarsipkan secara administratif.';
      case 'CANCELLED':
        return 'Tiket permohonan ini telah dibatalkan.';
      default:
        return 'Pantau status permohonan Anda secara berkala.';
    }
  }

  private findLatestRevisionNote(
    history: { to_status: ApplicationStatus; note: string | null }[],
  ): string | null {
    const revEntry = history.find((h) => h.to_status === 'REVISION_REQUIRED' && h.note);
    return revEntry?.note || null;
  }

  /**
   * Membentuk proyeksi milestone publik yang intensional dan terstruktur
   */
  private buildIntentionalPublicMilestones(
    currentStatus: ApplicationStatus,
    history: { to_status: ApplicationStatus; changed_at: string; note: string | null }[],
    submittedAt: string,
    updatedAt: string,
  ): PublicTimelineMilestone[] {
    const isVerif = ['VERIFICATION', 'REVISION_REQUIRED', 'APPROVED', 'IN_PROGRESS', 'COMPLETED'].includes(currentStatus);
    const isApproved = ['APPROVED', 'IN_PROGRESS', 'COMPLETED'].includes(currentStatus);
    const isInProgress = ['IN_PROGRESS', 'COMPLETED'].includes(currentStatus);
    const isCompleted = currentStatus === 'COMPLETED';
    const isRejected = currentStatus === 'REJECTED';

    const getStatusDate = (status: ApplicationStatus): string | undefined => {
      const match = history.find((h) => h.to_status === status);
      return match ? match.changed_at : undefined;
    };

    const milestones: PublicTimelineMilestone[] = [
      {
        step_number: 1,
        stage: 'PENDAFTARAN',
        title: 'Permohonan Didaftarkan',
        description: 'Berkas dan rincian usulan permohonan berhasil didaftarkan ke sistem SIMANTIK.',
        status: 'completed',
        date: submittedAt,
      },
      {
        step_number: 2,
        stage: 'VERIFIKASI',
        title: 'Verifikasi & Telaah Administrasi',
        description:
          currentStatus === 'REVISION_REQUIRED'
            ? 'Pemeriksaan menemukan catatan kelengkapan yang perlu diperbaiki oleh OPD pemohon.'
            : isVerif && currentStatus !== 'SUBMITTED'
            ? 'Pemeriksaan berkas administrasi dan kesesuaian KAK oleh tim verifikator Diskominfo.'
            : 'Menunggu antrean pemeriksaan administrasi dan telaah arsitektur SPBE.',
        status:
          currentStatus === 'REVISION_REQUIRED'
            ? 'current'
            : currentStatus === 'VERIFICATION'
            ? 'current'
            : isVerif
            ? 'completed'
            : 'upcoming',
        date: getStatusDate('VERIFICATION') || (isVerif ? updatedAt : undefined),
      },
    ];

    if (isRejected) {
      milestones.push({
        step_number: 3,
        stage: 'KEPUTUSAN',
        title: 'Permohonan Tidak Disetujui',
        description: 'Berdasarkan hasil telaah, permohonan belum dapat disetujui.',
        status: 'completed',
        date: getStatusDate('REJECTED') || updatedAt,
      });
      return milestones;
    }

    milestones.push(
      {
        step_number: 3,
        stage: 'PERSETUJUAN',
        title: 'Persetujuan Layanan & Penetapan Tim',
        description: 'Permohonan disetujui dan tim teknis pengembang Diskominfo ditugaskan.',
        status:
          currentStatus === 'APPROVED'
            ? 'current'
            : isApproved
            ? 'completed'
            : 'upcoming',
        date: getStatusDate('APPROVED'),
      },
      {
        step_number: 4,
        stage: 'PENGERJAAN',
        title: 'Pelaksanaan Pengembangan & Pengujian',
        description: 'Pengerjaan sistem informasi, pengujian fungsional, integrasi, dan uji keamanan.',
        status:
          currentStatus === 'IN_PROGRESS'
            ? 'current'
            : isInProgress
            ? 'completed'
            : 'upcoming',
        date: getStatusDate('IN_PROGRESS'),
      },
      {
        step_number: 5,
        stage: 'SERAH_TERIMA',
        title: 'Penyelesaian & Serah Terima Sistem',
        description: 'Aplikasi rampung dibangun, diserahterimakan, dan siap dioperasikan bersama.',
        status: isCompleted ? 'completed' : 'upcoming',
        date: getStatusDate('COMPLETED'),
      },
    );

    return milestones;
  }

  /**
   * Constant-time comparison for SHA-256 hash strings to prevent timing side-channel attacks.
   */
  private safeHashCompare(storedHashHex: string, candidateHashHex: string): boolean {
    if (!storedHashHex || !candidateHashHex) return false;
    const cleanStored = storedHashHex.trim().toLowerCase();
    const cleanCandidate = candidateHashHex.trim().toLowerCase();

    // Pastikan kedua hash valid hex 64-karakter (SHA-256 digest hex)
    if (cleanStored.length !== 64 || cleanCandidate.length !== 64) {
      return false;
    }

    try {
      const bufA = Buffer.from(cleanStored, 'hex');
      const bufB = Buffer.from(cleanCandidate, 'hex');
      if (bufA.length !== 32 || bufB.length !== 32) {
        return false;
      }
      return crypto.timingSafeEqual(bufA, bufB);
    } catch {
      return false;
    }
  }
}
