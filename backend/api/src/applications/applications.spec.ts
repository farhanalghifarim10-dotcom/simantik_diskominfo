import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ApplicationsService } from './applications.service.js';
import { ApplicationsController, OpdUnitsController } from './applications.controller.js';
import { ServicesService } from '../services/services.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { SupabaseService } from '../supabase/supabase.service.js';

describe('Public Application Submission Vertical Slice', () => {
  let supabaseMock: SupabaseService;
  let servicesService: ServicesService;
  let applicationsService: ApplicationsService;
  let applicationsController: ApplicationsController;
  let opdUnitsController: OpdUnitsController;

  const validPayload = {
    service_id: '11111111-1111-1111-1111-111111111111', // Pembangunan Aplikasi Baru
    opd_unit_id: 'c1111111-1111-1111-1111-111111111111', // Diskominfo
    applicant_name: 'Dr. Hendra Gunawan, S.Kom, M.T.',
    applicant_employee_id: '198501012010011005',
    applicant_position: 'Kepala Bidang Informatika',
    applicant_email: 'hendra.gunawan@bandungkab.go.id',
    applicant_phone: '081234567890',
    title: 'Sistem Informasi Presensi & Kinerja Terpadu',
    background: 'Kebutuhan pemantauan kehadiran ASN secara real-time berbasis geofencing dan biometrik terintegrasi.',
    problem_statement: 'Pencatatan manual rawan manipulasi data dan tidak dapat terintegrasi dengan penghitungan TPP ASN.',
    objective: 'Mewujudkan digitalisasi absensi presisi tinggi untuk seluruh OPD di Kabupaten Bandung.',
    scope: 'Perekaman absensi mobile, dashboard monitoring BKPSDM, dan integrasi API payroll Bapenda.',
    expected_output: 'Aplikasi mobile cross-platform dan web dashboard monitoring administrator.',
    terms_accepted: true,
    terms_version: 'v1.0-2026',
  };

  const validPdfBase64 = Buffer.from('%PDF-1.4 dummy valid PDF content for unit test').toString('base64');

  const validDocuments = [
    {
      requirement_id: 'a1111111-1111-1111-1111-111111111111', // Surat Permohonan (Wajib)
      original_filename: 'Surat_Permohonan_Kadis.pdf',
      mime_type: 'application/pdf',
      size_bytes: 1024 * 500, // 500 KB
      base64_data: validPdfBase64,
    },
    {
      requirement_id: 'a2222222-2222-2222-2222-222222222222', // KAK (Wajib)
      original_filename: 'Dokumen_KAK_Presensi.pdf',
      mime_type: 'application/pdf',
      size_bytes: 1024 * 1024 * 2, // 2 MB
      base64_data: validPdfBase64,
    },
  ];

  beforeEach(() => {
    supabaseMock = {
      getClient: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: null, error: new Error('DB Offline') }),
          insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
        storage: {
          from: vi.fn().mockReturnValue({
            upload: vi.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
          }),
        },
      }),
    } as unknown as SupabaseService;

    servicesService = new ServicesService(supabaseMock);
    applicationsService = new ApplicationsService(supabaseMock, servicesService);
    applicationsController = new ApplicationsController(applicationsService);
    opdUnitsController = new OpdUnitsController(applicationsService);
  });

  describe('1. OPD Units Retrieval', () => {
    it('should list active OPD units for the applicant dropdown', async () => {
      const response = await opdUnitsController.getOpdUnits();
      expect(response.success).toBe(true);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThan(0);
      expect(response.data.some((o) => o.code === 'DISKOMINFO')).toBe(true);
    });
  });

  describe('2. Validation Failures', () => {
    it('should reject submission if service_id is missing', async () => {
      await expect(
        applicationsController.submit({
          ...validPayload,
          service_id: '',
          documents: validDocuments,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject submission if OPD unit is invalid', async () => {
      await expect(
        applicationsController.submit({
          ...validPayload,
          opd_unit_id: 'invalid-opd-id',
          documents: validDocuments,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject submission with invalid email format', async () => {
      await expect(
        applicationsController.submit({
          ...validPayload,
          applicant_email: 'bukan-email-resmi',
          documents: validDocuments,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject submission if terms are not accepted', async () => {
      await expect(
        applicationsController.submit({
          ...validPayload,
          terms_accepted: false,
          documents: validDocuments,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject enhancement submission missing existing_application_name', async () => {
      await expect(
        applicationsController.submit({
          ...validPayload,
          service_id: '22222222-2222-2222-2222-222222222222', // ENHANCEMENT
          existing_application_name: '',
          documents: [
            {
              requirement_id: 'b1111111-1111-1111-1111-111111111111',
              original_filename: 'Surat_Perubahan.pdf',
              mime_type: 'application/pdf',
              size_bytes: 1000,
              base64_data: validPdfBase64,
            },
            {
              requirement_id: 'b2222222-2222-2222-2222-222222222222',
              original_filename: 'CR.pdf',
              mime_type: 'application/pdf',
              size_bytes: 1000,
              base64_data: validPdfBase64,
            },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject submission when a required document is missing', async () => {
      const missingKakDocuments = [validDocuments[0]];

      await expect(
        applicationsController.submit({
          ...validPayload,
          documents: missingKakDocuments,
        }),
      ).rejects.toThrow(/Dokumen wajib/);
    });

    it('should reject file with unsupported MIME type', async () => {
      const invalidMimeDocuments = [
        ...validDocuments,
        {
          requirement_id: 'a4444444-4444-4444-4444-444444444444',
          original_filename: 'malicious_script.exe',
          mime_type: 'application/x-msdownload',
          size_bytes: 1024,
          base64_data: Buffer.from('dummy exe binary').toString('base64'),
        },
      ];

      await expect(
        applicationsController.submit({
          ...validPayload,
          documents: invalidMimeDocuments,
        }),
      ).rejects.toThrow(/Format berkas/);
    });

    it('should reject .txt file with DOCUMENT_INVALID_TYPE error code', async () => {
      const txtDocuments = [
        ...validDocuments,
        {
          requirement_id: 'a4444444-4444-4444-4444-444444444444',
          original_filename: 'dokumen_catatan.txt',
          mime_type: 'text/plain',
          size_bytes: 1024,
          base64_data: Buffer.from('plain text').toString('base64'),
        },
      ];

      try {
        await applicationsController.submit({
          ...validPayload,
          documents: txtDocuments,
        });
        expect.unreachable('Should have rejected .txt file');
      } catch (err: any) {
        expect(err).toBeInstanceOf(BadRequestException);
        const resp = err.getResponse();
        expect(resp.code).toBe('DOCUMENT_INVALID_TYPE');
        expect(resp.message).toContain('.txt');
      }
    });

    it('should reject spoofed .pdf file when buffer contains plain text without PDF signature', async () => {
      const spoofedDocuments = [
        {
          requirement_id: 'a1111111-1111-1111-1111-111111111111',
          original_filename: 'fake_surat.pdf',
          mime_type: 'application/pdf',
          size_bytes: 1024,
          base64_data: Buffer.from('Ini file teks biasa yang di-rename menjadi pdf').toString('base64'),
        },
        validDocuments[1],
      ];

      try {
        await applicationsController.submit({
          ...validPayload,
          documents: spoofedDocuments,
        });
        expect.unreachable('Should have rejected spoofed PDF');
      } catch (err: any) {
        expect(err).toBeInstanceOf(BadRequestException);
        const resp = err.getResponse();
        expect(resp.code).toBe('DOCUMENT_INVALID_TYPE');
        expect(resp.message).toContain('tanda tangan PDF');
      }
    });

    it('should not persist application to database or upload to storage when document validation fails', async () => {
      const mockStorageUpload = vi.fn();
      const mockDbInsert = vi.fn();

      const customSupabase = {
        getClient: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: null, error: null }),
            insert: mockDbInsert,
          }),
          storage: {
            from: vi.fn().mockReturnValue({
              upload: mockStorageUpload,
            }),
          },
        }),
      } as unknown as SupabaseService;

      const testAppService = new ApplicationsService(customSupabase, servicesService);
      const testController = new ApplicationsController(testAppService);

      const invalidTxtDoc = [
        ...validDocuments,
        {
          requirement_id: 'a4444444-4444-4444-4444-444444444444',
          original_filename: 'unsupported.txt',
          mime_type: 'text/plain',
          size_bytes: 500,
          base64_data: Buffer.from('plain text').toString('base64'),
        },
      ];

      await expect(
        testController.submit({
          ...validPayload,
          documents: invalidTxtDoc,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockStorageUpload).not.toHaveBeenCalled();
      expect(mockDbInsert).not.toHaveBeenCalled();
    });

    it('should reject file exceeding 10 MB limit', async () => {
      const oversizedDocuments = [
        {
          requirement_id: 'a1111111-1111-1111-1111-111111111111',
          original_filename: 'huge_file.pdf',
          mime_type: 'application/pdf',
          size_bytes: 15 * 1024 * 1024, // 15 MB
          base64_data: validPdfBase64,
        },
        validDocuments[1],
      ];

      await expect(
        applicationsController.submit({
          ...validPayload,
          documents: oversizedDocuments,
        }),
      ).rejects.toThrow(/melebihi batas maksimum 10 MB/);
    });

    it('should reject submission with metadata-only document (missing base64_data)', async () => {
      const metadataOnlyDocuments = [
        {
          requirement_id: 'a1111111-1111-1111-1111-111111111111',
          original_filename: 'Surat_Permohonan.pdf',
          mime_type: 'application/pdf',
          size_bytes: 1024,
          // base64_data deliberately omitted
        },
        validDocuments[1],
      ];

      try {
        await applicationsController.submit({
          ...validPayload,
          documents: metadataOnlyDocuments,
        });
        expect.unreachable('Should have rejected metadata-only document');
      } catch (err: any) {
        expect(err).toBeInstanceOf(BadRequestException);
        const resp = err.getResponse();
        expect(resp.code).toBe('DOCUMENT_INVALID_TYPE');
        expect(resp.message).toContain('data konten biner');
      }
    });

    it('should reject submission with empty base64_data string', async () => {
      const emptyBase64Documents = [
        {
          requirement_id: 'a1111111-1111-1111-1111-111111111111',
          original_filename: 'Surat_Permohonan.pdf',
          mime_type: 'application/pdf',
          size_bytes: 1024,
          base64_data: '   ',
        },
        validDocuments[1],
      ];

      try {
        await applicationsController.submit({
          ...validPayload,
          documents: emptyBase64Documents,
        });
        expect.unreachable('Should have rejected empty base64 string');
      } catch (err: any) {
        expect(err).toBeInstanceOf(BadRequestException);
        const resp = err.getResponse();
        expect(resp.code).toBe('DOCUMENT_INVALID_TYPE');
        expect(resp.message).toContain('data konten biner');
      }
    });

    it('should reject submission with filename containing control characters or null bytes', async () => {
      const controlCharDocuments = [
        {
          requirement_id: 'a1111111-1111-1111-1111-111111111111',
          original_filename: 'Surat\x00_Kadis.pdf',
          mime_type: 'application/pdf',
          size_bytes: 1024,
          base64_data: validPdfBase64,
        },
        validDocuments[1],
      ];

      try {
        await applicationsController.submit({
          ...validPayload,
          documents: controlCharDocuments,
        });
        expect.unreachable('Should have rejected control characters');
      } catch (err: any) {
        expect(err).toBeInstanceOf(BadRequestException);
        const resp = err.getResponse();
        expect(resp.code).toBe('DOCUMENT_INVALID_TYPE');
        expect(resp.message).toContain('karakter kontrol atau null byte');
      }
    });
  });

  describe('3. Successful Submission & Ticket Generation', () => {
    it('should successfully submit application and issue ticket and tracking code', async () => {
      const response = await applicationsController.submit({
        ...validPayload,
        documents: validDocuments,
      });

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();

      expect(response.data.ticket_number).toMatch(/^SIM-2026-\d{6}$/);

      expect(response.data.tracking_code).toMatch(/^TRK-[0-9A-F]{8}$/);

      expect(response.data.current_status).toBe('SUBMITTED');

      expect(response.data.terms_version).toBe('v1.0-2026');
      expect(response.data.format_note).toContain('[IMPLEMENTATION ASSUMPTION]');
      expect(response.data.documents_count).toBe(2);
    });
  });

  describe('4. Idempotency Handling', () => {
    it('should return existing application when submitted with the same idempotency_key', async () => {
      const idempotencyKey = 'unique-submit-key-12345';

      const firstSubmit = await applicationsController.submit({
        ...validPayload,
        idempotency_key: idempotencyKey,
        documents: validDocuments,
      });

      const secondSubmit = await applicationsController.submit({
        ...validPayload,
        idempotency_key: idempotencyKey,
        documents: validDocuments,
      });

      expect(secondSubmit.success).toBe(true);
      expect(secondSubmit.data.ticket_number).toBe(firstSubmit.data.ticket_number);
      expect(secondSubmit.data.id).toBe(firstSubmit.data.id);
    });
  });

  describe('5. Database Persistence & Error Handling Resilience', () => {
    it('should throw BadRequestException and NOT return false success when applicant insert fails with FK violation (23503)', async () => {
      const customSupabase = {
        getClient: vi.fn().mockReturnValue({
          from: vi.fn().mockImplementation((table: string) => {
            if (table === 'opd_units') {
              return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({ data: null, error: null }),
              };
            }
            if (table === 'applicants') {
              return {
                insert: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'violates foreign key constraint on opd_unit_id', code: '23503' },
                }),
                delete: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              };
            }
            return {
              insert: vi.fn().mockResolvedValue({ data: null, error: null }),
            };
          }),
          storage: {
            from: vi.fn().mockReturnValue({
              upload: vi.fn().mockResolvedValue({ data: null, error: null }),
              remove: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          },
        }),
      } as unknown as SupabaseService;

      const appService = new ApplicationsService(customSupabase, servicesService);
      const controller = new ApplicationsController(appService);

      await expect(
        controller.submit({
          ...validPayload,
          documents: validDocuments,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should rollback applicant record and throw BadRequestException when application insert fails with FK violation', async () => {
      const mockApplicantDelete = vi.fn().mockResolvedValue({ data: null, error: null });

      const customSupabase = {
        getClient: vi.fn().mockReturnValue({
          from: vi.fn().mockImplementation((table: string) => {
            if (table === 'opd_units') {
              return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({ data: null, error: null }),
              };
            }
            if (table === 'applicants') {
              return {
                insert: vi.fn().mockResolvedValue({ data: null, error: null }),
                delete: vi.fn().mockReturnValue({
                  eq: mockApplicantDelete,
                }),
              };
            }
            if (table === 'applications') {
              return {
                insert: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'violates foreign key constraint on service_id', code: '23503' },
                }),
                delete: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              };
            }
            return {
              insert: vi.fn().mockResolvedValue({ data: null, error: null }),
            };
          }),
          storage: {
            from: vi.fn().mockReturnValue({
              upload: vi.fn().mockResolvedValue({ data: null, error: null }),
              remove: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          },
        }),
      } as unknown as SupabaseService;

      const appService = new ApplicationsService(customSupabase, servicesService);
      const controller = new ApplicationsController(appService);

      await expect(
        controller.submit({
          ...validPayload,
          documents: validDocuments,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockApplicantDelete).toHaveBeenCalled();
    });

    it('should execute rollback compensation across tables and storage when status history insert fails', async () => {
      const mockAppDelete = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockApplicantDelete = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockDocDelete = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockStorageRemove = vi.fn().mockResolvedValue({ data: null, error: null });

      const customSupabase = {
        getClient: vi.fn().mockReturnValue({
          from: vi.fn().mockImplementation((table: string) => {
            if (table === 'opd_units') {
              return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({ data: null, error: null }),
              };
            }
            if (table === 'applicants') {
              return {
                insert: vi.fn().mockResolvedValue({ data: null, error: null }),
                delete: vi.fn().mockReturnValue({ eq: mockApplicantDelete }),
              };
            }
            if (table === 'applications') {
              return {
                insert: vi.fn().mockResolvedValue({ data: null, error: null }),
                delete: vi.fn().mockReturnValue({ eq: mockAppDelete }),
              };
            }
            if (table === 'application_documents') {
              return {
                insert: vi.fn().mockResolvedValue({ data: null, error: null }),
                delete: vi.fn().mockReturnValue({ eq: mockDocDelete }),
              };
            }
            if (table === 'application_status_history') {
              return {
                insert: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Database connection dropped abruptly', code: '08006' },
                }),
                delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) }),
              };
            }
            return {
              insert: vi.fn().mockResolvedValue({ data: null, error: null }),
            };
          }),
          storage: {
            from: vi.fn().mockReturnValue({
              upload: vi.fn().mockResolvedValue({ data: { path: 'test' }, error: null }),
              remove: mockStorageRemove,
            }),
          },
        }),
      } as unknown as SupabaseService;

      const appService = new ApplicationsService(customSupabase, servicesService);
      const controller = new ApplicationsController(appService);

      await expect(
        controller.submit({
          ...validPayload,
          documents: validDocuments,
        }),
      ).rejects.toThrow(InternalServerErrorException);

      expect(mockDocDelete).toHaveBeenCalled();
      expect(mockAppDelete).toHaveBeenCalled();
      expect(mockApplicantDelete).toHaveBeenCalled();
    });
  });

  describe('6. Strict Base64 & Random UUID Storage Key Verification', () => {
    it('should accept document with explicit Data URL base64 format', async () => {
      const dataUrlDocuments = [
        {
          ...validDocuments[0],
          base64_data: `data:application/pdf;base64,${validPdfBase64}`,
        },
        validDocuments[1],
      ];

      const res = await applicationsController.submit({
        ...validPayload,
        documents: dataUrlDocuments,
      });

      expect(res.success).toBe(true);
      expect(res.data.documents_count).toBe(2);
    });

    it('should reject malformed base64 with foreign characters without DB/Storage mutation', async () => {
      const mockStorageUpload = vi.fn();
      const mockDbInsert = vi.fn();

      const customSupabase = {
        getClient: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: null, error: null }),
            insert: mockDbInsert,
          }),
          storage: {
            from: vi.fn().mockReturnValue({
              upload: mockStorageUpload,
            }),
          },
        }),
      } as unknown as SupabaseService;

      const appService = new ApplicationsService(customSupabase, servicesService);
      const controller = new ApplicationsController(appService);

      const malformedDocs = [
        {
          ...validDocuments[0],
          base64_data: 'JVBERi0xLjQ=!!!MALFORMED-FOREIGN-CHARS!!!',
        },
        validDocuments[1],
      ];

      try {
        await controller.submit({
          ...validPayload,
          documents: malformedDocs,
        });
        expect.unreachable('Should have rejected malformed base64 with foreign characters');
      } catch (err: any) {
        expect(err).toBeInstanceOf(BadRequestException);
        expect(err.getResponse().code).toBe('DOCUMENT_INVALID_TYPE');
      }

      expect(mockStorageUpload).not.toHaveBeenCalled();
      expect(mockDbInsert).not.toHaveBeenCalled();
    });

    it('should reject non-canonical base64 encoding (e.g. non-zero padding bits) without mutation', async () => {
      const mockStorageUpload = vi.fn();
      const mockDbInsert = vi.fn();

      const customSupabase = {
        getClient: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: null, error: null }),
            insert: mockDbInsert,
          }),
          storage: {
            from: vi.fn().mockReturnValue({
              upload: mockStorageUpload,
            }),
          },
        }),
      } as unknown as SupabaseService;

      const appService = new ApplicationsService(customSupabase, servicesService);
      const controller = new ApplicationsController(appService);

      const nonCanonicalDocs = [
        {
          ...validDocuments[0],
          base64_data: 'AB==',
        },
        validDocuments[1],
      ];

      try {
        await controller.submit({
          ...validPayload,
          documents: nonCanonicalDocs,
        });
        expect.unreachable('Should have rejected non-canonical base64');
      } catch (err: any) {
        expect(err).toBeInstanceOf(BadRequestException);
        expect(err.getResponse().code).toBe('DOCUMENT_INVALID_TYPE');
      }

      expect(mockStorageUpload).not.toHaveBeenCalled();
      expect(mockDbInsert).not.toHaveBeenCalled();
    });

    it('should generate server-generated UUID storage key and completely omit original_filename from the key path', async () => {
      const uploadedPaths: string[] = [];
      const insertedDocRecords: any[] = [];

      const customSupabase = {
        getClient: vi.fn().mockReturnValue({
          from: vi.fn().mockImplementation((table: string) => {
            if (table === 'opd_units') {
              return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({ data: null, error: null }),
              };
            }
            if (table === 'application_documents') {
              return {
                insert: vi.fn().mockImplementation((records) => {
                  insertedDocRecords.push(...(Array.isArray(records) ? records : [records]));
                  return Promise.resolve({ data: records, error: null });
                }),
              };
            }
            return {
              insert: vi.fn().mockResolvedValue({ data: null, error: null }),
            };
          }),
          storage: {
            from: vi.fn().mockReturnValue({
              upload: vi.fn().mockImplementation((path: string) => {
                uploadedPaths.push(path);
                return Promise.resolve({ data: { path }, error: null });
              }),
            }),
          },
        }),
      } as unknown as SupabaseService;

      const appService = new ApplicationsService(customSupabase, servicesService);
      const controller = new ApplicationsController(appService);

      const res = await controller.submit({
        ...validPayload,
        documents: [
          {
            requirement_id: 'a1111111-1111-1111-1111-111111111111',
            original_filename: 'Surat Permohonan Kadis Resmi DISKOMINFO.pdf',
            mime_type: 'application/pdf',
            size_bytes: 1024 * 100,
            base64_data: validPdfBase64,
          },
          {
            requirement_id: 'a2222222-2222-2222-2222-222222222222',
            original_filename: 'Dokumen KAK Presensi & Kinerja 2026.pdf',
            mime_type: 'application/pdf',
            size_bytes: 1024 * 200,
            base64_data: validPdfBase64,
          },
        ],
      });

      expect(res.success).toBe(true);
      expect(uploadedPaths.length).toBe(2);

      const ticketNumber = res.data.ticket_number;

      for (const storagePath of uploadedPaths) {
        const uuidRegex = new RegExp(`^applications\\/${ticketNumber}\\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\\.pdf$`);
        expect(storagePath).toMatch(uuidRegex);

        expect(storagePath).not.toContain('Surat');
        expect(storagePath).not.toContain('Permohonan');
        expect(storagePath).not.toContain('Kadis');
        expect(storagePath).not.toContain('DISKOMINFO');
        expect(storagePath).not.toContain('KAK');
        expect(storagePath).not.toContain('Presensi');
      }

      expect(insertedDocRecords.length).toBe(2);
      expect(insertedDocRecords[0].original_filename).toBe('Surat Permohonan Kadis Resmi DISKOMINFO.pdf');
      expect(insertedDocRecords[0].storage_path).toBe(uploadedPaths[0]);
      expect(insertedDocRecords[1].original_filename).toBe('Dokumen KAK Presensi & Kinerja 2026.pdf');
      expect(insertedDocRecords[1].storage_path).toBe(uploadedPaths[1]);
    });

    it('should safely sanitize Unicode filename and generate clean ASCII UUID storage key', async () => {
      const uploadedPaths: string[] = [];
      const insertedDocRecords: any[] = [];

      const customSupabase = {
        getClient: vi.fn().mockReturnValue({
          from: vi.fn().mockImplementation((table: string) => {
            if (table === 'opd_units') {
              return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({ data: null, error: null }),
              };
            }
            if (table === 'application_documents') {
              return {
                insert: vi.fn().mockImplementation((records) => {
                  insertedDocRecords.push(...(Array.isArray(records) ? records : [records]));
                  return Promise.resolve({ data: records, error: null });
                }),
              };
            }
            return {
              insert: vi.fn().mockResolvedValue({ data: null, error: null }),
            };
          }),
          storage: {
            from: vi.fn().mockReturnValue({
              upload: vi.fn().mockImplementation((path: string) => {
                uploadedPaths.push(path);
                return Promise.resolve({ data: { path }, error: null });
              }),
            }),
          },
        }),
      } as unknown as SupabaseService;

      const appService = new ApplicationsService(customSupabase, servicesService);
      const controller = new ApplicationsController(appService);

      const unicodeName = 'Surat_Permohonan_📄_Bandung_Bedas_✨_Resmi.pdf';

      const res = await controller.submit({
        ...validPayload,
        documents: [
          {
            requirement_id: 'a1111111-1111-1111-1111-111111111111',
            original_filename: unicodeName,
            mime_type: 'application/pdf',
            size_bytes: 1024 * 100,
            base64_data: validPdfBase64,
          },
          validDocuments[1],
        ],
      });

      expect(res.success).toBe(true);
      expect(uploadedPaths.length).toBe(2);

      expect(uploadedPaths[0]).toMatch(/^applications\/SIM-2026-\d{6}\/[a-f0-9-]{36}\.pdf$/);
      expect(uploadedPaths[0]).not.toContain('Bandung');
      expect(uploadedPaths[0]).not.toContain('Bedas');
      expect(uploadedPaths[0]).not.toContain('📄');

      expect(insertedDocRecords[0].original_filename).toBe(unicodeName);
      expect(insertedDocRecords[0].storage_path).toBe(uploadedPaths[0]);
    });

    it('should reject filename exceeding 255 characters without DB/Storage mutation', async () => {
      const mockStorageUpload = vi.fn();
      const mockDbInsert = vi.fn();

      const customSupabase = {
        getClient: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: null, error: null }),
            insert: mockDbInsert,
          }),
          storage: {
            from: vi.fn().mockReturnValue({
              upload: mockStorageUpload,
            }),
          },
        }),
      } as unknown as SupabaseService;

      const appService = new ApplicationsService(customSupabase, servicesService);
      const controller = new ApplicationsController(appService);

      const overlyLongFilename = 'a'.repeat(256) + '.pdf';

      try {
        await controller.submit({
          ...validPayload,
          documents: [
            {
              ...validDocuments[0],
              original_filename: overlyLongFilename,
            },
            validDocuments[1],
          ],
        });
        expect.unreachable('Should have rejected overly long filename');
      } catch (err: any) {
        expect(err).toBeInstanceOf(BadRequestException);
        expect(err.getResponse().code).toBe('DOCUMENT_INVALID_TYPE');
        expect(err.getResponse().message).toContain('maksimal 255 karakter');
      }

      expect(mockStorageUpload).not.toHaveBeenCalled();
      expect(mockDbInsert).not.toHaveBeenCalled();
    });

    it('should clean up storage using the exact UUID keys when subsequent DB insert fails', async () => {
      const uploadedPaths: string[] = [];
      const mockStorageRemove = vi.fn().mockResolvedValue({ data: null, error: null });

      const customSupabase = {
        getClient: vi.fn().mockReturnValue({
          from: vi.fn().mockImplementation((table: string) => {
            if (table === 'opd_units') {
              return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({ data: null, error: null }),
              };
            }
            if (table === 'application_status_history') {
              return {
                insert: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Connection dropped abruptly', code: '08006' },
                }),
                delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) }),
              };
            }
            return {
              insert: vi.fn().mockResolvedValue({ data: null, error: null }),
              delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) }),
            };
          }),
          storage: {
            from: vi.fn().mockReturnValue({
              upload: vi.fn().mockImplementation((path: string) => {
                uploadedPaths.push(path);
                return Promise.resolve({ data: { path }, error: null });
              }),
              remove: mockStorageRemove,
            }),
          },
        }),
      } as unknown as SupabaseService;

      const appService = new ApplicationsService(customSupabase, servicesService);
      const controller = new ApplicationsController(appService);

      await expect(
        controller.submit({
          ...validPayload,
          documents: validDocuments,
        }),
      ).rejects.toThrow(InternalServerErrorException);

      expect(uploadedPaths.length).toBe(2);
      expect(mockStorageRemove).toHaveBeenCalledTimes(1);
      const cleanedPaths = mockStorageRemove.mock.calls[0][0];
      expect(cleanedPaths).toEqual(uploadedPaths);
      for (const p of cleanedPaths) {
        expect(p).toMatch(/^applications\/SIM-2026-\d{6}\/[a-f0-9-]{36}\.pdf$/);
      }
    });
  });

  describe('7. Public Submission Audit Logging (Phase 19)', () => {
    it('catat event APPLICATION_SUBMITTED dengan metadata minimum setelah submission berhasil dipersistenkan', async () => {
      const mockAuditService = {
        record: vi.fn().mockResolvedValue({ id: 'aud-test-1' }),
      } as unknown as AuditService;

      const appService = new ApplicationsService(
        supabaseMock,
        servicesService,
        undefined,
        mockAuditService,
      );
      const controller = new ApplicationsController(appService);

      const res = await controller.submit({
        ...validPayload,
        documents: validDocuments,
      });

      expect(res.success).toBe(true);
      expect(mockAuditService.record).toHaveBeenCalledTimes(1);

      const auditCall = vi.mocked(mockAuditService.record).mock.calls[0][0];
      expect(auditCall.action).toBe('APPLICATION_SUBMITTED');
      expect(auditCall.entity_type).toBe('applications');
      expect(auditCall.actor_profile_id).toBeNull();
      expect(auditCall.application_id).toBe(res.data.id);
      expect(auditCall.entity_id).toBe(res.data.id);
      expect(auditCall.old_data).toBeNull();

      expect(auditCall.new_data).toBeDefined();
      expect(auditCall.new_data?.ticket_number).toBe(res.data.ticket_number);
      expect(auditCall.new_data?.service_id).toBe(validPayload.service_id);
      expect(auditCall.new_data?.title).toBe(validPayload.title);
      expect(auditCall.new_data?.documents_count).toBe(validDocuments.length);
      expect(auditCall.new_data?.terms_version).toBe(validPayload.terms_version);

      expect(auditCall.new_data?.tracking_code).toBeUndefined();
      expect(auditCall.new_data?.tracking_code_hash).toBeUndefined();
      expect(auditCall.new_data?.password).toBeUndefined();
      expect(auditCall.new_data?.documents).toBeUndefined();
    });

    it('tidak mencatat audit event sukses ketika submission gagal pada validasi', async () => {
      const mockAuditService = {
        record: vi.fn(),
      } as unknown as AuditService;

      const appService = new ApplicationsService(
        supabaseMock,
        servicesService,
        undefined,
        mockAuditService,
      );
      const controller = new ApplicationsController(appService);

      await expect(
        controller.submit({
          ...validPayload,
          documents: [],
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockAuditService.record).not.toHaveBeenCalled();
    });

    it('tidak mencatat audit event sukses ketika insert database permohonan gagal', async () => {
      const mockAuditService = {
        record: vi.fn(),
      } as unknown as AuditService;

      const failingSupabase = {
        getClient: vi.fn().mockReturnValue({
          from: vi.fn().mockImplementation((table: string) => {
            if (table === 'applications') {
              return {
                insert: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Database connection dropped', code: '08006' },
                }),
                delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) }),
              };
            }
            return {
              insert: vi.fn().mockResolvedValue({ data: null, error: null }),
              delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) }),
            };
          }),
          storage: {
            from: vi.fn().mockReturnValue({
              upload: vi.fn().mockResolvedValue({ data: { path: 'test' }, error: null }),
              remove: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          },
        }),
      } as unknown as SupabaseService;

      const appService = new ApplicationsService(
        failingSupabase,
        servicesService,
        undefined,
        mockAuditService,
      );
      const controller = new ApplicationsController(appService);

      await expect(
        controller.submit({
          ...validPayload,
          documents: validDocuments,
        }),
      ).rejects.toThrow(InternalServerErrorException);

      expect(mockAuditService.record).not.toHaveBeenCalled();
    });

    it('menangani kegagalan audit insert secara aman (fail-safe) tanpa membatalkan submission pemohon', async () => {
      const mockAuditService = {
        record: vi.fn().mockRejectedValue(new Error('Audit DB table locked')),
      } as unknown as AuditService;

      const appService = new ApplicationsService(
        supabaseMock,
        servicesService,
        undefined,
        mockAuditService,
      );
      const controller = new ApplicationsController(appService);

      const res = await controller.submit({
        ...validPayload,
        documents: validDocuments,
      });

      expect(res.success).toBe(true);
      expect(res.data.ticket_number).toBeDefined();
      expect(res.data.tracking_code).toBeDefined();
      expect(mockAuditService.record).toHaveBeenCalledTimes(1);
    });
  });
});
