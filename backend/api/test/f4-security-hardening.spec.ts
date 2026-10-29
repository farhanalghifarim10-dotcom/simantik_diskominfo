import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, HttpStatus } from '@nestjs/common';
import { ApplicationsService } from '../src/applications/applications.service.js';
import { MessagesService } from '../src/messages/messages.service.js';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter.js';
import configuration from '../src/config/configuration.js';
import { HealthController } from '../src/health/health.controller.js';
import { NotificationsController } from '../src/notifications/notifications.controller.js';
import { AdminApplicationsController } from '../src/applications/admin-applications.controller.js';
import { TechnicianWorkspaceController } from '../src/assignments/technician-workspace.controller.js';
import { MessagesController } from '../src/messages/messages.controller.js';
import { HelpdeskController } from '../src/helpdesk/helpdesk.controller.js';

describe('F4: Security Hardening, Rate Limiting, Trust Proxy & Input Constraints', () => {
  describe('1. ApplicationsService: Batas Input Form & Pendaftaran', () => {
    let applicationsService: ApplicationsService;
    let mockSupabase: any;
    let mockServices: any;

    beforeEach(() => {
      mockSupabase = {
        getClient: vi.fn().mockReturnValue({
          from: vi.fn((table: string) => {
            if (table === 'opd_units') {
              return {
                select: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({
                      data: [{ id: 'opd-1', code: 'DISKOMINFO', name: 'Diskominfo', is_active: true }],
                      error: null,
                    }),
                  }),
                }),
              };
            }
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              insert: vi.fn().mockResolvedValue({ error: null }),
            };
          }),
        }),
      };

      mockServices = {
        getPublicServiceBySlugOrId: vi.fn().mockResolvedValue({
          id: 'srv-1',
          slug: 'pembangunan-aplikasi',
          name: 'Pembangunan Aplikasi SPBE',
          type: 'NEW',
          requirements: [
            {
              id: 'req-kak',
              name: 'Kerangka Acuan Kerja (KAK)',
              type: 'DOCUMENT',
              is_required: true,
              allowed_file_types: 'application/pdf',
              max_file_size_mb: 10,
            },
          ],
        }),
      };

      applicationsService = new ApplicationsService(mockSupabase, mockServices);
    });

    const createValidPayload = () => ({
      service_id: 'srv-1',
      opd_unit_id: 'opd-1',
      applicant_name: 'Budi Santoso',
      applicant_position: 'Kepala Seksi Aplikasi',
      applicant_email: 'budi@bandungkab.go.id',
      applicant_phone: '081234567890',
      title: 'Permohonan Sistem Terpadu',
      background: 'Latar belakang pengembangan aplikasi sistem informasi terpadu Pemkab.',
      problem_statement: 'Belum terintegrasinya basis data antar unit kerja dinas terkait.',
      objective: 'Mewujudkan satu data terpadu dan pelayanan publik yang efisien.',
      scope: 'Pengembangan backend, frontend, dan integrasi API antar dinas.',
      expected_output: 'Sistem aplikasi berbasis web yang siap produksi.',
      terms_accepted: true,
      terms_version: 'v1.0-2026',
    });

    const createDummyDoc = (reqId: string, filename = 'kak.pdf') => ({
      requirement_id: reqId,
      original_filename: filename,
      mime_type: 'application/pdf',
      size_bytes: 1024,
      buffer: Buffer.from('%PDF-1.4 dummy valid pdf content'),
    });

    it('menolak jika nama pemohon melebihi 150 karakter', async () => {
      const payload = createValidPayload();
      payload.applicant_name = 'A'.repeat(151);

      await expect(
        applicationsService.submitApplication(payload, [createDummyDoc('req-kak')]),
      ).rejects.toThrow('Nama pemohon melebihi batas maksimum 150 karakter.');
    });

    it('menolak jika email pemohon melebihi 150 karakter', async () => {
      const payload = createValidPayload();
      payload.applicant_email = `${'a'.repeat(140)}@bandungkab.go.id`;

      await expect(
        applicationsService.submitApplication(payload, [createDummyDoc('req-kak')]),
      ).rejects.toThrow('Email pemohon melebihi batas maksimum 150 karakter.');
    });

    it('menolak jika nomor telepon pemohon melebihi 30 karakter atau kurang dari 8 karakter', async () => {
      const payload = createValidPayload();
      payload.applicant_phone = '0'.repeat(31);

      await expect(
        applicationsService.submitApplication(payload, [createDummyDoc('req-kak')]),
      ).rejects.toThrow('Nomor telepon pemohon tidak valid');

      payload.applicant_phone = '12345';
      await expect(
        applicationsService.submitApplication(payload, [createDummyDoc('req-kak')]),
      ).rejects.toThrow('Nomor telepon pemohon tidak valid');
    });

    it('menolak jika nomor telepon pemohon memuat karakter selain angka, spasi, +, -, dan kurung', async () => {
      const payload = createValidPayload();
      payload.applicant_phone = '0812-3456-abcd';

      await expect(
        applicationsService.submitApplication(payload, [createDummyDoc('req-kak')]),
      ).rejects.toThrow('Nomor telepon pemohon tidak valid');
    });

    it('menerima nomor telepon dengan format internasional, spasi, strip, dan kurung (8-30 karakter)', async () => {
      const payload = createValidPayload();
      payload.applicant_phone = '+62 (22) 123-4567';

      const res = await applicationsService.submitApplication(payload, [createDummyDoc('req-kak')]);
      expect(res).toBeDefined();
    });

    it('menolak jika jabatan pemohon melebihi 100 karakter', async () => {
      const payload = createValidPayload();
      payload.applicant_position = 'J'.repeat(101);

      await expect(
        applicationsService.submitApplication(payload, [createDummyDoc('req-kak')]),
      ).rejects.toThrow('Jabatan pemohon melebihi batas maksimum 100 karakter.');
    });

    it('menolak jika judul usulan melebihi 200 karakter', async () => {
      const payload = createValidPayload();
      payload.title = 'T'.repeat(201);

      await expect(
        applicationsService.submitApplication(payload, [createDummyDoc('req-kak')]),
      ).rejects.toThrow('Judul usulan melebihi batas maksimum 200 karakter.');
    });

    it('menolak jika uraian usulan (background) melebihi 5000 karakter', async () => {
      const payload = createValidPayload();
      payload.background = 'B'.repeat(5001);

      await expect(
        applicationsService.submitApplication(payload, [createDummyDoc('req-kak')]),
      ).rejects.toThrow('Uraian usulan melebihi batas maksimum 5000 karakter.');
    });

    it('menolak jika catatan tambahan melebihi 2000 karakter', async () => {
      const payload = createValidPayload();
      payload.additional_notes = 'N'.repeat(2001);

      await expect(
        applicationsService.submitApplication(payload, [createDummyDoc('req-kak')]),
      ).rejects.toThrow('Catatan melebihi batas maksimum 2000 karakter.');
    });

    it('menolak jika jumlah dokumen yang diunggah lebih dari 10 dokumen', async () => {
      const payload = createValidPayload();
      const docs = Array.from({ length: 11 }, (_, i) =>
        createDummyDoc(`req-${i}`, `doc-${i}.pdf`),
      );

      await expect(
        applicationsService.submitApplication(payload, docs),
      ).rejects.toThrow('Jumlah dokumen yang diunggah melebihi batas maksimum (maksimal 10 dokumen per permohonan).');
    });

    it('menolak jika terdapat duplikasi requirement_id pada dokumen yang diunggah', async () => {
      const payload = createValidPayload();
      const docs = [
        createDummyDoc('req-kak', 'kak-part1.pdf'),
        createDummyDoc('req-kak', 'kak-part2.pdf'),
      ];

      await expect(
        applicationsService.submitApplication(payload, docs),
      ).rejects.toThrow('Terdapat persyaratan dokumen ganda. Setiap persyaratan hanya boleh diunggah satu dokumen.');
    });

    it('menolak jika total ukuran decode seluruh dokumen melebihi 35 MB', async () => {
      const payload = createValidPayload();
      // Siapkan buffer berukuran total 36 MB (2 x 18 MB)
      const bigBuffer1 = Buffer.alloc(18 * 1024 * 1024, '%PDF-1.4 big file 1');
      const bigBuffer2 = Buffer.alloc(18 * 1024 * 1024, '%PDF-1.4 big file 2');

      const docs = [
        {
          requirement_id: 'req-kak',
          original_filename: 'kak-1.pdf',
          mime_type: 'application/pdf',
          size_bytes: bigBuffer1.length,
          buffer: bigBuffer1,
        },
        {
          requirement_id: 'req-other',
          original_filename: 'kak-2.pdf',
          mime_type: 'application/pdf',
          size_bytes: bigBuffer2.length,
          buffer: bigBuffer2,
        },
      ];

      await expect(
        applicationsService.submitApplication(payload, docs),
      ).rejects.toThrow('Total ukuran seluruh dokumen yang diunggah melebihi batas maksimum 35 MB.');
    });
  });

  describe('2. MessagesService: Batas Panjang Pesan Staf Internal (2000 Karakter)', () => {
    let messagesService: MessagesService;
    let mockSupabase: any;
    let mockNotif: any;
    let mockAssignments: any;

    beforeEach(() => {
      mockSupabase = {
        getClient: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { current_status: 'PROCESSING' } }),
              }),
            }),
            insert: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
      };
      mockNotif = { notify: vi.fn().mockResolvedValue({}) };
      mockAssignments = { checkTechnicianAuthorization: vi.fn().mockResolvedValue(true) };
      messagesService = new MessagesService(mockSupabase, mockNotif, mockAssignments);
    });

    it('menolak pesan internal staf jika melebihi 2000 karakter', async () => {
      const user: any = {
        id: 'staff-1',
        role: 'SUPER_ADMIN',
        fullName: 'Budi Santoso',
      };

      await expect(
        messagesService.sendInternalMessage('app-1', user, {
          message: 'A'.repeat(2001),
          visibility: 'INTERNAL',
        }),
      ).rejects.toThrow('Pesan melebihi batas maksimum 2000 karakter.');
    });

    it('menerima pesan internal staf yang tidak melebihi 2000 karakter', async () => {
      const user: any = {
        id: 'staff-1',
        role: 'SUPER_ADMIN',
        fullName: 'Budi Santoso',
      };

      const result = await messagesService.sendInternalMessage('app-1', user, {
        message: 'A'.repeat(2000),
        visibility: 'INTERNAL',
      });

      expect(result.id).toBeDefined();
      expect(result.message.length).toBe(2000);
    });
  });

  describe('3. Keamanan Global: HttpExceptionFilter & Konfigurasi Trust Proxy', () => {
    it('memformat respons status 429 Too Many Requests ke format pesan bahasa Indonesia yang ramah', () => {
      const filter = new HttpExceptionFilter();
      const statusMock = vi.fn().mockReturnThis();
      const jsonMock = vi.fn();

      const hostMock: any = {
        switchToHttp: () => ({
          getResponse: () => ({
            status: statusMock,
            json: jsonMock,
          }),
          getRequest: () => ({
            method: 'POST',
            url: '/api/v1/applications',
          }),
        }),
      };

      // Simulasi exception 429 dari ThrottlerGuard
      const throttlerException = new BadRequestException({
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: 'ThrottlerException: Too Many Requests',
      });
      // Override status code ke 429
      (throttlerException as any).status = HttpStatus.TOO_MANY_REQUESTS;
      (throttlerException as any).getStatus = () => HttpStatus.TOO_MANY_REQUESTS;

      filter.catch(throttlerException, hostMock);

      expect(statusMock).toHaveBeenCalledWith(429);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            statusCode: 429,
            code: 'TOO_MANY_REQUESTS',
            message: 'Terlalu banyak permintaan. Silakan tunggu beberapa saat sebelum mencoba kembali.',
          }),
        }),
      );
    });

    it('membaca konfigurasi trustProxy saat env TRUST_PROXY disetel', () => {
      process.env.JWT_SECRET = '01234567890123456789012345678901';
      process.env.TRUST_PROXY = 'true';

      const config = configuration();
      expect(config.trustProxy).toBe(true);

      process.env.TRUST_PROXY = '0';
      const configFalse = configuration();
      expect(configFalse.trustProxy).toBe(false);
    });

    it('memastikan rute internal /admin, /technician, /notifications, dan /health dikecualikan dari throttling global', () => {
      expect(Reflect.getMetadata('THROTTLER:SKIPdefault', HealthController)).toBe(true);
      expect(Reflect.getMetadata('THROTTLER:SKIPdefault', NotificationsController)).toBe(true);
      expect(Reflect.getMetadata('THROTTLER:SKIPdefault', AdminApplicationsController)).toBe(true);
      expect(Reflect.getMetadata('THROTTLER:SKIPdefault', TechnicianWorkspaceController)).toBe(true);
    });

    it('memastikan rute staf MessagesController dan HelpdeskController dikecualikan dari throttling global sedangkan rute publik tetap dibatasi', () => {
      // Rute staf internal di MessagesController dilewati (SkipThrottle: true)
      expect(Reflect.getMetadata('THROTTLER:SKIPdefault', MessagesController.prototype.getInternalMessages)).toBe(true);
      expect(Reflect.getMetadata('THROTTLER:SKIPdefault', MessagesController.prototype.sendInternalMessage)).toBe(true);
      expect(Reflect.getMetadata('THROTTLER:SKIPdefault', MessagesController.prototype.getAdminMessages)).toBe(true);
      expect(Reflect.getMetadata('THROTTLER:SKIPdefault', MessagesController.prototype.sendAdminMessage)).toBe(true);
      expect(Reflect.getMetadata('THROTTLER:SKIPdefault', MessagesController.prototype.getTechMessages)).toBe(true);
      expect(Reflect.getMetadata('THROTTLER:SKIPdefault', MessagesController.prototype.sendTechMessage)).toBe(true);

      // Rute publik di MessagesController TIDAK dikecualikan (SkipThrottle: undefined / falsy)
      expect(Reflect.getMetadata('THROTTLER:SKIPdefault', MessagesController.prototype.getPublicMessages)).toBeFalsy();
      expect(Reflect.getMetadata('THROTTLER:SKIPdefault', MessagesController.prototype.sendPublicMessage)).toBeFalsy();

      // Rute admin di HelpdeskController dilewati
      expect(Reflect.getMetadata('THROTTLER:SKIPdefault', HelpdeskController.prototype.getAdminConsultations)).toBe(true);
      expect(Reflect.getMetadata('THROTTLER:SKIPdefault', HelpdeskController.prototype.markAdminConsultationRead)).toBe(true);
      expect(Reflect.getMetadata('THROTTLER:SKIPdefault', HelpdeskController.prototype.getConsultationsInternalAlias)).toBe(true);
      expect(Reflect.getMetadata('THROTTLER:SKIPdefault', HelpdeskController.prototype.markConsultationReadAlias)).toBe(true);

      // Rute publik di HelpdeskController TIDAK dilewati dan memiliki batas ketat (@Throttle)
      expect(Reflect.getMetadata('THROTTLER:SKIPdefault', HelpdeskController.prototype.submitPublicConsultation)).toBeFalsy();
      expect(Reflect.getMetadata('THROTTLER:LIMITdefault', HelpdeskController.prototype.submitPublicConsultation)).toBe(3);
      expect(Reflect.getMetadata('THROTTLER:TTLdefault', HelpdeskController.prototype.submitPublicConsultation)).toBe(600000);
    });
  });

  describe('3. M4: Perbaikan Cache Idempotency ApplicationsService & Proteksi In-Memory', () => {
    let applicationsService: ApplicationsService;
    let mockSupabase: any;
    let mockServices: any;

    beforeEach(() => {
      mockSupabase = {
        getClient: vi.fn().mockReturnValue({
          from: vi.fn((table: string) => {
            if (table === 'opd_units') {
              return {
                select: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({
                      data: [{ id: 'opd-1', code: 'DISKOMINFO', name: 'Diskominfo', is_active: true }],
                      error: null,
                    }),
                  }),
                }),
              };
            }
            if (table === 'applications') {
              return {
                insert: vi.fn().mockReturnValue({
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: { id: 'app-uuid-1', ticket_number: 'SIM-2026-000001' },
                      error: null,
                    }),
                  }),
                }),
              };
            }
            if (table === 'applicants') {
              return {
                insert: vi.fn().mockReturnValue({
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: { id: 'applicant-uuid-1' },
                      error: null,
                    }),
                  }),
                }),
              };
            }
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              insert: vi.fn().mockResolvedValue({ error: null }),
            };
          }),
        }),
      };

      mockServices = {
        getPublicServiceBySlugOrId: vi.fn().mockResolvedValue({
          id: 'srv-1',
          name: 'Pembangunan Aplikasi',
          requirements: [],
        }),
      };

      applicationsService = new ApplicationsService(mockSupabase, mockServices);
    });

    const createPayload = () => ({
      service_id: 'srv-1',
      opd_unit_id: 'opd-1',
      applicant_name: 'Budi Santoso',
      applicant_position: 'Kasi Aplikasi',
      applicant_email: 'budi@bandungkab.go.id',
      applicant_phone: '081234567890',
      title: 'Permohonan SPBE',
      background: 'Latar belakang pengujian',
      problem_statement: 'Rumusan masalah pengujian',
      objective: 'Tujuan pengujian',
      scope: 'Ruang lingkup pengujian',
      expected_output: 'Hasil pengujian',
      terms_accepted: true,
      terms_version: 'v1.0',
    });

    it('mengembalikan hasil cache saat idempotency_key yang sama dikirim ulang', async () => {
      const payload = { ...createPayload(), idempotency_key: 'idem-key-1' };

      const res1 = await applicationsService.submitApplication(payload as any);
      expect(applicationsService.getIdempotencyCacheSize()).toBe(1);

      const res2 = await applicationsService.submitApplication(payload as any);
      expect(res2).toEqual(res1);
      expect(applicationsService.getIdempotencyCacheSize()).toBe(1);
    });

    it('mengosongkan entri saat TTL 10 menit telah lewat', async () => {
      vi.useFakeTimers();
      try {
        const payload = { ...createPayload(), idempotency_key: 'idem-key-ttl' };

        const res1 = await applicationsService.submitApplication(payload as any);
        expect(applicationsService.getIdempotencyCacheSize()).toBe(1);

        // Majukan waktu 10 menit 1 detik (601.000 ms)
        vi.advanceTimersByTime(10 * 60 * 1000 + 1000);

        // Setelah TTL lewat, panggilan dengan key yang sama akan dieksekusi ulang ke database
        const res2 = await applicationsService.submitApplication(payload as any);
        expect(res2).toBeDefined();
        // ID baru dibuat karena cache kedaluwarsa
        expect(res2.id).not.toBe(res1.id);
      } finally {
        vi.useRealTimers();
      }
    });

    it('membatasi ukuran maksimal 1000 entri dan membuang entri tertua (FIFO eviction)', async () => {
      applicationsService.clearIdempotencyCache();
      const basePayload = createPayload();

      // Masukkan 1005 entri unik
      for (let i = 1; i <= 1005; i++) {
        await applicationsService.submitApplication({
          ...basePayload,
          idempotency_key: `key-bulk-${i}`,
        } as any);
      }

      // Kapasitas cache tetap tepat 1000
      expect(applicationsService.getIdempotencyCacheSize()).toBe(1000);

      // Entri tertua (key-bulk-1) sudah dibuang sehingga saat dipanggil kembali akan disubmit ulang
      const resEvicted = await applicationsService.submitApplication({
        ...basePayload,
        idempotency_key: 'key-bulk-1',
      } as any);
      expect(resEvicted).toBeDefined();
      expect(applicationsService.getIdempotencyCacheSize()).toBe(1000);
    });

    it('memastikan inMemoryApplications dan registerInMemoryApplication TIDAK ditulis saat di luar mode test', async () => {
      const originalEnv = process.env.ALLOW_IN_MEMORY_FALLBACK;
      const originalNodeEnv = process.env.NODE_ENV;
      try {
        delete process.env.ALLOW_IN_MEMORY_FALLBACK;
        process.env.NODE_ENV = 'production';

        const mockTracking = {
          registerInMemoryApplication: vi.fn(),
        };

        const prodAppService = new ApplicationsService(
          mockSupabase,
          mockServices,
          mockTracking as any,
        );

        const payload = createPayload();
        await prodAppService.submitApplication(payload as any);

        // inMemoryApplications tidak ditulis
        expect(prodAppService.getInMemoryApplicationsCount()).toBe(0);
        // registerInMemoryApplication tidak dipanggil
        expect(mockTracking.registerInMemoryApplication).not.toHaveBeenCalled();
      } finally {
        if (originalEnv !== undefined) {
          process.env.ALLOW_IN_MEMORY_FALLBACK = originalEnv;
        } else {
          delete process.env.ALLOW_IN_MEMORY_FALLBACK;
        }
        process.env.NODE_ENV = originalNodeEnv;
      }
    });
  });
});
