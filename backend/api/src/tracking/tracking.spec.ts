import { beforeEach, describe, expect, it } from 'vitest';
import { BadRequestException, ForbiddenException, HttpException, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { TrackingTokenService } from './tracking-token.service.js';
import { TrackingRateLimiter } from './tracking-rate-limiter.js';
import { TrackingService } from './tracking.service.js';
import { TrackingAuthGuard } from './tracking.guard.js';

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

  const mockSupabaseService = {
    getClient: () => ({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
        insert: async () => ({ data: null, error: null }),
        update: () => ({
          eq: async () => ({ data: null, error: null }),
        }),
      }),
    }),
  } as any;

  const validTicket = 'SIM-2026-000101';
  const validCode = 'TRK-A1B2C3D4';

  beforeEach(() => {
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

      // Data Isolation Check: Must not leak internal notes or raw technician details
      expect((summary as any).internal_notes).toBeUndefined();
      expect((summary as any).audit_logs).toBeUndefined();
      expect((summary as any).test_records).toBeUndefined();
      expect((summary as any).technician_id).toBeUndefined();
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

    it('should accept revision submission when in REVISION_REQUIRED and transition back to VERIFICATION', async () => {
      const revisionTicket = 'SIM-2026-000202';
      const code = 'TRK-REV12345';
      const hash = crypto.createHash('sha256').update(code).digest('hex');
      const now = new Date().toISOString();

      // Register ticket in REVISION_REQUIRED state
      trackingService.registerInMemoryApplication({
        id: 'app-rev-uuid',
        ticket_number: revisionTicket,
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

      const session = {
        ticket_number: revisionTicket,
        application_id: 'app-rev-uuid',
        iat: 1,
        exp: 9999999999,
      };

      // Verify can_revise flag in summary
      const summaryBefore = await trackingService.getPublicTicketSummary(revisionTicket, session);
      expect(summaryBefore.can_revise).toBe(true);
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
  });
});
