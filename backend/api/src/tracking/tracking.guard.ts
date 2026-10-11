import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { TrackingTokenService } from './tracking-token.service.js';
import type { TrackingSessionPayload } from './tracking.types.js';

export interface TrackingRequest extends Request {
  trackingSession?: TrackingSessionPayload;
  params: Record<string, string>;
  headers: Headers & Record<string, string>;
}

@Injectable()
export class TrackingAuthGuard implements CanActivate {
  constructor(private readonly trackingTokenService: TrackingTokenService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<TrackingRequest>();

    const authHeader =
      (request.headers as any)['authorization'] ||
      (request.headers as any)['x-tracking-token'];

    if (!authHeader) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'TRACKING_INVALID_CREDENTIAL',
        message: 'Akses ditolak: Kredensial sesi pelacakan (token) tidak disertakan.',
      });
    }

    let token = String(authHeader);
    if (token.startsWith('Bearer ')) {
      token = token.slice(7).trim();
    }

    // Verifikasi tanda tangan dan masa kedaluwarsa token
    const session = this.trackingTokenService.verifySessionToken(token);

    // Verifikasi kesesuaian nomor tiket (mencegah manipulasi nomor tiket berbeda dengan token)
    const routeTicket =
      request.params?.ticket_number || request.params?.ticketNumber;

    if (
      routeTicket &&
      session.ticket_number.toUpperCase() !== routeTicket.toUpperCase().trim()
    ) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'TRACKING_TICKET_MISMATCH',
        message:
          'Sesi pelacakan ini tidak diizinkan untuk melihat atau memperbarui nomor tiket yang berbeda.',
      });
    }

    // Lampirkan sesi pada objek request
    request.trackingSession = session;
    return true;
  }
}
