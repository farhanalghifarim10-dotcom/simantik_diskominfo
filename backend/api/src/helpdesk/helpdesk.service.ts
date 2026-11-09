import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { SupabaseService } from '../supabase/supabase.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import type {
  ConsultationItem,
  CreateConsultationDto,
} from './helpdesk.types.js';

@Injectable()
export class HelpdeskService {
  private readonly inMemoryConsultations: Map<string, ConsultationItem> = new Map();

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private sanitizeText(input: string): string {
    if (!input) return '';
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]*>/g, '')
      .trim();
  }

  clearInMemoryConsultations(): void {
    this.inMemoryConsultations.clear();
  }

  seedInMemoryConsultation(item: ConsultationItem): void {
    this.inMemoryConsultations.set(item.id, item);
  }

  private validateDto(dto: CreateConsultationDto): {
    opdName: string;
    senderName: string;
    email: string;
    phone: string;
    subject: string;
    message: string;
  } {
    const rawOpd = dto.opd_name || dto.opdName || '';
    const rawSender = dto.sender_name || dto.senderName || '';
    const rawEmail = dto.email || '';
    const rawPhone = dto.phone || '';
    const rawSubject = dto.subject || '';
    const rawMessage = dto.message || '';

    const opdName = this.sanitizeText(rawOpd);
    const senderName = this.sanitizeText(rawSender);
    const email = rawEmail.trim().toLowerCase();
    const phone = this.sanitizeText(rawPhone);
    const subject = this.sanitizeText(rawSubject);
    const message = this.sanitizeText(rawMessage);

    if (!opdName || opdName.length < 3 || opdName.length > 200) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Nama OPD / Instansi wajib diisi (minimal 3 karakter, maksimal 200 karakter).',
      });
    }

    if (!senderName || senderName.length < 3 || senderName.length > 100) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Nama Narahubung (PIC) wajib diisi (minimal 3 karakter, maksimal 100 karakter).',
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email) || email.length > 150) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Alamat email resmi tidak valid.',
      });
    }

    const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{7,20}$/;
    if (!phone || !phoneRegex.test(phone) || phone.length < 8 || phone.length > 25) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Nomor telepon / WhatsApp narahubung tidak valid (minimal 8 digit).',
      });
    }

    if (!subject || subject.length < 5 || subject.length > 200) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Topik konsultasi wajib diisi (minimal 5 karakter, maksimal 200 karakter).',
      });
    }

    if (!message || message.length < 10 || message.length > 3000) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Uraian pesan konsultasi wajib diisi (minimal 10 karakter, maksimal 3000 karakter).',
      });
    }

    return { opdName, senderName, email, phone, subject, message };
  }

  private parseNotificationToConsultation(notif: any): ConsultationItem {
    let opdName = 'OPD Pemkab Bandung';
    let subject = 'Konsultasi SPBE';
    const titleMatch = (notif.title || '').match(/^\[Konsultasi OPD\]\s*(.*?)\s*-\s*(.*)$/);
    if (titleMatch) {
      opdName = titleMatch[1].trim();
      subject = titleMatch[2].trim();
    }

    let senderName = 'Narahubung OPD';
    let email = notif.recipient_email || 'opd@bandungkab.go.id';
    let phone = '-';
    let message = notif.body || '';

    const bodyText = notif.body || '';
    const senderMatch = bodyText.match(/Pengirim:\s*([^|\n]+)/);
    if (senderMatch) senderName = senderMatch[1].trim();

    const emailMatch = bodyText.match(/Pos-el:\s*([^|\n]+)/);
    if (emailMatch) email = emailMatch[1].trim();

    const phoneMatch = bodyText.match(/Telp:\s*([^|\n]+)/);
    if (phoneMatch) phone = phoneMatch[1].trim();

    const messageMatch = bodyText.match(/Pesan:\s*([\s\S]*)$/);
    if (messageMatch) message = messageMatch[1].trim();

    const isRead = Boolean(notif.read_at);

    return {
      id: notif.id,
      opd_name: opdName,
      sender_name: senderName,
      email,
      phone,
      subject,
      message,
      status: isRead ? 'READ' : 'NEW',
      read_at: notif.read_at || null,
      created_at: notif.created_at,
      notification_id: notif.id,
    };
  }

  async submitConsultation(dto: CreateConsultationDto): Promise<ConsultationItem> {
    const validated = this.validateDto(dto);
    const now = new Date().toISOString();

    const notifTitle = `[Konsultasi OPD] ${validated.opdName} - ${validated.subject}`;
    const notifBody = `Pengirim: ${validated.senderName} | Pos-el: ${validated.email} | Telp: ${validated.phone}\n\nTopik: ${validated.subject}\n\nPesan:\n${validated.message}`;

    let notifRecord: any;
    try {
      notifRecord = await this.notificationsService.notify({
        type: 'NEW_MESSAGE',
        channel: 'IN_APP',
        title: notifTitle,
        body: notifBody,
      });
    } catch {
      notifRecord = { id: crypto.randomUUID(), created_at: now };
    }

    const consultationId = notifRecord?.id || crypto.randomUUID();

    const consultationItem: ConsultationItem = {
      id: consultationId,
      opd_name: validated.opdName,
      sender_name: validated.senderName,
      email: validated.email,
      phone: validated.phone,
      subject: validated.subject,
      message: validated.message,
      status: 'NEW',
      read_at: null,
      created_at: notifRecord?.created_at || now,
      notification_id: notifRecord?.id,
    };

    this.inMemoryConsultations.set(consultationId, consultationItem);

    try {
      await this.notificationsService.notify({
        type: 'SYSTEM',
        channel: 'EMAIL',
        recipient_email: validated.email,
        title: `[SIMANTIK] Konfirmasi Penerimaan Konsultasi: ${validated.subject}`,
        body: `Yth. ${validated.senderName} (${validated.opdName}),\n\nPertanyaan konsultasi Anda terkait "${validated.subject}" telah kami terima oleh Tim Helpdesk Diskominfo Kabupaten Bandung. Tim kami akan meninjau dan menghubungi narahubung dalam waktu maksimal 1x24 jam kerja.\n\nRingkasan Pesan:\n${validated.message}`,
      });
    } catch {
      // Abaikan kegagalan email konfirmasi pemohon
    }

    return consultationItem;
  }

  async getConsultations(user: AuthenticatedUser): Promise<ConsultationItem[]> {
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'TECHNICIAN') {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'Akses ditolak. Hanya pengguna internal yang berwenang.',
      });
    }

    const itemsMap = new Map<string, ConsultationItem>();

    try {
      const client = this.supabaseService.getClient();
      const { data, error } = await client
        .from('notifications')
        .select('*')
        .eq('channel', 'IN_APP')
        .ilike('title', '[Konsultasi OPD]%')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && Array.isArray(data)) {
        for (const row of data) {
          const item = this.parseNotificationToConsultation(row);
          itemsMap.set(item.id, item);
        }
      }
    } catch {
      // Fallback
    }

    for (const [id, item] of this.inMemoryConsultations.entries()) {
      if (!itemsMap.has(id)) {
        itemsMap.set(id, item);
      }
    }

    return Array.from(itemsMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }

  async markAsRead(id: string, user: AuthenticatedUser): Promise<ConsultationItem> {
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'TECHNICIAN') {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'Akses ditolak.',
      });
    }

    const now = new Date().toISOString();

    try {
      await this.notificationsService.markAsRead(id, user);
    } catch {
      // Abaikan jika notifikasi tidak ada
    }

    const existing = this.inMemoryConsultations.get(id);
    if (existing) {
      existing.status = 'READ';
      existing.read_at = now;
      this.inMemoryConsultations.set(id, existing);
      return existing;
    }

    try {
      const client = this.supabaseService.getClient();
      const { data } = await client
        .from('notifications')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (data) {
        return {
          ...this.parseNotificationToConsultation(data),
          status: 'READ',
          read_at: now,
        };
      }
    } catch {
      // Fallback
    }

    throw new NotFoundException({
      statusCode: 404,
      message: 'Pesan konsultasi tidak ditemukan.',
    });
  }
}
