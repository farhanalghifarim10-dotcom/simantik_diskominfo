import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, HttpStatus } from '@nestjs/common';
import { ApplicationsService } from '../src/applications/applications.service.js';
import { MessagesService } from '../src/messages/messages.service.js';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter.js';
import configuration from '../src/config/configuration.js';

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
              allowed_file_types: 'pdf',
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

    it('menolak jika nomor telepon pemohon melebihi 30 karakter', async () => {
      const payload = createValidPayload();
      payload.applicant_phone = '0'.repeat(31);

      await expect(
        applicationsService.submitApplication(payload, [createDummyDoc('req-kak')]),
      ).rejects.toThrow('Nomor telepon pemohon melebihi batas maksimum 30 karakter.');
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
  });
});
