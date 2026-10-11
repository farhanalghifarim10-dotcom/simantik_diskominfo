import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { SupabaseService } from '../supabase/supabase.service.js';
import { EmailService } from './email.service.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import type {
  CreateNotificationPayload,
  NotificationItem,
  NotificationType,
} from './notifications.types.js';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  // In-memory store untuk testing & offline fallback
  private readonly inMemoryNotifications: Map<string, NotificationItem> = new Map();

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Menghasilkan template netral non-dogmatis untuk notifikasi SIMANTIK.
   */
  generateNeutralTemplate(
    type: NotificationType,
    params: {
      ticketNumber?: string;
      serviceTitle?: string;
      customTitle?: string;
      customBody?: string;
      details?: Record<string, unknown>;
    },
  ): { title: string; body: string; html: string } {
    const ticket = params.ticketNumber || 'SIM-2026';
    const service = params.serviceTitle || 'Layanan SPBE';

    if (params.customTitle && params.customBody) {
      return {
        title: params.customTitle,
        body: params.customBody,
        html: `<div style="font-family: sans-serif; line-height: 1.6; color: #1e293b;">
          <h2 style="color: #0f172a;">${params.customTitle}</h2>
          <p>${params.customBody}</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #64748b;">SIMANTIK — Sistem Manajemen Layanan Teknologi Informasi Diskominfo.</p>
        </div>`,
      };
    }

    let title = `[SIMANTIK] Pembaruan Permohonan #${ticket}`;
    let body = `Terdapat perkembangan terbaru pada permohonan ${service} (${ticket}).`;

    switch (type) {
      case 'APPLICATION_SUBMITTED':
        title = `[SIMANTIK] Permohonan Diterima #${ticket}`;
        body = `Permohonan ${service} dengan nomor tiket [${ticket}] telah berhasil didaftarkan ke sistem dan masuk dalam antrean telaah.`;
        break;
      case 'APPLICATION_STATUS_CHANGED':
        title = `[SIMANTIK] Perubahan Status Tiket #${ticket}`;
        body = `Status permohonan [${ticket}] telah diperbarui. Silakan periksa detailnya pada portal pelacakan.`;
        break;
      case 'APPLICATION_STAGE_CHANGED':
        title = `[SIMANTIK] Perubahan Tahapan Siklus Hidup #${ticket}`;
        body = `Tahapan teknis permohonan [${ticket}] telah berlanjut ke tahapan berikutnya.`;
        break;
      case 'REVISION_REQUIRED':
        title = `[SIMANTIK] Tindakan Diperlukan: Permintaan Perbaikan #${ticket}`;
        body = `Permohonan [${ticket}] membutuhkan perbaikan atau kelengkapan tambahan dari instansi Anda. Silakan buka halaman pelacakan untuk menanggapi revisi.`;
        break;
      case 'APPLICATION_ASSIGNED':
        title = `[SIMANTIK] Penugasan Teknisi #${ticket}`;
        body = `Teknisi penanggung jawab telah ditugaskan untuk memproses permohonan [${ticket}].`;
        break;
      case 'NEW_MESSAGE':
        title = `[SIMANTIK] Pesan / Catatan Baru #${ticket}`;
        body = `Terdapat pesan atau catatan baru pada komunikasi tiket [${ticket}].`;
        break;
      case 'TEST_RESULT_UPDATED':
        title = `[SIMANTIK] Hasil Pengujian Kelaikan #${ticket}`;
        body = `Pencatatan hasil uji kelaikan sistem untuk tiket [${ticket}] telah diperbarui.`;
        break;
      case 'APPLICATION_COMPLETED':
        title = `[SIMANTIK] Pembangunan Aplikasi Selesai #${ticket}`;
        body = `Seluruh tahapan permohonan [${ticket}] telah selesai dan siap untuk diserahterimakan.`;
        break;
      case 'APPLICATION_CLOSED':
        title = `[SIMANTIK] Tiket Ditutup #${ticket}`;
        body = `Tiket permohonan [${ticket}] telah ditutup secara administratif.`;
        break;
      case 'SYSTEM':
      default:
        title = `[SIMANTIK] Notifikasi Sistem #${ticket}`;
        body = `Informasi operasional sistem terkait tiket [${ticket}].`;
        break;
    }

    const html = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background-color: #0f172a; padding: 24px; color: #ffffff;">
        <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: bold;">Pemerintah Daerah — Diskominfo</span>
        <h1 style="font-size: 20px; font-weight: bold; margin: 8px 0 0 0; color: #ffffff;">SIMANTIK</h1>
      </div>
      <div style="padding: 24px; background-color: #ffffff;">
        <h2 style="font-size: 16px; font-weight: bold; color: #0f172a; margin-top: 0;">${title}</h2>
        <p style="font-size: 14px; color: #334155; line-height: 1.6;">${body}</p>
        <div style="margin: 24px 0; padding: 16px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 13px;">
          <div><strong>Nomor Tiket:</strong> <span style="font-family: monospace;">${ticket}</span></div>
          <div><strong>Jenis Layanan:</strong> ${service}</div>
        </div>
        <p style="font-size: 13px; color: #64748b;">Untuk memeriksa rincian terkini dan menanggapi catatan, silakan buka portal pelacakan SIMANTIK.</p>
      </div>
      <div style="padding: 16px 24px; background-color: #f1f5f9; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
        Email ini dikirimkan secara otomatis oleh sistem pencatatan SIMANTIK. Mohon tidak membalas langsung ke email ini.
      </div>
    </div>`;

    return { title, body, html };
  }

  /**
   * Membuat dan mendistribusikan notifikasi (IN_APP atau EMAIL).
   */
  async notify(payload: CreateNotificationPayload): Promise<NotificationItem> {
    const template = this.generateNeutralTemplate(payload.type, {
      ticketNumber: payload.ticket_number,
      serviceTitle: payload.service_title,
      customTitle: payload.title,
      customBody: payload.body,
    });

    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    const record: NotificationItem = {
      id,
      recipient_profile_id: payload.recipient_profile_id || null,
      recipient_email: payload.recipient_email || null,
      application_id: payload.application_id || null,
      ticket_number: payload.ticket_number,
      type: payload.type,
      channel: payload.channel,
      title: template.title,
      body: template.body,
      delivery_status: 'PENDING',
      read_at: null,
      sent_at: null,
      delivery_error: null,
      created_at: now,
    };

    // 1. Jika Channel EMAIL: Kirim melalui EmailService (Resend abstraction)
    if (payload.channel === 'EMAIL' && payload.recipient_email) {
      const emailRes = await this.emailService.sendEmail({
        to: payload.recipient_email,
        subject: template.title,
        html: template.html,
        text: template.body,
        idempotencyKey: payload.idempotency_key,
      });

      record.delivery_status = emailRes.status;
      if (emailRes.status === 'SENT') {
        record.sent_at = now;
      } else {
        record.delivery_error = emailRes.error || 'Gagal mengirim email';
      }
    } else if (payload.channel === 'IN_APP') {
      record.delivery_status = 'SENT';
      record.sent_at = now;
    }

    // 2. Simpan ke database Supabase
    try {
      const client = this.supabaseService.getClient();
      await client.from('notifications').insert({
        id: record.id,
        recipient_profile_id: record.recipient_profile_id,
        recipient_email: record.recipient_email,
        application_id: record.application_id,
        type: record.type,
        channel: record.channel,
        title: record.title,
        body: record.body,
        delivery_status: record.delivery_status,
        sent_at: record.sent_at,
        delivery_error: record.delivery_error,
        created_at: record.created_at,
      });
    } catch {
      // Fallback in-memory
    }

    this.inMemoryNotifications.set(id, record);
    return record;
  }

  /**
   * Helper untuk menormalisasi user parameter baik objek AuthenticatedUser maupun string ID.
   */
  private resolveUser(userOrId: AuthenticatedUser | string): AuthenticatedUser {
    if (typeof userOrId === 'string') {
      return {
        id: userOrId,
        email: null,
        role: 'SUPER_ADMIN',
        fullName: 'Pengguna Internal',
      };
    }
    return userOrId;
  }

  /**
   * Helper pengujian: Menghapus seluruh notifikasi tersimpan di memori.
   */
  clearInMemoryNotifications(): void {
    this.inMemoryNotifications.clear();
  }

  /**
   * Helper pengujian: Mendaftarkan notifikasi secara langsung ke memori.
   */
  seedInMemoryNotification(item: NotificationItem): void {
    this.inMemoryNotifications.set(item.id, item);
  }

  /**
   * Mengambil daftar notifikasi in-app untuk pengguna internal dengan penegakan RBAC.
   * - SUPER_ADMIN: Memiliki hak visibilitas terhadap seluruh notifikasi IN_APP internal.
   * - TECHNICIAN: Hanya melihat notifikasi yang ditujukan langsung ke profilnya atau broadcast tanpa penerima spesifik.
   * - Bergabung dengan tabel applications untuk melengkapi ticket_number.
   */
  async getUserNotifications(userOrId: AuthenticatedUser | string): Promise<NotificationItem[]> {
    const user = this.resolveUser(userOrId);

    try {
      const client = this.supabaseService.getClient();
      let query = client
        .from('notifications')
        .select(`
          *,
          applications:application_id(id, ticket_number)
        `)
        .eq('channel', 'IN_APP')
        .order('created_at', { ascending: false })
        .limit(50);

      // Teknisi dibatasi hanya notifikasi personal atau broadcast
      if (user.role === 'TECHNICIAN') {
        query = query.or(`recipient_profile_id.eq.${user.id},recipient_profile_id.is.null`);
      }

      const { data, error } = await query;

      if (!error && Array.isArray(data)) {
        return data.map((row: any) => ({
          ...row,
          ticket_number: row.applications?.ticket_number || row.ticket_number || undefined,
        })) as NotificationItem[];
      }
    } catch {
      // Fallback in-memory
    }

    return Array.from(this.inMemoryNotifications.values())
      .filter((n) => {
        if (n.channel !== 'IN_APP') return false;
        if (user.role === 'SUPER_ADMIN') return true;
        return n.recipient_profile_id === user.id || n.recipient_profile_id === null;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  /**
   * Menandai satu notifikasi sebagai telah dibaca (read_at).
   * Memvalidasi otorisasi: SUPER_ADMIN dapat menandai notifikasi apapun; TECHNICIAN hanya yang menjadi haknya.
   */
  async markAsRead(
    notificationId: string,
    userOrId: AuthenticatedUser | string,
  ): Promise<void> {
    const user = this.resolveUser(userOrId);
    const now = new Date().toISOString();

    try {
      const client = this.supabaseService.getClient();
      let query = client
        .from('notifications')
        .update({ read_at: now })
        .eq('id', notificationId);

      if (user.role === 'TECHNICIAN') {
        query = query.or(`recipient_profile_id.eq.${user.id},recipient_profile_id.is.null`);
      }

      await query;
    } catch {
      // Fallback
    }

    const item = this.inMemoryNotifications.get(notificationId);
    if (item) {
      if (
        user.role === 'SUPER_ADMIN' ||
        item.recipient_profile_id === user.id ||
        item.recipient_profile_id === null
      ) {
        item.read_at = now;
      }
    }
  }

  /**
   * Menandai seluruh notifikasi yang belum dibaca sebagai telah dibaca (read_at).
   */
  async markAllAsRead(
    userOrId: AuthenticatedUser | string,
  ): Promise<{ affected: number }> {
    const user = this.resolveUser(userOrId);
    const now = new Date().toISOString();
    let affected = 0;

    try {
      const client = this.supabaseService.getClient();
      let query = client
        .from('notifications')
        .update({ read_at: now })
        .is('read_at', null)
        .eq('channel', 'IN_APP');

      if (user.role === 'TECHNICIAN') {
        query = query.or(`recipient_profile_id.eq.${user.id},recipient_profile_id.is.null`);
      }

      const { data, error } = await query.select('id');
      if (!error && data) {
        affected = data.length;
      }
    } catch {
      // Fallback in-memory
    }

    for (const item of this.inMemoryNotifications.values()) {
      if (!item.read_at && item.channel === 'IN_APP') {
        if (
          user.role === 'SUPER_ADMIN' ||
          item.recipient_profile_id === user.id ||
          item.recipient_profile_id === null
        ) {
          item.read_at = now;
          affected++;
        }
      }
    }

    return { affected };
  }

  /**
   * Menghitung jumlah notifikasi belum dibaca untuk pengguna internal.
   */
  async getUnreadCount(userOrId: AuthenticatedUser | string): Promise<number> {
    const notifs = await this.getUserNotifications(userOrId);
    return notifs.filter((n) => !n.read_at).length;
  }
}
