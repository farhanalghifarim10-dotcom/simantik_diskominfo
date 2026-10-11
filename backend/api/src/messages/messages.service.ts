import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { SupabaseService } from '../supabase/supabase.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { AssignmentsService } from '../assignments/assignments.service.js';
import type { TrackingSessionPayload } from '../tracking/tracking.types.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import type {
  CreateMessageDto,
  CreatePublicMessageDto,
  MessageItem,
} from './messages.types.js';

@Injectable()
export class MessagesService {
  // In-memory fallback message store for offline and unit testing
  private readonly inMemoryMessages: Map<string, MessageItem[]> = new Map();

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly notificationsService: NotificationsService,
    private readonly assignmentsService: AssignmentsService,
  ) {
    this.seedInitialMessages();
  }

  private seedInitialMessages() {
    const seedAppId = 'a1000000-0000-0000-0000-000000000001';
    const now = new Date().toISOString();

    this.inMemoryMessages.set(seedAppId, [
      {
        id: 'msg-seed-1',
        application_id: seedAppId,
        ticket_number: 'SIM-2026-000101',
        sender_type: 'PUBLIC_APPLICANT',
        sender_name: 'Drs. Agus S***',
        visibility: 'PUBLIC',
        message: 'Permohonan integrasi API Simpatik telah kami ajukan beserta KAK resmi.',
        created_at: new Date(Date.now() - 3600000).toISOString(),
        updated_at: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: 'msg-seed-2',
        application_id: seedAppId,
        ticket_number: 'SIM-2026-000101',
        sender_type: 'ADMIN',
        sender_name: 'Diskominfo Aptika',
        visibility: 'PUBLIC',
        message: 'Terima kasih, berkas KAK Anda sedang dalam proses penelaahan administrasi.',
        created_at: now,
        updated_at: now,
      },
      {
        id: 'msg-seed-3-internal',
        application_id: seedAppId,
        ticket_number: 'SIM-2026-000101',
        sender_type: 'ADMIN',
        sender_name: 'Verifikator Internal',
        visibility: 'INTERNAL',
        message: '[CATATAN INTERNAL TEKNISI]: Perlu cek kesesuaian endpoint API dengan arsitektur SPBE Pemkab.',
        created_at: now,
        updated_at: now,
      },
    ]);
  }

  /**
   * Helper untuk mendaftarkan pesan in-memory pada unit test
   */
  setInMemoryMessages(applicationId: string, messages: MessageItem[]): void {
    this.inMemoryMessages.set(applicationId, messages);
  }

  /**
   * 1. GET PUBLIC MESSAGES
   * CRITICAL SECURITY CONSTRAINT:
   * Mengambil pesan komunikasi tiket untuk akses publik pemohon.
   * HANYA pesan dengan visibility = 'PUBLIC' yang dikembalikan!
   * Pesan 'INTERNAL' TIDAK PERNAH dikembalikan ke publik.
   */
  async getPublicMessages(
    ticketNumber: string,
    session: TrackingSessionPayload,
  ): Promise<MessageItem[]> {
    const normalizedTicket = ticketNumber.trim().toUpperCase();
    if (session.ticket_number.toUpperCase() !== normalizedTicket) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'TRACKING_INVALID_CREDENTIAL',
        message: 'Sesi pelacakan tidak diotorisasi untuk nomor tiket ini.',
      });
    }

    const appId = session.application_id;

    // 1. Coba dari Supabase dengan filter ketat visibility = 'PUBLIC'
    try {
      const client = this.supabaseService.getClient();
      const { data, error } = await client
        .from('messages')
        .select('*')
        .eq('application_id', appId)
        .eq('visibility', 'PUBLIC') // KETAT: hanya PUBLIC
        .order('created_at', { ascending: true });

      if (!error && Array.isArray(data)) {
        return data.map((m) => this.sanitizePublicMessage(m));
      }
    } catch {
      // Fallback in-memory
    }

    // 2. Fallback in-memory: filter ketat visibility = 'PUBLIC'
    const list = this.inMemoryMessages.get(appId) || [];
    return list
      .filter((m) => m.visibility === 'PUBLIC')
      .map((m) => this.sanitizePublicMessage(m));
  }

  /**
   * 2. POST PUBLIC MESSAGE
   * Mengirim pesan dari sisi pemohon publik.
   * Visibility dipaksa 'PUBLIC', sender_type dipaksa 'PUBLIC_APPLICANT'.
   */
  async sendPublicMessage(
    ticketNumber: string,
    session: TrackingSessionPayload,
    dto: CreatePublicMessageDto,
  ): Promise<MessageItem> {
    const normalizedTicket = ticketNumber.trim().toUpperCase();
    if (session.ticket_number.toUpperCase() !== normalizedTicket) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'TRACKING_INVALID_CREDENTIAL',
        message: 'Sesi pelacakan tidak sah.',
      });
    }

    const messageText = dto.message ? dto.message.trim() : '';
    if (!messageText) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Pesan tidak boleh kosong.',
      });
    }

    if (messageText.length > 2000) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Pesan terlalu panjang (maksimal 2000 karakter).',
      });
    }

    const appId = session.application_id;
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    const record: MessageItem = {
      id,
      application_id: appId,
      ticket_number: normalizedTicket,
      sender_type: 'PUBLIC_APPLICANT',
      sender_name: 'Pemohon OPD',
      visibility: 'PUBLIC',
      message: messageText,
      created_at: now,
      updated_at: now,
    };

    // Simpan ke Supabase
    try {
      const client = this.supabaseService.getClient();
      await client.from('messages').insert({
        id: record.id,
        application_id: record.application_id,
        sender_type: record.sender_type,
        sender_name: record.sender_name,
        visibility: record.visibility,
        message: record.message,
        created_at: record.created_at,
      });
    } catch {
      // Fallback
    }

    // Simpan di in-memory
    const existing = this.inMemoryMessages.get(appId) || [];
    existing.push(record);
    this.inMemoryMessages.set(appId, existing);

    // Kirim notifikasi in-app kepada admin/teknisi
    try {
      await this.notificationsService.notify({
        application_id: appId,
        ticket_number: normalizedTicket,
        type: 'NEW_MESSAGE',
        channel: 'IN_APP',
        title: `Pesan Baru dari Pemohon [${normalizedTicket}]`,
        body: messageText.length > 100 ? `${messageText.slice(0, 100)}...` : messageText,
      });
    } catch {
      // Abaikan jika notifikasi gagal
    }

    return this.sanitizePublicMessage(record);
  }

  /**
   * 3. GET INTERNAL MESSAGES
   * Khusus pengguna internal terautentikasi (SUPER_ADMIN atau TECHNICIAN yang ditugaskan).
   * Mengembalikan semua pesan (PUBLIC maupun INTERNAL).
   */
  async getInternalMessages(
    applicationId: string,
    user: AuthenticatedUser,
  ): Promise<MessageItem[]> {
    await this.assertInternalAccess(applicationId, user);

    // 1. Coba dari Supabase
    try {
      const client = this.supabaseService.getClient();
      const { data, error } = await client
        .from('messages')
        .select('*')
        .eq('application_id', applicationId)
        .order('created_at', { ascending: true });

      if (!error && Array.isArray(data)) {
        return data as MessageItem[];
      }
    } catch {
      // Fallback
    }

    // 2. Fallback in-memory
    return this.inMemoryMessages.get(applicationId) || [];
  }

  /**
   * 4. POST INTERNAL MESSAGE
   * Mengirim balasan publik atau catatan internal oleh admin/teknisi.
   */
  async sendInternalMessage(
    applicationId: string,
    user: AuthenticatedUser,
    dto: CreateMessageDto,
  ): Promise<MessageItem> {
    await this.assertInternalAccess(applicationId, user);

    const messageText = dto.message ? dto.message.trim() : '';
    if (!messageText) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Pesan tidak boleh kosong.',
      });
    }

    const visibility = dto.visibility === 'PUBLIC' ? 'PUBLIC' : 'INTERNAL';
    const senderType = user.role === 'SUPER_ADMIN' ? 'ADMIN' : 'TECHNICIAN';
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    const record: MessageItem = {
      id,
      application_id: applicationId,
      sender_type: senderType,
      sender_profile_id: user.id,
      sender_name: user.fullName || (user.role === 'SUPER_ADMIN' ? 'Admin Diskominfo' : 'Teknisi SPBE'),
      sender_email: user.email,
      visibility,
      message: messageText,
      created_at: now,
      updated_at: now,
    };

    // Simpan ke Supabase
    try {
      const client = this.supabaseService.getClient();
      await client.from('messages').insert({
        id: record.id,
        application_id: record.application_id,
        sender_type: record.sender_type,
        sender_profile_id: record.sender_profile_id,
        sender_name: record.sender_name,
        sender_email: record.sender_email,
        visibility: record.visibility,
        message: record.message,
        created_at: record.created_at,
      });
    } catch {
      // Fallback
    }

    // Simpan di in-memory
    const existing = this.inMemoryMessages.get(applicationId) || [];
    existing.push(record);
    this.inMemoryMessages.set(applicationId, existing);

    // Jika pesan bertipe PUBLIC: beri notifikasi ke pemohon via EMAIL
    if (visibility === 'PUBLIC') {
      try {
        let recipientEmail: string | undefined;
        let ticketNumber = 'TIK';

        // Cari email pemohon
        const client = this.supabaseService.getClient();
        const { data: app } = await client
          .from('applications')
          .select('ticket_number, applicant_email')
          .eq('id', applicationId)
          .maybeSingle();

        if (app) {
          recipientEmail = app.applicant_email;
          ticketNumber = app.ticket_number || ticketNumber;
        }

        if (recipientEmail) {
          await this.notificationsService.notify({
            application_id: applicationId,
            ticket_number: ticketNumber,
            type: 'NEW_MESSAGE',
            channel: 'EMAIL',
            recipient_email: recipientEmail,
            title: `Balasan Baru dari Diskominfo pada Tiket #${ticketNumber}`,
            body: `Tim Diskominfo telah membalas pesan pada tiket permohonan Anda: "${messageText.slice(0, 150)}"`,
          });
        }
      } catch {
        // Abaikan kegagalan notifikasi
      }
    }

    return record;
  }

  /**
   * Memastikan otorisasi internal admin/teknisi
   */
  private async assertInternalAccess(applicationId: string, user: AuthenticatedUser) {
    if (user.role === 'SUPER_ADMIN') return;

    if (user.role === 'TECHNICIAN') {
      const isAssigned = await this.assignmentsService.checkTechnicianAuthorization(
        applicationId,
        user.id,
      );
      if (!isAssigned) {
        throw new ForbiddenException({
          statusCode: 403,
          code: 'ASSIGNMENT_NOT_ALLOWED',
          message: 'Anda tidak memiliki otorisasi untuk mengakses komunikasi pada permohonan ini.',
        });
      }
      return;
    }

    throw new ForbiddenException({
      statusCode: 403,
      message: 'Akses ditolak untuk role ini.',
    });
  }

  /**
   * Sanitasi pesan publik: tidak membocorkan email teknisi atau internal ID
   */
  private sanitizePublicMessage(m: MessageItem): MessageItem {
    return {
      id: m.id,
      application_id: m.application_id,
      ticket_number: m.ticket_number,
      sender_type: m.sender_type,
      sender_name:
        m.sender_type === 'PUBLIC_APPLICANT'
          ? m.sender_name || 'Pemohon OPD'
          : 'Tim Teknis Diskominfo',
      visibility: 'PUBLIC',
      message: m.message,
      created_at: m.created_at,
      updated_at: m.updated_at,
    };
  }
}
