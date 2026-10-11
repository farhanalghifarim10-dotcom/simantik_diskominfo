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

      // 1. Assign to Technician 1
      await assignmentsService.assignTechnician(
        appId,
        { technician_id: technician1User.id, note: 'Tugas pertama' },
        superAdminUser,
      );

      // 2. Re-assign to Technician 2
      await assignmentsService.assignTechnician(
        appId,
        { technician_id: technician2User.id, note: 'Pengalihan tugas kedua' },
        superAdminUser,
      );

      const appAssignments = await assignmentsService.getApplicationAssignments(appId);

      // Current assignee must be Technician 2
      expect(appAssignments.current_assignment?.technician_id).toBe(technician2User.id);
      expect(appAssignments.current_assignment?.is_current).toBe(true);

      // Previous assignment for Technician 1 must be archived
      const archived = appAssignments.assignment_history.filter((a) => !a.is_current);
      expect(archived.length).toBeGreaterThanOrEqual(1);
      expect(archived[0].unassigned_at).toBeDefined();

      // Exactly one current assignment
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

      // Technician 2 tries to access
      await expect(
        assignmentsService.getTechnicianApplicationDetail(appId, technician2User),
      ).rejects.toThrow(ForbiddenException);

      // Technician 2 tries to execute transition
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

      // Advance to APPROVED by Super Admin first
      await adminAppsService.executeTransition(appId, { target_status: 'VERIFICATION' }, superAdminUser);
      await adminAppsService.executeTransition(appId, { target_status: 'APPROVED' }, superAdminUser);

      // Assign to Technician 1
      await assignmentsService.assignTechnician(
        appId,
        { technician_id: technician1User.id },
        superAdminUser,
      );

      // Assigned Technician 1 can view detail
      const detail = await assignmentsService.getTechnicianApplicationDetail(appId, technician1User);
      expect(detail.id).toBe(appId);

      // Assigned Technician 1 can start work (APPROVED -> IN_PROGRESS)
      const inProgressApp = await assignmentsService.executeTechnicianTransition(
        appId,
        { target_status: 'IN_PROGRESS', note: 'Mulai pengerjaan teknis modul' },
        technician1User,
      );
      expect(inProgressApp.current_status).toBe('IN_PROGRESS');

      // Assigned Technician 1 can complete work (IN_PROGRESS -> COMPLETED)
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
      // Assign Technician 1 to application
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
      // Application is assigned to Technician 1
      await assignmentsService.assignTechnician(
        appId,
        { technician_id: technician1User.id, note: 'Tugas teknisi 1' },
        superAdminUser,
      );

      // Technician 2 is NOT assigned to this application
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

      // 1. getApplicationAssignments handler allows TECHNICIAN via method-level override
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

      // 2. listTechnicians handler blocks TECHNICIAN (class-level SUPER_ADMIN applies)
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

      // 3. assignTechnician handler blocks TECHNICIAN (class-level SUPER_ADMIN applies)
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
});
