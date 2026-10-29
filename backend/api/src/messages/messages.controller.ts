import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { MessagesService } from './messages.service.js';
import { TrackingAuthGuard, type TrackingRequest } from '../tracking/tracking.guard.js';
import { AuthGuard } from '../auth/auth.guard.js';
import type {
  CreateMessageDto,
  CreatePublicMessageDto,
} from './messages.types.js';

@Controller()
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  // ------------------------------------------------------------
  // 1. PUBLIC TICKET MESSAGES (Terotentikasi Sesi Pelacakan)
  // ------------------------------------------------------------

  @Get('public/tickets/:ticket_number/messages')
  @UseGuards(TrackingAuthGuard)
  async getPublicMessages(
    @Param('ticket_number') ticketNumber: string,
    @Req() req: TrackingRequest,
  ) {
    const session = req.trackingSession!;
    const data = await this.messagesService.getPublicMessages(
      ticketNumber,
      session,
    );

    return {
      success: true,
      data,
    };
  }

  @Post('public/tickets/:ticket_number/messages')
  @UseGuards(TrackingAuthGuard)
  async sendPublicMessage(
    @Param('ticket_number') ticketNumber: string,
    @Body() body: CreatePublicMessageDto,
    @Req() req: TrackingRequest,
  ) {
    const session = req.trackingSession!;
    const data = await this.messagesService.sendPublicMessage(
      ticketNumber,
      session,
      body,
    );

    return {
      success: true,
      data,
      message: 'Pesan berhasil terkirim.',
    };
  }

  // ------------------------------------------------------------
  // 2. INTERNAL APPLICATION MESSAGES (Admin & Teknisi)
  // ------------------------------------------------------------

  @Get('applications/:id/messages')
  @SkipThrottle()
  @UseGuards(AuthGuard)
  async getInternalMessages(@Param('id') id: string, @Req() req: any) {
    const user = req.user;
    const data = await this.messagesService.getInternalMessages(id, user);

    return {
      success: true,
      data,
    };
  }

  @Post('applications/:id/messages')
  @SkipThrottle()
  @UseGuards(AuthGuard)
  async sendInternalMessage(
    @Param('id') id: string,
    @Body() body: CreateMessageDto,
    @Req() req: any,
  ) {
    const user = req.user;
    const data = await this.messagesService.sendInternalMessage(id, user, body);

    return {
      success: true,
      data,
      message:
        body.visibility === 'PUBLIC'
          ? 'Balasan publik berhasil dikirimkan ke pemohon.'
          : 'Catatan internal berhasil disimpan.',
    };
  }

  // Aliases for /admin/applications/:id/messages and /technician/applications/:id/messages
  @Get('admin/applications/:id/messages')
  @SkipThrottle()
  @UseGuards(AuthGuard)
  async getAdminMessages(@Param('id') id: string, @Req() req: any) {
    return this.getInternalMessages(id, req);
  }

  @Post('admin/applications/:id/messages')
  @SkipThrottle()
  @UseGuards(AuthGuard)
  async sendAdminMessage(
    @Param('id') id: string,
    @Body() body: CreateMessageDto,
    @Req() req: any,
  ) {
    return this.sendInternalMessage(id, body, req);
  }

  @Get('technician/applications/:id/messages')
  @SkipThrottle()
  @UseGuards(AuthGuard)
  async getTechMessages(@Param('id') id: string, @Req() req: any) {
    return this.getInternalMessages(id, req);
  }

  @Post('technician/applications/:id/messages')
  @SkipThrottle()
  @UseGuards(AuthGuard)
  async sendTechMessage(
    @Param('id') id: string,
    @Body() body: CreateMessageDto,
    @Req() req: any,
  ) {
    return this.sendInternalMessage(id, body, req);
  }
}
