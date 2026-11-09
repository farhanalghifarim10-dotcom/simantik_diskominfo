import { beforeEach, describe, expect, it } from 'vitest';
import {
  BadRequestException,
  ExecutionContext,
  ForbiddenException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { TrackingTokenService } from '../tracking/tracking-token.service.js';
import { TrackingRateLimiter } from '../tracking/tracking-rate-limiter.js';
import { TrackingService } from '../tracking/tracking.service.js';
import { AdminApplicationsService } from '../applications/admin-applications.service.js';
import { WorkflowEngine } from '../applications/workflow/workflow.engine.js';
import { MessagesService } from '../messages/messages.service.js';
import { HttpExceptionFilter } from './filters/http-exception.filter.js';

describe('Security Hardening & Audit Verification Suite', () => {
  describe('1. Authentication Hardening (AuthGuard)', () => {
    let mockSupabaseService: any;
    let authGuard: AuthGuard;

    const createMockContext = (authHeader?: string): ExecutionContext => {
      const req: any = {
        headers: authHeader ? { authorization: authHeader } : {},
      };
      return {
        switchToHttp: () => ({
          getRequest: () => req,
        }),
      } as unknown as ExecutionContext;
    };

    beforeEach(() => {
      mockSupabaseService = {
        getClient: () => ({
          auth: {
            getUser: async (token: string) => {
              if (token === 'valid-admin-token') {
                return { data: { user: { id: 'u-admin-1', email: 'admin@bandungkab.go.id' } }, error: null };
              }
              if (token === 'inactive-user-token') {
                return { data: { user: { id: 'u-inactive-1', email: 'inactive@bandungkab.go.id' } }, error: null };
              }
              return { data: { user: null }, error: new Error('Invalid or expired token') };
            },
          },
          from: () => ({
            select: () => ({
              eq: () => ({
                single: async () => {
                  return { data: null, error: new Error('Profile not found') };
                },
              }),
            }),
          }),
        }),
      };
      authGuard = new AuthGuard(mockSupabaseService);
    });

    it('should reject requests missing Authorization header', async () => {
      const ctx = createMockContext();
      await expect(authGuard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    });

    it('should reject non-Bearer tokens or malformed headers', async () => {
      const ctx = createMockContext('Basic dXNlcjpwYXNz');
      await expect(authGuard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    });

    it('should reject invalid or expired JWT tokens', async () => {
      const ctx = createMockContext('Bearer expired-or-invalid-token');
      await expect(authGuard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    });

    it('should reject authenticated tokens if profile is inactive (is_active: false)', async () => {
      mockSupabaseService.getClient = () => ({
        auth: {
          getUser: async () => ({
            data: { user: { id: 'u-inactive-1', email: 'inactive@bandungkab.go.id' } },
            error: null,
          }),
        },
        from: () => ({
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: { id: 'u-inactive-1', full_name: 'Staf Nonaktif', role: 'TECHNICIAN', is_active: false },
                error: null,
              }),
            }),
          }),
        }),
      });

      const ctx = createMockContext('Bearer inactive-user-token');
      await expect(authGuard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('2. Authorization Boundaries (RolesGuard & Assignment Isolation)', () => {
    let reflector: Reflector;
    let rolesGuard: RolesGuard;
    let adminAppsService: AdminApplicationsService;
    let workflowEngine: WorkflowEngine;

    const superAdmin: AuthenticatedUser = {
      id: 'u-admin-1',
      email: 'admin@bandungkab.go.id',
      role: 'SUPER_ADMIN',
      fullName: 'Super Admin',
    };

    const assignedTechnician: AuthenticatedUser = {
      id: 'u-tech-1',
      email: 'tech1@bandungkab.go.id',
      role: 'TECHNICIAN',
      fullName: 'Teknisi Utama',
    };

    const unassignedTechnician: AuthenticatedUser = {
      id: 'u-tech-unassigned',
      email: 'tech2@bandungkab.go.id',
      role: 'TECHNICIAN',
      fullName: 'Teknisi Lain',
    };

    beforeEach(() => {
      reflector = new Reflector();
      rolesGuard = new RolesGuard(reflector);

      const mockSupabase = {
        getClient: () => ({
          from: () => ({
            select: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: async () => ({ data: null, error: null }),
                  }),
                }),
                single: async () => ({ data: null, error: new Error('Fallback') }),
                order: async () => ({ data: null, error: new Error('Fallback') }),
              }),
            }),
            insert: async () => ({ error: null }),
            update: () => ({ eq: async () => ({ error: null }) }),
          }),
          storage: {
            from: () => ({
              createSignedUrl: async () => ({
                data: { signedUrl: 'https://storage.supabase.co/signed/doc.pdf' },
                error: null,
              }),
            }),
          },
        }),
      } as any;

      workflowEngine = new WorkflowEngine();
      adminAppsService = new AdminApplicationsService(mockSupabase, workflowEngine);
    });

    it('should enforce role requirement via RolesGuard and reject unauthorized roles', () => {
      const handler = () => {};
      reflector.getAllAndOverride = () => ['SUPER_ADMIN'];

      const ctxTech = {
        getHandler: () => handler,
        getClass: () => class {},
        switchToHttp: () => ({
          getRequest: () => ({ user: assignedTechnician }),
        }),
      } as unknown as ExecutionContext;

      expect(() => rolesGuard.canActivate(ctxTech)).toThrow(ForbiddenException);

      const ctxAdmin = {
        getHandler: () => handler,
        getClass: () => class {},
        switchToHttp: () => ({
          getRequest: () => ({ user: superAdmin }),
        }),
      } as unknown as ExecutionContext;

      expect(rolesGuard.canActivate(ctxAdmin)).toBe(true);
    });

    it('should block unassigned technician from accessing application detail', async () => {
      const appId = 'a1000000-0000-0000-0000-000000000001';

      const detail = await adminAppsService.getApplicationDetail(appId, assignedTechnician);
      expect(detail.id).toBe(appId);

      await expect(
        adminAppsService.getApplicationDetail(appId, unassignedTechnician),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should block unassigned technician from executing transitions or internal notes', async () => {
      const appId = 'a1000000-0000-0000-0000-000000000001';

      await expect(
        adminAppsService.executeTransition(
          appId,
          { target_status: 'IN_PROGRESS' },
          unassignedTechnician,
        ),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        adminAppsService.addInternalNote(appId, 'Catatan liar dari luar tim', unassignedTechnician),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        adminAppsService.getDocumentSignedUrl(appId, 'doc-1111', unassignedTechnician),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('3. Public Tracking Security & Data Minimization', () => {
    let tokenService: TrackingTokenService;
    let rateLimiter: TrackingRateLimiter;
    let trackingService: TrackingService;

    const mockConfigService = {
      get: (key: string) => {
        if (key === 'jwt.secret') return 'super-secret-jwt-key-minimum-32chars!';
        return null;
      },
    } as unknown as ConfigService;

    const mockSupabase = {
      getClient: () => ({
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
        }),
      }),
    } as any;

    const validTicket = 'SIM-2026-000101';
    const validCode = 'TRK-A1B2C3D4';

    beforeEach(() => {
      tokenService = new TrackingTokenService(mockConfigService);
      rateLimiter = new TrackingRateLimiter();
      trackingService = new TrackingService(mockSupabase, tokenService, rateLimiter);
    });

    it('should generate short-lived 15-minute token upon correct credential verification', async () => {
      const res = await trackingService.verifyCredential({
        ticket_number: validTicket,
        tracking_code: validCode,
      });

      expect(res.tracking_token).toBeDefined();
      expect(res.expires_in).toBe(900);

      const payload = tokenService.verifySessionToken(res.tracking_token);
      expect(payload.ticket_number).toBe(validTicket);
    });

    it('should reject tampered or modified tracking tokens with 401', () => {
      const res = tokenService.generateSessionToken(validTicket, 'app-id-1');
      const tamperedToken = res.token.slice(0, -5) + 'xxxxx';

      expect(() => tokenService.verifySessionToken(tamperedToken)).toThrow(UnauthorizedException);
    });

    it('should mask sensitive applicant identity data in public summary', async () => {
      const session = tokenService.generateSessionToken(validTicket, 'a1000000-0000-0000-0000-000000000001');
      const payload = tokenService.verifySessionToken(session.token);
      const summary = await trackingService.getPublicTicketSummary(validTicket, payload);

      expect(summary.applicant_name_masked).toContain('***');
      expect(summary.applicant_email_masked).toContain('***');
      expect(summary.applicant_email_masked).not.toBe('agus.setiawan@bandungkab.go.id');
    });
  });

  describe('4. Message Visibility & Note Leakage Prevention', () => {
    let messagesService: MessagesService;

    const mockSupabase = {
      getClient: () => ({
        from: () => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                order: async () => ({ data: null, error: null }),
              }),
            }),
          }),
        }),
      }),
    } as any;

    const mockNotificationsService = {
      sendInAppNotification: async () => {},
      sendEmailNotification: async () => {},
    } as any;

    const mockAssignmentsService = {
      checkTechnicianAuthorization: async () => true,
    } as any;

    beforeEach(() => {
      messagesService = new MessagesService(
        mockSupabase,
        mockNotificationsService,
        mockAssignmentsService,
      );
    });

    it('should strictly filter out INTERNAL messages on public message endpoint', async () => {
      const testTicket = 'SIM-2026-000101';
      const testAppId = 'a1000000-0000-0000-0000-000000000001';
      const validPublicSession = {
        ticket_number: testTicket,
        application_id: testAppId,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 900,
      };

      await messagesService.sendPublicMessage(testTicket, validPublicSession, {
        message: 'Mohon info progres permohonan kami.',
      });

      const internalAdmin: AuthenticatedUser = {
        id: 'u-admin-1',
        email: 'admin@bandungkab.go.id',
        role: 'SUPER_ADMIN',
        fullName: 'Budi Santoso',
      };

      await messagesService.sendInternalMessage(testAppId, internalAdmin, {
        message: 'Catatan rahasia tim teknis: database eksisting bermasalah koneksi.',
        visibility: 'INTERNAL',
      });

      const publicMessages = await messagesService.getPublicMessages(testTicket, validPublicSession);

      expect(publicMessages.some((m) => m.message.includes('Catatan rahasia'))).toBe(false);
      expect(publicMessages.every((m) => m.visibility === 'PUBLIC')).toBe(true);
    });
  });

  describe('5. Error Response Uniformity & Information Leakage Prevention', () => {
    let filter: HttpExceptionFilter;

    beforeEach(() => {
      filter = new HttpExceptionFilter();
    });

    it('should format standard HttpExceptions into uniform schema without leaking stacks', () => {
      let capturedStatus = 0;
      let capturedJson: any = null;

      const mockResponse = {
        status: (code: number) => {
          capturedStatus = code;
          return {
            json: (payload: any) => {
              capturedJson = payload;
            },
          };
        },
      } as any;

      const mockHost = {
        switchToHttp: () => ({
          getResponse: () => mockResponse,
          getRequest: () => ({ method: 'POST', url: '/api/v1/applications' }),
        }),
      } as unknown as ExecutionContext;

      const notFoundEx = new BadRequestException('Parameter ID permohonan tidak valid.');
      filter.catch(notFoundEx, mockHost as any);

      expect(capturedStatus).toBe(HttpStatus.BAD_REQUEST);
      expect(capturedJson.success).toBe(false);
      expect(capturedJson.error.statusCode).toBe(400);
      expect(capturedJson.error.code).toBe('BAD_REQUEST');
      expect(capturedJson.error.message).toBe('Parameter ID permohonan tidak valid.');
      expect(capturedJson.error.timestamp).toBeDefined();
      expect(capturedJson.stack).toBeUndefined();
    });

    it('should sanitize raw database or uncaught 500 errors to generic error message', () => {
      let capturedStatus = 0;
      let capturedJson: any = null;

      const mockResponse = {
        status: (code: number) => {
          capturedStatus = code;
          return {
            json: (payload: any) => {
              capturedJson = payload;
            },
          };
        },
      } as any;

      const mockHost = {
        switchToHttp: () => ({
          getResponse: () => mockResponse,
          getRequest: () => ({ method: 'GET', url: '/api/v1/internal/data' }),
        }),
      } as unknown as ExecutionContext;

      const rawPgError = new Error(
        'pg_query_error: relation "public.secret_credentials" does not exist at postgres://user:pass@db.internal:5432',
      );

      filter.catch(rawPgError, mockHost as any);

      expect(capturedStatus).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(capturedJson.success).toBe(false);
      expect(capturedJson.error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(capturedJson.error.message).toBe('Terjadi kesalahan internal pada peladen.');
      expect(capturedJson.error.message).not.toContain('postgres://');
      expect(capturedJson.error.message).not.toContain('secret_credentials');
      expect(capturedJson.stack).toBeUndefined();
    });
  });
});
