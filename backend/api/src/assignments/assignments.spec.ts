import { beforeEach, describe, expect, it } from 'vitest';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../auth/roles.guard.js';
import { AssignmentsService } from './assignments.service.js';
import { AdminAssignmentsController } from './admin-assignments.controller.js';
import { AdminApplicationsService } from '../applications/admin-applications.service.js';
import { WorkflowEngine } from '../applications/workflow/workflow.engine.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';

describe('Assignments & Technician Workspace', () => {
  let assignmentsService: AssignmentsService;
  let adminAppsService: AdminApplicationsService;
  let workflowEngine: WorkflowEngine;
  let adminAssignmentsController: AdminAssignmentsController;

  const superAdminUser: AuthenticatedUser = {
    id: 'u-admin-1',
    email: 'admin.aptika@bandungkab.go.id',
    role: 'SUPER_ADMIN',
    fullName: 'Budi Santoso, S.Kom (Super Admin)',
  };

  const technician1User: AuthenticatedUser = {
    id: 't1111111-1111-1111-1111-111111111111',
    email: 'ahmad.fauzi@bandungkab.go.id',
    role: 'TECHNICIAN',
    fullName: 'Ahmad Fauzi, S.Kom',
  };

  const technician2User: AuthenticatedUser = {
    id: 't2222222-2222-2222-2222-222222222222',
    email: 'siti.rahmawati@bandungkab.go.id',
    role: 'TECHNICIAN',
    fullName: 'Siti Rahmawati, S.Tr.Kom',
  };

  const mockSupabase = {
    getClient: () => ({
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: null, error: new Error('Fallback') }),
            order: async () => ({ data: null, error: new Error('Fallback') }),
          }),
        }),
        insert: async () => ({ error: null }),
        update: () => ({ eq: async () => ({ error: null }) }),
      }),
    }),
  } as any;

  beforeEach(() => {
    workflowEngine = new WorkflowEngine();
    adminAppsService = new AdminApplicationsService(mockSupabase, workflowEngine);
    assignmentsService = new AssignmentsService(mockSupabase, adminAppsService);
    adminAssignmentsController = new AdminAssignmentsController(assignmentsService);
  });

  describe('1. Technician Listing & Profiles', () => {
    it('should list active technicians with workload metrics', async () => {
      const technicians = await assignmentsService.listTechnicians();
      expect(technicians.length).toBeGreaterThan(0);
      expect(technicians.every((t) => t.role === 'TECHNICIAN')).toBe(true);
      expect(technicians.some((t) => t.id === technician1User.id)).toBe(true);
    });
  });

  describe('2. Assignment & Single Current Constraint', () => {
    it('should assign a primary technician to an application', async () => {
      const appId = 'a1000000-0000-0000-0000-000000000001';
      const result = await assignmentsService.assignTechnician(
        appId,
        {
          technician_id: technician2User.id,
          note: 'Penugasan teknis pengembangan modul',
        },
        superAdminUser,
      );

      expect(result.technician_id).toBe(technician2User.id);
      expect(result.is_current).toBe(true);
      expect(result.note).toBe('Penugasan teknis pengembangan modul');

      const appAssignments = await assignmentsService.getApplicationAssignments(appId);
      expect(appAssignments.current_assignment?.technician_id).toBe(technician2User.id);
      expect(appAssignments.current_assignment?.is_current).toBe(true);
    });

    it('should enforce at most ONE current assignment per application upon re-assignment', async () => {
      const appId = 'a1000000-0000-0000-0000-000000000001';

      await assignmentsService.assignTechnician(
        appId,
        { technician_id: technician1User.id, note: 'Tugas pertama' },
        superAdminUser,
      );

      await assignmentsService.assignTechnician(
        appId,
        { technician_id: technician2User.id, note: 'Pengalihan tugas kedua' },
        superAdminUser,
      );

      const appAssignments = await assignmentsService.getApplicationAssignments(appId);

      expect(appAssignments.current_assignment?.technician_id).toBe(technician2User.id);
      expect(appAssignments.current_assignment?.is_current).toBe(true);

      const archived = appAssignments.assignment_history.filter((a) => !a.is_current);
      expect(archived.length).toBeGreaterThanOrEqual(1);
      expect(archived[0].unassigned_at).toBeDefined();

      const currentList = appAssignments.assignment_history.filter((a) => a.is_current);
      expect(currentList.length).toBe(1);
    });

    it('should reject assigning non-existent technician', async () => {
      const appId = 'a1000000-0000-0000-0000-000000000001';
      await expect(
        assignmentsService.assignTechnician(
          appId,
          { technician_id: 'non-existent-tech-id' },
          superAdminUser,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject assignment by non-admin role', async () => {
      const appId = 'a1000000-0000-0000-0000-000000000001';
      await expect(
        assignmentsService.assignTechnician(
          appId,
          { technician_id: technician1User.id },
          technician1User,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('3. Technician Workspace & Workload Summary', () => {
    it('should calculate workload summary for assigned technician', async () => {
      const appId = 'a1000000-0000-0000-0000-000000000001';
      await assignmentsService.assignTechnician(
        appId,
        { technician_id: technician1User.id },
        superAdminUser,
      );

      const summary = await assignmentsService.getTechnicianWorkSummary(technician1User.id);
      expect(summary.total_assigned).toBeGreaterThanOrEqual(1);
    });

    it('should list assigned applications in technician My Work', async () => {
      const appId = 'a1000000-0000-0000-0000-000000000001';
      await assignmentsService.assignTechnician(
        appId,
        { technician_id: technician1User.id },
        superAdminUser,
      );

      const work = await assignmentsService.getTechnicianMyWork(technician1User.id, { page: 1 });
      expect(work.items.some((i) => i.id === appId)).toBe(true);
    });
  });

  describe('4. Backend Authorization Enforcement for Technicians', () => {
    it('should forbid Technician 2 from accessing application assigned to Technician 1', async () => {
      const appId = 'a1000000-0000-0000-0000-000000000001';
      await assignmentsService.assignTechnician(
        appId,
        { technician_id: technician1User.id },
        superAdminUser,
      );

      await expect(
        assignmentsService.getTechnicianApplicationDetail(appId, technician2User),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        assignmentsService.executeTechnicianTransition(
          appId,
          { target_status: 'IN_PROGRESS' },
          technician2User,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow assigned Technician 1 to access detail and execute permitted transitions', async () => {
      const appId = 'a1000000-0000-0000-0000-000000000001';

      await adminAppsService.executeTransition(appId, { target_status: 'VERIFICATION' }, superAdminUser);
      await adminAppsService.executeTransition(appId, { target_status: 'APPROVED' }, superAdminUser);

      await assignmentsService.assignTechnician(
        appId,
        { technician_id: technician1User.id },
        superAdminUser,
      );

      const detail = await assignmentsService.getTechnicianApplicationDetail(appId, technician1User);
      expect(detail.id).toBe(appId);

      const inProgressApp = await assignmentsService.executeTechnicianTransition(
        appId,
        { target_status: 'IN_PROGRESS', note: 'Mulai pengerjaan teknis modul' },
        technician1User,
      );
      expect(inProgressApp.current_status).toBe('IN_PROGRESS');

      const completedApp = await assignmentsService.executeTechnicianTransition(
        appId,
        { target_status: 'COMPLETED', note: 'Seluruh pengujian integrasi lulus' },
        technician1User,
      );
      expect(completedApp.current_status).toBe('COMPLETED');
    });
  });

  describe('5. RBAC & Endpoint Protections for Assignments (Phase 20)', () => {
    const appId = 'a1000000-0000-0000-0000-000000000001';

    it('allows SUPER_ADMIN to read assignments for any application', async () => {
      const res = await adminAssignmentsController.getApplicationAssignments(
        appId,
        { user: superAdminUser } as any,
      );
      expect(res.success).toBe(true);
      expect(res.data).toBeDefined();
    });

    it('allows assigned TECHNICIAN to read assignments for their assigned application', async () => {
      await assignmentsService.assignTechnician(
        appId,
        { technician_id: technician1User.id, note: 'Tugas teknisi 1' },
        superAdminUser,
      );

      const res = await adminAssignmentsController.getApplicationAssignments(
        appId,
        { user: technician1User } as any,
      );
      expect(res.success).toBe(true);
      expect(res.data.current_assignment?.technician_id).toBe(technician1User.id);
    });

    it('rejects unassigned TECHNICIAN with 403 Forbidden', async () => {
      await assignmentsService.assignTechnician(
        appId,
        { technician_id: technician1User.id, note: 'Tugas teknisi 1' },
        superAdminUser,
      );

      await expect(
        adminAssignmentsController.getApplicationAssignments(
          appId,
          { user: technician2User } as any,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('verifies RolesGuard allows TECHNICIAN on getApplicationAssignments but blocks other admin endpoints', () => {
      const reflector = new Reflector();
      const guard = new RolesGuard(reflector);

      const getAssignmentsContext = {
        getHandler: () => adminAssignmentsController.getApplicationAssignments,
        getClass: () => AdminAssignmentsController,
        switchToHttp: () => ({
          getRequest: () => ({
            user: technician1User,
          }),
        }),
      };
      expect(guard.canActivate(getAssignmentsContext as any)).toBe(true);

      const listTechsContext = {
        getHandler: () => adminAssignmentsController.listTechnicians,
        getClass: () => AdminAssignmentsController,
        switchToHttp: () => ({
          getRequest: () => ({
            user: technician1User,
          }),
        }),
      };
      expect(() => guard.canActivate(listTechsContext as any)).toThrow(ForbiddenException);

      const assignTechContext = {
        getHandler: () => adminAssignmentsController.assignTechnician,
        getClass: () => AdminAssignmentsController,
        switchToHttp: () => ({
          getRequest: () => ({
            user: technician1User,
          }),
        }),
      };
      expect(() => guard.canActivate(assignTechContext as any)).toThrow(ForbiddenException);
    });
  });

  describe('4. Workload Calculation & Terminal Status Invariance (Bugfix Regression)', () => {
    const appId = 'a1000000-0000-0000-0000-000000000001';

    it('decreases active workload to 0 when application transitions to COMPLETED, while preserving assignment history', async () => {
      await assignmentsService.assignTechnician(
        appId,
        { technician_id: technician1User.id, note: 'Tugas implementasi sistem' },
        superAdminUser,
      );

      let technicians = await assignmentsService.listTechnicians();
      let tech1 = technicians.find((t) => t.id === technician1User.id);
      expect(tech1?.active_assignments_count).toBe(1);

      await adminAppsService.executeTransition(
        appId,
        { target_status: 'VERIFICATION', note: 'Verifikasi berkas' },
        superAdminUser,
      );
      await adminAppsService.executeTransition(
        appId,
        { target_status: 'APPROVED', note: 'Disetujui untuk dikerjakan' },
        superAdminUser,
      );
      await adminAppsService.executeTransition(
        appId,
        { target_status: 'IN_PROGRESS', note: 'Mulai koding' },
        superAdminUser,
      );

      technicians = await assignmentsService.listTechnicians();
      tech1 = technicians.find((t) => t.id === technician1User.id);
      expect(tech1?.active_assignments_count).toBe(1);

      await adminAppsService.executeTransition(
        appId,
        { target_status: 'COMPLETED', note: 'Pekerjaan selesai lolos uji kelaikan' },
        superAdminUser,
      );

      technicians = await assignmentsService.listTechnicians();
      tech1 = technicians.find((t) => t.id === technician1User.id);
      expect(tech1?.active_assignments_count).toBe(0);

      const appAssignments = await assignmentsService.getApplicationAssignments(appId);
      expect(appAssignments.current_assignment?.technician_id).toBe(technician1User.id);
      expect(appAssignments.current_assignment?.is_current).toBe(true);
      expect(appAssignments.assignment_history.length).toBeGreaterThanOrEqual(1);

      await adminAppsService.executeTransition(
        appId,
        { target_status: 'CLOSED', note: 'Tiket ditutup resmi' },
        superAdminUser,
      );
      technicians = await assignmentsService.listTechnicians();
      tech1 = technicians.find((t) => t.id === technician1User.id);
      expect(tech1?.active_assignments_count).toBe(0);
    });

    it('rejects assigning technician to a COMPLETED or CLOSED application', async () => {
      await adminAppsService.executeTransition(
        appId,
        { target_status: 'VERIFICATION', note: 'Verifikasi' },
        superAdminUser,
      );
      await adminAppsService.executeTransition(
        appId,
        { target_status: 'APPROVED', note: 'Disetujui' },
        superAdminUser,
      );
      await adminAppsService.executeTransition(
        appId,
        { target_status: 'IN_PROGRESS', note: 'Mulai' },
        superAdminUser,
      );
      await adminAppsService.executeTransition(
        appId,
        { target_status: 'COMPLETED', note: 'Selesai' },
        superAdminUser,
      );

      await expect(
        assignmentsService.assignTechnician(
          appId,
          { technician_id: technician2User.id, note: 'Tugas baru tidak valid pada tiket selesai' },
          superAdminUser,
        ),
      ).rejects.toThrow(BadRequestException);

      await adminAppsService.executeTransition(
        appId,
        { target_status: 'CLOSED', note: 'Ditutup' },
        superAdminUser,
      );

      await expect(
        assignmentsService.assignTechnician(
          appId,
          { technician_id: technician2User.id, note: 'Tugas baru tidak valid pada tiket ditutup' },
          superAdminUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('5. Technician Workspace ("Pekerjaan Saya") Filtering & Summary Invariance (Bugfix Regression)', () => {
    const createMockApp = (
      id: string,
      ticketNumber: string,
      status: any,
      stage: any = null,
    ) => {
      const now = new Date().toISOString();
      return {
        id,
        ticket_number: ticketNumber,
        title: `Aplikasi ${ticketNumber}`,
        background: 'Latar belakang pengujian',
        problem_statement: 'Permasalahan',
        objective: 'Tujuan',
        scope: 'Ruang lingkup',
        expected_output: 'Hasil',
        existing_application_name: null,
        requested_deadline: '2026-12-31',
        additional_notes: null,
        terms_accepted_at: now,
        terms_version: 'v1.0-2026',
        submitted_at: now,
        current_status: status,
        current_stage: stage,
        service: {
          id: 'srv-test-1',
          code: 'LAY-APP-01',
          name: 'Layanan Uji Coba',
          type: 'DEVELOPMENT' as const,
          description: 'Deskripsi',
        },
        applicant: {
          id: 'ap-test-1',
          full_name: 'Pemohon Uji Coba',
          employee_id: '198501012010011001',
          position: 'Staff',
          email: 'pemohon@bandungkab.go.id',
          phone: '081234567890',
          opd_unit_id: 'opd-test-1',
          opd_name: 'Dinas Komunikasi dan Informatika',
          opd_code: 'DISKOMINFO',
        },
        documents: [],
        status_history: [],
        stage_history: [],
        internal_notes: [],
        audit_logs: [],
      };
    };

    beforeEach(() => {
      (assignmentsService as any).inMemoryAssignments.delete('a1000000-0000-0000-0000-000000000001');
      adminAppsService.unassignTechniciansInMemory('a1000000-0000-0000-0000-000000000001');

      const apps = (adminAppsService as any).inMemoryRecords;
      apps.set('app-approved', { detail: createMockApp('app-approved', 'SIM-2026-111111', 'APPROVED', 'ANALYSIS') });
      apps.set('app-inprogress', { detail: createMockApp('app-inprogress', 'SIM-2026-222222', 'IN_PROGRESS', 'IMPLEMENTATION') });
      apps.set('app-completed', { detail: createMockApp('app-completed', 'SIM-2026-333333', 'COMPLETED', 'EVALUATION') });
      apps.set('app-closed', { detail: createMockApp('app-closed', 'SIM-2026-444444', 'CLOSED', 'EVALUATION') });
      apps.set('app-rejected', { detail: createMockApp('app-rejected', 'SIM-2026-555555', 'REJECTED', null) });
      apps.set('app-cancelled', { detail: createMockApp('app-cancelled', 'SIM-2026-666666', 'CANCELLED', null) });

      for (const id of ['app-approved', 'app-inprogress', 'app-completed', 'app-closed', 'app-rejected', 'app-cancelled']) {
        adminAppsService.assignTechnicianInMemory(id, technician1User.id);
        (assignmentsService as any).inMemoryAssignments.set(id, [
          {
            id: `assign-${id}`,
            application_id: id,
            technician_id: technician1User.id,
            technician_name: technician1User.fullName,
            technician_email: technician1User.email,
            assigned_by_id: superAdminUser.id,
            assigned_by_name: superAdminUser.fullName,
            note: 'Tugas UAT',
            assigned_at: new Date().toISOString(),
            unassigned_at: null,
            is_current: true,
          },
        ]);
      }
    });

    it('excludes terminal tickets (CLOSED, COMPLETED, REJECTED, CANCELLED) from Pekerjaan Saya and retains active tickets', async () => {
      const work = await assignmentsService.getTechnicianMyWork(technician1User.id, { page: 1, page_size: 10 });

      expect(work.total).toBe(2);
      expect(work.items.length).toBe(2);

      const ticketNumbers = work.items.map((i) => i.ticket_number);
      expect(ticketNumbers).toContain('SIM-2026-111111');
      expect(ticketNumbers).toContain('SIM-2026-222222');

      expect(ticketNumbers).not.toContain('SIM-2026-333333');
      expect(ticketNumbers).not.toContain('SIM-2026-444444');
      expect(ticketNumbers).not.toContain('SIM-2026-555555');
      expect(ticketNumbers).not.toContain('SIM-2026-666666');
    });

    it('ensures getTechnicianWorkSummary is consistent with active work items', async () => {
      const summary = await assignmentsService.getTechnicianWorkSummary(technician1User.id);
      const work = await assignmentsService.getTechnicianMyWork(technician1User.id, { page: 1 });

      expect(summary.total_assigned).toBe(work.total);
      expect(summary.total_assigned).toBe(2);
      expect(summary.approved_pending_count).toBe(1);
      expect(summary.in_progress_count).toBe(1);
      expect(summary.completed_count).toBe(0);
    });

    it('handles status, stage, search filtering and pagination consistently on non-terminal items', async () => {
      const approvedOnly = await assignmentsService.getTechnicianMyWork(technician1User.id, { status: 'APPROVED' });
      expect(approvedOnly.total).toBe(1);
      expect(approvedOnly.items[0].ticket_number).toBe('SIM-2026-111111');

      const closedQuery = await assignmentsService.getTechnicianMyWork(technician1User.id, { status: 'CLOSED' });
      expect(closedQuery.total).toBe(0);
      expect(closedQuery.items.length).toBe(0);

      const stageFilter = await assignmentsService.getTechnicianMyWork(technician1User.id, { stage: 'IMPLEMENTATION' });
      expect(stageFilter.total).toBe(1);
      expect(stageFilter.items[0].ticket_number).toBe('SIM-2026-222222');

      const searchQuery = await assignmentsService.getTechnicianMyWork(technician1User.id, { search: '111111' });
      expect(searchQuery.total).toBe(1);
      expect(searchQuery.items[0].ticket_number).toBe('SIM-2026-111111');

      const page1 = await assignmentsService.getTechnicianMyWork(technician1User.id, { page: 1, page_size: 1 });
      expect(page1.items.length).toBe(1);
      expect(page1.total).toBe(2);
      expect(page1.total_pages).toBe(2);
      expect(page1.page).toBe(1);

      const page2 = await assignmentsService.getTechnicianMyWork(technician1User.id, { page: 2, page_size: 1 });
      expect(page2.items.length).toBe(1);
      expect(page2.page).toBe(2);
    });

    it('preserves assignment history and detail access for CLOSED applications', async () => {
      const appAssignments = await assignmentsService.getApplicationAssignments('app-closed');
      expect(appAssignments.current_assignment?.technician_id).toBe(technician1User.id);
      expect(appAssignments.current_assignment?.is_current).toBe(true);

      const detail = await assignmentsService.getTechnicianApplicationDetail('app-closed', technician1User);
      expect(detail.id).toBe('app-closed');
      expect(detail.ticket_number).toBe('SIM-2026-444444');
      expect(detail.current_status).toBe('CLOSED');
    });

    it('dynamically reduces active work and summary when application transitions from IN_PROGRESS to COMPLETED', async () => {
      let summary = await assignmentsService.getTechnicianWorkSummary(technician1User.id);
      expect(summary.total_assigned).toBe(2);
      expect(summary.in_progress_count).toBe(1);

      await adminAppsService.executeTransition(
        'app-inprogress',
        { target_status: 'COMPLETED', note: 'Pekerjaan selesai dan diserahkan' },
        superAdminUser,
      );

      const work = await assignmentsService.getTechnicianMyWork(technician1User.id, { page: 1 });
      expect(work.total).toBe(1);
      expect(work.items.map((i) => i.id)).toEqual(['app-approved']);

      summary = await assignmentsService.getTechnicianWorkSummary(technician1User.id);
      expect(summary.total_assigned).toBe(1);
      expect(summary.in_progress_count).toBe(0);
      expect(summary.approved_pending_count).toBe(1);
    });
  });
});
