import { beforeEach, describe, expect, it } from 'vitest';
import { BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../notifications/email.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { MessagesService } from './messages.service.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';

describe('Messages & Notifications Modules (Ticket Chat & Alerting)', () => {
  let emailService: EmailService;
  let notificationsService: NotificationsService;
  let messagesService: MessagesService;

  const mockConfigService = {
    get: (key: string) => {
      if (key === 'email.resendApiKey') return null;
      if (key === 'email.fromEmail') return 'SIMANTIK <test@simantik.bandungkab.go.id>';
      return null;
    },
  } as unknown as ConfigService;

  const mockSupabaseService = {
    getClient: () => ({
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: null, error: null }),
            }),
            order: () => Promise.resolve({ data: null, error: null }),
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
        insert: () => Promise.resolve({ data: null, error: null }),
        update: () => ({
          eq: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
    }),
  } as any;

  const mockAssignmentsService = {
    checkTechnicianAuthorization: async (appId: string, userId: string) => {
      return userId === 'tech-assigned-id';
    },
  } as any;

  const testAppId = 'app-test-uuid-1';
  const testTicket = 'SIM-2026-000101';

  const superAdminUser: AuthenticatedUser = {
    id: 'admin-id-1',
    email: 'admin@bandungkab.go.id',
    fullName: 'Super Administrator',
    role: 'SUPER_ADMIN',
  };

  const assignedTechUser: AuthenticatedUser = {
    id: 'tech-assigned-id',
    email: 'tech.assigned@bandungkab.go.id',
    fullName: 'Teknisi Utama',
    role: 'TECHNICIAN',
  };

  const unassignedTechUser: AuthenticatedUser = {
    id: 'tech-unassigned-id',
    email: 'tech.other@bandungkab.go.id',
    fullName: 'Teknisi Lain',
    role: 'TECHNICIAN',
  };

  const validPublicSession = {
    ticket_number: testTicket,
    application_id: testAppId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 900,
  };

  beforeEach(() => {
    emailService = new EmailService(mockConfigService);
    notificationsService = new NotificationsService(mockSupabaseService, emailService);
    messagesService = new MessagesService(
      mockSupabaseService,
      notificationsService,
      mockAssignmentsService,
    );

    messagesService.setInMemoryMessages(testAppId, [
      {
        id: 'msg-pub-1',
        application_id: testAppId,
        ticket_number: testTicket,
        sender_type: 'PUBLIC_APPLICANT',
        sender_name: 'Drs. Agus S***',
        visibility: 'PUBLIC',
        message: 'Mohon informasi waktu pelaksanaan telaah KAK.',
        created_at: new Date(Date.now() - 3600000).toISOString(),
        updated_at: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: 'msg-pub-2',
        application_id: testAppId,
        ticket_number: testTicket,
        sender_type: 'ADMIN',
        sender_name: 'Tim Teknis Diskominfo',
        visibility: 'PUBLIC',
        message: 'Telaah KAK dijadwalkan selesai lusa.',
        created_at: new Date(Date.now() - 1800000).toISOString(),
        updated_at: new Date(Date.now() - 1800000).toISOString(),
      },
      {
        id: 'msg-int-1',
        application_id: testAppId,
        ticket_number: testTicket,
        sender_type: 'ADMIN',
        sender_name: 'Super Administrator',
        visibility: 'INTERNAL',
        message: '[CATATAN INTERNAL]: Server database staging sedang disiapkan teknisi.',
        created_at: new Date(Date.now() - 900000).toISOString(),
        updated_at: new Date(Date.now() - 900000).toISOString(),
      },
    ]);
  });

  describe('1. Public / Internal Message Isolation (CRITICAL)', () => {
    it('CRITICAL: Public API must NEVER return INTERNAL messages', async () => {
      const publicMessages = await messagesService.getPublicMessages(
        testTicket,
        validPublicSession,
      );

      expect(publicMessages).toHaveLength(2);
      publicMessages.forEach((m) => {
        expect(m.visibility).toBe('PUBLIC');
        expect(m.message).not.toContain('[CATATAN INTERNAL]');
      });

      const internalFound = publicMessages.find((m) => m.id === 'msg-int-1');
      expect(internalFound).toBeUndefined();
    });

    it('should return both PUBLIC and INTERNAL messages for authorized internal users', async () => {
      const internalMessages = await messagesService.getInternalMessages(
        testAppId,
        superAdminUser,
      );

      expect(internalMessages).toHaveLength(3);
      expect(internalMessages.some((m) => m.visibility === 'INTERNAL')).toBe(true);
      expect(internalMessages.some((m) => m.visibility === 'PUBLIC')).toBe(true);
    });
  });

  describe('2. Message Authorization', () => {
    it('should reject public message fetch when session ticket does not match', async () => {
      await expect(
        messagesService.getPublicMessages('SIM-2026-999999', validPublicSession),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should allow assigned technician to access internal messages', async () => {
      const msgs = await messagesService.getInternalMessages(
        testAppId,
        assignedTechUser,
      );
      expect(msgs).toHaveLength(3);
    });

    it('should reject unassigned technician with 403 Forbidden', async () => {
      await expect(
        messagesService.getInternalMessages(testAppId, unassignedTechUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('3. Sending Messages & Validation', () => {
    it('should allow public user to send message and force visibility to PUBLIC', async () => {
      const newMsg = await messagesService.sendPublicMessage(
        testTicket,
        validPublicSession,
        { message: 'Berikut lampiran tambahan yang diperlukan.' },
      );

      expect(newMsg.visibility).toBe('PUBLIC');
      expect(newMsg.sender_type).toBe('PUBLIC_APPLICANT');
      expect(newMsg.message).toBe('Berikut lampiran tambahan yang diperlukan.');

      const updated = await messagesService.getPublicMessages(
        testTicket,
        validPublicSession,
      );
      expect(updated).toHaveLength(3);
    });

    it('should reject empty message with 400 BadRequest', async () => {
      await expect(
        messagesService.sendPublicMessage(testTicket, validPublicSession, {
          message: '   ',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow admin to create an INTERNAL note', async () => {
      const note = await messagesService.sendInternalMessage(
        testAppId,
        superAdminUser,
        {
          message: 'Catatan rahasia penugasan tim.',
          visibility: 'INTERNAL',
        },
      );

      expect(note.visibility).toBe('INTERNAL');
      expect(note.sender_type).toBe('ADMIN');

      const publicMsgs = await messagesService.getPublicMessages(
        testTicket,
        validPublicSession,
      );
      expect(publicMsgs.find((m) => m.id === note.id)).toBeUndefined();
    });

    it('should allow admin to reply with a PUBLIC message', async () => {
      const reply = await messagesService.sendInternalMessage(
        testAppId,
        superAdminUser,
        {
          message: 'Balasan resmi: Dokumen Anda telah disetujui.',
          visibility: 'PUBLIC',
        },
      );

      expect(reply.visibility).toBe('PUBLIC');

      const publicMsgs = await messagesService.getPublicMessages(
        testTicket,
        validPublicSession,
      );
      expect(publicMsgs.find((m) => m.id === reply.id)).toBeDefined();
    });
  });

  describe('4. Notification Service & Email Abstraction', () => {
    it('should create in-app notification with neutral template', async () => {
      const notif = await notificationsService.notify({
        application_id: testAppId,
        ticket_number: testTicket,
        type: 'APPLICATION_STATUS_CHANGED',
        channel: 'IN_APP',
        recipient_profile_id: 'admin-id-1',
      });

      expect(notif.delivery_status).toBe('SENT');
      expect(notif.title).toContain(testTicket);
      expect(notif.body).toContain(testTicket);

      const userNotifs = await notificationsService.getUserNotifications('admin-id-1');
      expect(userNotifs.some((n) => n.id === notif.id)).toBe(true);
    });

    it('should mark in-app notification as read', async () => {
      const notif = await notificationsService.notify({
        application_id: testAppId,
        ticket_number: testTicket,
        type: 'APPLICATION_ASSIGNED',
        channel: 'IN_APP',
        recipient_profile_id: 'tech-assigned-id',
      });

      expect(notif.read_at).toBeNull();

      await notificationsService.markAsRead(notif.id, 'tech-assigned-id');

      const userNotifs = await notificationsService.getUserNotifications('tech-assigned-id');
      const updated = userNotifs.find((n) => n.id === notif.id);
      expect(updated?.read_at).toBeDefined();
    });

    it('should safely dispatch email via EmailService abstraction in simulated/production mode', async () => {
      emailService.clearDeduplicationCache();

      const result = await emailService.sendEmail({
        to: 'applicant@bandungkab.go.id',
        subject: `[SIMANTIK] Pemberitahuan #${testTicket}`,
        html: '<p>Konten notifikasi netral</p>',
      });

      expect(result.status).toBe('SENT');
      expect(result.id).toBeDefined();
    });

    it('should prevent sending duplicate emails within deduplication window', async () => {
      emailService.clearDeduplicationCache();

      const res1 = await emailService.sendEmail({
        to: 'applicant@bandungkab.go.id',
        subject: `[SIMANTIK] Status #${testTicket}`,
        html: '<p>Isi email</p>',
      });
      expect(res1.status).toBe('SENT');

      const res2 = await emailService.sendEmail({
        to: 'applicant@bandungkab.go.id',
        subject: `[SIMANTIK] Status #${testTicket}`,
        html: '<p>Isi email</p>',
      });

      expect(res2.id).toBe('deduplicated');
      expect(res2.status).toBe('SENT');
    });
  });
});
