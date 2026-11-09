import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { TrackingService } from './tracking.service.js';
import { TrackingAuthGuard, type TrackingRequest } from './tracking.guard.js';
import type { SubmitRevisionDto, VerifyTrackingDto } from './tracking.types.js';

@Controller('public')
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @Post('tracking/verify')
  async verify(@Body() body: VerifyTrackingDto, @Req() req: any) {
    const clientIp =
      (req.headers && req.headers['x-forwarded-for']) ||
      req.ip ||
      req.socket?.remoteAddress ||
      '127.0.0.1';

    const data = await this.trackingService.verifyCredential(body, String(clientIp));

    return {
      success: true,
      data,
      message: 'Kredensial pelacakan valid. Sesi pelacakan aktif selama 15 menit.',
    };
  }

  @Get('tickets/:ticket_number')
  @UseGuards(TrackingAuthGuard)
  async getTicket(
    @Param('ticket_number') ticketNumber: string,
    @Req() req: TrackingRequest,
  ) {
    const session = req.trackingSession!;
    const data = await this.trackingService.getPublicTicketSummary(
      ticketNumber,
      session,
    );

    return {
      success: true,
      data,
    };
  }

  @Get('tickets/:ticket_number/timeline')
  @UseGuards(TrackingAuthGuard)
  async getTimeline(
    @Param('ticket_number') ticketNumber: string,
    @Req() req: TrackingRequest,
  ) {
    const session = req.trackingSession!;
    const data = await this.trackingService.getPublicTimeline(
      ticketNumber,
      session,
    );

    return {
      success: true,
      data,
    };
  }

  @Post('tickets/:ticket_number/revision')
  @UseGuards(TrackingAuthGuard)
  async submitRevision(
    @Param('ticket_number') ticketNumber: string,
    @Body() body: SubmitRevisionDto,
    @Req() req: TrackingRequest,
  ) {
    const session = req.trackingSession!;
    const data = await this.trackingService.submitRevision(
      ticketNumber,
      session,
      body,
    );

    return {
      success: true,
      data,
      message: data.message,
    };
  }
}
