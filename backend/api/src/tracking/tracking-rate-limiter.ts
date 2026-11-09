import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

interface RateLimitEntry {
  attempts: number;
  firstAttemptAt: number;
  blockedUntil: number | null;
}

@Injectable()
export class TrackingRateLimiter {
  private readonly maxAttempts = 5;
  private readonly windowMs = 15 * 60 * 1000;
  private readonly blockDurationMs = 15 * 60 * 1000;
  private readonly records: Map<string, RateLimitEntry> = new Map();

  assertNotBlocked(key: string): void {
    const now = Date.now();
    const entry = this.records.get(key);

    if (!entry) return;

    if (entry.blockedUntil && now < entry.blockedUntil) {
      const remainingSeconds = Math.ceil((entry.blockedUntil - now) / 1000);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          code: 'TRACKING_RATE_LIMITED',
          message: `Terlalu banyak percobaan pelacakan yang gagal. Akses dibatasi sementara selama ${remainingSeconds} detik untuk mencegah brute force.`,
          retry_after_seconds: remainingSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (now - entry.firstAttemptAt > this.windowMs) {
      this.records.delete(key);
    }
  }

  recordFailure(key: string): void {
    const now = Date.now();
    const entry = this.records.get(key);

    if (!entry || now - entry.firstAttemptAt > this.windowMs) {
      this.records.set(key, {
        attempts: 1,
        firstAttemptAt: now,
        blockedUntil: null,
      });
      return;
    }

    entry.attempts += 1;
    if (entry.attempts >= this.maxAttempts) {
      entry.blockedUntil = now + this.blockDurationMs;
    }
  }

  reset(key: string): void {
    this.records.delete(key);
  }

  clearAll(): void {
    this.records.clear();
  }
}
