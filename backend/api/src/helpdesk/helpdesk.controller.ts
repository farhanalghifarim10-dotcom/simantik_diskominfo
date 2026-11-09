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

  @Post('public/helpdesk/consultations')
  async submitPublicConsultation(@Body() body: CreateConsultationDto) {
    const data = await this.helpdeskService.submitConsultation(body);
    return {
      success: true,
      data,
      message: 'Pertanyaan konsultasi berhasil dikirimkan ke Tim Helpdesk Diskominfo.',
    };
  }

  @Post('helpdesk/consultations')
  async submitConsultationAlias(@Body() body: CreateConsultationDto) {
    return this.submitPublicConsultation(body);
  }

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
