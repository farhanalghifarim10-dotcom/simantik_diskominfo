import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import type { ConfigService } from '@nestjs/config';
import { WorkflowEngine } from './workflow/workflow.engine.js';
import { AdminApplicationsService } from './admin-applications.service.js';
import { AdminApplicationsController } from './admin-applications.controller.js';
import { TrackingService } from '../tracking/tracking.service.js';
import { TrackingTokenService } from '../tracking/tracking-token.service.js';
import { TrackingRateLimiter } from '../tracking/tracking-rate-limiter.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import type { ApplicationStatus } from './workflow/workflow.types.js';

describe('Admin Applications & Workflow Transition Engine', () => {
  let workflowEngine: WorkflowEngine;
  let adminService: AdminApplicationsService;

  const superAdminUser: AuthenticatedUser = {
    id: 'u-admin-1',
    email: 'admin.aptika@bandungkab.go.id',
    role: 'SUPER_ADMIN',
    fullName: 'Budi Santoso, S.Kom (Super Admin)',
  };

  const technicianUser: AuthenticatedUser = {
    id: 'u-tech-1',
    email: 'teknisi1@bandungkab.go.id',
    role: 'TECHNICIAN',
    fullName: 'Ahmad Fauzi (Teknisi TI)',
  };

  const mockSupabaseService = {
    getClient: () => ({
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: null, error: new Error('Mock fallback') }),
            order: async () => ({ data: null, error: new Error('Mock fallback') }),
          }),
          range: () => ({ data: null, count: null, error: new Error('Mock fallback') }),
        }),
        insert: async () => ({ error: null }),
        update: () => ({ eq: async () => ({ error: null }) }),
      }),
      rpc: async () => ({
        data: { application_id: 'a1000000-0000-0000-0000-000000000001', audit_id: 'mock-audit-id' },
        error: null,
      }),
      storage: {
        from: () => ({
          createSignedUrl: async () => ({
            data: { signedUrl: 'https://storage.supabase.co/signed/sample.pdf' },
            error: null,
          }),
        }),
      },
    }),
  } as any;

  beforeEach(() => {
    workflowEngine = new WorkflowEngine();
    adminService = new AdminApplicationsService(mockSupabaseService, workflowEngine);
  });

  describe('1. Valid verification flow', () => {
    it('should transition from SUBMITTED -> VERIFICATION -> APPROVED successfully', async () => {
      const appId = 'a1000000-0000-0000-0000-000000000001';

      // Initial state is SUBMITTED
      let detail = await adminService.getApplicationDetail(appId, superAdminUser);
      expect(detail.current_status).toBe('SUBMITTED');

      // 1. Move to VERIFICATION
      detail = await adminService.executeTransition(
        appId,
        { target_status: 'VERIFICATION', note: 'Mulai proses telaah kelengkapan administrasi' },
        superAdminUser,
      );
      expect(detail.current_status).toBe('VERIFICATION');
      expect(detail.status_history[0].to_status).toBe('VERIFICATION');
      expect(detail.status_history[0].from_status).toBe('SUBMITTED');

      // 2. Move to APPROVED
      detail = await adminService.executeTransition(
        appId,
        { target_status: 'APPROVED', note: 'Kriteria kelayakan SPBE terpenuhi, disetujui.' },
        superAdminUser,
      );
      expect(detail.current_status).toBe('APPROVED');
      expect(detail.current_stage).toBe('ANALYSIS'); // targetStage automatically set to ANALYSIS
      expect(detail.status_history[0].to_status).toBe('APPROVED');
    });
  });

  describe('2. Invalid transition', () => {
    it('should reject invalid transition from SUBMITTED directly to COMPLETED', async () => {
      const appId = 'a1000000-0000-0000-0000-000000000001';

      await expect(
        adminService.executeTransition(
          appId,
          { target_status: 'COMPLETED', note: 'Langsung selesai tanpa verifikasi' },
          superAdminUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid transition from SUBMITTED directly to APPROVED without verification', async () => {
      const appId = 'a1000000-0000-0000-0000-000000000001';

      await expect(
        adminService.executeTransition(
          appId,
          { target_status: 'APPROVED' },
          superAdminUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('3. Unauthorized transition', () => {
    it('should throw ForbiddenException when TECHNICIAN attempts to perform verification or approval', async () => {
      const appId = 'a1000000-0000-0000-0000-000000000001';

      // TECHNICIAN cannot move from SUBMITTED -> VERIFICATION
      await expect(
        adminService.executeTransition(
          appId,
          { target_status: 'VERIFICATION' },
          technicianUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow TECHNICIAN to start IN_PROGRESS once APPROVED', async () => {
      const appId = 'a1000000-0000-0000-0000-000000000001';

      // Admin advances to APPROVED
      await adminService.executeTransition(
        appId,
        { target_status: 'VERIFICATION' },
        superAdminUser,
      );
      await adminService.executeTransition(
        appId,
        { target_status: 'APPROVED' },
        superAdminUser,
      );

      // Now TECHNICIAN can start work (APPROVED -> IN_PROGRESS)
      const detail = await adminService.executeTransition(
        appId,
        { target_status: 'IN_PROGRESS', note: 'Teknisi memulai analisis dan perancangan' },
        technicianUser,
      );
      expect(detail.current_status).toBe('IN_PROGRESS');
      expect(detail.status_history[0].changed_by_role).toBe('TECHNICIAN');
    });
  });

  describe('4. Revision request', () => {
    it('should require a note when requesting revision', async () => {
      const appId = 'a1000000-0000-0000-0000-000000000001';

      await adminService.executeTransition(
        appId,
        { target_status: 'VERIFICATION' },
        superAdminUser,
      );

      // Empty or short note should fail
      await expect(
        adminService.executeTransition(
          appId,
          { target_status: 'REVISION_REQUIRED', note: '' },
          superAdminUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should succeed with valid revision note and store internal note', async () => {
      const appId = 'a1000000-0000-0000-0000-000000000001';

      await adminService.executeTransition(
        appId,
        { target_status: 'VERIFICATION' },
        superAdminUser,
      );

      const revisionNote = 'Surat KAK perlu disahkan oleh Pejabat Eselon II dan melampirkan rancangan proses bisnis.';
      const updated = await adminService.executeTransition(
        appId,
        { target_status: 'REVISION_REQUIRED', note: revisionNote },
        superAdminUser,
      );

      expect(updated.current_status).toBe('REVISION_REQUIRED');
      expect(updated.status_history[0].to_status).toBe('REVISION_REQUIRED');
      expect(updated.status_history[0].note).toBe(revisionNote);
      expect(updated.internal_notes.some((n) => n.message.includes(revisionNote))).toBe(true);
    });
  });

  describe('5. Document access & secure signed URL', () => {
    it('should generate signed URL and create audit log for valid document', async () => {
      const appId = 'a1000000-0000-0000-0000-000000000001';
      const docId = 'doc-1111';

      const result = await adminService.getDocumentSignedUrl(appId, docId, superAdminUser);

      expect(result.signed_url).toBeDefined();
      expect(result.expires_in).toBe(900);
      expect(result.filename).toBe('Surat_Permohonan_Bapenda.pdf');

      // Verify audit log entry
      const detail = await adminService.getApplicationDetail(appId, superAdminUser);
      expect(detail.audit_logs.some((al) => al.action === 'DOCUMENT_ACCESSED')).toBe(true);
    });

    it('should throw NotFoundException for non-existent document ID', async () => {
      const appId = 'a1000000-0000-0000-0000-000000000001';
      await expect(
        adminService.getDocumentSignedUrl(appId, 'non-existent-doc-id', superAdminUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('6. Status history creation & audit trail', () => {
    it('should record every status change with actor, timestamps, and notes', async () => {
      const appId = 'a1000000-0000-0000-0000-000000000001';

      await adminService.executeTransition(
        appId,
        { target_status: 'VERIFICATION', note: 'Pemeriksaan administrasi berkas' },
        superAdminUser,
      );

      const detail = await adminService.getApplicationDetail(appId, superAdminUser);
      const latestHistory = detail.status_history[0];

      expect(latestHistory.from_status).toBe('SUBMITTED');
      expect(latestHistory.to_status).toBe('VERIFICATION');
      expect(latestHistory.changed_by_name).toBe(superAdminUser.fullName);
      expect(latestHistory.changed_by_role).toBe(superAdminUser.role);
      expect(latestHistory.note).toBe('Pemeriksaan administrasi berkas');
      expect(latestHistory.changed_at).toBeDefined();

      // Verify audit log has matching action
      expect(detail.audit_logs.some((al) => al.action === 'APPLICATION_STATUS_TRANSITION')).toBe(true);
    });
  });

  describe('7. Lifecycle Stage Transition', () => {
    it('should prevent stage update when application is not approved', async () => {
      const appId = 'a1000000-0000-0000-0000-000000000001';
      // In SUBMITTED status
      await expect(
        adminService.executeStageTransition(
          appId,
          { target_stage: 'DESIGN' },
          superAdminUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow valid stage transition once application is approved', async () => {
      const appId = 'a1000000-0000-0000-0000-000000000001';

      await adminService.executeTransition(appId, { target_status: 'VERIFICATION' }, superAdminUser);
      await adminService.executeTransition(appId, { target_status: 'APPROVED' }, superAdminUser);

      const updated = await adminService.executeStageTransition(
        appId,
        { target_stage: 'PLANNING', note: 'Perumusan arsitektur sistem dan backlog' },
        technicianUser,
      );

      expect(updated.current_stage).toBe('PLANNING');
      expect(updated.stage_history[0].to_stage).toBe('PLANNING');
      expect(updated.stage_history[0].from_stage).toBe('ANALYSIS');
    });

    it('should forbid stage transition when application is in terminal statuses (COMPLETED, CLOSED)', async () => {
      const appId = 'a1000000-0000-0000-0000-000000000001';

      await adminService.executeTransition(appId, { target_status: 'VERIFICATION' }, superAdminUser);
      await adminService.executeTransition(appId, { target_status: 'APPROVED' }, superAdminUser);
      await adminService.executeTransition(appId, { target_status: 'IN_PROGRESS' }, superAdminUser);
      await adminService.executeTransition(appId, { target_status: 'COMPLETED', note: 'Selesai pengerjaan' }, superAdminUser);

      // Pada status COMPLETED, perubahan stage dilarang
      await expect(
        adminService.executeStageTransition(
          appId,
          { target_stage: 'TESTING', note: 'Ubah tahap dilarang saat selesai' },
          superAdminUser,
        ),
      ).rejects.toThrow(BadRequestException);

      // Pada status CLOSED, perubahan stage juga dilarang
      await adminService.executeTransition(appId, { target_status: 'CLOSED', note: 'Ditutup resmi' }, superAdminUser);

      await expect(
        adminService.executeStageTransition(
          appId,
          { target_stage: 'MAINTENANCE', note: 'Ubah tahap dilarang saat ditutup' },
          superAdminUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('8. List, Filtering, Sorting, Pagination', () => {
    it('should list applications with filtering and pagination', async () => {
      const res = await adminService.listApplications(
        { page: 1, page_size: 10, search: 'Bapenda' },
        superAdminUser,
      );

      expect(res.items.length).toBeGreaterThan(0);
      expect(res.total).toBeGreaterThan(0);
      expect(res.page).toBe(1);
      expect(res.items[0].ticket_number).toBe('SIM-2026-000101');
    });
  });

  describe('9. Dashboard Metrics Aggregation (SUPER_ADMIN)', () => {
    const createMockApp = (
      id: string,
      ticketNumber: string,
      status: any,
      stage: any = null,
      submittedAt = '2026-10-10T06:29:00.000Z',
    ) => ({
      id,
      ticket_number: ticketNumber,
      title: `Permohonan ${ticketNumber}`,
      background: 'Latar belakang pengujian',
      problem_statement: 'Permasalahan',
      objective: 'Tujuan',
      scope: 'Ruang lingkup',
      expected_output: 'Hasil',
      existing_application_name: null,
      requested_deadline: '2026-12-31',
      additional_notes: null,
      terms_accepted_at: submittedAt,
      terms_version: 'v1.0-2026',
      submitted_at: submittedAt,
      current_status: status,
      current_stage: stage,
      service: {
        id: 's-1',
        code: 'LAY-APP-01',
        name: 'Pembangunan Baru',
        type: 'DEVELOPMENT' as const,
        description: 'Layanan baru',
      },
      applicant: {
        id: 'ap-1',
        full_name: 'Pemohon UAT',
        employee_id: '198501012010011001',
        position: 'Staf',
        email: 'pemohon@bandungkab.go.id',
        phone: '081234567890',
        opd_unit_id: 'opd-1',
        opd_name: 'Dinas Kominfo',
        opd_code: 'DISKOMINFO',
      },
      documents: [],
      status_history: [],
      stage_history: [],
      internal_notes: [],
      audit_logs: [],
      allowed_transitions: [],
    });

    beforeEach(() => {
      adminService.clearInMemoryRecords();
    });

    it('should correctly aggregate UAT scenario: ticket SIM-2026-603023 (CLOSED, EVALUATION)', async () => {
      adminService.registerApplicationInMemory(
        createMockApp('app-uat-1', 'SIM-2026-603023', 'CLOSED', 'EVALUATION'),
      );

      const stats = await adminService.getDashboardStats(undefined, superAdminUser);

      // Expected for current UAT data:
      // Total Permohonan >= 1 (1)
      // Selesai / Ditutup: 1 (CLOSED counts toward completed/closed)
      // Dalam Pengerjaan: 0 (CLOSED is not IN_PROGRESS)
      expect(stats.total_applications).toBe(1);
      expect(stats.completed_closed_count).toBe(1);
      expect(stats.in_progress_count).toBe(0);
      expect(stats.submitted_count).toBe(0);
    });

    it('should count SUBMITTED permohonan in total but not in Dalam Pengerjaan or Selesai/Ditutup', async () => {
      adminService.registerApplicationInMemory(
        createMockApp('app-sub-1', 'SIM-2026-000001', 'SUBMITTED'),
      );

      const stats = await adminService.getDashboardStats(undefined, superAdminUser);
      expect(stats.total_applications).toBe(1);
      expect(stats.submitted_count).toBe(1);
      expect(stats.in_progress_count).toBe(0);
      expect(stats.completed_closed_count).toBe(0);
    });

    it('should count IN_PROGRESS permohonan in Dalam Pengerjaan', async () => {
      adminService.registerApplicationInMemory(
        createMockApp('app-inp-1', 'SIM-2026-000002', 'IN_PROGRESS', 'IMPLEMENTATION'),
      );

      const stats = await adminService.getDashboardStats(undefined, superAdminUser);
      expect(stats.total_applications).toBe(1);
      expect(stats.in_progress_count).toBe(1);
      expect(stats.completed_closed_count).toBe(0);
      expect(stats.submitted_count).toBe(0);
    });

    it('should count COMPLETED permohonan in Selesai / Ditutup', async () => {
      adminService.registerApplicationInMemory(
        createMockApp('app-comp-1', 'SIM-2026-000003', 'COMPLETED', 'MAINTENANCE'),
      );

      const stats = await adminService.getDashboardStats(undefined, superAdminUser);
      expect(stats.total_applications).toBe(1);
      expect(stats.completed_closed_count).toBe(1);
      expect(stats.in_progress_count).toBe(0);
    });

    it('should count CANCELLED permohonan in Total Permohonan without inflating Dalam Pengerjaan or Selesai/Ditutup', async () => {
      adminService.registerApplicationInMemory(
        createMockApp('app-cnc-1', 'SIM-2026-000004', 'CANCELLED'),
      );

      const stats = await adminService.getDashboardStats(undefined, superAdminUser);
      expect(stats.total_applications).toBe(1);
      expect(stats.in_progress_count).toBe(0);
      expect(stats.completed_closed_count).toBe(0);
    });

    it('should accurately aggregate mixed statuses across SUBMITTED, IN_PROGRESS, COMPLETED, CLOSED, and CANCELLED', async () => {
      adminService.registerApplicationInMemory(createMockApp('app-1', 'SIM-2026-001', 'SUBMITTED'));
      adminService.registerApplicationInMemory(createMockApp('app-2', 'SIM-2026-002', 'IN_PROGRESS', 'IMPLEMENTATION'));
      adminService.registerApplicationInMemory(createMockApp('app-3', 'SIM-2026-003', 'COMPLETED', 'MAINTENANCE'));
      adminService.registerApplicationInMemory(createMockApp('app-4', 'SIM-2026-004', 'CLOSED', 'EVALUATION'));
      adminService.registerApplicationInMemory(createMockApp('app-5', 'SIM-2026-005', 'CANCELLED'));

      const stats = await adminService.getDashboardStats(undefined, superAdminUser);
      expect(stats.total_applications).toBe(5);
      expect(stats.in_progress_count).toBe(1);
      expect(stats.completed_closed_count).toBe(2); // COMPLETED + CLOSED
      expect(stats.submitted_count).toBe(1);
    });

    it('should support year filtering without dropping valid current-year tickets', async () => {
      adminService.registerApplicationInMemory(
        createMockApp('app-2025', 'SIM-2025-001', 'COMPLETED', 'MAINTENANCE', '2025-06-01T00:00:00.000Z'),
      );
      adminService.registerApplicationInMemory(
        createMockApp('app-2026', 'SIM-2026-001', 'CLOSED', 'EVALUATION', '2026-10-10T00:00:00.000Z'),
      );

      // Filtering for 2026
      const stats2026 = await adminService.getDashboardStats({ year: 2026 }, superAdminUser);
      expect(stats2026.total_applications).toBe(1);
      expect(stats2026.completed_closed_count).toBe(1);

      // No year filter includes both
      const statsAll = await adminService.getDashboardStats(undefined, superAdminUser);
      expect(statsAll.total_applications).toBe(2);
      expect(statsAll.completed_closed_count).toBe(2);
    });

    it('should expose GET /api/v1/admin/applications/stats via AdminApplicationsController', async () => {
      const controller = new AdminApplicationsController(adminService);
      adminService.registerApplicationInMemory(
        createMockApp('app-uat-1', 'SIM-2026-603023', 'CLOSED', 'EVALUATION'),
      );

      const res = await controller.getDashboardStats(undefined, {
        user: superAdminUser,
      } as any);

      expect(res.success).toBe(true);
      expect(res.data.total_applications).toBe(1);
      expect(res.data.completed_closed_count).toBe(1);
      expect(res.data.in_progress_count).toBe(0);
    });
  });

  describe('Penerbitan Ulang Kode Pelacakan (Reissue Tracking Code)', () => {
    const targetAppId = 'a1000000-0000-0000-0000-000000000001';
    const targetTicketNumber = 'SIM-2026-000101';

    it('1. Otorisasi: harus menolak role TECHNICIAN dengan ForbiddenException', async () => {
      await expect(
        adminService.reissueTrackingCode(
          targetAppId,
          { reason: 'Permohonan kode baru oleh OPD' },
          technicianUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('2. Validasi: harus menolak alasan kosong, spasi saja, atau kurang dari 10 karakter dengan BadRequestException, serta menerima >= 10 karakter', async () => {
      // Alasan kosong
      await expect(
        adminService.reissueTrackingCode(targetAppId, { reason: '' }, superAdminUser),
      ).rejects.toThrow(BadRequestException);

      // Alasan hanya spasi
      await expect(
        adminService.reissueTrackingCode(targetAppId, { reason: '          ' }, superAdminUser),
      ).rejects.toThrow(BadRequestException);

      // Alasan kurang dari 10 karakter (3 karakter)
      await expect(
        adminService.reissueTrackingCode(targetAppId, { reason: 'abc' }, superAdminUser),
      ).rejects.toThrow(BadRequestException);

      // Alasan 9 karakter (tepat di bawah batas minimal)
      await expect(
        adminService.reissueTrackingCode(targetAppId, { reason: '123456789' }, superAdminUser),
      ).rejects.toThrow(BadRequestException);

      // Alasan dengan padding spasi namun isi trimmed kurang dari 10 karakter
      await expect(
        adminService.reissueTrackingCode(targetAppId, { reason: '   123456789   ' }, superAdminUser),
      ).rejects.toThrow(BadRequestException);

      // DTO null/undefined
      await expect(
        adminService.reissueTrackingCode(targetAppId, null as any, superAdminUser),
      ).rejects.toThrow(BadRequestException);

      // Alasan tepat 10 karakter setelah trim diterima
      const validTen = await adminService.reissueTrackingCode(
        targetAppId,
        { reason: '1234567890' },
        superAdminUser,
      );
      expect(validTen.tracking_code).toBeDefined();

      // Alasan dengan spasi di awal/akhir tapi >= 10 karakter setelah trim diterima
      const validTrimmed = await adminService.reissueTrackingCode(
        targetAppId,
        { reason: '   1234567890   ' },
        superAdminUser,
      );
      expect(validTrimmed.tracking_code).toBeDefined();
    });

    it('3. Validasi: harus menolak ID atau tiket yang tidak terdaftar dengan NotFoundException', async () => {
      await expect(
        adminService.reissueTrackingCode(
          'b9999999-9999-9999-9999-999999999999',
          { reason: 'Permohonan kode pengganti OPD' },
          superAdminUser,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('4. Kriptografi & Hash: harus menghasilkan kode TRK-XXXXXXXX acak dan menyimpan hanya SHA-256 hash', async () => {
      const initialHash = adminService.getInMemoryTrackingCodeHash(targetAppId);
      expect(initialHash).toBeDefined();

      const result = await adminService.reissueTrackingCode(
        targetAppId,
        { reason: 'Verifikasi identitas Kepala Bidang Bapenda selesai' },
        superAdminUser,
      );

      // Kode baru harus berformat TRK-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX (32 digit heksadesimal kapital = 128 bit entropy)
      expect(result.tracking_code).toMatch(/^TRK-[0-9A-F]{32}$/);
      expect(result.application_id).toBe(targetAppId);
      expect(result.ticket_number).toBe(targetTicketNumber);
      expect(result.reissued_at).toBeDefined();
      expect(result.message).toContain('berhasil diterbitkan');

      // Hash di database/memory harus terbarui dan cocok dengan SHA-256 dari kode baru
      const updatedHash = adminService.getInMemoryTrackingCodeHash(targetAppId);
      expect(updatedHash).toBeDefined();
      expect(updatedHash).not.toBe(initialHash);

      const expectedSha256 = crypto
        .createHash('sha256')
        .update(result.tracking_code)
        .digest('hex');
      expect(updatedHash).toBe(expectedSha256);
    });

    it('5. Ketidakberlakuan Kode Lama: kode lama harus batal dan kode baru langsung aktif di TrackingService', async () => {
      const mockConfigService = {
        get: (k: string) => (k === 'jwt.secret' ? 'test-secret-key-for-tracking-service-test' : null),
      } as unknown as ConfigService;
      const tokenService = new TrackingTokenService(mockConfigService);
      const rateLimiter = new TrackingRateLimiter();
      const trackingService = new TrackingService(mockSupabaseService, tokenService, rateLimiter);

      // Kode awal sebelum diterbitkan ulang adalah TRK-A1B2C3D4
      const initialVerification = await trackingService.verifyCredential({
        ticket_number: targetTicketNumber,
        tracking_code: 'TRK-A1B2C3D4',
      });
      expect(initialVerification.tracking_token).toBeDefined();

      // Buat instance service terintegrasi dengan trackingService
      const integratedService = new AdminApplicationsService(
        mockSupabaseService,
        workflowEngine,
        trackingService,
      );

      // Terbitkan ulang kode
      const reissued = await integratedService.reissueTrackingCode(
        targetTicketNumber,
        { reason: 'Surat dinas resmi OPD perihal kehilangan kode pelacakan' },
        superAdminUser,
      );

      expect(reissued.tracking_code).not.toBe('TRK-A1B2C3D4');

      // Percobaan menggunakan kode lama (TRK-A1B2C3D4) SEKARANG HARUS DITOLAK
      await expect(
        trackingService.verifyCredential({
          ticket_number: targetTicketNumber,
          tracking_code: 'TRK-A1B2C3D4',
        }),
      ).rejects.toThrow(UnauthorizedException);

      // Percobaan menggunakan kode baru HARUS BERHASIL
      const newVerification = await trackingService.verifyCredential({
        ticket_number: targetTicketNumber,
        tracking_code: reissued.tracking_code,
      });
      expect(newVerification.tracking_token).toBeDefined();
      expect(newVerification.ticket_number).toBe(targetTicketNumber);
    });

    it('6. Audit Log: harus mencatat petugas, alasan, dan waktu TANPA mencatat kode asli atau hash kode', async () => {
      const recordSpy = vi.fn().mockResolvedValue({ id: 'aud-test-reissue' });
      const mockAuditService = { record: recordSpy } as any;

      const serviceWithAudit = new AdminApplicationsService(
        mockSupabaseService,
        workflowEngine,
        undefined,
        mockAuditService,
      );

      const reason = 'Verifikasi langsung tatap muka dengan pejabat berwenang Diskominfo';
      const reissued = await serviceWithAudit.reissueTrackingCode(
        targetAppId,
        { reason },
        superAdminUser,
      );

      expect(recordSpy).toHaveBeenCalledTimes(1);
      const loggedEntry = recordSpy.mock.calls[0][0];

      // Verifikasi field audit log wajib
      expect(loggedEntry.action).toBe('TRACKING_CODE_REISSUED');
      expect(loggedEntry.entity_type).toBe('applications');
      expect(loggedEntry.entity_id).toBe(targetAppId);
      expect(loggedEntry.actor_profile_id).toBe(superAdminUser.id);
      expect(loggedEntry.new_data.reason).toBe(reason);
      expect(loggedEntry.new_data.ticket_number).toBe(targetTicketNumber);
      expect(loggedEntry.new_data.actor_email).toBe(superAdminUser.email);
      expect(loggedEntry.new_data.actor_role).toBe('SUPER_ADMIN');

      // KEAMANAN KETAT: Jejak audit TIDAK BOLEH memuat kode pelacakan asli atau hash-nya
      const serializedAudit = JSON.stringify(loggedEntry);
      expect(serializedAudit).not.toContain(reissued.tracking_code);
      const newHash = crypto.createHash('sha256').update(reissued.tracking_code).digest('hex');
      expect(serializedAudit).not.toContain(newHash);
    });

    it('7. Preservasi: nomor tiket, dokumen, dan status permohonan harus dipertahankan tanpa membuat duplikat', async () => {
      const beforeDetail = await adminService.getApplicationDetail(targetAppId, superAdminUser);
      const beforeStats = await adminService.getDashboardStats(undefined, superAdminUser);

      await adminService.reissueTrackingCode(
        targetAppId,
        { reason: 'Permohonan penggantian kode resmi diverifikasi' },
        superAdminUser,
      );

      const afterDetail = await adminService.getApplicationDetail(targetAppId, superAdminUser);
      const afterStats = await adminService.getDashboardStats(undefined, superAdminUser);

      // Data kunci harus tetap utuh
      expect(afterDetail.id).toBe(beforeDetail.id);
      expect(afterDetail.ticket_number).toBe(beforeDetail.ticket_number);
      expect(afterDetail.current_status).toBe(beforeDetail.current_status);
      expect(afterDetail.current_stage).toBe(beforeDetail.current_stage);
      expect(afterDetail.title).toBe(beforeDetail.title);
      expect(afterDetail.service).toEqual(beforeDetail.service);
      expect(afterDetail.applicant).toEqual(beforeDetail.applicant);
      expect(afterDetail.documents).toEqual(beforeDetail.documents);

      // Jumlah total permohonan tidak bertambah (tidak ada permohonan baru dibuat)
      expect(afterStats.total_applications).toBe(beforeStats.total_applications);
    });

    it('8. Controller: endpoint POST /api/v1/admin/applications/:id/reissue-tracking-code berfungsi sesuai spesifikasi', async () => {
      const controller = new AdminApplicationsController(adminService);
      const res = await controller.reissueTrackingCode(
        targetAppId,
        { reason: 'Panggilan resmi dari Sekretaris Dinas Bapenda telah diverifikasi' },
        { user: superAdminUser } as any,
      );

      expect(res.success).toBe(true);
      expect(res.data.application_id).toBe(targetAppId);
      expect(res.data.ticket_number).toBe(targetTicketNumber);
      expect(res.data.tracking_code).toMatch(/^TRK-[0-9A-F]{32}$/);
      expect(res.message).toBeDefined();
    });

    it('9. Jalur RPC Tidak Tersedia (Metode rpc tidak didukung klien): harus menolak seketika dan tidak melakukan pembaruan hash alternatif', async () => {
      let updateAttempted = false;
      const initialDbHash = crypto.createHash('sha256').update('TRK-A1B2C3D4').digest('hex');

      const mockNoRpcDbService = {
        getClient: () => ({
          from: (table: string) => ({
            select: () => ({
              maybeSingle: async () => ({
                data: {
                  id: targetAppId,
                  ticket_number: targetTicketNumber,
                  tracking_code_hash: initialDbHash,
                  current_status: 'SUBMITTED',
                },
                error: null,
              }),
            }),
            update: () => {
              if (table === 'applications') {
                updateAttempted = true;
              }
              return { eq: async () => ({ error: null }) };
            },
          }),
          // Klien tidak memiliki fungsi rpc (rpc is undefined)
        }),
      } as any;

      const mockConfigService = {
        get: (k: string) => (k === 'jwt.secret' ? 'test-secret-key-for-tracking-service-test' : null),
      } as unknown as ConfigService;
      const tokenService = new TrackingTokenService(mockConfigService);
      const rateLimiter = new TrackingRateLimiter();
      const trackingService = new TrackingService(mockSupabaseService, tokenService, rateLimiter);

      const serviceWithNoRpc = new AdminApplicationsService(
        mockNoRpcDbService,
        workflowEngine,
        trackingService,
      );

      // Harus menolak dengan InternalServerErrorException yang jelas
      await expect(
        serviceWithNoRpc.reissueTrackingCode(
          targetAppId,
          { reason: 'Permohonan kode resmi terverifikasi' },
          superAdminUser,
        ),
      ).rejects.toThrow(InternalServerErrorException);

      // Pastikan TIDAK ADA pembaruan hash melalui jalur alternatif
      expect(updateAttempted).toBe(false);

      // Kredensial lama HARUS TETAP BERLAKU
      const oldCheck = await trackingService.verifyCredential({
        ticket_number: targetTicketNumber,
        tracking_code: 'TRK-A1B2C3D4',
      });
      expect(oldCheck.tracking_token).toBeDefined();
    });

    it('10. Jalur RPC Tidak Tersedia (Fungsi PostgreSQL belum dimigrasi / 404): harus menghentikan operasi seketika dan tidak melakukan update hash alternatif', async () => {
      let updateAttempted = false;
      const initialDbHash = crypto.createHash('sha256').update('TRK-A1B2C3D4').digest('hex');

      const rpcMissingSpy = vi.fn().mockResolvedValue({
        data: null,
        error: {
          code: 'PGRST202',
          message: 'Could not find the function public.reissue_tracking_code_atomic in schema cache',
        },
      });

      const mockMissingRpcDbService = {
        getClient: () => ({
          from: (table: string) => ({
            select: () => ({
              maybeSingle: async () => ({
                data: {
                  id: targetAppId,
                  ticket_number: targetTicketNumber,
                  tracking_code_hash: initialDbHash,
                  current_status: 'SUBMITTED',
                },
                error: null,
              }),
            }),
            update: () => {
              if (table === 'applications') {
                updateAttempted = true;
              }
              return { eq: async () => ({ error: null }) };
            },
          }),
          rpc: rpcMissingSpy,
        }),
      } as any;

      const mockConfigService = {
        get: (k: string) => (k === 'jwt.secret' ? 'test-secret-key-for-tracking-service-test' : null),
      } as unknown as ConfigService;
      const tokenService = new TrackingTokenService(mockConfigService);
      const rateLimiter = new TrackingRateLimiter();
      const trackingService = new TrackingService(mockSupabaseService, tokenService, rateLimiter);

      const serviceWithMissingRpc = new AdminApplicationsService(
        mockMissingRpcDbService,
        workflowEngine,
        trackingService,
      );

      // Operasi harus dibatalkan seketika dengan pesan kegagalan jelas
      await expect(
        serviceWithMissingRpc.reissueTrackingCode(
          targetAppId,
          { reason: 'Permohonan kode baru oleh pejabat berwenang OPD' },
          superAdminUser,
        ),
      ).rejects.toThrow(InternalServerErrorException);

      // Verifikasi RPC dipanggil dan gagal
      expect(rpcMissingSpy).toHaveBeenCalledTimes(1);

      // Verifikasi TIDAK ADA update hash alternatif pada tabel applications
      expect(updateAttempted).toBe(false);

      // Kode lama HARUS TETAP BERLAKU
      const oldCheck = await trackingService.verifyCredential({
        ticket_number: targetTicketNumber,
        tracking_code: 'TRK-A1B2C3D4',
      });
      expect(oldCheck.tracking_token).toBeDefined();
    });

    it('11. Transaksi Atomik PostgreSQL RPC: harus memproses pembaruan hash dan audit log dalam satu panggilan RPC tunggal', async () => {
      const rpcSpy = vi.fn().mockResolvedValue({
        data: { application_id: targetAppId, audit_id: 'aud-atomic-1' },
        error: null,
      });

      const mockRpcDbService = {
        getClient: () => ({
          from: () => ({
            select: () => ({
              maybeSingle: async () => ({
                data: {
                  id: targetAppId,
                  ticket_number: targetTicketNumber,
                  tracking_code_hash: crypto.createHash('sha256').update('TRK-A1B2C3D4').digest('hex'),
                  current_status: 'SUBMITTED',
                },
                error: null,
              }),
            }),
          }),
          rpc: rpcSpy,
        }),
      } as any;

      const mockConfigService = {
        get: (k: string) => (k === 'jwt.secret' ? 'test-secret-key-for-tracking-service-test' : null),
      } as unknown as ConfigService;
      const tokenService = new TrackingTokenService(mockConfigService);
      const rateLimiter = new TrackingRateLimiter();
      const trackingService = new TrackingService(mockSupabaseService, tokenService, rateLimiter);

      const serviceWithRpc = new AdminApplicationsService(
        mockRpcDbService,
        workflowEngine,
        trackingService,
      );

      const res = await serviceWithRpc.reissueTrackingCode(
        targetAppId,
        { reason: 'Permohonan kode pengganti resmi via surat dinas OPD' },
        superAdminUser,
      );

      // Pastikan fungsi RPC dipanggil tepat 1 kali dengan parameter yang sesuai
      expect(rpcSpy).toHaveBeenCalledTimes(1);
      const rpcCall = rpcSpy.mock.calls[0];
      expect(rpcCall[0]).toBe('reissue_tracking_code_atomic');
      expect(rpcCall[1].p_application_id).toBe(targetAppId);
      expect(rpcCall[1].p_ticket_number).toBe(targetTicketNumber);
      expect(rpcCall[1].p_actor_profile_id).toBe(superAdminUser.id);
      expect(rpcCall[1].p_reason).toBe('Permohonan kode pengganti resmi via surat dinas OPD');
      expect(rpcCall[1].p_new_hash).toBe(crypto.createHash('sha256').update(res.tracking_code).digest('hex'));

      // Kode baru harus berlaku di tracking service
      const verifyNew = await trackingService.verifyCredential({
        ticket_number: targetTicketNumber,
        tracking_code: res.tracking_code,
      });
      expect(verifyNew.tracking_token).toBeDefined();
    });

    it('12. Kegagalan Transaksi Atomik RPC: jika fungsi RPC gagal di database, seluruh transaksi dibatalkan dan kode lama tetap berlaku', async () => {
      let updateAttempted = false;
      const rpcFailingSpy = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'relation constraint violation or deadlocked transaction' },
      });

      const mockRpcFailingDbService = {
        getClient: () => ({
          from: (table: string) => ({
            select: () => ({
              maybeSingle: async () => ({
                data: {
                  id: targetAppId,
                  ticket_number: targetTicketNumber,
                  tracking_code_hash: crypto.createHash('sha256').update('TRK-A1B2C3D4').digest('hex'),
                  current_status: 'SUBMITTED',
                },
                error: null,
              }),
            }),
            update: () => {
              if (table === 'applications') {
                updateAttempted = true;
              }
              return { eq: async () => ({ error: null }) };
            },
          }),
          rpc: rpcFailingSpy,
        }),
      } as any;

      const mockConfigService = {
        get: (k: string) => (k === 'jwt.secret' ? 'test-secret-key-for-tracking-service-test' : null),
      } as unknown as ConfigService;
      const tokenService = new TrackingTokenService(mockConfigService);
      const rateLimiter = new TrackingRateLimiter();
      const trackingService = new TrackingService(mockSupabaseService, tokenService, rateLimiter);

      const serviceWithFailingRpc = new AdminApplicationsService(
        mockRpcFailingDbService,
        workflowEngine,
        trackingService,
      );

      await expect(
        serviceWithFailingRpc.reissueTrackingCode(
          targetAppId,
          { reason: 'Permintaan kode baru terverifikasi' },
          superAdminUser,
        ),
      ).rejects.toThrow(InternalServerErrorException);

      // Tidak ada pembaruan hash melalui update alternatif
      expect(updateAttempted).toBe(false);

      // Kredensial lama tetap berlaku karena RPC transaction di-rollback di tingkat database
      const oldCheck = await trackingService.verifyCredential({
        ticket_number: targetTicketNumber,
        tracking_code: 'TRK-A1B2C3D4',
      });
      expect(oldCheck.tracking_token).toBeDefined();
    });

    it('13. Penolakan Akses Langsung oleh Role Tidak Berwenang: validasi backend menolak keras role selain SUPER_ADMIN', async () => {
      // 1. Role TECHNICIAN ditolak
      await expect(
        adminService.reissueTrackingCode(
          targetAppId,
          { reason: 'Mencoba menerbitkan ulang kode pelacakan' },
          technicianUser,
        ),
      ).rejects.toThrow(ForbiddenException);

      // 2. Role non-Superadmin lainnya ditolak
      const unauthorizedUser: AuthenticatedUser = {
        id: 'u-unauthorized',
        email: 'user@example.com',
        role: 'APPLICANT' as any,
        fullName: 'Unauthorized User',
      };

      await expect(
        adminService.reissueTrackingCode(
          targetAppId,
          { reason: 'Akses tanpa izin Superadmin' },
          unauthorizedUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('14. Validasi Status Terminal: harus menolak penerbitan ulang untuk permohonan berstatus terminal dan memastikan RPC tidak dipanggil', async () => {
      const terminalStatuses: ApplicationStatus[] = ['COMPLETED', 'CLOSED', 'REJECTED', 'CANCELLED'];

      for (const terminalStatus of terminalStatuses) {
        const rpcSpy = vi.fn().mockResolvedValue({
          data: { application_id: targetAppId, audit_id: 'mock-audit-id' },
          error: null,
        });

        const mockDb = {
          getClient: () => ({
            from: () => {
              const queryBuilder: any = {
                eq: () => queryBuilder,
                ilike: () => queryBuilder,
                maybeSingle: async () => ({
                  data: {
                    id: targetAppId,
                    ticket_number: targetTicketNumber,
                    tracking_code_hash: crypto.createHash('sha256').update('TRK-A1B2C3D4').digest('hex'),
                    current_status: terminalStatus,
                  },
                  error: null,
                }),
              };
              return {
                select: () => queryBuilder,
              };
            },
            rpc: rpcSpy,
          }),
        } as any;

        const mockConfigService = {
          get: (k: string) => (k === 'jwt.secret' ? 'test-secret-key-for-tracking-service-test' : null),
        } as unknown as ConfigService;
        const tokenService = new TrackingTokenService(mockConfigService);
        const rateLimiter = new TrackingRateLimiter();
        const trackingService = new TrackingService(mockDb, tokenService, rateLimiter);

        const service = new AdminApplicationsService(
          mockDb,
          workflowEngine,
          trackingService,
        );

        await expect(
          service.reissueTrackingCode(
            targetAppId,
            { reason: 'Permohonan kode tiket yang statusnya terminal' },
            superAdminUser,
          ),
        ).rejects.toThrow(
          new BadRequestException(
            `Kode pelacakan tidak dapat diterbitkan ulang untuk permohonan dengan nomor tiket [${targetTicketNumber}] karena telah berstatus terminal [${terminalStatus}].`,
          ),
        );

        // Pastikan RPC sama sekali TIDAK dipanggil ketika berstatus terminal
        expect(rpcSpy).not.toHaveBeenCalled();
      }

      // Pengujian penolakan status terminal pada fallback in-memory records
      const initialSeedRecord = (adminService as any).inMemoryRecords.get(targetAppId);
      expect(initialSeedRecord).toBeDefined();

      for (const terminalStatus of terminalStatuses) {
        if (initialSeedRecord) {
          initialSeedRecord.detail.current_status = terminalStatus;
        }

        await expect(
          adminService.reissueTrackingCode(
            targetAppId,
            { reason: 'Alasan penerbitan ulang terverifikasi resmi' },
            superAdminUser,
          ),
        ).rejects.toThrow(
          new BadRequestException(
            `Kode pelacakan tidak dapat diterbitkan ulang untuk permohonan dengan nomor tiket [${targetTicketNumber}] karena telah berstatus terminal [${terminalStatus}].`,
          ),
        );
      }

      // Kembalikan status in-memory record ke SUBMITTED
      if (initialSeedRecord) {
        initialSeedRecord.detail.current_status = 'SUBMITTED';
      }
    });

    it('15. Validasi Status Tidak Tersedia dan Tidak Dikenal: harus menolak jika status kosong/tidak tersedia atau tidak dikenal, serta memastikan RPC tidak dipanggil', async () => {
      // 1. Status kosong / tidak tersedia (null / undefined / '')
      const missingStatuses = [null, undefined, ''];

      for (const missingStatus of missingStatuses) {
        const rpcSpy = vi.fn().mockResolvedValue({
          data: { application_id: targetAppId, audit_id: 'mock-audit-id' },
          error: null,
        });

        const mockDb = {
          getClient: () => ({
            from: () => {
              const queryBuilder: any = {
                eq: () => queryBuilder,
                ilike: () => queryBuilder,
                maybeSingle: async () => ({
                  data: {
                    id: targetAppId,
                    ticket_number: targetTicketNumber,
                    tracking_code_hash: crypto.createHash('sha256').update('TRK-A1B2C3D4').digest('hex'),
                    current_status: missingStatus,
                  },
                  error: null,
                }),
              };
              return {
                select: () => queryBuilder,
              };
            },
            rpc: rpcSpy,
          }),
        } as any;

        const mockConfigService = {
          get: (k: string) => (k === 'jwt.secret' ? 'test-secret-key-for-tracking-service-test' : null),
        } as unknown as ConfigService;
        const tokenService = new TrackingTokenService(mockConfigService);
        const rateLimiter = new TrackingRateLimiter();
        const trackingService = new TrackingService(mockDb, tokenService, rateLimiter);

        const service = new AdminApplicationsService(
          mockDb,
          workflowEngine,
          trackingService,
        );

        await expect(
          service.reissueTrackingCode(
            targetAppId,
            { reason: 'Permohonan kode tiket tanpa status' },
            superAdminUser,
          ),
        ).rejects.toThrow(
          new BadRequestException(
            `Status permohonan dengan nomor tiket [${targetTicketNumber}] tidak tersedia atau tidak dapat dibaca.`,
          ),
        );

        // Pastikan RPC sama sekali TIDAK dipanggil saat status tidak tersedia
        expect(rpcSpy).not.toHaveBeenCalled();
      }

      // 2. Status tidak dikenal / tidak valid (misal: 'UNKNOWN', 'INVALID_STATUS', 'DRAFT')
      const unknownStatuses = ['UNKNOWN', 'INVALID_STATUS', 'DRAFT', 'ARCHIVED'];

      for (const unknownStatus of unknownStatuses) {
        const rpcSpy = vi.fn().mockResolvedValue({
          data: { application_id: targetAppId, audit_id: 'mock-audit-id' },
          error: null,
        });

        const mockDb = {
          getClient: () => ({
            from: () => {
              const queryBuilder: any = {
                eq: () => queryBuilder,
                ilike: () => queryBuilder,
                maybeSingle: async () => ({
                  data: {
                    id: targetAppId,
                    ticket_number: targetTicketNumber,
                    tracking_code_hash: crypto.createHash('sha256').update('TRK-A1B2C3D4').digest('hex'),
                    current_status: unknownStatus,
                  },
                  error: null,
                }),
              };
              return {
                select: () => queryBuilder,
              };
            },
            rpc: rpcSpy,
          }),
        } as any;

        const mockConfigService = {
          get: (k: string) => (k === 'jwt.secret' ? 'test-secret-key-for-tracking-service-test' : null),
        } as unknown as ConfigService;
        const tokenService = new TrackingTokenService(mockConfigService);
        const rateLimiter = new TrackingRateLimiter();
        const trackingService = new TrackingService(mockDb, tokenService, rateLimiter);

        const service = new AdminApplicationsService(
          mockDb,
          workflowEngine,
          trackingService,
        );

        await expect(
          service.reissueTrackingCode(
            targetAppId,
            { reason: 'Permohonan kode tiket dengan status tidak valid' },
            superAdminUser,
          ),
        ).rejects.toThrow(
          new BadRequestException(
            `Status permohonan [${unknownStatus}] dengan nomor tiket [${targetTicketNumber}] tidak dikenal atau tidak valid dalam alur kerja SIMANTIK.`,
          ),
        );

        // Pastikan RPC sama sekali TIDAK dipanggil saat status tidak dikenal
        expect(rpcSpy).not.toHaveBeenCalled();
      }

      // 3. Verifikasi seluruh status non-terminal yang valid berhasil diproses
      const validNonTerminalStatuses: ApplicationStatus[] = [
        'SUBMITTED',
        'VERIFICATION',
        'REVISION_REQUIRED',
        'APPROVED',
        'IN_PROGRESS',
      ];

      for (const validStatus of validNonTerminalStatuses) {
        const rpcSpy = vi.fn().mockResolvedValue({
          data: { application_id: targetAppId, audit_id: 'mock-audit-id' },
          error: null,
        });

        const mockDb = {
          getClient: () => ({
            from: () => {
              const queryBuilder: any = {
                eq: () => queryBuilder,
                ilike: () => queryBuilder,
                maybeSingle: async () => ({
                  data: {
                    id: targetAppId,
                    ticket_number: targetTicketNumber,
                    tracking_code_hash: crypto.createHash('sha256').update('TRK-A1B2C3D4').digest('hex'),
                    current_status: validStatus,
                  },
                  error: null,
                }),
              };
              return {
                select: () => queryBuilder,
              };
            },
            rpc: rpcSpy,
          }),
        } as any;

        const mockConfigService = {
          get: (k: string) => (k === 'jwt.secret' ? 'test-secret-key-for-tracking-service-test' : null),
        } as unknown as ConfigService;
        const tokenService = new TrackingTokenService(mockConfigService);
        const rateLimiter = new TrackingRateLimiter();
        const trackingService = new TrackingService(mockDb, tokenService, rateLimiter);

        const service = new AdminApplicationsService(
          mockDb,
          workflowEngine,
          trackingService,
        );

        const res = await service.reissueTrackingCode(
          targetAppId,
          { reason: `Permohonan kode tiket status valid ${validStatus}` },
          superAdminUser,
        );

        expect(res.tracking_code).toBeDefined();
        expect(rpcSpy).toHaveBeenCalledTimes(1);
      }
    });
  });
});
