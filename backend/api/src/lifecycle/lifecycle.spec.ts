import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { LifecycleService } from './lifecycle.service.js';
import { LifecycleController } from './lifecycle.controller.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';

describe('LifecycleService', () => {
  let service: LifecycleService;
  let mockSupabaseService: any;
  let mockAssignmentsService: any;

  const superAdminUser: AuthenticatedUser = {
    id: 'user-admin-1',
    email: 'admin@bandungkab.go.id',
    fullName: 'Super Administrator',
    role: 'SUPER_ADMIN',
  };

  const assignedTechnicianUser: AuthenticatedUser = {
    id: 'tech-123',
    email: 'tech1@bandungkab.go.id',
    fullName: 'Teknisi Ditugaskan',
    role: 'TECHNICIAN',
  };

  const unassignedTechnicianUser: AuthenticatedUser = {
    id: 'tech-999',
    email: 'tech2@bandungkab.go.id',
    fullName: 'Teknisi Lain',
    role: 'TECHNICIAN',
  };

  const applicantUser: AuthenticatedUser = {
    id: 'applicant-1',
    email: 'opd@bandungkab.go.id',
    fullName: 'Pemohon OPD',
    role: 'TECHNICIAN',
  };

  beforeEach(() => {
    mockSupabaseService = {
      getClient: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
        storage: {
          from: vi.fn().mockReturnValue({
            upload: vi.fn().mockResolvedValue({ data: {}, error: null }),
            createSignedUrl: vi.fn().mockResolvedValue({
              data: { signedUrl: 'https://storage.test/signed-doc' },
              error: null,
            }),
          }),
        },
      }),
    };

    mockAssignmentsService = {
      checkTechnicianAuthorization: vi.fn().mockImplementation((appId, techId) => {
        return Promise.resolve(techId === 'tech-123');
      }),
    };

    service = new LifecycleService(mockSupabaseService, mockAssignmentsService);
  });

  describe('Authorization Rules', () => {
    const appId = 'app-test-101';

    it('allows SUPER_ADMIN full access to lifecycle operations', async () => {
      await expect(service.assertLifecycleAccess(appId, superAdminUser)).resolves.not.toThrow();
    });

    it('allows assigned TECHNICIAN to access lifecycle operations', async () => {
      await expect(service.assertLifecycleAccess(appId, assignedTechnicianUser)).resolves.not.toThrow();
    });

    it('strictly forbids unassigned TECHNICIAN from accessing lifecycle operations', async () => {
      await expect(
        service.assertLifecycleAccess(appId, unassignedTechnicianUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('strictly forbids APPLICANT from accessing internal lifecycle operations', async () => {
      await expect(
        service.assertLifecycleAccess(appId, applicantUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('ANALYSIS Stage Management', () => {
    const appId = 'app-test-analysis';

    it('upserts and retrieves analysis record for assigned technician', async () => {
      const dto = {
        problems: 'Kendala pendataan manual aset SPBE',
        needs: 'Sistem terintegrasi dengan validasi otomatis',
        stakeholders: 'Diskominfo, BPKAD, Seluruh OPD',
        objectives: 'Meningkatkan akurasi pelaporan aset TI',
        scope: 'Pemerintah Kabupaten Bandung',
        risks: 'Keterlambatan input data unit kerja',
        target_users: 'Pengurus barang OPD',
        target_timeline: '3 bulan',
        target_location: 'Diskominfo Soreang',
        supporting_analysis: 'Kesesuaian dengan Arsitektur SPBE Pemda',
      };

      const result = await service.upsertAnalysis(appId, dto, assignedTechnicianUser);
      expect(result).toBeDefined();
      expect(result.problems).toBe(dto.problems);
      expect(result.objectives).toBe(dto.objectives);

      const fetched = await service.getAnalysis(appId, superAdminUser);
      expect(fetched).toBeDefined();
      expect(fetched?.needs).toBe(dto.needs);
    });
  });

  describe('PLANNING Stage (Project Plan)', () => {
    const appId = 'app-test-planning';

    it('upserts and retrieves project plan record', async () => {
      const dto = {
        scope: 'Pengembangan modul backend dan antarmuka web',
        business_process: 'Verifikasi usulan -> Analisis -> Pengujian -> Serah Terima',
        technical_approach: 'Vite React + NestJS + PostgreSQL',
        executor: 'Tim Pengembang Diskominfo',
        roles_and_responsibilities: 'Tech Lead: Bpk A, Programmer: Sdr B',
        planned_start_date: '2026-10-10',
        planned_end_date: '2026-12-15',
        security_plan: 'Autentikasi JWT, HTTPS, Audit Trail',
        resource_plan: '1 Server VM, 2 Pengembang',
        success_indicators: '100% lulus uji kelaikan fungsi dan keamanan',
        knowledge_transfer_plan: 'Bimtek dan Manual Book untuk admin OPD',
        monitoring_plan: 'Weekly sprint review setiap hari Jumat',
        reporting_plan: 'Laporan bulanan berkala ke Kepala Dinas',
      };

      const plan = await service.upsertProjectPlan(appId, dto, superAdminUser);
      expect(plan).toBeDefined();
      expect(plan.planned_start_date).toBe('2026-10-10');
      expect(plan.executor).toBe('Tim Pengembang Diskominfo');

      const fetched = await service.getProjectPlan(appId, assignedTechnicianUser);
      expect(fetched?.scope).toBe(dto.scope);
    });
  });

  describe('DESIGN Stage', () => {
    const appId = 'app-test-design';

    it('upserts and retrieves design specifications', async () => {
      const dto = {
        architecture_model: 'Microservices modular monolith',
        process_flow: 'BPMN alur pengajuan permohonan SIMANTIK',
        function_mapping: 'Modul Admin, Modul Pemohon, Modul Teknisi',
        database_mapping: 'Skema PostgreSQL: applications, lifecycle, audit',
        role_access_mapping: 'SUPER_ADMIN, TECHNICIAN, APPLICANT',
        ui_navigation: 'Figma prototype versi 1.2',
        internal_control: 'Audit trail semua mutasi data',
        integration_design: 'REST API JSON dengan API Gateway Pemda',
      };

      const design = await service.upsertDesign(appId, dto, assignedTechnicianUser);
      expect(design.architecture_model).toBe(dto.architecture_model);
      expect(design.ui_navigation).toBe(dto.ui_navigation);
    });
  });

  describe('IMPLEMENTATION Stage', () => {
    const appId = 'app-test-implementation';

    it('upserts implementation and handover details', async () => {
      const dto = {
        software_dev_records: 'Git repo: gitlab.bandungkab.go.id/diskominfo/simantik-api tag v1.0.0',
        database_implementation: 'Migration 20261008170000 sukses dijalankan',
        quality_control: 'Unit testing 100% pass, Oxlint zero errors',
        installation_config: 'Docker compose di server datacenter Pemda',
        api_interoperability: 'OpenAPI 3.0 spec /api/v1',
        documentation_notes: 'Buku panduan pengoperasian teknis selesai',
        knowledge_transfer: 'Pelatihan teknis dilaksanakan 2 hari',
        handover_notes: 'BAST Nomor: 005/BAST/DISKOMINFO/2026',
      };

      const impl = await service.upsertImplementation(appId, dto, superAdminUser);
      expect(impl.software_dev_records).toContain('simantik-api');
      expect(impl.handover_notes).toContain('BAST');
    });
  });

  describe('TESTING Records', () => {
    const appId = 'app-test-records';

    it('creates, filters, and retrieves test records across all 4 dimensions', async () => {
      const test = await service.createTest(
        appId,
        {
          test_type: 'FUNCTION',
          test_name: 'Uji Validasi Form Usulan',
          test_scope: 'Formulir permohonan baru',
          test_criteria: 'Field mandatori tidak boleh kosong',
          test_scenario: 'Input data valid dan invalid',
          expected_result: 'Pesan error muncul jika field wajib kosong',
          actual_result: 'Validasi form berjalan sempurna',
          findings: 'Tidak ditemukan bug',
          corrective_action: 'Tidak diperlukan',
          result: 'PASS',
          tester: 'Sdr. QA Diskominfo',
          testing_time: '2026-10-08T10:00:00Z',
          attachment_base64: Buffer.from('UAT_REPORT_DOC').toString('base64'),
          attachment_filename: 'uat_signoff.pdf',
        },
        assignedTechnicianUser,
      );

      expect(test.id).toBeDefined();
      expect(test.test_type).toBe('FUNCTION');
      expect(test.result).toBe('PASS');
      expect(test.tester).toBe('Sdr. QA Diskominfo');
      expect(test.attachment_filename).toBe('uat_signoff.pdf');

      // Create a load test record
      await service.createTest(
        appId,
        {
          test_type: 'LOAD',
          test_name: 'Uji Beban 500 CCU',
          result: 'PASS_WITH_NOTES',
          findings: 'Response time naik menjadi 1.2s saat peak',
        },
        assignedTechnicianUser,
      );

      // Create a security test record
      await service.createTest(
        appId,
        {
          test_type: 'SECURITY',
          test_name: 'Penetration Testing OWASP Top 10',
          result: 'PASS',
        },
        assignedTechnicianUser,
      );

      // Create an integration test record
      await service.createTest(
        appId,
        {
          test_type: 'INTEGRATION',
          test_name: 'Uji Sinkronisasi API Gateway Pemda',
          result: 'FAIL',
          corrective_action: 'Periksa timeout setting di gateway',
        },
        assignedTechnicianUser,
      );

      // Filter by type
      const funcTests = await service.getTests(appId, superAdminUser, { type: 'FUNCTION' });
      expect(funcTests.length).toBe(1);
      expect(funcTests[0].test_type).toBe('FUNCTION');

      // Filter by result
      const passTests = await service.getTests(appId, superAdminUser, { result: 'PASS' });
      expect(passTests.length).toBe(2);

      // Get single detail
      const singleTest = await service.getTest(appId, test.id, assignedTechnicianUser);
      expect(singleTest.test_name).toBe('Uji Validasi Form Usulan');
      expect(singleTest.test_scope).toBe('Formulir permohonan baru');

      // Update test record
      const updated = await service.updateTest(
        appId,
        test.id,
        {
          findings: 'Catatan tambahan pasca re-test',
          result: 'PASS',
        },
        assignedTechnicianUser,
      );
      expect(updated.findings).toBe('Catatan tambahan pasca re-test');

      // Get signed attachment URL
      const attachmentUrl = await service.getTestAttachmentUrl(appId, test.id, superAdminUser);
      expect(attachmentUrl.signed_url).toBeDefined();
      expect(attachmentUrl.filename).toBe('uat_signoff.pdf');
    });

    it('rejects test record creation with empty name', async () => {
      await expect(
        service.createTest(
          appId,
          {
            test_type: 'SECURITY',
            test_name: '',
          },
          assignedTechnicianUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('MAINTENANCE Records', () => {
    const appId = 'app-maint-records';

    it('creates, updates, and retrieves maintenance records across 4 types', async () => {
      const record = await service.createMaintenanceRecord(
        appId,
        {
          maintenance_type: 'CORRECTIVE',
          reason: 'Error format pelaporan NIP pada ekspor Excel',
          description: 'NIP lebih dari 16 digit terpotong format numerik',
          action_taken: 'Mengubah format sel sheet menjadi text murni',
          result: 'Export NIP berhasil tampil 18 digit lengkap tanpa format scientific',
          start_time: '2026-10-08T09:00:00Z',
          end_time: '2026-10-08T11:30:00Z',
          executor: 'Tim Programmer Diskominfo',
          attachment_base64: Buffer.from('PATCH_LOG').toString('base64'),
          attachment_filename: 'patch_notes.txt',
        },
        assignedTechnicianUser,
      );

      expect(record.id).toBeDefined();
      expect(record.maintenance_type).toBe('CORRECTIVE');
      expect(record.executor).toBe('Tim Programmer Diskominfo');
      expect(record.attachment_filename).toBe('patch_notes.txt');

      // Create PREVENTIVE record
      await service.createMaintenanceRecord(
        appId,
        {
          maintenance_type: 'PREVENTIVE',
          reason: 'Pembersihan log berkala dan backup database rutin',
          description: 'Vacuum Postgres and log rotation',
          action_taken: 'Menjalankan script maintenance mingguan',
          result: 'Disk space berkurang 12GB',
          start_time: '2026-10-08T02:00:00Z',
          end_time: '2026-10-08T03:00:00Z',
          executor: 'Sysadmin Datacenter',
        },
        superAdminUser,
      );

      // Create PERFECTIVE record
      await service.createMaintenanceRecord(
        appId,
        {
          maintenance_type: 'PERFECTIVE',
          reason: 'Optimasi query laporan bulanan',
          description: 'Tambahkan indeks pada kolom application_id',
          action_taken: 'CREATE INDEX CONCURRENTLY',
          result: 'Query latency turun dari 4.2s ke 120ms',
          start_time: '2026-10-08T13:00:00Z',
          end_time: '2026-10-08T14:00:00Z',
          executor: 'Database Engineer',
        },
        superAdminUser,
      );

      // Create ADAPTIVE record
      await service.createMaintenanceRecord(
        appId,
        {
          maintenance_type: 'ADAPTIVE',
          reason: 'Perubahan endpoint Single Sign-On Pemprov Jabar',
          description: 'Migrasi ke OAuth 2.0 PKCE flow baru',
          action_taken: 'Update konfigurasi auth provider URL',
          result: 'SSO terhubung kembali dengan normal',
          start_time: '2026-10-08T15:00:00Z',
          end_time: '2026-10-08T16:00:00Z',
          executor: 'Backend Lead',
        },
        superAdminUser,
      );

      // Filter by type
      const correctiveList = await service.getMaintenanceRecords(appId, superAdminUser, {
        type: 'CORRECTIVE',
      });
      expect(correctiveList.length).toBe(1);
      expect(correctiveList[0].maintenance_type).toBe('CORRECTIVE');

      // Get single detail
      const detail = await service.getMaintenanceRecord(appId, record.id, assignedTechnicianUser);
      expect(detail.reason).toContain('Error format pelaporan NIP');

      // Update maintenance record
      const updated = await service.updateMaintenanceRecord(
        appId,
        record.id,
        {
          result: 'Diverifikasi kembali oleh penanggung jawab OPD',
        },
        assignedTechnicianUser,
      );
      expect(updated.result).toBe('Diverifikasi kembali oleh penanggung jawab OPD');

      // Get signed attachment URL
      const attachment = await service.getMaintenanceAttachmentUrl(
        appId,
        record.id,
        assignedTechnicianUser,
      );
      expect(attachment.signed_url).toBeDefined();
      expect(attachment.filename).toBe('patch_notes.txt');
    });

    it('rejects maintenance record with empty reason or description', async () => {
      await expect(
        service.createMaintenanceRecord(
          appId,
          {
            maintenance_type: 'CORRECTIVE',
            reason: '',
            description: '',
          },
          assignedTechnicianUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('EVALUATION Records', () => {
    const appId = 'app-eval-records';

    it('creates, updates, and retrieves post-implementation evaluation records', async () => {
      const evaluation = await service.createEvaluation(
        appId,
        {
          evaluation_date: '2026-10-08',
          success_indicators: '90% pengguna OPD dapat mengajukan usulan tanpa kendala',
          achievement: 'Tercapai 94% kepuasan layanan per kuartal III 2026',
          findings: 'Perlu penambahan panduan video singkat untuk operator baru',
          recommendations: 'Menyelenggarakan webinar pendampingan berkala',
          follow_up: 'Jadwalkan bimtek daring akhir bulan ini',
          evaluator: 'Tim Evaluasi TI Diskominfo Kab Bandung',
          attachment_base64: Buffer.from('EVALUATION_REPORT_PDF').toString('base64'),
          attachment_filename: 'laporan_evaluasi_q3.pdf',
        },
        superAdminUser,
      );

      expect(evaluation.id).toBeDefined();
      expect(evaluation.evaluator).toBe('Tim Evaluasi TI Diskominfo Kab Bandung');
      expect(evaluation.achievement).toContain('Tercapai 94%');
      expect(evaluation.attachment_filename).toBe('laporan_evaluasi_q3.pdf');

      // Get all evaluations
      const allEvals = await service.getEvaluations(appId, assignedTechnicianUser);
      expect(allEvals.length).toBe(1);

      // Get single detail
      const detail = await service.getEvaluation(appId, evaluation.id, assignedTechnicianUser);
      expect(detail.id).toBe(evaluation.id);
      expect(detail.recommendations).toBe('Menyelenggarakan webinar pendampingan berkala');

      // Update evaluation
      const updated = await service.updateEvaluation(
        appId,
        evaluation.id,
        {
          follow_up: 'Bimtek daring telah dijadwalkan pada 25 Oktober 2026',
        },
        superAdminUser,
      );
      expect(updated.follow_up).toBe('Bimtek daring telah dijadwalkan pada 25 Oktober 2026');

      // Get attachment signed URL
      const attachment = await service.getEvaluationAttachmentUrl(
        appId,
        evaluation.id,
        assignedTechnicianUser,
      );
      expect(attachment.signed_url).toBeDefined();
      expect(attachment.filename).toBe('laporan_evaluasi_q3.pdf');

      // Delete evaluation
      await service.deleteEvaluation(appId, evaluation.id, superAdminUser);
      const remaining = await service.getEvaluations(appId, superAdminUser);
      expect(remaining.length).toBe(0);
    });

    it('rejects evaluation creation with invalid date', async () => {
      await expect(
        service.createEvaluation(
          appId,
          {
            evaluation_date: 'not-a-valid-date',
          },
          superAdminUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('TECHNICAL DOCUMENTS', () => {
    const appId = 'app-test-docs';

    it('uploads technical document and generates signed download url', async () => {
      const doc = await service.uploadTechnicalDocument(
        appId,
        {
          document_type: 'ARCHITECTURE',
          title: 'Dokumen Arsitektur SPBE',
          original_filename: 'arsitektur_spbe.pdf',
          mime_type: 'application/pdf',
          size_bytes: 102400,
          base64_data: Buffer.from('PDF_DUMMY_CONTENT').toString('base64'),
        },
        assignedTechnicianUser,
      );

      expect(doc.id).toBeDefined();
      expect(doc.storage_path).toContain('technical/');

      const download = await service.getTechnicalDocumentDownloadUrl(
        appId,
        doc.id,
        superAdminUser,
      );
      expect(download.signed_url).toBeDefined();
      expect(download.filename).toBe('arsitektur_spbe.pdf');
    });
  });

  describe('LIFECYCLE OVERVIEW', () => {
    const appId = 'app-overview-test';

    it('returns structured summary across all lifecycle stages', async () => {
      // Seed analysis and a test record
      await service.upsertAnalysis(
        appId,
        { objectives: 'Otomasi Pelayanan' },
        assignedTechnicianUser,
      );
      await service.createTest(
        appId,
        {
          test_type: 'SECURITY',
          test_name: 'Penetration Testing SQL Injection',
          result: 'PASS',
        },
        assignedTechnicianUser,
      );

      const overview = await service.getLifecycleOverview(appId, superAdminUser);
      expect(overview.application_id).toBe(appId);
      expect(overview.stages_status.ANALYSIS.has_record).toBe(true);
      expect(overview.stages_status.PLANNING.has_record).toBe(false);
      expect(overview.stages_status.TESTING.count).toBe(1);
      expect(overview.stages_status.TESTING.pass_count).toBe(1);
    });
  });

  describe('LifecycleController Route Metadata Regression Test', () => {
    it('defines canonical route path without redundant api/v1 prefix', () => {
      const path = Reflect.getMetadata('path', LifecycleController);
      expect(path).toBe('applications/:id/lifecycle');
    });
  });
});
