import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LifecycleService } from '../src/lifecycle/lifecycle.service';
import { AuthenticatedUser } from '../src/common/types/auth.types';

describe('F6: Audit Penghapusan Lifecycle & Pembersihan Berkas Storage', () => {
  const adminUser: AuthenticatedUser = {
    id: 'user-admin-1',
    email: 'admin@bandungkab.go.id',
    role: 'SUPER_ADMIN',
    fullName: 'Super Admin Diskominfo',
  };

  const appId = 'app-123';
  let removeStorageMock: any;
  let auditLogsInsertMock: any;
  let mockClient: any;
  let lifecycleService: LifecycleService;

  beforeEach(() => {
    process.env.ALLOW_IN_MEMORY_FALLBACK = 'false';
    process.env.NODE_ENV = 'test';

    removeStorageMock = vi.fn().mockResolvedValue({ data: [], error: null });
    auditLogsInsertMock = vi.fn().mockResolvedValue({ error: null });

    mockClient = {
      storage: {
        from: vi.fn().mockReturnValue({
          remove: removeStorageMock,
        }),
      },
      from: vi.fn((table: string) => {
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
        if (table === 'audit_logs') {
          return {
            insert: auditLogsInsertMock,
          };
        }
        if (table === 'test_records') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: 'test-1',
                      application_id: appId,
                      test_name: 'UAT Security',
                      test_type: 'SECURITY',
                      result: 'PASSED',
                      attachment_path: 'lifecycle/test-1-proof.pdf',
                    },
                  ],
                  error: null,
                }),
              }),
            }),
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'maintenance_records') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: 'maint-1',
                      application_id: appId,
                      title: 'Patch Kernel',
                      activity_type: 'CORRECTIVE',
                      status: 'COMPLETED',
                      attachment_path: 'lifecycle/maint-1-log.txt',
                    },
                  ],
                  error: null,
                }),
              }),
            }),
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'evaluations') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: 'eval-1',
                      application_id: appId,
                      evaluation_date: '2026-10-20',
                      success_indicator: 'Kinerja Baik',
                      findings: 'Evaluasi triwulanan',
                      attachment_path: 'lifecycle/eval-1-report.pdf',
                    },
                  ],
                  error: null,
                }),
              }),
            }),
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'technical_documents') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: 'doc-1',
                      application_id: appId,
                      title: 'Arsitektur Sistem',
                      document_type: 'ARCHITECTURE',
                      original_filename: 'arsitektur.pdf',
                      storage_path: 'technical-docs/doc-1-arsitektur.pdf',
                    },
                  ],
                  error: null,
                }),
              }),
            }),
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
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

    lifecycleService = new LifecycleService(mockSupabase as any, mockAudit as any);
  });

  it('deleteTest: membersihkan berkas storage dan mencatat audit log LIFECYCLE_TEST_DELETED', async () => {
    await lifecycleService.deleteTest(appId, 'test-1', adminUser);

    expect(removeStorageMock).toHaveBeenCalledWith(['lifecycle/test-1-proof.pdf']);
    expect(auditLogsInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actor_profile_id: adminUser.id,
        application_id: appId,
        action: 'LIFECYCLE_TEST_DELETED',
        entity_type: 'test_records',
        entity_id: 'test-1',
        old_data: expect.objectContaining({
          test_name: 'UAT Security',
          attachment_path: 'lifecycle/test-1-proof.pdf',
        }),
      }),
    );
  });

  it('deleteMaintenanceRecord: membersihkan berkas storage dan mencatat audit log LIFECYCLE_MAINTENANCE_DELETED', async () => {
    await lifecycleService.deleteMaintenanceRecord(appId, 'maint-1', adminUser);

    expect(removeStorageMock).toHaveBeenCalledWith(['lifecycle/maint-1-log.txt']);
    expect(auditLogsInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actor_profile_id: adminUser.id,
        application_id: appId,
        action: 'LIFECYCLE_MAINTENANCE_DELETED',
        entity_type: 'maintenance_records',
        entity_id: 'maint-1',
        old_data: expect.objectContaining({
          title: 'Patch Kernel',
          attachment_path: 'lifecycle/maint-1-log.txt',
        }),
      }),
    );
  });

  it('deleteEvaluation: membersihkan berkas storage dan mencatat audit log LIFECYCLE_EVALUATION_DELETED', async () => {
    await lifecycleService.deleteEvaluation(appId, 'eval-1', adminUser);

    expect(removeStorageMock).toHaveBeenCalledWith(['lifecycle/eval-1-report.pdf']);
    expect(auditLogsInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actor_profile_id: adminUser.id,
        application_id: appId,
        action: 'LIFECYCLE_EVALUATION_DELETED',
        entity_type: 'evaluations',
        entity_id: 'eval-1',
        old_data: expect.objectContaining({
          evaluation_date: '2026-10-20',
          attachment_path: 'lifecycle/eval-1-report.pdf',
        }),
      }),
    );
  });

  it('deleteTechnicalDocument: membersihkan berkas storage dan mencatat audit log LIFECYCLE_TECHNICAL_DOCUMENT_DELETED', async () => {
    await lifecycleService.deleteTechnicalDocument(appId, 'doc-1', adminUser);

    expect(removeStorageMock).toHaveBeenCalledWith(['technical-docs/doc-1-arsitektur.pdf']);
    expect(auditLogsInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actor_profile_id: adminUser.id,
        application_id: appId,
        action: 'LIFECYCLE_TECHNICAL_DOCUMENT_DELETED',
        entity_type: 'technical_documents',
        entity_id: 'doc-1',
        old_data: expect.objectContaining({
          title: 'Arsitektur Sistem',
          storage_path: 'technical-docs/doc-1-arsitektur.pdf',
        }),
      }),
    );
  });
});
