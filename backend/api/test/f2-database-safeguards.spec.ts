import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  assertSupabaseOk,
  isInMemoryFallbackAllowed,
} from '../src/common/utils/supabase.utils.js';
import { TrackingService } from '../src/tracking/tracking.service.js';
import { TrackingTokenService } from '../src/tracking/tracking-token.service.js';
import { TrackingRateLimiter } from '../src/tracking/tracking-rate-limiter.js';
import { AssignmentsService } from '../src/assignments/assignments.service.js';
import { LifecycleService } from '../src/lifecycle/lifecycle.service.js';
import { TechniciansService } from '../src/technicians/technicians.service.js';
import { OpdService } from '../src/opd/opd.service.js';
import { ServicesService } from '../src/services/services.service.js';
import { AuditService } from '../src/audit/audit.service.js';

describe('F2: Database Safeguards & Supabase Error Handling', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  describe('assertSupabaseOk Utility', () => {
    it('tidak melempar exception bila response sukses tanpa error', () => {
      expect(() =>
        assertSupabaseOk({ data: { id: 'test-1' }, error: null }, 'Operasi sukses'),
      ).not.toThrow();
    });

    it('melempar ConflictException (409) pada kode PostgreSQL 23505 (unique violation)', () => {
      expect(() =>
        assertSupabaseOk(
          {
            data: null,
            error: {
              code: '23505',
              message: 'duplicate key value violates unique constraint',
              details: 'Key (ticket_number) already exists',
            },
          },
          'Insert permohonan',
        ),
      ).toThrow(ConflictException);
    });

    it('melempar BadRequestException (400) pada kode PostgreSQL 23503 (foreign key violation)', () => {
      expect(() =>
        assertSupabaseOk(
          {
            data: null,
            error: {
              code: '23503',
              message: 'insert or update violates foreign key constraint',
              details: 'Key (service_id) is not present in table services',
            },
          },
          'Insert permohonan',
        ),
      ).toThrow(BadRequestException);
    });

    it('melempar InternalServerErrorException (500) pada kode error tak terduga', () => {
      expect(() =>
        assertSupabaseOk(
          {
            data: null,
            error: {
              code: '42P01',
              message: 'relation does not exist',
            },
          },
          'Query tabel',
        ),
      ).toThrow(InternalServerErrorException);
    });
  });

  describe('isInMemoryFallbackAllowed Utility', () => {
    it('mengembalikan true hanya di lingkungan test dengan ALLOW_IN_MEMORY_FALLBACK=true', () => {
      process.env.ALLOW_IN_MEMORY_FALLBACK = 'true';
      process.env.NODE_ENV = 'test';
      expect(isInMemoryFallbackAllowed()).toBe(true);
    });

    it('mengembalikan false bila ALLOW_IN_MEMORY_FALLBACK=false', () => {
      process.env.ALLOW_IN_MEMORY_FALLBACK = 'false';
      process.env.NODE_ENV = 'test';
      expect(isInMemoryFallbackAllowed()).toBe(false);
    });

    it('mengembalikan false bila NODE_ENV adalah production meskipun ALLOW_IN_MEMORY_FALLBACK=true', () => {
      process.env.ALLOW_IN_MEMORY_FALLBACK = 'true';
      process.env.NODE_ENV = 'production';
      expect(isInMemoryFallbackAllowed()).toBe(false);
    });
  });

  describe('TrackingService: Fallback In-Memory Isolation', () => {
    it('menolak kredensial dummy contoh (SIM-2026-000101 / TRK-A1B2C3D4) bila fallback dinonaktifkan', async () => {
      process.env.ALLOW_IN_MEMORY_FALLBACK = 'false';
      process.env.NODE_ENV = 'test';

      const mockSupabase = {
        getClient: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      };

      const tokenService = new TrackingTokenService();
      const rateLimiter = new TrackingRateLimiter();
      const trackingService = new TrackingService(
        mockSupabase as any,
        tokenService,
        rateLimiter,
      );

      await expect(
        trackingService.verifyCredential({
          ticket_number: 'SIM-2026-000101',
          tracking_code: 'TRK-A1B2C3D4',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('AssignmentsService: Error Assertion & Rollback Compensation', () => {
    it('melempar exception dan membatalkan mutasi bila insert penugasan baru di Supabase gagal', async () => {
      process.env.ALLOW_IN_MEMORY_FALLBACK = 'false';
      process.env.NODE_ENV = 'test';

      const revertMock = vi.fn().mockResolvedValue({ error: null });

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'assignments') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({
                    data: [
                      {
                        id: 'asgn-old-1',
                        application_id: 'app-1',
                        technician_id: 'tech-old-1',
                        is_current: true,
                        assigned_at: new Date().toISOString(),
                      },
                    ],
                    error: null,
                  }),
                  then: (resolve: any) => resolve({ data: [], error: null }),
                }),
              }),
              update: vi.fn().mockReturnValue({
                eq: revertMock.mockReturnValue({
                  select: vi.fn().mockResolvedValue({
                    data: [{ id: 'asgn-old-1' }],
                    error: null,
                  }),
                  then: (resolve: any) => resolve({ data: [{ id: 'asgn-old-1' }], error: null }),
                }),
              }),
              insert: vi.fn().mockImplementation(() => {
                const res = {
                  data: null,
                  error: { code: '23503', message: 'foreign key violation' },
                };
                return {
                  ...res,
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue(res),
                  }),
                  then: (resolve: any) => resolve(res),
                };
              }),
            };
          }
          if (table === 'applications') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: 'app-1', ticket_number: 'SIM-2026-000001' },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'profiles') {
            const techList = [
              { id: 'tech-1', full_name: 'Teknisi Test', role: 'TECHNICIAN', is_active: true },
            ];
            const eqActive: any = {
              then: (resolve: any) => resolve({ data: techList, error: null }),
            };
            const eqRole = {
              eq: vi.fn().mockReturnValue(eqActive),
            };
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue(eqRole),
              }),
            };
          }
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
            select: vi.fn().mockReturnThis(),
          };
        }),
      };

      const mockSupabase = { getClient: vi.fn().mockReturnValue(mockClient) };
      const mockAdminApps = {
        getApplicationDetail: vi.fn().mockResolvedValue({
          id: 'app-1',
          ticket_number: 'SIM-2026-000001',
          current_status: 'SUBMITTED',
        }),
      };
      const mockNotif = { notify: vi.fn().mockResolvedValue({}) };

      const assignmentsService = new AssignmentsService(
        mockSupabase as any,
        mockAdminApps as any,
        mockNotif as any,
      );

      await expect(
        assignmentsService.assignTechnician(
          'app-1',
          { technician_id: 'tech-1' },
          { id: 'admin-1', role: 'SUPER_ADMIN', email: 'admin@bandungkab.go.id', fullName: 'Super Admin' } as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('LifecycleService: Berkas Storage Cleanup Saat DB Error', () => {
    it('menghapus berkas yang telah diunggah ke storage bila insert metadata ke DB gagal', async () => {
      process.env.ALLOW_IN_MEMORY_FALLBACK = 'false';
      process.env.NODE_ENV = 'test';

      const removeStorageMock = vi.fn().mockResolvedValue({ error: null });

      const mockClient = {
        storage: {
          from: vi.fn().mockReturnValue({
            upload: vi.fn().mockResolvedValue({ data: { path: 'test.pdf' }, error: null }),
            remove: removeStorageMock,
          }),
        },
        from: vi.fn((table: string) => {
          if (table === 'technical_documents') {
            return {
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { code: '42P01', message: 'table error' },
                  }),
                }),
              }),
            };
          }
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { role: 'SUPER_ADMIN' },
                    error: null,
                  }),
                }),
              }),
            };
          }
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
          };
        }),
      };

      const mockSupabase = { getClient: vi.fn().mockReturnValue(mockClient) };
      const mockAudit = { record: vi.fn().mockResolvedValue({}) };

      const lifecycleService = new LifecycleService(
        mockSupabase as any,
        mockAudit as any,
      );

      const fakeFile: any = {
        originalname: 'dokumen.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('%PDF-1.4 test document'),
      };

      await expect(
        lifecycleService.uploadTechnicalDocument(
          'app-1',
          {
            document_type: 'ANALYSIS' as any,
            title: 'Dokumen Teknis',
            original_filename: 'dokumen.pdf',
            mime_type: 'application/pdf',
            size_bytes: 1024,
            base64_data: Buffer.from('%PDF-1.4 test document').toString('base64'),
          },
          { id: 'user-1', role: 'SUPER_ADMIN', fullName: 'Super Admin', email: 'admin@bandungkab.go.id' } as any,
        ),
      ).rejects.toThrow(InternalServerErrorException);

      expect(removeStorageMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('TechniciansService: Auth Rollback Compensation', () => {
    it('menghapus akun autentikasi yang sempat dibuat bila upsert profile gagal', async () => {
      process.env.ALLOW_IN_MEMORY_FALLBACK = 'false';
      process.env.NODE_ENV = 'test';

      const deleteUserMock = vi.fn().mockResolvedValue({ data: null, error: null });

      const mockClient = {
        auth: {
          admin: {
            createUser: vi.fn().mockResolvedValue({
              data: { user: { id: 'created-user-uuid' } },
              error: null,
            }),
            deleteUser: deleteUserMock,
          },
        },
        from: vi.fn((table: string) => {
          if (table === 'profiles') {
            return {
              upsert: vi.fn().mockResolvedValue({
                data: null,
                error: { code: '23505', message: 'profile already exists' },
              }),
            };
          }
          return {
            select: vi.fn().mockReturnThis(),
          };
        }),
      };

      const mockSupabase = { getClient: vi.fn().mockReturnValue(mockClient) };
      const mockAudit = { record: vi.fn().mockResolvedValue({}) };

      const techniciansService = new TechniciansService(
        mockSupabase as any,
        mockAudit as any,
      );

      await expect(
        techniciansService.createTechnician(
          {
            full_name: 'Budi Santoso',
            email: 'budi.santoso@bandungkab.go.id',
          },
          'admin-1',
        ),
      ).rejects.toThrow(ConflictException);

      expect(deleteUserMock).toHaveBeenCalledWith('created-user-uuid');
    });
  });

  describe('OpdService & ServicesService: Tidak Mengisi In-Memory Saat DB Error', () => {
    it('OpdService melempar exception dan tidak memasukkan data ke inMemoryOpds saat Supabase error', async () => {
      process.env.ALLOW_IN_MEMORY_FALLBACK = 'false';
      process.env.NODE_ENV = 'test';

      const mockClient = {
        from: vi.fn().mockReturnValue({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: '23505', message: 'Kode OPD sudah ada' },
              }),
            }),
          }),
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      };

      const mockSupabase = { getClient: vi.fn().mockReturnValue(mockClient) };
      const mockAudit = { record: vi.fn().mockResolvedValue({}) };

      const opdService = new OpdService(mockSupabase as any, mockAudit as any);

      await expect(
        opdService.createOpd({ code: 'NEWOPD', name: 'Dinas Baru' }),
      ).rejects.toThrow(ConflictException);

      const list = await opdService.listOpds();
      expect(list.find((o) => o.code === 'NEWOPD')).toBeUndefined();
    });

    it('ServicesService melempar exception dan tidak memasukkan data ke inMemoryServices saat Supabase error', async () => {
      process.env.ALLOW_IN_MEMORY_FALLBACK = 'false';
      process.env.NODE_ENV = 'test';

      const mockClient = {
        from: vi.fn().mockReturnValue({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: '23505', message: 'Kode layanan sudah ada' },
              }),
            }),
          }),
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        }),
      };

      const mockSupabase = { getClient: vi.fn().mockReturnValue(mockClient) };
      const servicesService = new ServicesService(mockSupabase as any);

      await expect(
        servicesService.createService({
          code: 'SRV-TEST',
          name: 'Layanan Uji Coba',
          type: 'DEVELOPMENT',
        }),
      ).rejects.toThrow(ConflictException);

      const list = await servicesService.getPublicServices();
      expect(list.find((s) => s.code === 'SRV-TEST')).toBeUndefined();
    });
  });

  describe('Isolasi Ketat Fallback In-Memory: verifyCredential 401, listTechnicians 5xx, listLogs 5xx', () => {
    it('tanpa ALLOW_IN_MEMORY_FALLBACK, verifyCredential dengan tiket dan kode contoh harus 401 Unauthorized', async () => {
      // Pastikan fallback in-memory dinonaktifkan
      process.env.ALLOW_IN_MEMORY_FALLBACK = 'false';
      process.env.NODE_ENV = 'production';

      const mockClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null, // Tiket tidak ditemukan di database nyata
                error: null,
              }),
            }),
          }),
        }),
      };

      const mockSupabase = { getClient: vi.fn().mockReturnValue(mockClient) };
      const tokenService = new TrackingTokenService({
        get: vi.fn().mockReturnValue('dummy-test-secret-at-least-32-chars-long!'),
      } as any);
      const rateLimiter = new TrackingRateLimiter();

      const trackingService = new TrackingService(
        mockSupabase as any,
        tokenService,
        rateLimiter,
      );

      // Coba verifikasi menggunakan kredensial contoh seed (SIM-2026-000101 & TRK-A1B2C3D4)
      await expect(
        trackingService.verifyCredential({
          ticket_number: 'SIM-2026-000101',
          tracking_code: 'TRK-A1B2C3D4',
        }),
      ).rejects.toThrow(UnauthorizedException);

      try {
        await trackingService.verifyCredential({
          ticket_number: 'SIM-2026-000101',
          tracking_code: 'TRK-A1B2C3D4',
        });
      } catch (err: any) {
        expect(err.getStatus()).toBe(401);
        expect(err.getResponse()).toEqual(
          expect.objectContaining({
            statusCode: 401,
            code: 'TRACKING_INVALID_CREDENTIAL',
            message: 'Nomor tiket atau kode pelacakan tidak sesuai.',
          }),
        );
      }
    });

    it('tanpa ALLOW_IN_MEMORY_FALLBACK, listTechnicians saat database error harus melempar galat 5xx InternalServerError, bukan data contoh', async () => {
      process.env.ALLOW_IN_MEMORY_FALLBACK = 'false';
      process.env.NODE_ENV = 'production';

      const mockClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database connection failed: ECONNREFUSED' },
              }),
            }),
          }),
        }),
      };

      const mockSupabase = { getClient: vi.fn().mockReturnValue(mockClient) };
      const mockAudit = { record: vi.fn().mockResolvedValue({}) };

      const techniciansService = new TechniciansService(
        mockSupabase as any,
        mockAudit as any,
      );

      await expect(techniciansService.listTechnicians()).rejects.toThrow(
        InternalServerErrorException,
      );

      try {
        await techniciansService.listTechnicians();
      } catch (err: any) {
        expect(err.getStatus()).toBe(500);
        expect(err.message).toContain('Gagal memuat daftar tenaga ahli dari basis data');
      }
    });

    it('tanpa ALLOW_IN_MEMORY_FALLBACK, listLogs saat database error harus melempar galat 5xx InternalServerError, bukan data contoh', async () => {
      process.env.ALLOW_IN_MEMORY_FALLBACK = 'false';
      process.env.NODE_ENV = 'production';

      const mockClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: null,
                count: null,
                error: { message: 'Query execution timeout on audit_logs' },
              }),
            }),
          }),
        }),
      };

      const mockSupabase = { getClient: vi.fn().mockReturnValue(mockClient) };
      const auditService = new AuditService(mockSupabase as any);

      await expect(auditService.listLogs({})).rejects.toThrow(
        InternalServerErrorException,
      );

      try {
        await auditService.listLogs({});
      } catch (err: any) {
        expect(err.getStatus()).toBe(500);
        expect(err.message).toContain('Gagal memuat log audit dari basis data');
      }
    });
  });
});
