import { BadRequestException, ConflictException, ForbiddenException, HttpException, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { TrackingTokenService } from './tracking-token.service.js';
import { TrackingRateLimiter } from './tracking-rate-limiter.js';
import { TrackingService } from './tracking.service.js';
import { TrackingAuthGuard } from './tracking.guard.js';
import configuration from '../config/configuration.js';

describe('TrackingModule (Public Tracking & Revision Flow)', () => {
  let tokenService: TrackingTokenService;
  let rateLimiter: TrackingRateLimiter;
  let trackingService: TrackingService;
  let guard: TrackingAuthGuard;

  const mockConfigService = {
    get: (key: string) => {
      if (key === 'jwt.secret') return 'test-tracking-secret-key-32chars!';
      return null;
    },
  } as unknown as ConfigService;

  const mockStorageUpload = vi.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null });
  const mockStorageRemove = vi.fn().mockResolvedValue({ data: null, error: null });
  const mockDocInsert = vi.fn().mockResolvedValue({ data: null, error: null });
  const mockDocDelete = vi.fn().mockReturnValue({ in: vi.fn().mockResolvedValue({ data: null, error: null }) });

  let appUpdateError: any = null;
  let appUpdateData: any[] | null = [{ id: 'app-uuid-1' }];
  let appRevertError: any = null;
  let appRevertData: any[] | null = [{ id: 'app-uuid-1' }];
  const mockAppUpdate = vi.fn();
  const mockAppUpdateEq = vi.fn();
  const mockAppUpdateSelect = vi.fn();
  let historyInsertError: any = null;
  const mockHistoryInsert = vi.fn();
  const mockHistoryDelete = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) });
  let messageInsertError: any = null;
  const mockMessageInsert = vi.fn();
  const mockMessageDelete = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) });

  const mockSupabaseService = {
    getClient: () => ({
      from: (table: string) => {
        if (table === 'application_documents') {
          return {
            insert: mockDocInsert,
            delete: mockDocDelete,
          };
        }
        if (table === 'application_status_history') {
          return {
            insert: mockHistoryInsert,
            delete: mockHistoryDelete,
          };
        }
        if (table === 'messages') {
          return {
            insert: mockMessageInsert,
            delete: mockMessageDelete,
          };
        }
        if (table === 'applications') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
            insert: async () => ({ data: null, error: null }),
            update: (...args: any[]) => {
              mockAppUpdate(...args);
              const payload = args[0] || {};
              const isRevert = payload.current_status === 'REVISION_REQUIRED';
              const err = isRevert ? appRevertError : appUpdateError;
              const resData = isRevert ? appRevertData : appUpdateData;
              const chain: any = {
                eq: vi.fn().mockImplementation((...eqArgs: any[]) => {
                  mockAppUpdateEq(...eqArgs);
                  return chain;
                }),
                select: vi.fn().mockImplementation((...selectArgs: any[]) => {
                  mockAppUpdateSelect(...selectArgs);
                  return chain;
                }),
                then: (onfulfilled?: any, onrejected?: any) =>
                  Promise.resolve({ data: resData, error: err }).then(onfulfilled, onrejected),
              };
              return chain;
            },
          };
        }
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
          insert: async () => ({ data: null, error: null }),
          update: () => ({
            eq: async () => ({ data: null, error: null }),
          }),
        };
      },
      storage: {
        from: () => ({
          upload: mockStorageUpload,
          remove: mockStorageRemove,
        }),
      },
    }),
  } as any;

  const validTicket = 'SIM-2026-000101';
  const validCode = 'TRK-A1B2C3D4';

  beforeEach(() => {
    vi.clearAllMocks();
    appUpdateError = null;
    appUpdateData = [{ id: 'app-uuid-1' }];
    appRevertError = null;
    appRevertData = [{ id: 'app-uuid-1' }];
    mockAppUpdate.mockReset();
    mockAppUpdateEq.mockReset();
    mockAppUpdateSelect.mockReset();
    historyInsertError = null;
    messageInsertError = null;
    mockStorageUpload.mockResolvedValue({ data: { path: 'test-path' }, error: null });
    mockStorageRemove.mockResolvedValue({ data: null, error: null });
    mockDocInsert.mockResolvedValue({ data: null, error: null });
    mockDocDelete.mockReturnValue({ in: vi.fn().mockResolvedValue({ data: null, error: null }) });
    mockHistoryInsert.mockImplementation(() => Promise.resolve({ data: null, error: historyInsertError }));
    mockHistoryDelete.mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) });
    mockMessageInsert.mockImplementation(() => Promise.resolve({ data: null, error: messageInsertError }));
    mockMessageDelete.mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) });

    tokenService = new TrackingTokenService(mockConfigService);
    rateLimiter = new TrackingRateLimiter();
    trackingService = new TrackingService(mockSupabaseService, tokenService, rateLimiter);
    guard = new TrackingAuthGuard(tokenService);
  });

  describe('1. Tracking Credential Verification', () => {
    it('should successfully verify valid ticket and tracking code', async () => {
      const res = await trackingService.verifyCredential({
        ticket_number: validTicket,
        tracking_code: validCode,
      });

      expect(res.ticket_number).toBe(validTicket);
      expect(res.tracking_token).toBeDefined();
      expect(typeof res.tracking_token).toBe('string');
      expect(res.expires_in).toBe(900); // 15 menit
      expect(res.expires_at).toBeDefined();
    });

    it('should successfully verify credential directly from Supabase database without relying on in-memory store', async () => {
      const dbTicket = 'SIM-2026-999888';
      const dbCode = 'TRK-Z9Y8X7W6';
      const dbHash = crypto.createHash('sha256').update(dbCode).digest('hex');

      const customSupabase = {
        getClient: () => ({
          from: () => ({
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: 'app-uuid-remote-db-123',
                    ticket_number: dbTicket,
                    tracking_code_hash: dbHash,
                    title: 'Permohonan SPBE Remote DB',
                    current_status: 'SUBMITTED',
                    current_stage: 'ANALYSIS',
                    submitted_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    applicant_name: 'Budi Santoso',
                    applicant_email: 'budi@bandungkab.go.id',
                    services: { name: 'Pembangunan Aplikasi Baru' },
                    applicants: { opd_units: { name: 'Dinas Komunikasi dan Informatika' } },
                  },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      } as any;

      const remoteTrackingService = new TrackingService(
        customSupabase,
        tokenService,
        rateLimiter,
      );

      const res = await remoteTrackingService.verifyCredential({
        ticket_number: dbTicket,
        tracking_code: dbCode,
      });

      expect(res.ticket_number).toBe(dbTicket);
      expect(res.tracking_token).toBeDefined();
    });

    it('should throw UnauthorizedException on invalid tracking code', async () => {
      await expect(
        trackingService.verifyCredential({
          ticket_number: validTicket,
          tracking_code: 'WRONG-CODE',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException on nonexistent ticket number', async () => {
      await expect(
        trackingService.verifyCredential({
          ticket_number: 'SIM-9999-999999',
          tracking_code: validCode,
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject empty credentials with 401', async () => {
      await expect(
        trackingService.verifyCredential({
          ticket_number: '',
          tracking_code: '',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('2. Rate Limiting & Anti-Brute Force', () => {
    it('should block after 5 repeated invalid attempts with 429 Too Many Requests', async () => {
      const ip = '192.168.1.50';

      for (let i = 0; i < 4; i++) {
        await expect(
          trackingService.verifyCredential(
            { ticket_number: validTicket, tracking_code: `WRONG-${i}` },
            ip,
          ),
        ).rejects.toThrow(UnauthorizedException);
      }

      // Percobaan ke-5 mencatat limit
      await expect(
        trackingService.verifyCredential(
          { ticket_number: validTicket, tracking_code: 'WRONG-5' },
          ip,
        ),
      ).rejects.toThrow(UnauthorizedException);

      // Percobaan ke-6 harus ditolak dengan 429 TOO_MANY_REQUESTS
      try {
        await trackingService.verifyCredential(
          { ticket_number: validTicket, tracking_code: 'WRONG-6' },
          ip,
        );
        expect.unreachable('Should have thrown 429');
      } catch (err: any) {
        expect(err).toBeInstanceOf(HttpException);
        expect(err.getStatus()).toBe(429);
        expect(err.getResponse().code).toBe('TRACKING_RATE_LIMITED');
      }
    });
  });

  describe('3. Token Session Handling & Expiry', () => {
    it('should successfully verify token session payload', () => {
      const { token } = tokenService.generateSessionToken(validTicket, 'app-uuid-1');
      const payload = tokenService.verifySessionToken(token);

      expect(payload.ticket_number).toBe(validTicket);
      expect(payload.application_id).toBe('app-uuid-1');
      expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it('should reject tampered token with 401', () => {
      const { token } = tokenService.generateSessionToken(validTicket, 'app-uuid-1');
      const parts = token.split('.');
      const tampered = `${parts[0]}.${parts[1]}.tamperedSignature`;

      expect(() => tokenService.verifySessionToken(tampered)).toThrow(UnauthorizedException);
    });

    it('should reject expired session token with TRACKING_SESSION_EXPIRED', () => {
      // Buat token yang sudah kedaluwarsa secara manual
      const now = Math.floor(Date.now() / 1000);
      const expiredPayload = {
        ticket_number: validTicket,
        application_id: 'app-uuid-1',
        iat: now - 3600,
        exp: now - 1800, // expired 30 minutes ago
      };

      const header = { alg: 'HS256', typ: 'TRACKING_SESSION' };
      const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
      const encodedPayload = Buffer.from(JSON.stringify(expiredPayload)).toString('base64url');
      const secret = 'test-tracking-secret-key-32chars!';
      const sig = crypto.createHmac('sha256', secret).update(`${encodedHeader}.${encodedPayload}`).digest('base64url');
      const expiredToken = `${encodedHeader}.${encodedPayload}.${sig}`;

      try {
        tokenService.verifySessionToken(expiredToken);
        expect.unreachable('Should throw expired token');
      } catch (err: any) {
        expect(err).toBeInstanceOf(UnauthorizedException);
        expect(err.getResponse().code).toBe('TRACKING_SESSION_EXPIRED');
      }
    });
  });

  describe('4. Guard & Cross-Ticket Access Isolation', () => {
    it('should allow access when token matches ticket number', () => {
      const { token } = tokenService.generateSessionToken(validTicket, 'app-uuid-1');

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: { authorization: `Bearer ${token}` },
            params: { ticket_number: validTicket },
          }),
        }),
      } as any;

      expect(guard.canActivate(mockContext)).toBe(true);
    });

    it('should reject access to another ticket number with 403 Forbidden', () => {
      const { token } = tokenService.generateSessionToken(validTicket, 'app-uuid-1');

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: { authorization: `Bearer ${token}` },
            params: { ticket_number: 'SIM-2026-999999' }, // different ticket!
          }),
        }),
      } as any;

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });
  });

  describe('5. Data Isolation & Minimization (Public Projection)', () => {
    it('should return public projection without internal technical notes or private test data', async () => {
      const session = {
        ticket_number: validTicket,
        application_id: 'app-1',
        iat: 1,
        exp: 9999999999,
      };

      const summary = await trackingService.getPublicTicketSummary(validTicket, session);

      expect(summary.ticket_number).toBe(validTicket);
      expect(summary.current_status).toBe('SUBMITTED');
      expect(summary.status_label).toBe('Permohonan Diterima');
      expect(summary.next_step).toBeDefined();

      // Masking verification
      expect(summary.applicant_name_masked).toBe('Drs. A***');
      expect(summary.applicant_email_masked).toBe('ag***@bandungkab.go.id');

      // Stage Progress & Applicant Action Verification (Tahap 2)
      expect(summary.stage_description).toBeDefined();
      expect(summary.stage_progress).toHaveLength(7);
      expect(summary.stage_progress[0].stage).toBe('ANALYSIS');
      expect(summary.stage_progress[0].label).toBe('Analisis Kebutuhan SPBE');
      expect(summary.action_required_by_applicant).toBe(false);
      expect(summary.applicant_action_message).toContain('Tidak ada tindakan yang diperlukan');

      // Data Isolation Check: Must not leak internal notes or raw technician details
      expect((summary as any).internal_notes).toBeUndefined();
      expect((summary as any).audit_logs).toBeUndefined();
      expect((summary as any).test_records).toBeUndefined();
      expect((summary as any).technician_id).toBeUndefined();
      expect((summary as any).technician_name).toBeUndefined();
      expect((summary as any).application_id).toBeUndefined();
    });

    it('should produce an intentional milestone timeline projection', async () => {
      const session = {
        ticket_number: validTicket,
        application_id: 'app-1',
        iat: 1,
        exp: 9999999999,
      };

      const timeline = await trackingService.getPublicTimeline(validTicket, session);

      expect(timeline.ticket_number).toBe(validTicket);
      expect(timeline.milestones).toHaveLength(5);
      expect(timeline.milestones[0].step_number).toBe(1);
      expect(timeline.milestones[0].title).toBe('Permohonan Didaftarkan');
      expect(timeline.milestones[0].status).toBe('completed');
      expect(timeline.milestones[1].title).toBe('Verifikasi & Telaah Administrasi');

      // Check intentional projection: no internal notes in descriptions
      timeline.milestones.forEach((m) => {
        expect(m.title).toBeDefined();
        expect(m.description).toBeDefined();
        expect((m as any).actor_id).toBeUndefined();
      });
    });
  });

  describe('6. Revision Flow (Applicant Response)', () => {
    it('should reject revision submission when ticket is not in REVISION_REQUIRED status', async () => {
      const session = {
        ticket_number: validTicket,
        application_id: 'app-1',
        iat: 1,
        exp: 9999999999,
      };

      // Tiket saat ini adalah 'SUBMITTED'
      await expect(
        trackingService.submitRevision(validTicket, session, {
          revision_notes: 'Ini kelengkapan KAK yang diminta',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    const setupRevisionTicket = (ticket = 'SIM-2026-000202', appId = 'app-rev-uuid') => {
      const code = 'TRK-REV12345';
      const hash = crypto.createHash('sha256').update(code).digest('hex');
      const now = new Date().toISOString();

      trackingService.registerInMemoryApplication({
        id: appId,
        ticket_number: ticket,
        tracking_code_hash: hash,
        title: 'Pengembangan Portal SPBE',
        service_name: 'Pembangunan Aplikasi',
        opd_name: 'Dinas Komunikasi dan Informatika',
        applicant_name: 'Budi Santoso',
        applicant_email: 'budi@bandungkab.go.id',
        current_status: 'REVISION_REQUIRED',
        current_stage: null,
        submitted_at: now,
        updated_at: now,
        revision_note: 'Mohon lampirkan KAK yang telah ditandatangani Kepala Dinas.',
        documents: [],
        status_history: [
          {
            from_status: 'VERIFICATION',
            to_status: 'REVISION_REQUIRED',
            note: 'Mohon lampirkan KAK yang telah ditandatangani Kepala Dinas.',
            changed_at: now,
          },
        ],
      });

      return {
        ticket_number: ticket,
        application_id: appId,
        iat: 1,
        exp: 9999999999,
      };
    };

    it('should accept revision submission when in REVISION_REQUIRED and transition back to VERIFICATION', async () => {
      const session = setupRevisionTicket();
      const revisionTicket = session.ticket_number;

      // Verify can_revise flag in summary
      const summaryBefore = await trackingService.getPublicTicketSummary(revisionTicket, session);
      expect(summaryBefore.can_revise).toBe(true);
      expect(summaryBefore.action_required_by_applicant).toBe(true);
      expect(summaryBefore.applicant_action_message).toContain('Tindakan diperlukan');
      expect(summaryBefore.revision_reason).toBe('Mohon lampirkan KAK yang telah ditandatangani Kepala Dinas.');

      // Submit revision response
      const res = await trackingService.submitRevision(revisionTicket, session, {
        revision_notes: 'Berkas KAK bertanda tangan basah telah kami upload ulang.',
        updated_title: 'Pengembangan Portal SPBE (Revisi Final)',
        additional_documents: [
          {
            original_filename: 'KAK_Final_Bertandatangan.pdf',
            mime_type: 'application/pdf',
            size_bytes: 850000,
            base64_data: Buffer.from('%PDF-1.4 valid signed KAK content').toString('base64'),
          },
        ],
      });

      expect(res.previous_status).toBe('REVISION_REQUIRED');
      expect(res.current_status).toBe('VERIFICATION');

      // Verify ticket state updated in summary
      const summaryAfter = await trackingService.getPublicTicketSummary(revisionTicket, session);
      expect(summaryAfter.current_status).toBe('VERIFICATION');
      expect(summaryAfter.title).toBe('Pengembangan Portal SPBE (Revisi Final)');
      expect(summaryAfter.can_revise).toBe(false);
      expect(summaryAfter.documents).toHaveLength(1);

      expect(mockDocInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          application_id: session.application_id,
          requirement_id: null,
          original_filename: 'KAK_Final_Bertandatangan.pdf',
        }),
      );
      expect(mockStorageUpload).toHaveBeenCalled();
      const storageCall = mockStorageUpload.mock.calls[0];
      const uploadedPath = storageCall[0];
      expect(uploadedPath).toMatch(/^applications\/[A-Z0-9-]+\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$/);
      expect(uploadedPath).not.toContain('KAK_Final_Bertandatangan');
    });

    it('should reject revision submission with empty notes', async () => {
      const session = {
        ticket_number: validTicket,
        application_id: 'app-1',
        iat: 1,
        exp: 9999999999,
      };

      await expect(
        trackingService.submitRevision(validTicket, session, {
          revision_notes: '   ',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject revision submission when additional_documents has missing or empty base64_data', async () => {
      const session = setupRevisionTicket();

      await expect(
        trackingService.submitRevision(session.ticket_number, session, {
          revision_notes: 'Ini revisi tanpa biner berkas',
          additional_documents: [
            {
              original_filename: 'lampiran.pdf',
              mime_type: 'application/pdf',
              size_bytes: 1024,
              // base64_data missing
            },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject revision submission when additional_documents has spoofed magic bytes', async () => {
      const session = setupRevisionTicket();

      await expect(
        trackingService.submitRevision(session.ticket_number, session, {
          revision_notes: 'Ini revisi dengan spoofed file',
          additional_documents: [
            {
              original_filename: 'lampiran_palsu.pdf',
              mime_type: 'application/pdf',
              size_bytes: 1024,
              base64_data: Buffer.from('Plain text instead of PDF signature').toString('base64'),
            },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject revision submission when filename contains control characters or null bytes', async () => {
      const session = setupRevisionTicket();

      await expect(
        trackingService.submitRevision(session.ticket_number, session, {
          revision_notes: 'Ini revisi dengan invalid filename',
          additional_documents: [
            {
              original_filename: 'lampiran\x00_berbahaya.pdf',
              mime_type: 'application/pdf',
              size_bytes: 1024,
              base64_data: Buffer.from('%PDF-1.4 valid content').toString('base64'),
            },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should rollback uploaded storage file when database document insertion fails', async () => {
      const session = setupRevisionTicket();
      mockDocInsert.mockResolvedValueOnce({ error: { message: 'Database constraint violation' } });

      await expect(
        trackingService.submitRevision(session.ticket_number, session, {
          revision_notes: 'Uji kegagalan persistensi DB',
          additional_documents: [
            {
              original_filename: 'dokumen_revisi.pdf',
              mime_type: 'application/pdf',
              size_bytes: 2048,
              base64_data: Buffer.from('%PDF-1.4 valid content').toString('base64'),
            },
          ],
        }),
      ).rejects.toThrow(InternalServerErrorException);

      // Verify that storage rollback removal was triggered with UUID key
      expect(mockStorageRemove).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringMatching(/^applications\/[A-Z0-9-]+\/[a-f0-9-]{36}\.pdf$/)]),
      );
      expect(mockStorageRemove.mock.calls[0][0][0]).not.toContain('dokumen_revisi');
    });

    it('should fail and not persist database document if storage upload fails', async () => {
      const session = setupRevisionTicket();
      mockStorageUpload.mockResolvedValueOnce({ data: null, error: { message: 'Storage bucket unavailable' } });

      await expect(
        trackingService.submitRevision(session.ticket_number, session, {
          revision_notes: 'Uji kegagalan storage upload',
          additional_documents: [
            {
              original_filename: 'dokumen_revisi.pdf',
              mime_type: 'application/pdf',
              size_bytes: 2048,
              base64_data: Buffer.from('%PDF-1.4 valid content').toString('base64'),
            },
          ],
        }),
      ).rejects.toThrow(InternalServerErrorException);

      // Verify that database insert was never called because upload failed first
      expect(mockDocInsert).not.toHaveBeenCalled();
    });

    it('should rollback storage and documents when applications status update fails due to DB error', async () => {
      const session = setupRevisionTicket();
      appUpdateError = { message: 'Database lock timeout on applications' };

      await expect(
        trackingService.submitRevision(session.ticket_number, session, {
          revision_notes: 'Uji kegagalan update status',
          additional_documents: [
            {
              original_filename: 'dokumen_revisi.pdf',
              mime_type: 'application/pdf',
              size_bytes: 2048,
              base64_data: Buffer.from('%PDF-1.4 valid content').toString('base64'),
            },
          ],
        }),
      ).rejects.toThrow(InternalServerErrorException);

      // Verify storage and doc cleanup called with UUID key
      expect(mockStorageRemove).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringMatching(/^applications\/[A-Z0-9-]+\/[a-f0-9-]{36}\.pdf$/)]),
      );
      expect(mockDocDelete).toHaveBeenCalled();
      // History and message were not inserted
      expect(mockHistoryInsert).not.toHaveBeenCalled();
      expect(mockMessageInsert).not.toHaveBeenCalled();
      // Status revert was NOT called because forward update never succeeded
      expect(mockAppUpdate).toHaveBeenCalledTimes(1);

      // Verify ticket state remains REVISION_REQUIRED
      const summaryAfter = await trackingService.getPublicTicketSummary(session.ticket_number, session);
      expect(summaryAfter.current_status).toBe('REVISION_REQUIRED');
      expect(summaryAfter.can_revise).toBe(true);
      expect(summaryAfter.documents).toHaveLength(0);
    });

    it('should abort, clean up storage/docs, and throw ConflictException when forward update matches 0 rows due to concurrent status change', async () => {
      const session = setupRevisionTicket();
      // Simulate 0 rows updated because another process/admin moved the ticket status
      appUpdateData = [];

      await expect(
        trackingService.submitRevision(session.ticket_number, session, {
          revision_notes: 'Uji status bentrok konkurensi (0 rows updated)',
          additional_documents: [
            {
              original_filename: 'dokumen_revisi.pdf',
              mime_type: 'application/pdf',
              size_bytes: 2048,
              base64_data: Buffer.from('%PDF-1.4 valid content').toString('base64'),
            },
          ],
        }),
      ).rejects.toThrow(ConflictException);

      // Verify cleanup of uploaded storage and docs of this attempt
      expect(mockStorageRemove).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringMatching(/^applications\/[A-Z0-9-]+\/[a-f0-9-]{36}\.pdf$/)]),
      );
      expect(mockDocDelete).toHaveBeenCalled();

      // Verify that no history or message was written
      expect(mockHistoryInsert).not.toHaveBeenCalled();
      expect(mockMessageInsert).not.toHaveBeenCalled();

      // Verify status revert was NOT called (does not overwrite concurrent changes)
      expect(mockAppUpdate).toHaveBeenCalledTimes(1);

      // Verify in-memory state was NOT changed to VERIFICATION
      const summaryAfter = await trackingService.getPublicTicketSummary(session.ticket_number, session);
      expect(summaryAfter.current_status).toBe('REVISION_REQUIRED');
      expect(summaryAfter.can_revise).toBe(true);
    });

    it('should rollback storage, documents, and revert application status to REVISION_REQUIRED when status history insert fails', async () => {
      const session = setupRevisionTicket();
      historyInsertError = { message: 'History foreign key constraint failed' };

      await expect(
        trackingService.submitRevision(session.ticket_number, session, {
          revision_notes: 'Uji kegagalan status history insert',
          additional_documents: [
            {
              original_filename: 'dokumen_revisi.pdf',
              mime_type: 'application/pdf',
              size_bytes: 2048,
              base64_data: Buffer.from('%PDF-1.4 valid content').toString('base64'),
            },
          ],
        }),
      ).rejects.toThrow(InternalServerErrorException);

      // Verify storage and documents cleanup
      expect(mockStorageRemove).toHaveBeenCalled();
      expect(mockDocDelete).toHaveBeenCalled();

      // Verify status revert update was called on applications with previousStatus and select('id')
      expect(mockAppUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          current_status: 'REVISION_REQUIRED',
        }),
      );
      expect(mockAppUpdateSelect).toHaveBeenCalledWith('id');

      // Message was not inserted
      expect(mockMessageInsert).not.toHaveBeenCalled();

      // Verify in-memory status remains REVISION_REQUIRED and no docs added
      const summaryAfter = await trackingService.getPublicTicketSummary(session.ticket_number, session);
      expect(summaryAfter.current_status).toBe('REVISION_REQUIRED');
      expect(summaryAfter.can_revise).toBe(true);
      expect(summaryAfter.documents).toHaveLength(0);
    });

    it('should rollback storage, documents, delete status history, and revert application status when messages insert fails', async () => {
      const session = setupRevisionTicket();
      messageInsertError = { message: 'Message payload validation failed in DB' };

      await expect(
        trackingService.submitRevision(session.ticket_number, session, {
          revision_notes: 'Uji kegagalan messages insert',
          additional_documents: [
            {
              original_filename: 'dokumen_revisi.pdf',
              mime_type: 'application/pdf',
              size_bytes: 2048,
              base64_data: Buffer.from('%PDF-1.4 valid content').toString('base64'),
            },
          ],
        }),
      ).rejects.toThrow(InternalServerErrorException);

      // Verify storage, documents, and status history cleanup
      expect(mockStorageRemove).toHaveBeenCalled();
      expect(mockDocDelete).toHaveBeenCalled();
      expect(mockHistoryDelete().eq).toHaveBeenCalledWith(
        'id',
        expect.any(String),
      );

      // Verify status revert update was called
      expect(mockAppUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          current_status: 'REVISION_REQUIRED',
        }),
      );

      // Verify summary status remains REVISION_REQUIRED
      const summaryAfter = await trackingService.getPublicTicketSummary(session.ticket_number, session);
      expect(summaryAfter.current_status).toBe('REVISION_REQUIRED');
      expect(summaryAfter.can_revise).toBe(true);
    });

    it('should handle rollback safely when revert update matches 0 rows due to concurrent modification', async () => {
      const session = setupRevisionTicket();
      messageInsertError = { message: 'Message table timeout' };
      // Simulate that by the time rollback runs, another process changed status so 0 rows match revert
      appRevertData = [];

      await expect(
        trackingService.submitRevision(session.ticket_number, session, {
          revision_notes: 'Uji rollback 0 rows',
          additional_documents: [
            {
              original_filename: 'dokumen_revisi.pdf',
              mime_type: 'application/pdf',
              size_bytes: 2048,
              base64_data: Buffer.from('%PDF-1.4 valid content').toString('base64'),
            },
          ],
        }),
      ).rejects.toThrow(InternalServerErrorException);

      // Verify storage, documents, and status history were still cleaned up
      expect(mockStorageRemove).toHaveBeenCalled();
      expect(mockDocDelete).toHaveBeenCalled();
      expect(mockHistoryDelete().eq).toHaveBeenCalledWith('id', expect.any(String));

      // Revert update was executed and handled safely
      expect(mockAppUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          current_status: 'REVISION_REQUIRED',
        }),
      );
      expect(mockAppUpdateSelect).toHaveBeenCalledWith('id');
    });

    it('should clean up ONLY storage objects and documents belonging to this attempt', async () => {
      const session = setupRevisionTicket();
      // Inject existing document into ticket before revision
      const existingDoc = {
        requirement_name: 'Dokumen KAK Awal',
        original_filename: 'kak_awal.pdf',
        size_bytes: 500000,
        uploaded_at: '2026-10-01T10:00:00Z',
      };
      const app = (trackingService as any).inMemoryTrackRecords.get(session.ticket_number);
      app.documents = [existingDoc];

      messageInsertError = { message: 'Pesan gagal disimpan' };

      await expect(
        trackingService.submitRevision(session.ticket_number, session, {
          revision_notes: 'Uji isolasi cleanup berkas',
          additional_documents: [
            {
              original_filename: 'dokumen_revisi_khusus.pdf',
              mime_type: 'application/pdf',
              size_bytes: 2048,
              base64_data: Buffer.from('%PDF-1.4 valid content').toString('base64'),
            },
          ],
        }),
      ).rejects.toThrow(InternalServerErrorException);

      // Verify storage remove only targeted the revision document, not existing files
      expect(mockStorageRemove).toHaveBeenCalledWith([
        expect.stringMatching(/^applications\/[A-Z0-9-]+\/[a-f0-9-]{36}\.pdf$/),
      ]);
      expect(mockStorageRemove.mock.calls[0][0][0]).not.toContain('dokumen_revisi_khusus');
      expect(mockStorageRemove.mock.calls[0][0][0]).not.toContain('kak_awal');

      // Verify document delete in DB only targeted the newly generated ID
      const deleteInCall = mockDocDelete().in.mock.calls[0];
      expect(deleteInCall[0]).toBe('id');
      expect(deleteInCall[1]).toHaveLength(1);
      expect(typeof deleteInCall[1][0]).toBe('string');

      // Verify existing document is still present in ticket
      const summaryAfter = await trackingService.getPublicTicketSummary(session.ticket_number, session);
      expect(summaryAfter.documents).toHaveLength(1);
      expect(summaryAfter.documents[0].original_filename).toBe('kak_awal.pdf');
    });

    it('should handle Storage cleanup failure gracefully without crash and rethrow original error', async () => {
      const session = setupRevisionTicket();
      mockDocInsert.mockResolvedValueOnce({ error: { message: 'DB doc insert failed' } });
      mockStorageRemove.mockRejectedValueOnce(new Error('S3 remove connection timeout'));

      await expect(
        trackingService.submitRevision(session.ticket_number, session, {
          revision_notes: 'Uji double fault storage cleanup',
          additional_documents: [
            {
              original_filename: 'dokumen_revisi.pdf',
              mime_type: 'application/pdf',
              size_bytes: 2048,
              base64_data: Buffer.from('%PDF-1.4 valid content').toString('base64'),
            },
          ],
        }),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should handle status revert failure gracefully without crash and rethrow original error', async () => {
      const session = setupRevisionTicket();
      historyInsertError = { message: 'History insert DB error' };

      // Make app update fail on the revert call
      let callCount = 0;
      mockAppUpdate.mockImplementation(() => {
        callCount++;
        if (callCount > 1) {
          throw new Error('Revert DB network error');
        }
      });

      await expect(
        trackingService.submitRevision(session.ticket_number, session, {
          revision_notes: 'Uji double fault status revert',
        }),
      ).rejects.toThrow(InternalServerErrorException);

      mockAppUpdate.mockReset();
    });

    it('should enforce conditional status checks to protect against concurrent transitions and select updated row id', async () => {
      const session = setupRevisionTicket();

      const res = await trackingService.submitRevision(session.ticket_number, session, {
        revision_notes: 'Uji guard konkurensi',
      });

      expect(res.current_status).toBe('VERIFICATION');
      // Verify that forward update filtered for both application id and REVISION_REQUIRED
      expect(mockAppUpdateEq).toHaveBeenCalledWith('id', session.application_id);
      expect(mockAppUpdateEq).toHaveBeenCalledWith('current_status', 'REVISION_REQUIRED');
      // Verify that .select('id') was called to check row mutation
      expect(mockAppUpdateSelect).toHaveBeenCalledWith('id');
    });

    it('should accept revision submission with Data URL formatted base64 document', async () => {
      const session = setupRevisionTicket();
      const validPdfBase64 = Buffer.from('%PDF-1.4 valid content').toString('base64');
      const dataUrl = `data:application/pdf;base64,${validPdfBase64}`;

      const res = await trackingService.submitRevision(session.ticket_number, session, {
        revision_notes: 'Revisi dengan data URL',
        additional_documents: [
          {
            original_filename: 'dokumen_data_url.pdf',
            mime_type: 'application/pdf',
            size_bytes: 2048,
            base64_data: dataUrl,
          },
        ],
      });

      expect(res.current_status).toBe('VERIFICATION');
      expect(mockStorageUpload).toHaveBeenCalled();
    });

    it('should reject revision submission with malformed base64 (foreign chars or bad padding)', async () => {
      const session = setupRevisionTicket();

      await expect(
        trackingService.submitRevision(session.ticket_number, session, {
          revision_notes: 'Revisi dengan base64 malformed',
          additional_documents: [
            {
              original_filename: 'dokumen_corrupt.pdf',
              mime_type: 'application/pdf',
              size_bytes: 2048,
              base64_data: 'JVBERi0xLjQK@#$%^&*()',
            },
          ],
        }),
      ).rejects.toThrow(BadRequestException);

      // Verify no storage upload or db insertion occurred
      expect(mockStorageUpload).not.toHaveBeenCalled();
      expect(mockDocInsert).not.toHaveBeenCalled();
    });
  });

  describe('8. F1: JWT_SECRET Mandatory & Boot Validation', () => {
    it('gagal instansiasi TrackingTokenService jika secret kosong', () => {
      const mockEmptyConfig = {
        get: () => '',
      } as unknown as ConfigService;
      expect(() => new TrackingTokenService(mockEmptyConfig)).toThrow(
        /Konfigurasi JWT_SECRET tidak valid/,
      );
    });

    it('gagal instansiasi TrackingTokenService jika secret kurang dari 32 karakter', () => {
      const mockShortConfig = {
        get: () => 'short-secret-key-12345',
      } as unknown as ConfigService;
      expect(() => new TrackingTokenService(mockShortConfig)).toThrow(
        /minimal 32 karakter/,
      );
    });

    it('berhasil instansiasi dan terbitkan token serta verifikasi jika secret valid (>= 32 karakter)', () => {
      const mockValidConfig = {
        get: () => 'valid-secret-key-with-more-than-32-chars-test!',
      } as unknown as ConfigService;
      const validTokenService = new TrackingTokenService(mockValidConfig);
      const generated = validTokenService.generateSessionToken('SIM-2026-000101', 'app-uuid-1');

      expect(generated.token).toBeDefined();
      expect(generated.expires_in).toBe(900);

      const payload = validTokenService.verifySessionToken(generated.token);
      expect(payload.ticket_number).toBe('SIM-2026-000101');
      expect(payload.application_id).toBe('app-uuid-1');
    });

    it('gagal konfigurasi boot jika process.env.JWT_SECRET kosong atau kurang dari 32 karakter', () => {
      const originalSecret = process.env.JWT_SECRET;
      try {
        delete process.env.JWT_SECRET;
        expect(() => configuration()).toThrow(/Konfigurasi JWT_SECRET tidak valid/);

        process.env.JWT_SECRET = 'short-secret-key';
        expect(() => configuration()).toThrow(/minimal 32 karakter/);

        process.env.JWT_SECRET = 'valid-32-chars-environment-key-for-simantik!';
        const loaded = configuration();
        expect(loaded.jwt.secret).toBe('valid-32-chars-environment-key-for-simantik!');
      } finally {
        process.env.JWT_SECRET = originalSecret;
      }
    });
  });
});
