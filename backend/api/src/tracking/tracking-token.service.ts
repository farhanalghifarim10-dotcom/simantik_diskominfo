import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import type { TrackingSessionPayload } from './tracking.types.js';

@Injectable()
export class TrackingTokenService {
  private readonly secret: string;
  private readonly ttlSeconds: number = 15 * 60; // 15 minutes TTL

  constructor(private readonly configService: ConfigService) {
    this.secret =
      this.configService.get<string>('jwt.secret') ||
      process.env.JWT_SECRET ||
      'simantik-tracking-secure-fallback-secret-2026';
  }

  /**
   * Menghasilkan short-lived signed tracking session token (15 menit).
   */
  generateSessionToken(ticketNumber: string, applicationId: string): {
    token: string;
    expires_in: number;
    expires_at: string;
  } {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + this.ttlSeconds;

    const payload: TrackingSessionPayload = {
      ticket_number: ticketNumber.toUpperCase().trim(),
      application_id: applicationId,
      iat: now,
      exp,
    };

    const header = { alg: 'HS256', typ: 'TRACKING_SESSION' };
    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');

    const signature = crypto
      .createHmac('sha256', this.secret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url');

    const token = `${encodedHeader}.${encodedPayload}.${signature}`;

    return {
      token,
      expires_in: this.ttlSeconds,
      expires_at: new Date(exp * 1000).toISOString(),
    };
  }

  /**
   * Memvalidasi keabsahan token dan memeriksa masa kedaluwarsa.
   * Melempar UnauthorizedException dengan kode standar jika tidak valid / kedaluwarsa.
   */
  verifySessionToken(token: string): TrackingSessionPayload {
    if (!token || typeof token !== 'string') {
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'TRACKING_INVALID_CREDENTIAL',
        message: 'Kredensial sesi pelacakan tidak ditemukan atau tidak valid.',
      });
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'TRACKING_INVALID_CREDENTIAL',
        message: 'Format sesi pelacakan tidak valid.',
      });
    }

    const [encodedHeader, encodedPayload, signature] = parts;

    // Verifikasi tanda tangan HMAC-SHA256
    const expectedSignature = crypto
      .createHmac('sha256', this.secret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url');

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSignature);

    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'TRACKING_INVALID_CREDENTIAL',
        message: 'Tanda tangan sesi pelacakan tidak valid atau telah dimodifikasi.',
      });
    }

    let payload: TrackingSessionPayload;
    try {
      payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf-8'));
    } catch {
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'TRACKING_INVALID_CREDENTIAL',
        message: 'Payload sesi pelacakan tidak dapat dibaca.',
      });
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'TRACKING_SESSION_EXPIRED',
        message: 'Sesi pelacakan telah kedaluwarsa (15 menit). Silakan masukkan kembali nomor tiket dan kode pelacakan.',
      });
    }

    return payload;
  }
}
