import { describe, expect, it, beforeEach } from 'vitest';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { WorkflowEngine } from './workflow/workflow.engine.js';
import { AdminApplicationsService } from './admin-applications.service.js';
import { AdminApplicationsController } from './admin-applications.controller.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';

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
});
