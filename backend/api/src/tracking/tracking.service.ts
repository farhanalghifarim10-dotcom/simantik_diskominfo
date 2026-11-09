import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { SupabaseService } from '../supabase/supabase.service.js';
import { TrackingTokenService } from './tracking-token.service.js';
import { TrackingRateLimiter } from './tracking-rate-limiter.js';
import {
  generateSecureStorageKey,
  parseAndValidateBase64,
  sanitizeFilename,
  validateUploadedFile,
} from '../common/utils/file-validator.js';
import type {
  ApplicationStage,
  ApplicationStatus,
  PublicDocumentItem,
  PublicTicketSummary,
  PublicTimelineMilestone,
  PublicTimelineResponse,
  StageProgressItem,
  StageProgressStatus,
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
  stage_history?: {
    from_stage: ApplicationStage | null;
    to_stage: ApplicationStage;
    changed_at: string;
  }[];
}

const LIFECYCLE_STAGES: { stage: ApplicationStage; label: string; description: string }[] = [
  {
    stage: 'ANALYSIS',
    label: 'Analisis Kebutuhan SPBE',
    description: 'Telaah proses bisnis, spesifikasi teknis, arsitektur data, dan kepatuhan standar SPBE.',
  },
  {
    stage: 'PLANNING',
    label: 'Perencanaan Proyek',
    description: 'Penyusunan jadwal pengerjaan, alokasi sumber daya teknis, dan rencana deliverable sistem.',
  },
  {
    stage: 'DESIGN',
    label: 'Perancangan Arsitektur & UI/UX',
    description: 'Perancangan arsitektur sistem, basis data, diagram alur, dan prototipe antarmuka pengguna.',
  },
  {
    stage: 'IMPLEMENTATION',
    label: 'Pembangunan / Koding Sistem',
    description: 'Pengembangan kode program modul aplikasi, integrasi basis data, dan implementasi layanan.',
  },
  {
    stage: 'TESTING',
    label: 'Uji Kelaikan Aplikasi',
    description: 'Pengujian fungsionalitas fitur, keamanan informasi, performa, dan kesesuaian integrasi.',
  },
  {
    stage: 'MAINTENANCE',
    label: 'Pemeliharaan Sistem',
    description: 'Pemantauan stabilitas operasional sistem, penanganan kendala teknis, dan optimasi performa.',
  },
  {
    stage: 'EVALUATION',
    label: 'Evaluasi Pasca-Implementasi',
    description: 'Penilaian efektivitas pemanfaatan sistem informasi dan evaluasi kesesuaian siklus hidup SPBE.',
  },
];

@Injectable()
export class TrackingService {
  private readonly logger = new Logger(TrackingService.name);

  private inMemoryTrackRecords: Map<string, InMemApplicationTrack> = new Map();

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly tokenService: TrackingTokenService,
    private readonly rateLimiter: TrackingRateLimiter,
  ) {
    this.seedFallbackApplications();
  }

  registerInMemoryApplication(record: InMemApplicationTrack): void {
    this.inMemoryTrackRecords.set(record.ticket_number.toUpperCase(), record);
  }

  updateInMemoryStatus(
    ticketNumber: string,
    toStatus: ApplicationStatus,
    targetStage?: ApplicationStage | null,
    note?: string | null,
    now: string = new Date().toISOString(),
  ): void {
    const norm = ticketNumber.toUpperCase();
    const record = this.inMemoryTrackRecords.get(norm);
    if (record) {
      const fromStatus = record.current_status;
      const fromStage = record.current_stage;
      record.current_status = toStatus;
      if (targetStage) {
        record.current_stage = targetStage;
        if (!record.stage_history) {
          record.stage_history = [];
        }
        record.stage_history.push({
          from_stage: fromStage,
          to_stage: targetStage,
          changed_at: now,
        });
      }
      record.updated_at = now;
      record.status_history.unshift({
        from_status: fromStatus,
        to_status: toStatus,
        note: note || null,
        changed_at: now,
      });
    }
  }

  updateInMemoryTrackingCodeHash(
    ticketNumber: string,
    newTrackingCodeHash: string,
    now: string = new Date().toISOString(),
  ): void {
    const norm = ticketNumber.toUpperCase();
    const record = this.inMemoryTrackRecords.get(norm);
    if (record) {
      record.tracking_code_hash = newTrackingCodeHash;
      record.updated_at = now;
    }
  }

  private seedFallbackApplications() {
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
      stage_history: [
        {
          from_stage: null,
          to_stage: 'ANALYSIS',
          changed_at: now,
        },
      ],
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
    this.rateLimiter.assertNotBlocked(rateLimitKey);

    const inputHashExact = crypto
      .createHash('sha256')
      .update(trackingCode)
      .digest('hex');
    const inputHashUpper = crypto
      .createHash('sha256')
      .update(trackingCode.toUpperCase())
      .digest('hex');

    let appRecord: InMemApplicationTrack | null = null;

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

    if (!appRecord) {
      this.rateLimiter.recordFailure(rateLimitKey);
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'TRACKING_INVALID_CREDENTIAL',
        message: 'Nomor tiket atau kode pelacakan tidak sesuai.',
      });
    }

    if (appRecord.current_status === 'CLOSED') {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'TICKET_CLOSED',
        message: `Tiket permohonan [${appRecord.ticket_number}] telah resmi ditutup oleh Administrator. Layanan untuk nomor tiket ini sudah selesai dan tidak dapat dibuka kembali.`,
      });
    }

    this.rateLimiter.reset(rateLimitKey);

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

    if (app.current_status === 'CLOSED') {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'TICKET_CLOSED',
        message: `Tiket permohonan [${app.ticket_number}] telah resmi ditutup oleh Administrator. Layanan untuk nomor tiket ini sudah selesai dan tidak dapat dibuka kembali.`,
      });
    }

    const applicantNameMasked = this.maskName(app.applicant_name);
    const applicantEmailMasked = this.maskEmail(app.applicant_email);

    const nextStep = this.resolveNextStepAdvisory(app.current_status);

    let revisionReason: string | null = null;
    if (app.current_status === 'REVISION_REQUIRED') {
      revisionReason = app.revision_note || this.findLatestRevisionNote(app.status_history);
    }

    const stageLabel = app.current_stage ? this.resolveStageLabel(app.current_stage) : null;
    const stageDescription = this.resolveStageDescription(app.current_stage);
    const applicantAction = this.resolveApplicantAction(app.current_status, stageLabel);
    const stageProgress = this.buildStageProgress(
      app.current_status,
      app.current_stage,
      app.stage_history || [],
    );

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
      stage_label: stageLabel,
      stage_description: stageDescription,
      stage_progress: stageProgress,
      action_required_by_applicant: applicantAction.actionRequired,
      applicant_action_message: applicantAction.message,
      submitted_at: app.submitted_at,
      updated_at: app.updated_at,
      next_step: nextStep,
      can_revise: app.current_status === 'REVISION_REQUIRED',
      revision_reason: revisionReason,
      documents: app.documents || [],
    };
  }

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

    if (app.current_status === 'CLOSED') {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'TICKET_CLOSED',
        message: `Tiket permohonan [${app.ticket_number}] telah resmi ditutup oleh Administrator. Akses pelacakan layanan untuk tiket ini tidak lagi aktif.`,
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

    if (app.current_status !== 'REVISION_REQUIRED') {
      throw new BadRequestException({
        statusCode: 400,
        code: 'REVISION_NOT_ALLOWED',
        message: `Permohonan tidak dapat direvisi karena status saat ini adalah [${app.current_status}], bukan REVISION_REQUIRED.`,
      });
    }

    const validatedRevisionDocs: {
      original_filename: string;
      mime_type: string;
      size_bytes: number;
      buffer: Buffer;
    }[] = [];

    if (dto.additional_documents && dto.additional_documents.length > 0) {
      for (const doc of dto.additional_documents) {
        const buffer = parseAndValidateBase64(doc.base64_data, doc.original_filename);

        validateUploadedFile({
          original_filename: doc.original_filename,
          mime_type: doc.mime_type,
          size_bytes: doc.size_bytes,
          buffer,
        });

        validatedRevisionDocs.push({
          original_filename: doc.original_filename,
          mime_type: doc.mime_type,
          size_bytes: doc.size_bytes,
          buffer,
        });
      }
    }

    const now = new Date().toISOString();
    const previousStatus = app.current_status;
    const newStatus: ApplicationStatus = 'VERIFICATION';

    const uploadedStoragePaths: string[] = [];
    const insertedDocIds: string[] = [];
    let applicationStatusUpdated = false;
    let insertedHistoryId: string | null = null;
    let insertedMessageId: string | null = null;

    try {
      const client = this.supabaseService.getClient();

      for (const doc of validatedRevisionDocs) {
        const docId = crypto.randomUUID();
        const storagePath = generateSecureStorageKey(`applications/${normalizedTicket}`, doc.original_filename);

        if (client?.storage) {
          const { error: uploadError } = await client.storage
            .from('simantik-documents')
            .upload(storagePath, doc.buffer, {
              contentType: doc.mime_type,
              upsert: false,
            });

          if (uploadError) {
            throw new InternalServerErrorException(
              `Gagal mengunggah berkas perbaikan "${doc.original_filename}" ke penyimpanan: ${uploadError.message}`,
            );
          }
          uploadedStoragePaths.push(storagePath);
        }

        const { error: docInsertError } = await client
          .from('application_documents')
          .insert({
            id: docId,
            application_id: app.id,
            requirement_id: null, // Dokumen revisi tidak terikat requirement_id spesifik awal
            original_filename: sanitizeFilename(doc.original_filename),
            storage_path: storagePath,
            mime_type: doc.mime_type,
            size_bytes: doc.size_bytes,
            version: 1,
            is_current: true,
            uploaded_at: now,
          });

        if (docInsertError) {
          throw new InternalServerErrorException(
            `Gagal menyimpan metadata berkas perbaikan "${doc.original_filename}": ${docInsertError.message}`,
          );
        }
        insertedDocIds.push(docId);
      }

      const { data: updatedRows, error: appUpdateError } = await client
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
        .eq('id', app.id)
        .eq('current_status', previousStatus)
        .select('id');

      if (appUpdateError) {
        throw new InternalServerErrorException(`Gagal memperbarui status permohonan: ${appUpdateError.message}`);
      }

      if (!updatedRows || updatedRows.length === 0) {
        throw new ConflictException({
          statusCode: 409,
          code: 'CONCURRENT_STATUS_CHANGE',
          message: `Permohonan [${normalizedTicket}] tidak lagi berada pada status [${previousStatus}]. Status telah diperbarui oleh proses lain. Revisi dibatalkan.`,
        });
      }

      if (updatedRows.length !== 1) {
        throw new InternalServerErrorException(
          `Inkonsistensi data: mutasi status permohonan [${normalizedTicket}] memengaruhi ${updatedRows.length} baris data, diharapkan tepat 1 baris.`,
        );
      }

      applicationStatusUpdated = true;

      const historyId = crypto.randomUUID();
      const { error: historyError } = await client.from('application_status_history').insert({
        id: historyId,
        application_id: app.id,
        from_status: previousStatus,
        to_status: newStatus,
        note: `Tanggapan perbaikan dikirimkan oleh pemohon OPD: ${notes}`,
        changed_at: now,
      });

      if (historyError) {
        throw new InternalServerErrorException(`Gagal mencatat riwayat status revisi: ${historyError.message}`);
      }
      insertedHistoryId = historyId;

      const messageId = crypto.randomUUID();
      const { error: msgError } = await client.from('messages').insert({
        id: messageId,
        application_id: app.id,
        sender_type: 'PUBLIC_APPLICANT',
        sender_name: app.applicant_name,
        sender_email: app.applicant_email,
        visibility: 'PUBLIC',
        message: `[TANGGAPAN REVISI PEMOHON]: ${notes}`,
        created_at: now,
      });

      if (msgError) {
        throw new InternalServerErrorException(`Gagal mencatat pesan revisi: ${msgError.message}`);
      }
      insertedMessageId = messageId;
    } catch (err: any) {
      if (uploadedStoragePaths.length > 0) {
        try {
          const client = this.supabaseService.getClient();
          if (client?.storage) {
            await client.storage.from('simantik-documents').remove(uploadedStoragePaths);
          }
        } catch (cleanupErr: any) {
          this.logger.warn(`Gagal membersihkan berkas Storage revisi: ${cleanupErr?.message || cleanupErr}`);
        }
      }
      if (insertedDocIds.length > 0) {
        try {
          const client = this.supabaseService.getClient();
          if (client?.from) {
            await client.from('application_documents').delete().in('id', insertedDocIds);
          }
        } catch (cleanupErr: any) {
          this.logger.warn(`Gagal membersihkan metadata berkas revisi: ${cleanupErr?.message || cleanupErr}`);
        }
      }
      if (insertedMessageId) {
        try {
          const client = this.supabaseService.getClient();
          if (client?.from) {
            await client.from('messages').delete().eq('id', insertedMessageId);
          }
        } catch (cleanupErr: any) {
          this.logger.warn(`Gagal membersihkan pesan revisi parsial: ${cleanupErr?.message || cleanupErr}`);
        }
      }
      if (insertedHistoryId) {
        try {
          const client = this.supabaseService.getClient();
          if (client?.from) {
            await client.from('application_status_history').delete().eq('id', insertedHistoryId);
          }
        } catch (cleanupErr: any) {
          this.logger.warn(`Gagal membersihkan riwayat status revisi parsial: ${cleanupErr?.message || cleanupErr}`);
        }
      }
      if (applicationStatusUpdated) {
        try {
          const client = this.supabaseService.getClient();
          if (client?.from) {
            const revertPayload: Record<string, any> = {
              current_status: previousStatus,
              updated_at: app.updated_at,
            };
            if (dto.updated_title) revertPayload.title = app.title;
            const { data: revertedRows, error: revertErr } = await client
              .from('applications')
              .update(revertPayload)
              .eq('id', app.id)
              .eq('current_status', newStatus)
              .select('id');

            if (revertErr) {
              this.logger.warn(`Gagal mengembalikan status permohonan ke ${previousStatus}: ${revertErr.message}`);
            } else if (!revertedRows || revertedRows.length === 0) {
              this.logger.warn(
                `Kompensasi status tidak mengenai baris target: status permohonan [${app.ticket_number}] bukan lagi [${newStatus}] saat rollback dilakukan. Status pihak lain dipertahankan.`,
              );
            } else if (revertedRows.length !== 1) {
              this.logger.warn(
                `Kompensasi status memengaruhi ${revertedRows.length} baris data untuk tiket [${app.ticket_number}], diharapkan tepat 1 baris.`,
              );
            } else {
              this.logger.log(
                `Kompensasi status berhasil: status permohonan [${app.ticket_number}] dikembalikan ke [${previousStatus}].`,
              );
            }
          }
        } catch (revertErr: any) {
          this.logger.warn(`Gagal mengembalikan status permohonan ke ${previousStatus}: ${revertErr?.message || revertErr}`);
        }
      }

      if (err instanceof BadRequestException) {
        throw err;
      }
      if (err instanceof ConflictException) {
        throw err;
      }
      if (err instanceof InternalServerErrorException) {
        throw err;
      }

      const isExplicitFallbackAllowed =
        process.env.ALLOW_IN_MEMORY_FALLBACK === 'true' &&
        process.env.NODE_ENV === 'test';
      if (!isExplicitFallbackAllowed) {
        throw new InternalServerErrorException(
          `Gagal memproses tanggapan revisi ke basis data: ${err?.message || err}`,
        );
      }
    }

    app.current_status = newStatus;
    app.updated_at = now;
    if (dto.updated_title) app.title = dto.updated_title.trim();
    app.revision_note = undefined;
    app.status_history.unshift({
      from_status: previousStatus,
      to_status: newStatus,
      note: `Tanggapan perbaikan dikirimkan oleh pemohon OPD: ${notes}`,
      changed_at: now,
    });

    if (validatedRevisionDocs.length > 0) {
      for (const doc of validatedRevisionDocs) {
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

  private async findApplicationData(ticketNumber: string): Promise<InMemApplicationTrack | null> {
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
        let stageHistory: {
          from_stage: ApplicationStage | null;
          to_stage: ApplicationStage;
          changed_at: string;
        }[] = [];
        try {
          const { data: stgData } = await client
            .from('application_stage_history')
            .select('from_stage, to_stage, changed_at')
            .eq('application_id', data.id)
            .order('changed_at', { ascending: true });
          if (stgData && Array.isArray(stgData)) {
            stageHistory = stgData as any;
          }
        } catch {
          // Non-fatal fallback
        }

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
          stage_history: stageHistory,
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

  private resolveStageDescription(stage: ApplicationStage | null): string | null {
    if (!stage) return null;
    const found = LIFECYCLE_STAGES.find((s) => s.stage === stage);
    return found ? found.description : null;
  }

  private resolveApplicantAction(
    status: ApplicationStatus,
    stageLabel: string | null,
  ): { actionRequired: boolean; message: string } {
    switch (status) {
      case 'REVISION_REQUIRED':
        return {
          actionRequired: true,
          message:
            'Tindakan diperlukan: Permohonan membutuhkan perbaikan dokumen KAK atau klarifikasi data dari instansi Anda. Silakan cermati catatan revisi pada panel di atas dan kirimkan dokumen perbaikan melalui formulir tanggapan.',
        };
      case 'SUBMITTED':
        return {
          actionRequired: false,
          message:
            'Tidak ada tindakan yang diperlukan dari OPD Anda saat ini. Berkas usulan telah terdaftar dalam sistem dan sedang dalam antrean telaah awal oleh Tim Verifikator Diskominfo.',
        };
      case 'VERIFICATION':
        return {
          actionRequired: false,
          message:
            'Tidak ada tindakan yang diperlukan dari OPD Anda saat ini. Tim Verifikator Diskominfo sedang memeriksa kelengkapan berkas administrasi dan dokumen KAK instansi Anda.',
        };
      case 'APPROVED':
        return {
          actionRequired: false,
          message:
            'Tidak ada tindakan yang diperlukan dari OPD Anda saat ini. Permohonan telah disetujui secara substantif dan administratif. Tim Diskominfo sedang memproses penjadwalan dan penugasan tenaga ahli pengembang.',
        };
      case 'IN_PROGRESS':
        return {
          actionRequired: false,
          message: stageLabel
            ? `Tidak ada tindakan yang diperlukan dari OPD Anda saat ini. Aplikasi sedang dikerjakan secara aktif oleh tenaga ahli pengembang pada tahap ${stageLabel}.`
            : 'Tidak ada tindakan yang diperlukan dari OPD Anda saat ini. Aplikasi sedang dalam proses pengerjaan teknis oleh tenaga ahli pengembang sesuai siklus hidup SPBE.',
        };
      case 'COMPLETED':
        return {
          actionRequired: false,
          message:
            'Permohonan telah selesai dikerjakan. Seluruh rangkaian deliverable aplikasi telah rampung dan siap digunakan secara resmi oleh instansi Anda.',
        };
      case 'CLOSED':
        return {
          actionRequired: false,
          message:
            'Layanan untuk tiket permohonan ini telah selesai dan diarsipkan secara administratif oleh Diskominfo.',
        };
      case 'REJECTED':
        return {
          actionRequired: false,
          message:
            'Permohonan belum dapat disetujui untuk dilanjutkan berdasarkan hasil telaah administrasi/substantif. Silakan hubungi helpdesk jika memerlukan penjelasan lebih lanjut.',
        };
      case 'CANCELLED':
        return {
          actionRequired: false,
          message: 'Permohonan ini telah dibatalkan.',
        };
      default:
        return {
          actionRequired: false,
          message:
            'Pantau perkembangan status permohonan Anda secara berkala melalui portal pelacakan ini.',
        };
    }
  }

  private buildStageProgress(
    currentStatus: ApplicationStatus,
    currentStage: ApplicationStage | null,
    stageHistory: { from_stage: ApplicationStage | null; to_stage: ApplicationStage; changed_at: string }[] = [],
  ): StageProgressItem[] {
    const isInLifecycle =
      ['IN_PROGRESS', 'COMPLETED', 'CLOSED'].includes(currentStatus) ||
      currentStage !== null ||
      stageHistory.length > 0;

    const currentStageIndex = currentStage
      ? LIFECYCLE_STAGES.findIndex((s) => s.stage === currentStage)
      : -1;

    const recordedStageMap = new Map<ApplicationStage, string>();
    for (const hist of stageHistory) {
      if (hist.to_stage && !recordedStageMap.has(hist.to_stage)) {
        recordedStageMap.set(hist.to_stage, hist.changed_at);
      }
      if (hist.from_stage && !recordedStageMap.has(hist.from_stage)) {
        recordedStageMap.set(hist.from_stage, hist.changed_at);
      }
    }

    return LIFECYCLE_STAGES.map((item, idx) => {
      let status: StageProgressStatus = 'upcoming';
      const recordedAt: string | undefined = recordedStageMap.get(item.stage);

      if (currentStatus === 'COMPLETED' || currentStatus === 'CLOSED') {
        if (currentStageIndex >= 0 && idx <= currentStageIndex) {
          status = 'completed';
        } else if (recordedStageMap.has(item.stage)) {
          status = 'completed';
        } else {
          status = 'upcoming';
        }
      } else if (isInLifecycle) {
        if (currentStage && item.stage === currentStage && currentStatus === 'IN_PROGRESS') {
          status = 'current';
        } else if (recordedStageMap.has(item.stage) || (currentStageIndex > 0 && idx < currentStageIndex)) {
          status = 'recorded';
        } else {
          status = 'upcoming';
        }
      }

      return {
        stage: item.stage,
        label: item.label,
        description: item.description,
        status,
        recorded_at: recordedAt,
      };
    });
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
        return 'Permohonan telah disetujui secara substantif dan administratif. Tim Diskominfo sedang memproses penjadwalan dan penugasan tenaga ahli pengembang.';
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

  private buildIntentionalPublicMilestones(
    currentStatus: ApplicationStatus,
    history: { to_status: ApplicationStatus; changed_at: string; note: string | null }[],
    submittedAt: string,
    updatedAt: string,
  ): PublicTimelineMilestone[] {
    const isVerif = ['VERIFICATION', 'REVISION_REQUIRED', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED'].includes(currentStatus);
    const isApproved = ['APPROVED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED'].includes(currentStatus);
    const isInProgress = ['IN_PROGRESS', 'COMPLETED', 'CLOSED'].includes(currentStatus);
    const isCompleted = ['COMPLETED', 'CLOSED'].includes(currentStatus);
    const isClosed = currentStatus === 'CLOSED';
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

    if (isClosed) {
      milestones.push({
        step_number: 6,
        stage: 'DITUTUP',
        title: 'Tiket Resmi Ditutup & Diarsipkan',
        description: 'Seluruh rangkaian tahapan layanan telah selesai dilaksanakan dan tiket resmi ditutup serta diarsipkan oleh Administrator Diskominfo.',
        status: 'completed',
        date: getStatusDate('CLOSED') || updatedAt,
      });
    }

    return milestones;
  }

  private safeHashCompare(storedHashHex: string, candidateHashHex: string): boolean {
    if (!storedHashHex || !candidateHashHex) return false;
    const cleanStored = storedHashHex.trim().toLowerCase();
    const cleanCandidate = candidateHashHex.trim().toLowerCase();

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
