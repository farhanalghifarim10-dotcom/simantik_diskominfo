import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HttpException, HttpStatus } from '@nestjs/common';
import {
  escapeHtml,
  formatHtmlParagraph,
  sanitizeEmailSubject,
} from '../src/common/utils/html.utils.js';
import { NotificationsService } from '../src/notifications/notifications.service.js';
import { EmailService } from '../src/notifications/email.service.js';
import { HelpdeskService } from '../src/helpdesk/helpdesk.service.js';

describe('F3: Keamanan Email, Sanitasi HTML, dan Pembatasan Laju Helpdesk', () => {
  describe('1. Utilitas html.utils: escapeHtml, formatHtmlParagraph, sanitizeEmailSubject', () => {
    it('meng-escape 5 karakter rentan (&, <, >, ", \') dengan benar', () => {
      const raw = `Tom & Jerry <cartoon> "classic" 'vintage'`;
      const escaped = escapeHtml(raw);

      expect(escaped).toBe('Tom &amp; Jerry &lt;cartoon&gt; &quot;classic&quot; &#39;vintage&#39;');
      expect(escaped).not.toContain('<');
      expect(escaped).not.toContain('>');
      expect(escaped).not.toContain('"');
      expect(escaped).not.toContain("'");
    });

    it('menangani input null, undefined, dan string kosong secara aman', () => {
      expect(escapeHtml(null)).toBe('');
      expect(escapeHtml(undefined)).toBe('');
      expect(escapeHtml('')).toBe('');
      expect(formatHtmlParagraph(null)).toBe('');
      expect(sanitizeEmailSubject(undefined)).toBe('');
    });

    it('formatHtmlParagraph meng-escape HTML terlebih dahulu baru mengubah newline menjadi <br />', () => {
      const dangerousInput = `<img src="x" onerror="alert('hack')">\nBaris kedua\r\nBaris ketiga`;
      const result = formatHtmlParagraph(dangerousInput);

      expect(result).toContain('&lt;img src=&quot;x&quot; onerror=&quot;alert(&#39;hack&#39;)&quot;&gt;');
      expect(result).toContain('<br />Baris kedua<br />Baris ketiga');
      expect(result).not.toContain('<img');
    });

    it('sanitizeEmailSubject menghapus karakter CRLF (\\r dan \\n) untuk mencegah header injection', () => {
      const injection = `Subjek Normal\r\nBcc: victim@example.com\nSubject: Injected`;
      const sanitized = sanitizeEmailSubject(injection);

      expect(sanitized).toBe('Subjek Normal Bcc: victim@example.com Subject: Injected');
      expect(sanitized).not.toContain('\r');
      expect(sanitized).not.toContain('\n');
    });
  });

  describe('2. NotificationsService: Pengamanan Template Email', () => {
    let notificationsService: NotificationsService;
    let mockSupabase: any;
    let mockEmailService: any;

    beforeEach(() => {
      mockSupabase = {
        getClient: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            insert: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
      };
      mockEmailService = {
        sendEmail: vi.fn().mockResolvedValue({ id: 'mock-mail-id', status: 'SENT' }),
      };
      notificationsService = new NotificationsService(mockSupabase, mockEmailService);
    });

    it('meng-escape HTML pada customTitle dan customBody', () => {
      const result = notificationsService.generateNeutralTemplate('SYSTEM', {
        customTitle: 'Peringatan <script>alert("xss")</script>',
        customBody: 'Halo & selamat datang!\nSistem <b>aman</b>.',
      });

      expect(result.html).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
      expect(result.html).toContain('Halo &amp; selamat datang!<br />Sistem &lt;b&gt;aman&lt;/b&gt;.');
      expect(result.html).not.toContain('<script>');
      expect(result.html).not.toContain('<b>aman</b>');
    });

    it('meng-escape HTML pada nomor tiket dan nama layanan pada template default', () => {
      const result = notificationsService.generateNeutralTemplate('APPLICATION_SUBMITTED', {
        ticketNumber: 'SIM<script>2026</script>',
        serviceTitle: 'Layanan <SPBE> & "Integrasi"',
      });

      expect(result.html).toContain('SIM&lt;script&gt;2026&lt;/script&gt;');
      expect(result.html).toContain('Layanan &lt;SPBE&gt; &amp; &quot;Integrasi&quot;');
      expect(result.html).not.toContain('<script>');
      expect(result.html).not.toContain('<SPBE>');
    });
  });

  describe('3. EmailService: Sanitasi Subjek & Pembatasan Laju (Rate Limiting) per Penerima', () => {
    it('membersihkan baris baru dari subjek saat dikirimkan ke Resend API', async () => {
      const mockConfigService = {
        get: vi.fn().mockReturnValue(null),
      };
      const emailService = new EmailService(mockConfigService as any);

      // Pada mode simulasi (apiKey null), pastikan pesan log terbebas dari CRLF
      const result = await emailService.sendEmail({
        to: 'user@example.com',
        subject: 'Subjek Penting\r\nCC: hacker@bad.com\nIsi subjek jahat',
        html: '<p>Halo</p>',
      });

      expect(result.status).toBe('SENT');
      expect(result.id).toBeDefined();
    });

    it('mengizinkan hingga 3 pengiriman email per jam untuk penerima yang sama', async () => {
      const mockConfigService = {
        get: vi.fn().mockReturnValue(null),
      };
      const emailService = new EmailService(mockConfigService as any);

      const recipient = 'pemohon@bandungkab.go.id';
      const res1 = await emailService.sendEmail({
        to: recipient,
        subject: 'Email Notifikasi 1',
        html: '<p>Pesan 1</p>',
      });
      const res2 = await emailService.sendEmail({
        to: recipient,
        subject: 'Email Notifikasi 2',
        html: '<p>Pesan 2</p>',
      });
      const res3 = await emailService.sendEmail({
        to: recipient,
        subject: 'Email Notifikasi 3',
        html: '<p>Pesan 3</p>',
      });

      expect(res1.status).toBe('SENT');
      expect(res2.status).toBe('SENT');
      expect(res3.status).toBe('SENT');
    });

    it('menolak pengiriman email ke-4 ke penerima yang sama dalam kurun waktu 1 jam', async () => {
      const mockConfigService = {
        get: vi.fn().mockReturnValue(null),
      };
      const emailService = new EmailService(mockConfigService as any);

      const recipient = 'pemohon.kuota@bandungkab.go.id';
      await emailService.sendEmail({ to: recipient, subject: 'Subjek 1', html: '<p>1</p>' });
      await emailService.sendEmail({ to: recipient, subject: 'Subjek 2', html: '<p>2</p>' });
      await emailService.sendEmail({ to: recipient, subject: 'Subjek 3', html: '<p>3</p>' });

      const res4 = await emailService.sendEmail({
        to: recipient,
        subject: 'Subjek 4',
        html: '<p>4</p>',
      });

      expect(res4.status).toBe('FAILED');
      expect(res4.error).toContain('Batas pengiriman email terlampaui (maksimal 3 email per penerima per jam)');
    });

    it('tidak membatasi pengiriman email ke alamat penerima yang berbeda', async () => {
      const mockConfigService = {
        get: vi.fn().mockReturnValue(null),
      };
      const emailService = new EmailService(mockConfigService as any);

      const recipientA = 'kadis@bandungkab.go.id';
      const recipientB = 'sekretaris@bandungkab.go.id';

      // 3 email ke Kadis
      await emailService.sendEmail({ to: recipientA, subject: 'A1', html: '<p>A1</p>' });
      await emailService.sendEmail({ to: recipientA, subject: 'A2', html: '<p>A2</p>' });
      await emailService.sendEmail({ to: recipientA, subject: 'A3', html: '<p>A3</p>' });

      // Kadis ditolak pada email ke-4
      const resA4 = await emailService.sendEmail({ to: recipientA, subject: 'A4', html: '<p>A4</p>' });
      expect(resA4.status).toBe('FAILED');

      // Penerima B tetap sukses terkirim
      const resB = await emailService.sendEmail({ to: recipientB, subject: 'B1', html: '<p>B1</p>' });
      expect(resB.status).toBe('SENT');
    });

    it('mereset kuota pengiriman ketika clearRateLimitCache() dipanggil', async () => {
      const mockConfigService = {
        get: vi.fn().mockReturnValue(null),
      };
      const emailService = new EmailService(mockConfigService as any);

      const recipient = 'staf@bandungkab.go.id';
      await emailService.sendEmail({ to: recipient, subject: '1', html: '<p>1</p>' });
      await emailService.sendEmail({ to: recipient, subject: '2', html: '<p>2</p>' });
      await emailService.sendEmail({ to: recipient, subject: '3', html: '<p>3</p>' });

      const blocked = await emailService.sendEmail({ to: recipient, subject: '4', html: '<p>4</p>' });
      expect(blocked.status).toBe('FAILED');

      // Reset cache
      emailService.clearRateLimitCache();

      // Sekarang dapat mengirim lagi
      const successAfterReset = await emailService.sendEmail({ to: recipient, subject: '5', html: '<p>5</p>' });
      expect(successAfterReset.status).toBe('SENT');
    });
  });

  describe('4. HelpdeskService: Pembatasan Laju (Rate Limiting) per Alamat Email', () => {
    let helpdeskService: HelpdeskService;
    let mockSupabase: any;
    let mockNotifications: any;

    beforeEach(() => {
      mockSupabase = {
        getClient: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      };
      mockNotifications = {
        notify: vi.fn().mockResolvedValue({ id: 'notif-1', created_at: new Date().toISOString() }),
      };
      helpdeskService = new HelpdeskService(mockSupabase, mockNotifications);
      helpdeskService.clearRateLimitCache();
    });

    it('mengizinkan hingga 3 pengajuan konsultasi per jam untuk alamat email yang sama', async () => {
      const payload = {
        opd_name: 'Dinas Komunikasi dan Informatika',
        sender_name: 'Budi Santoso',
        email: 'budi.santoso@bandungkab.go.id',
        phone: '081234567890',
        subject: 'Permohonan Konsultasi Integrasi SPBE',
        message: 'Mohon jadwal konsultasi arsitektur sistem informasi SPBE antar dinas.',
      };

      const res1 = await helpdeskService.submitConsultation(payload);
      const res2 = await helpdeskService.submitConsultation(payload);
      const res3 = await helpdeskService.submitConsultation(payload);

      expect(res1.id).toBeDefined();
      expect(res2.id).toBeDefined();
      expect(res3.id).toBeDefined();
    });

    it('menolak pengajuan ke-4 dengan status 429 Too Many Requests untuk email yang sama dalam 1 jam', async () => {
      const payload = {
        opd_name: 'Dinas Komunikasi dan Informatika',
        sender_name: 'Budi Santoso',
        email: 'budi.santoso@bandungkab.go.id',
        phone: '081234567890',
        subject: 'Permohonan Konsultasi Integrasi SPBE',
        message: 'Mohon jadwal konsultasi arsitektur sistem informasi SPBE antar dinas.',
      };

      await helpdeskService.submitConsultation(payload);
      await helpdeskService.submitConsultation(payload);
      await helpdeskService.submitConsultation(payload);

      await expect(helpdeskService.submitConsultation(payload)).rejects.toThrow(
        HttpException,
      );

      try {
        await helpdeskService.submitConsultation(payload);
      } catch (err: any) {
        expect(err.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
        expect(err.message).toContain('Batas pengajuan konsultasi tercapai. Maksimal 3 pengajuan per jam');
      }
    });

    it('tidak memblokir pengajuan dari email yang berbeda', async () => {
      const payload1 = {
        opd_name: 'Dinas Kesehatan',
        sender_name: 'Dokter Ani',
        email: 'ani@bandungkab.go.id',
        phone: '081234567891',
        subject: 'Integrasi Data Puskesmas',
        message: 'Konsultasi integrasi data rekam medis puskesmas ke portal daerah.',
      };

      const payload2 = {
        opd_name: 'Dinas Pendidikan',
        sender_name: 'Bapak Joko',
        email: 'joko@bandungkab.go.id',
        phone: '081234567892',
        subject: 'Integrasi Data Sekolah',
        message: 'Konsultasi aplikasi PPDB online terpadu tahun ajaran baru.',
      };

      // 3 kali dari Ani
      await helpdeskService.submitConsultation(payload1);
      await helpdeskService.submitConsultation(payload1);
      await helpdeskService.submitConsultation(payload1);

      // Joko tetap dapat mengajukan karena email berbeda
      const resJoko = await helpdeskService.submitConsultation(payload2);
      expect(resJoko.id).toBeDefined();
    });

    it('mereset kuota pengajuan saat clearRateLimitCache() dipanggil', async () => {
      const payload = {
        opd_name: 'Dinas Perhubungan',
        sender_name: 'Pak Doni',
        email: 'doni@bandungkab.go.id',
        phone: '081234567893',
        subject: 'Konsultasi ATCS Dishub',
        message: 'Konsultasi integrasi CCTV lalu lintas Dishub ke SIMANTIK dashboard.',
      };

      await helpdeskService.submitConsultation(payload);
      await helpdeskService.submitConsultation(payload);
      await helpdeskService.submitConsultation(payload);

      // Percobaan ke-4 diblokir
      await expect(helpdeskService.submitConsultation(payload)).rejects.toThrow(HttpException);

      // Reset cache
      helpdeskService.clearRateLimitCache();

      // Sekarang dapat mengajukan kembali
      const resAfterReset = await helpdeskService.submitConsultation(payload);
      expect(resAfterReset.id).toBeDefined();
    });
  });
});
