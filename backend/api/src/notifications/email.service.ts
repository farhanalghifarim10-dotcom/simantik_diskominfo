import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EmailDeliveryResult, SendEmailOptions } from './notifications.types.js';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly apiKey: string | null;
  private readonly fromEmail: string;

  private readonly sentCache: Map<string, number> = new Map();
  private readonly deduplicationWindowMs = 5 * 60 * 1000;

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

  async sendEmail(options: SendEmailOptions): Promise<EmailDeliveryResult> {
    const { to, subject, html, text, idempotencyKey } = options;

    const dedupKey = `${to.toLowerCase()}:${subject}:${idempotencyKey || ''}`;
    const now = Date.now();
    const lastSent = this.sentCache.get(dedupKey);

    if (lastSent && now - lastSent < this.deduplicationWindowMs) {
      this.logger.warn(`Deduplikasi: Email ke [${to}] dengan subjek [${subject}] diabaikan karena baru saja dikirim.`);
      return {
        id: 'deduplicated',
        status: 'SENT',
      };
    }

    if (!this.apiKey) {
      this.logger.log(`[SIMULASI EMAIL - RESEND API KEY TIDAK DISET] To: ${to} | Subject: ${subject}`);
      this.sentCache.set(dedupKey, now);
      return {
        id: `sim-${Date.now()}`,
        status: 'SENT',
      };
    }

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
          subject,
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

  clearDeduplicationCache(): void {
    this.sentCache.clear();
  }
}
