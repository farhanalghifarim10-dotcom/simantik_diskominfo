import { describe, expect, it, beforeEach } from 'vitest';
import { NotificationsService } from './notifications.service.js';
import { NotificationsController } from './notifications.controller.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import type { NotificationItem } from './notifications.types.js';

describe('Notifications Module & RBAC Flow', () => {
  let notificationsService: NotificationsService;
  let notificationsController: NotificationsController;

  const superAdminUser: AuthenticatedUser = {
    id: 'u-admin-1',
    email: 'admin.aptika@bandungkab.go.id',
    role: 'SUPER_ADMIN',
    fullName: 'Budi Santoso, S.Kom (Super Admin)',
  };

  const technician1: AuthenticatedUser = {
    id: 'u-tech-1',
    email: 'teknisi1@bandungkab.go.id',
    role: 'TECHNICIAN',
    fullName: 'Ahmad Fauzi (Teknisi TI)',
  };

  const technician2: AuthenticatedUser = {
    id: 'u-tech-2',
    email: 'teknisi2@bandungkab.go.id',
    role: 'TECHNICIAN',
    fullName: 'Siti Rahmawati (Teknisi TI)',
  };

  const mockSupabaseService = {
    getClient: () => ({
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: async () => ({ data: null, error: new Error('Mock fallback to memory') }),
            }),
          }),
        }),
        insert: async () => ({ error: null }),
        update: () => ({
          eq: () => ({
            eq: async () => ({ error: null }),
            or: async () => ({ error: null }),
          }),
          is: () => ({
            eq: () => ({
              or: () => ({ select: async () => ({ data: [], error: null }) }),
              select: async () => ({ data: [], error: null }),
            }),
          }),
        }),
      }),
    }),
  } as any;

  const mockEmailService = {
    sendEmail: async () => ({ status: 'SENT', id: 'email-id-1' }),
  } as any;

  const createMockNotif = (
    id: string,
    channel: 'IN_APP' | 'EMAIL',
    recipientProfileId: string | null = null,
    readAt: string | null = null,
  ): NotificationItem => ({
    id,
    recipient_profile_id: recipientProfileId,
    recipient_email: channel === 'EMAIL' ? 'pemohon@bandungkab.go.id' : null,
    application_id: 'app-1',
    ticket_number: 'SIM-2026-603023',
    type: 'NEW_MESSAGE',
    channel,
    title: `Notifikasi ${id}`,
    body: `Isi pesan notifikasi ${id}`,
    delivery_status: 'SENT',
    read_at: readAt,
    sent_at: '2026-10-10T09:00:00.000Z',
    delivery_error: null,
    created_at: '2026-10-10T09:00:00.000Z',
  });

  beforeEach(() => {
    notificationsService = new NotificationsService(mockSupabaseService, mockEmailService);
    notificationsController = new NotificationsController(notificationsService);
  });

  describe('1. Retrieval & Visibility RBAC', () => {
    it('should return empty list when no notifications exist', async () => {
      const res = await notificationsService.getUserNotifications(superAdminUser);
      expect(res).toEqual([]);
      expect(await notificationsService.getUnreadCount(superAdminUser)).toBe(0);
    });

    it('should allow SUPER_ADMIN to see all IN_APP notifications (broadcast & targeted)', async () => {
      notificationsService.seedInMemoryNotification(createMockNotif('n-broadcast', 'IN_APP', null));
      notificationsService.seedInMemoryNotification(createMockNotif('n-tech1', 'IN_APP', technician1.id));
      notificationsService.seedInMemoryNotification(createMockNotif('n-email', 'EMAIL', null));

      const adminNotifs = await notificationsService.getUserNotifications(superAdminUser);
      expect(adminNotifs.length).toBe(2);
      expect(adminNotifs.some((n) => n.id === 'n-broadcast')).toBe(true);
      expect(adminNotifs.some((n) => n.id === 'n-tech1')).toBe(true);
      expect(adminNotifs.some((n) => n.id === 'n-email')).toBe(false);
    });

    it('should enforce TECHNICIAN isolation: sees own and broadcast, but not other technicians', async () => {
      notificationsService.seedInMemoryNotification(createMockNotif('n-broadcast', 'IN_APP', null));
      notificationsService.seedInMemoryNotification(createMockNotif('n-tech1', 'IN_APP', technician1.id));
      notificationsService.seedInMemoryNotification(createMockNotif('n-tech2', 'IN_APP', technician2.id));

      const tech1Notifs = await notificationsService.getUserNotifications(technician1);
      expect(tech1Notifs.length).toBe(2);
      expect(tech1Notifs.some((n) => n.id === 'n-broadcast')).toBe(true);
      expect(tech1Notifs.some((n) => n.id === 'n-tech1')).toBe(true);
      expect(tech1Notifs.some((n) => n.id === 'n-tech2')).toBe(false);
    });
  });

  describe('2. Unread Count Calculation', () => {
    it('should accurately calculate unread count', async () => {
      notificationsService.seedInMemoryNotification(createMockNotif('n-1', 'IN_APP', null, null));
      notificationsService.seedInMemoryNotification(createMockNotif('n-2', 'IN_APP', null, '2026-10-10T10:00:00.000Z'));

      const count = await notificationsService.getUnreadCount(superAdminUser);
      expect(count).toBe(1);
    });

    it('should return 0 when all notifications are read', async () => {
      notificationsService.seedInMemoryNotification(createMockNotif('n-read', 'IN_APP', null, '2026-10-10T10:00:00.000Z'));
      const count = await notificationsService.getUnreadCount(superAdminUser);
      expect(count).toBe(0);
    });
  });

  describe('3. Mark as Read & Bulk Read Actions', () => {
    it('should mark single notification as read', async () => {
      notificationsService.seedInMemoryNotification(createMockNotif('n-unread', 'IN_APP', null, null));

      expect(await notificationsService.getUnreadCount(superAdminUser)).toBe(1);

      await notificationsService.markAsRead('n-unread', superAdminUser);

      const items = await notificationsService.getUserNotifications(superAdminUser);
      expect(items[0].read_at).toBeDefined();
      expect(await notificationsService.getUnreadCount(superAdminUser)).toBe(0);
    });

    it('should mark all unread notifications as read via markAllAsRead', async () => {
      notificationsService.seedInMemoryNotification(createMockNotif('n-1', 'IN_APP', null, null));
      notificationsService.seedInMemoryNotification(createMockNotif('n-2', 'IN_APP', superAdminUser.id, null));

      expect(await notificationsService.getUnreadCount(superAdminUser)).toBe(2);

      const res = await notificationsService.markAllAsRead(superAdminUser);
      expect(res.affected).toBe(2);

      const countAfter = await notificationsService.getUnreadCount(superAdminUser);
      expect(countAfter).toBe(0);
    });
  });

  describe('4. NotificationsController Endpoints', () => {
    it('should handle GET /notifications', async () => {
      notificationsService.seedInMemoryNotification(createMockNotif('n-ctrl', 'IN_APP', null));

      const res = await notificationsController.getMyNotifications({ user: superAdminUser });
      expect(res.success).toBe(true);
      expect(res.data.length).toBe(1);
      expect(res.data[0].id).toBe('n-ctrl');
    });

    it('should handle GET /notifications/unread-count', async () => {
      notificationsService.seedInMemoryNotification(createMockNotif('n-ctrl-unread', 'IN_APP', null, null));

      const res = await notificationsController.getUnreadCount({ user: superAdminUser });
      expect(res.success).toBe(true);
      expect(res.data.unread_count).toBe(1);
    });

    it('should handle POST /notifications/:id/read', async () => {
      notificationsService.seedInMemoryNotification(createMockNotif('n-target', 'IN_APP', null, null));

      const res = await notificationsController.markRead('n-target', { user: superAdminUser });
      expect(res.success).toBe(true);
      expect(res.message).toBe('Notifikasi ditandai telah dibaca.');

      const count = await notificationsService.getUnreadCount(superAdminUser);
      expect(count).toBe(0);
    });

    it('should handle POST /notifications/read-all', async () => {
      notificationsService.seedInMemoryNotification(createMockNotif('n-bulk-1', 'IN_APP', null, null));
      notificationsService.seedInMemoryNotification(createMockNotif('n-bulk-2', 'IN_APP', null, null));

      const res = await notificationsController.markAllRead({ user: superAdminUser });
      expect(res.success).toBe(true);
      expect(res.message).toBe('Semua notifikasi ditandai telah dibaca.');

      const count = await notificationsService.getUnreadCount(superAdminUser);
      expect(count).toBe(0);
    });
  });
});
