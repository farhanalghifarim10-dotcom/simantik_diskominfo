import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { HelpdeskService } from './helpdesk.service.js';
import { AuthGuard } from '../auth/auth.guard.js';
import type { CreateConsultationDto } from './helpdesk.types.js';

@Controller()
export class HelpdeskController {
  constructor(private readonly helpdeskService: HelpdeskService) {}

  // ------------------------------------------------------------
  // 1. PUBLIC SUBMISSION (Portal Layanan Helpdesk & Kontak)
  // ------------------------------------------------------------

  @Post('public/helpdesk/consultations')
  async submitPublicConsultation(@Body() body: CreateConsultationDto) {
    const data = await this.helpdeskService.submitConsultation(body);
    return {
      success: true,
      data,
      message: 'Pertanyaan konsultasi berhasil dikirimkan ke Tim Helpdesk Diskominfo.',
    };
  }

  // Alias endpoint jika dipanggil tanpa prefix public
  @Post('helpdesk/consultations')
  async submitConsultationAlias(@Body() body: CreateConsultationDto) {
    return this.submitPublicConsultation(body);
  }

  // ------------------------------------------------------------
  // 2. INTERNAL ADMIN & TECHNICIAN INBOX
  // ------------------------------------------------------------

  @Get('admin/helpdesk/consultations')
  @UseGuards(AuthGuard)
  async getAdminConsultations(@Req() req: any) {
    const user = req.user;
    const data = await this.helpdeskService.getConsultations(user);
    return {
      success: true,
      data,
    };
  }

  @Post('admin/helpdesk/consultations/:id/read')
  @UseGuards(AuthGuard)
  async markAdminConsultationRead(@Param('id') id: string, @Req() req: any) {
    const user = req.user;
    const data = await this.helpdeskService.markAsRead(id, user);
    return {
      success: true,
      data,
      message: 'Status konsultasi berhasil diperbarui.',
    };
  }

  // Aliases for /helpdesk/consultations when called by internal client
  @Get('helpdesk/consultations')
  @UseGuards(AuthGuard)
  async getConsultationsInternalAlias(@Req() req: any) {
    return this.getAdminConsultations(req);
  }

  @Post('helpdesk/consultations/:id/read')
  @UseGuards(AuthGuard)
  async markConsultationReadAlias(@Param('id') id: string, @Req() req: any) {
    return this.markAdminConsultationRead(id, req);
  }
}
