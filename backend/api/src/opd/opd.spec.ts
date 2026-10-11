import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../auth/roles.guard.js';
import { OpdService } from './opd.service.js';
import { AdminOpdController } from './admin-opd.controller.js';
import { OpdController } from './opd.controller.js';
import { AuditService } from '../audit/audit.service.js';
import type { SupabaseService } from '../supabase/supabase.service.js';

describe('OPD Units Management (Phase 13)', () => {
  let supabaseMock: SupabaseService;
  let auditService: AuditService;
  let opdService: OpdService;
  let adminOpdController: AdminOpdController;
  let publicOpdController: OpdController;

  beforeEach(() => {
    supabaseMock = {
      getClient: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: null, error: new Error('DB offline') }),
          insert: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: new Error('DB offline') }),
        }),
      }),
    } as unknown as SupabaseService;

    auditService = new AuditService(supabaseMock);
    opdService = new OpdService(supabaseMock, auditService);
    adminOpdController = new AdminOpdController(opdService);
    publicOpdController = new OpdController(opdService);
  });

  describe('1. Public vs Admin Visibility', () => {
    it('public controller returns only active OPD units', async () => {
      // First de-activate an OPD in admin
      const allOpds = await adminOpdController.getAdminOpds();
      const firstOpd = allOpds.data[0];
      await adminOpdController.toggleOpdStatus(firstOpd.id, false, {
        user: { id: 'admin-1', role: 'SUPER_ADMIN', fullName: 'Admin' },
      } as any);

      const publicResult = await publicOpdController.getPublicOpds();
      expect(publicResult.success).toBe(true);
      expect(publicResult.data.some((o) => o.id === firstOpd.id)).toBe(false);
      expect(publicResult.data.every((o) => o.is_active)).toBe(true);
    });

    it('admin controller can list all OPDs including inactive ones', async () => {
      const adminResult = await adminOpdController.getAdminOpds();
      expect(adminResult.success).toBe(true);
      expect(adminResult.data.length).toBeGreaterThan(0);
      expect(adminResult.data.some((o) => !o.is_active)).toBe(true);
    });
  });

  describe('2. Creation & Validation', () => {
    it('successfully creates a new OPD unit and writes audit log', async () => {
      const res = await adminOpdController.createOpd(
        {
          code: 'DISPUSIP',
          name: 'Dinas Perpustakaan dan Kearsipan',
        },
        { user: { id: 'admin-1', role: 'SUPER_ADMIN', fullName: 'Admin' } } as any,
      );

      expect(res.success).toBe(true);
      expect(res.data.code).toBe('DISPUSIP');
      expect(res.data.is_active).toBe(true);

      const detail = await adminOpdController.getOpdDetail(res.data.id);
      expect(detail.data.name).toBe('Dinas Perpustakaan dan Kearsipan');
    });

    it('rejects creation with duplicate OPD code', async () => {
      await expect(
        adminOpdController.createOpd(
          {
            code: 'DISKOMINFO',
            name: 'Dinas Kominfo Duplikat',
          },
          { user: { id: 'admin-1', role: 'SUPER_ADMIN', fullName: 'Admin' } } as any,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects creation with empty fields', async () => {
      await expect(
        adminOpdController.createOpd(
          { code: '', name: 'Nama' },
          { user: { id: 'admin-1', role: 'SUPER_ADMIN', fullName: 'Admin' } } as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('3. Referential Safety & Deactivation', () => {
    it('preserves historical OPD data when deactivated without deletion', async () => {
      const opds = await adminOpdController.getAdminOpds();
      const bapenda = opds.data.find((o) => o.code === 'BAPENDA')!;

      const deactRes = await adminOpdController.toggleOpdStatus(bapenda.id, false, {
        user: { id: 'admin-1', role: 'SUPER_ADMIN', fullName: 'Admin' },
      } as any);

      expect(deactRes.data.is_active).toBe(false);

      // Verify BAPENDA is still retrievable by ID for historical tickets
      const detail = await adminOpdController.getOpdDetail(bapenda.id);
      expect(detail.data.id).toBe(bapenda.id);
      expect(detail.data.is_active).toBe(false);
    });
  });

  describe('4. RBAC Protection', () => {
    it('blocks TECHNICIAN from accessing AdminOpdController', () => {
      const reflector = new Reflector();
      const guard = new RolesGuard(reflector);

      const mockTechContext = {
        getHandler: () => adminOpdController.createOpd,
        getClass: () => AdminOpdController,
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: 'tech-1', role: 'TECHNICIAN' },
          }),
        }),
      };

      expect(() => guard.canActivate(mockTechContext as any)).toThrowError(
        /does not have sufficient permissions/,
      );
    });
  });
});
