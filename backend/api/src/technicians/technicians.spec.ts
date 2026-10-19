import { assert, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../auth/roles.guard.js';
import { TechniciansService } from './technicians.service.js';
import { AdminTechniciansController } from './admin-technicians.controller.js';
import { AuditService } from '../audit/audit.service.js';
import type { SupabaseService } from '../supabase/supabase.service.js';

describe('Technician Account Management (Phase 13 & Regression Fixes)', () => {
  let supabaseMock: SupabaseService;
  let auditService: AuditService;
  let techniciansService: TechniciansService;
  let adminTechniciansController: AdminTechniciansController;

  let profilesTableData: any[] = [];
  let assignmentsTableData: any[] = [];
  let applicationsTableData: any[] = [];
  let profilesError: any = null;
  let assignmentsError: any = null;

  beforeEach(() => {
    delete process.env.ALLOW_IN_MEMORY_FALLBACK;

    profilesTableData = [];
    assignmentsTableData = [];
    applicationsTableData = [];
    profilesError = null;
    assignmentsError = null;

    const createChain = (tableName: string) => {
      const chain: any = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        in: vi.fn(() => chain),
        order: vi.fn(async () => {
          if (tableName === 'profiles') {
            return { data: profilesError ? null : profilesTableData, error: profilesError };
          }
          if (tableName === 'assignments') {
            return { data: assignmentsError ? null : assignmentsTableData, error: assignmentsError };
          }
          if (tableName === 'applications') {
            return { data: applicationsTableData, error: null };
          }
          return { data: [], error: null };
        }),
        maybeSingle: vi.fn(async () => {
          if (profilesError) {
            return { data: null, error: profilesError };
          }
          const item = profilesTableData[0] || null;
          return { data: item, error: null };
        }),
        upsert: vi.fn().mockResolvedValue({ error: null }),
        update: vi.fn(() => chain),
        insert: vi.fn().mockResolvedValue({ error: null }),
      };

      // Buat thenable agar await client.from('...').select(...) langsung mengembalikan hasil
      chain.then = (resolve: any) => {
        if (tableName === 'assignments') {
          return Promise.resolve({
            data: assignmentsError ? null : assignmentsTableData,
            error: assignmentsError,
          }).then(resolve);
        }
        if (tableName === 'profiles') {
          return Promise.resolve({
            data: profilesError ? null : profilesTableData,
            error: profilesError,
          }).then(resolve);
        }
        if (tableName === 'applications') {
          return Promise.resolve({
            data: applicationsTableData,
            error: null,
          }).then(resolve);
        }
        return Promise.resolve({ data: [], error: null }).then(resolve);
      };

      return chain;
    };

    supabaseMock = {
      getClient: vi.fn().mockReturnValue({
        auth: {
          admin: {
            createUser: vi.fn().mockResolvedValue({
              data: { user: { id: 'u-new-tech-uuid' } },
              error: null,
            }),
            updateUserById: vi.fn().mockResolvedValue({ error: null }),
          },
        },
        from: vi.fn((tableName: string) => createChain(tableName)),
      }),
    } as unknown as SupabaseService;

    auditService = new AuditService(supabaseMock);
    techniciansService = new TechniciansService(supabaseMock, auditService);
    adminTechniciansController = new AdminTechniciansController(techniciansService);
  });

  describe('1. Regression Tests (Fitur Manajemen Teknisi SIMANTIK)', () => {
    it('mengembalikan [] ketika database berisi 0 teknisi dan tidak menampilkan 3 default fiktif', async () => {
      profilesTableData = [];
      profilesError = null;

      const res = await adminTechniciansController.getTechnicians();

      expect(res.success).toBe(true);
      expect(res.data).toEqual([]);
      expect(res.data.length).toBe(0);
      // Memastikan tidak membocorkan 3 akun default
      expect(res.data.some((t: any) => t.full_name.includes('Ahmad Fauzi'))).toBe(false);
      expect(res.data.some((t: any) => t.full_name.includes('Siti Rahmawati'))).toBe(false);
      expect(res.data.some((t: any) => t.full_name.includes('Hendra Wijaya'))).toBe(false);
    });

    it('menghitung jumlah penugasan aktual 0 ketika tabel assignments kosong', async () => {
      const realTechId = 'tech-real-uuid-001';
      profilesTableData = [
        {
          id: realTechId,
          full_name: 'Dadan Ramdani, S.Kom',
          email: 'dadan.ramdani@bandungkab.go.id',
          role: 'TECHNICIAN',
          is_active: true,
          created_at: '2026-03-01T00:00:00Z',
          updated_at: '2026-03-01T00:00:00Z',
        },
      ];
      assignmentsTableData = []; // Tabel penugasan kosong
      profilesError = null;
      assignmentsError = null;

      const listRes = await adminTechniciansController.getTechnicians();
      expect(listRes.success).toBe(true);
      expect(listRes.data.length).toBe(1);
      expect(listRes.data[0].active_assignments_count).toBe(0);
      expect(listRes.data[0].total_assignments_count).toBe(0);

      const detailRes = await adminTechniciansController.getTechnicianDetail(realTechId);
      expect(detailRes.success).toBe(true);
      expect(detailRes.data.active_assignments_count).toBe(0);
      expect(detailRes.data.total_assignments_count).toBe(0);
      expect(detailRes.data.recent_assignments).toEqual([]);
    });

    it('melempar NotFoundException (404) ketika ID teknisi tidak ditemukan di database remote', async () => {
      profilesTableData = []; // tidak ada profil dengan id ini
      profilesError = null;

      await expect(
        adminTechniciansController.getTechnicianDetail('non-existent-uuid-999'),
      ).rejects.toThrow(NotFoundException);
    });

    it('melempar InternalServerErrorException dan tidak fallback ke mock ketika database query error', async () => {
      profilesError = { message: 'Supabase connection timeout', code: '57P01' };

      // listTechnicians melempar error, bukan mengembalikan 3 default
      await expect(adminTechniciansController.getTechnicians()).rejects.toThrow(
        InternalServerErrorException,
      );

      // getTechnicianDetail melempar error, bukan mengembalikan mock
      await expect(
        adminTechniciansController.getTechnicianDetail('tech-uuid-1'),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('hanya menggunakan in-memory fallback jika ALLOW_IN_MEMORY_FALLBACK=true di environment test', async () => {
      process.env.ALLOW_IN_MEMORY_FALLBACK = 'true';
      profilesError = { message: 'Database offline for test', code: 'TEST_ERR' };

      const res = await adminTechniciansController.getTechnicians();
      expect(res.success).toBe(true);
      expect(res.data.length).toBeGreaterThanOrEqual(3);

      delete process.env.ALLOW_IN_MEMORY_FALLBACK;
    });
  });

  describe('2. Technician Listing & Workload Metric Calculation', () => {
    it('memetakan teknisi dengan beban kerja aktif dari database secara akurat', async () => {
      const tech1Id = 'tech-001';
      const tech2Id = 'tech-002';

      profilesTableData = [
        {
          id: tech1Id,
          full_name: 'Asep Saepuloh, S.T.',
          email: 'asep.saepuloh@bandungkab.go.id',
          role: 'TECHNICIAN',
          is_active: true,
          created_at: '2026-02-01T00:00:00Z',
          updated_at: '2026-02-01T00:00:00Z',
        },
        {
          id: tech2Id,
          full_name: 'Budi Kurnia, S.Kom',
          email: 'budi.kurnia@bandungkab.go.id',
          role: 'TECHNICIAN',
          is_active: true,
          created_at: '2026-02-01T00:00:00Z',
          updated_at: '2026-02-01T00:00:00Z',
        },
      ];

      assignmentsTableData = [
        { technician_id: tech1Id, is_current: true },
        { technician_id: tech1Id, is_current: true },
        { technician_id: tech1Id, is_current: false },
        { technician_id: tech2Id, is_current: true },
      ];

      const res = await adminTechniciansController.getTechnicians();
      expect(res.success).toBe(true);
      expect(res.data.length).toBe(2);

      const tech1 = res.data.find((t: any) => t.id === tech1Id);
      expect(tech1).toBeDefined();
      assert(tech1);
      expect(tech1.active_assignments_count).toBe(2);
      expect(tech1.total_assignments_count).toBe(3);

      const tech2 = res.data.find((t: any) => t.id === tech2Id);
      expect(tech2).toBeDefined();
      assert(tech2);
      expect(tech2.active_assignments_count).toBe(1);
      expect(tech2.total_assignments_count).toBe(1);

      // Password hash atau credential rahasia tidak pernah diekspos
      expect((tech1 as any).password).toBeUndefined();
    });

    it('tidak menghitung beban kerja aktif jika tiket berstatus CLOSED, COMPLETED, REJECTED, atau CANCELLED meskipun is_current=true', async () => {
      const techId = 't-closed-test';
      profilesTableData = [
        {
          id: techId,
          full_name: 'Muhammad Farhan',
          email: 'muhammad.farhan@bandungkab.go.id',
          role: 'TECHNICIAN',
          is_active: true,
          created_at: '2026-02-01T00:00:00Z',
          updated_at: '2026-02-01T00:00:00Z',
        },
      ];

      assignmentsTableData = [
        { technician_id: techId, application_id: 'app-closed', is_current: true },
        { technician_id: techId, application_id: 'app-completed', is_current: true },
        { technician_id: techId, application_id: 'app-rejected', is_current: true },
        { technician_id: techId, application_id: 'app-cancelled', is_current: true },
      ];

      applicationsTableData = [
        { id: 'app-closed', current_status: 'CLOSED' },
        { id: 'app-completed', current_status: 'COMPLETED' },
        { id: 'app-rejected', current_status: 'REJECTED' },
        { id: 'app-cancelled', current_status: 'CANCELLED' },
      ];

      const res = await adminTechniciansController.getTechnicians();
      expect(res.success).toBe(true);
      const tech = res.data.find((t: any) => t.id === techId);
      expect(tech).toBeDefined();
      assert(tech);
      expect(tech.active_assignments_count).toBe(0);
      expect(tech.total_assignments_count).toBe(4);
    });
  });

  describe('3. Account Creation & Secret Safety', () => {
    it('creates technician without exposing password in response', async () => {
      const res = await adminTechniciansController.createTechnician(
        {
          full_name: 'Doni Pratama, S.Kom',
          email: 'doni.pratama@bandungkab.go.id',
          password: 'SecretPassword#2026',
        },
        { user: { id: 'admin-1', role: 'SUPER_ADMIN', fullName: 'Admin' } } as any,
      );

      expect(res.success).toBe(true);
      expect(res.data.full_name).toBe('Doni Pratama, S.Kom');
      expect(res.data.email).toBe('doni.pratama@bandungkab.go.id');
      expect((res.data as any).password).toBeUndefined();
    });

    it('rejects duplicate email', async () => {
      // Daftarkan teknisi pertama
      await adminTechniciansController.createTechnician(
        {
          full_name: 'Ahmad Fauzi',
          email: 'unique.technician@bandungkab.go.id',
        },
        { user: { id: 'admin-1', role: 'SUPER_ADMIN', fullName: 'Admin' } } as any,
      );

      // Pendaftaran kedua dengan email yang sama harus gagal
      await expect(
        adminTechniciansController.createTechnician(
          {
            full_name: 'Ahmad Fauzi Clone',
            email: 'unique.technician@bandungkab.go.id',
          },
          { user: { id: 'admin-1', role: 'SUPER_ADMIN', fullName: 'Admin' } } as any,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects missing or invalid email', async () => {
      await expect(
        adminTechniciansController.createTechnician(
          {
            full_name: 'No Email Tech',
            email: 'invalid-email',
          },
          { user: { id: 'admin-1', role: 'SUPER_ADMIN', fullName: 'Admin' } } as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('4. Safe Deactivation & Referential Preservation', () => {
    it('deactivates technician without deleting historical records', async () => {
      const techId = 'tech-deact-01';
      profilesTableData = [
        {
          id: techId,
          full_name: 'Fajar Nugraha, S.T.',
          email: 'fajar.nugraha@bandungkab.go.id',
          role: 'TECHNICIAN',
          is_active: true,
          created_at: '2026-01-15T00:00:00Z',
          updated_at: '2026-01-15T00:00:00Z',
        },
      ];

      const res = await adminTechniciansController.toggleTechnicianStatus(
        techId,
        false,
        { user: { id: 'admin-1', role: 'SUPER_ADMIN', fullName: 'Admin' } } as any,
      );

      expect(res.success).toBe(true);
      expect(res.data.is_active).toBe(false);

      // Simulasikan database mengembalikan status diperbarui
      profilesTableData[0].is_active = false;
      const detail = await adminTechniciansController.getTechnicianDetail(techId);
      expect(detail.data.id).toBe(techId);
      expect(detail.data.is_active).toBe(false);
      expect(detail.data.recent_assignments).toBeDefined();
    });
  });

  describe('5. RBAC Protection', () => {
    it('blocks TECHNICIAN role from accessing AdminTechniciansController', () => {
      const reflector = new Reflector();
      const guard = new RolesGuard(reflector);

      const mockTechContext = {
        getHandler: () => adminTechniciansController.createTechnician,
        getClass: () => AdminTechniciansController,
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
