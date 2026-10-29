import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { HelpdeskService } from './helpdesk.service.js';
import { HelpdeskController } from './helpdesk.controller.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';

describe('Helpdesk Module (Layanan Bantuan & Konsultasi OPD)', () => {
  let helpdeskService: HelpdeskService;
  let mockSupabaseService: any;
  let mockNotificationsService: any;

  const superAdminUser: AuthenticatedUser = {
    id: 'admin-uuid-1',
    email: 'admin@bandungkab.go.id',
    role: 'SUPER_ADMIN',
    fullName: 'Administrator SPBE',
  };

  const technicianUser: AuthenticatedUser = {
    id: 'tech-uuid-1',
    email: 'tech@bandungkab.go.id',
    role: 'TECHNICIAN',
    fullName: 'Teknisi Jaringan',
  };

  beforeEach(() => {
    mockSupabaseService = {
      getClient: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          ilike: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    };

    mockNotificationsService = {
      notify: vi.fn().mockImplementation(async (payload) => ({
        id: 'notif-generated-uuid-1',
        title: payload.title,
        body: payload.body,
        created_at: new Date().toISOString(),
      })),
      markAsRead: vi.fn().mockResolvedValue({ success: true }),
    };

    helpdeskService = new HelpdeskService(
      mockSupabaseService,
      mockNotificationsService,
    );
  });

  describe('1. Validasi & Sanitasi Formulir Konsultasi', () => {
    it('sukses menyimpan konsultasi dengan data valid dan men-trigger notifikasi in-app', async () => {
      const res = await helpdeskService.submitConsultation({
        opdName: 'Dinas Kesehatan Kabupaten Bandung',
        senderName: 'Budi Santoso, S.Kom',
        email: 'budi.santoso@bandungkab.go.id',
        phone: '081234567890',
        subject: 'Konsultasi KAK Sistem Antrean Puskesmas',
        message: 'Mohon arahan dan telaah teknis terkait arsitektur sistem antrean terintegrasi SATUSEHAT.',
      });

      expect(res).toBeDefined();
      expect(res.opd_name).toBe('Dinas Kesehatan Kabupaten Bandung');
      expect(res.sender_name).toBe('Budi Santoso, S.Kom');
      expect(res.email).toBe('budi.santoso@bandungkab.go.id');
      expect(res.status).toBe('NEW');

      // Memastikan notifikasi IN_APP dipanggil dengan parameter yang benar
      expect(mockNotificationsService.notify).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'NEW_MESSAGE',
          channel: 'IN_APP',
          title: expect.stringContaining('Dinas Kesehatan Kabupaten Bandung'),
          body: expect.stringContaining('budi.santoso@bandungkab.go.id'),
        }),
      );
    });

    it('mendukung payload format snake_case (opd_name, sender_name)', async () => {
      const res = await helpdeskService.submitConsultation({
        opd_name: 'Dinas Pendidikan',
        sender_name: 'Siti Rahma',
        email: 'siti@bandungkab.go.id',
        phone: '081987654321',
        subject: 'Integrasi Data Pokok Pendidikan',
        message: 'Pengajuan konsultasi penyelarasan API dapodik dengan server lokal.',
      });

      expect(res.opd_name).toBe('Dinas Pendidikan');
      expect(res.sender_name).toBe('Siti Rahma');
    });

    it('membersihkan tag HTML pada isian (XSS sanitization)', async () => {
      const res = await helpdeskService.submitConsultation({
        opdName: '<script>alert("hack")</script>Dinas Sosial',
        senderName: '<b>Ahmad Fauzi</b>',
        email: 'ahmad@bandungkab.go.id',
        phone: '08122334455',
        subject: 'Penyusunan KAK Bansos<style>body{color:red}</style>',
        message: '<img src=x onerror=alert(1)>Permohonan konsultasi aplikasi verifikasi DTKS.',
      });

      expect(res.opd_name).toBe('Dinas Sosial');
      expect(res.sender_name).toBe('Ahmad Fauzi');
      expect(res.subject).toBe('Penyusunan KAK Bansos');
      expect(res.message).toBe('Permohonan konsultasi aplikasi verifikasi DTKS.');
    });

    it('menolak pengiriman jika nama OPD kosong atau terlalu pendek', async () => {
      await expect(
        helpdeskService.submitConsultation({
          opdName: 'ab',
          senderName: 'Valid Name',
          email: 'valid@bandungkab.go.id',
          phone: '08123456789',
          subject: 'Valid Subject Here',
          message: 'Valid message content longer than 10 chars.',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('menolak pengiriman jika email tidak valid', async () => {
      await expect(
        helpdeskService.submitConsultation({
          opdName: 'Dinas Kesehatan',
          senderName: 'Budi Santoso',
          email: 'bukan-email-valid',
          phone: '08123456789',
          subject: 'Valid Subject',
          message: 'Valid message content longer than 10 chars.',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('menolak pengiriman jika nomor telepon tidak valid', async () => {
      await expect(
        helpdeskService.submitConsultation({
          opdName: 'Dinas Kesehatan',
          senderName: 'Budi Santoso',
          email: 'budi@bandungkab.go.id',
          phone: '123',
          subject: 'Valid Subject',
          message: 'Valid message content longer than 10 chars.',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('menolak pengiriman jika pesan konsultasi kurang dari 10 karakter', async () => {
      await expect(
        helpdeskService.submitConsultation({
          opdName: 'Dinas Kesehatan',
          senderName: 'Budi Santoso',
          email: 'budi@bandungkab.go.id',
          phone: '08123456789',
          subject: 'Valid Subject',
          message: 'pendek',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('2. Otorisasi & Pengambilan Kotak Masuk Konsultasi', () => {
    it('SUPER_ADMIN dan TECHNICIAN dapat mengambil daftar konsultasi', async () => {
      // Seed data
      await helpdeskService.submitConsultation({
        opdName: 'Dinas Pertanian',
        senderName: 'Cecep Suryana',
        email: 'cecep@bandungkab.go.id',
        phone: '081333444555',
        subject: 'Konsultasi SIM Lahan Pertanian',
        message: 'Pembahasan teknis GIS pemetaan sawah abadi di Soreang.',
      });

      const adminList = await helpdeskService.getConsultations(superAdminUser);
      expect(adminList.length).toBeGreaterThanOrEqual(1);
      expect(adminList[0].opd_name).toBe('Dinas Pertanian');

      const techList = await helpdeskService.getConsultations(technicianUser);
      expect(techList.length).toBeGreaterThanOrEqual(1);
    });

    it('menolak akses pengguna publik/role tidak sah saat mengakses inbox konsultasi', async () => {
      const invalidUser: any = { id: 'anon', role: 'PUBLIC' };
      await expect(helpdeskService.getConsultations(invalidUser)).rejects.toThrow(ForbiddenException);
    });

    it('dapat menandai pesan konsultasi sebagai dibaca (markAsRead)', async () => {
      const item = await helpdeskService.submitConsultation({
        opdName: 'Inspektorat Daerah',
        senderName: 'Dewi Lestari',
        email: 'dewi@bandungkab.go.id',
        phone: '081222333444',
        subject: 'Konsultasi Pengawasan Pengadaan',
        message: 'Kebutuhan integrasi audit trail untuk pengawasan SPBE.',
      });

      expect(item.status).toBe('NEW');

      const updated = await helpdeskService.markAsRead(item.id, superAdminUser);
      expect(updated.status).toBe('READ');
      expect(updated.read_at).toBeDefined();
    });
  });

  describe('3. Controller Endpoints', () => {
    it('controller submitPublicConsultation mengembalikan envelope response sukses', async () => {
      const controller = new HelpdeskController(helpdeskService);
      const res = await controller.submitPublicConsultation({
        opdName: 'Dinas Perhubungan',
        senderName: 'Dodi Hidayat',
        email: 'dodi@bandungkab.go.id',
        phone: '081444555666',
        subject: 'Konsultasi ATCS Lampu Lalu Lintas',
        message: 'Koordinasi koneksi fiber optic ke data center Diskominfo.',
      });

      expect(res.success).toBe(true);
      expect(res.data.opd_name).toBe('Dinas Perhubungan');
      expect(res.message).toBeDefined();
    });

    it('controller getAdminConsultations meneruskan konteks user ke service', async () => {
      const controller = new HelpdeskController(helpdeskService);
      const res = await controller.getAdminConsultations({ user: superAdminUser });
      expect(res.success).toBe(true);
      expect(Array.isArray(res.data)).toBe(true);
    });

    it('seluruh rute baca dan tindak lanjut internal dilindungi oleh AuthGuard, RolesGuard, dan peran SUPER_ADMIN & TECHNICIAN', () => {
      const internalHandlers = [
        HelpdeskController.prototype.getAdminConsultations,
        HelpdeskController.prototype.markAdminConsultationRead,
        HelpdeskController.prototype.getConsultationsInternalAlias,
        HelpdeskController.prototype.markConsultationReadAlias,
      ];

      for (const handler of internalHandlers) {
        const guards = Reflect.getMetadata('__guards__', handler);
        expect(guards).toBeDefined();
        expect(guards.length).toBe(2);

        const roles = Reflect.getMetadata('roles', handler);
        expect(roles).toEqual(['SUPER_ADMIN', 'TECHNICIAN']);
      }

      // Rute publik tidak boleh dilindungi AuthGuard
      const publicGuards = Reflect.getMetadata('__guards__', HelpdeskController.prototype.submitPublicConsultation);
      expect(publicGuards).toBeUndefined();
    });
  });
});
