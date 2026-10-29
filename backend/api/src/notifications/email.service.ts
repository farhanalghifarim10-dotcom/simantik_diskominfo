import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sanitizeEmailSubject } from '../common/utils/html.utils.js';
import type { EmailDeliveryResult, SendEmailOptions } from './notifications.types.js';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly apiKey: string | null;
  private readonly fromEmail: string;

  // Deduplication cache: hash of (to + subject + idempotencyKey) -> timestamp
  private readonly sentCache: Map<string, number> = new Map();
  private readonly deduplicationWindowMs = 5 * 60 * 1000; // 5 menit

  // Rate limiting per recipient: recipient (lowercase) -> array of timestamps
  private readonly recipientRateLimitMap: Map<string, number[]> = new Map();
  private readonly recipientRateLimitWindowMs = 60 * 60 * 1000; // 1 jam
  private readonly maxEmailsPerHour = 3;

  constructor(private readonly configService: ConfigService) {
    this.apiKey =
      this.configService.get<string>('email.resendApiKey') ||
      process.env.RESEND_API_KEY ||
      null;

    this.fromEmail =
      this.configService.get<string>('email.fromEmail') ||
      process.env.RESEND_FROM_EMAIL ||
      'SIMANTIK Diskominfo <noreply@simantik.bandungkab.go.id>';
  }

  /**
   * Membersihkan entri kedaluwarsa dari cache deduplikasi dan pembatasan laju penerima
   */
  private cleanupExpiredEntries(now: number): void {
    for (const [key, timestamp] of this.sentCache.entries()) {
      if (now - timestamp >= this.deduplicationWindowMs) {
        this.sentCache.delete(key);
      }
    }

    for (const [recipient, timestamps] of this.recipientRateLimitMap.entries()) {
      const valid = timestamps.filter((t) => now - t < this.recipientRateLimitWindowMs);
      if (valid.length === 0) {
        this.recipientRateLimitMap.delete(recipient);
      } else if (valid.length !== timestamps.length) {
        this.recipientRateLimitMap.set(recipient, valid);
      }
    }
  }

  /**
   * Mengirim email menggunakan Resend API secara aman dari server-side.
   */
  async sendEmail(options: SendEmailOptions): Promise<EmailDeliveryResult> {
    const { to, subject, html, text, idempotencyKey } = options;
    const cleanSubject = sanitizeEmailSubject(subject);
    const now = Date.now();

    // 0. Pembersihan berkala memori kedaluwarsa
    this.cleanupExpiredEntries(now);

    // 1. Pembatasan laju pengiriman per penerima (maksimal 3 email per jam)
    const recipientKey = to.toLowerCase().trim();
    const activeTimestamps = (this.recipientRateLimitMap.get(recipientKey) || []).filter(
      (t) => now - t < this.recipientRateLimitWindowMs,
    );

    if (activeTimestamps.length >= this.maxEmailsPerHour) {
      const errorMsg = `Batas pengiriman email terlampaui (maksimal ${this.maxEmailsPerHour} email per penerima per jam).`;
      this.logger.warn(`Rate limit: Email ke [${to}] ditolak karena melebihi kuota 3 email/jam.`);
      return {
        status: 'FAILED',
        error: errorMsg,
      };
    }

    // 2. Pemeriksaan deduplikasi untuk mencegah pengiriman email ganda
    const dedupKey = `${recipientKey}:${cleanSubject}:${idempotencyKey || ''}`;
    const lastSent = this.sentCache.get(dedupKey);

    if (lastSent && now - lastSent < this.deduplicationWindowMs) {
      this.logger.warn(`Deduplikasi: Email ke [${to}] dengan subjek [${cleanSubject}] diabaikan karena baru saja dikirim.`);
      return {
        id: 'deduplicated',
        status: 'SENT',
      };
    }

    // 3. Mode simulasi jika API key tidak disetel (misal: development lokal atau testing)
    if (!this.apiKey) {
      this.logger.log(`[SIMULASI EMAIL - RESEND API KEY TIDAK DISET] To: ${to} | Subject: ${cleanSubject}`);
      this.sentCache.set(dedupKey, now);
      activeTimestamps.push(now);
      this.recipientRateLimitMap.set(recipientKey, activeTimestamps);
      return {
        id: `sim-${Date.now()}`,
        status: 'SENT',
      };
    }

    // 4. Panggilan resmi ke Resend REST API
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          from: this.fromEmail,
          to: [to],
          subject: cleanSubject,
          html,
          text: text || html.replace(/<[^>]*>/g, ''),
        }),
      });

      const resData = (await response.json().catch(() => null)) as any;

      if (!response.ok) {
        const errorMsg =
          resData?.message ||
          resData?.error?.message ||
          `Resend API error status ${response.status}`;
        this.logger.error(`Gagal mengirim email via Resend: ${errorMsg}`);
        return {
          status: 'FAILED',
          error: errorMsg,
        };
      }

      this.sentCache.set(dedupKey, now);
      activeTimestamps.push(now);
      this.recipientRateLimitMap.set(recipientKey, activeTimestamps);
      return {
        id: resData?.id,
        status: 'SENT',
      };
    } catch (err: any) {
      const errorMsg = err?.message || 'Network exception saat memanggil Resend API';
      this.logger.error(`Eksepsi pengiriman email: ${errorMsg}`);
      return {
        status: 'FAILED',
        error: errorMsg,
      };
    }
  }

  /**
   * Reset cache deduplikasi dan pembatasan laju penerima (berguna untuk testing)
   */
  clearDeduplicationCache(): void {
    this.sentCache.clear();
  }

  clearRateLimitCache(): void {
    this.recipientRateLimitMap.clear();
    this.sentCache.clear();
  }
}
