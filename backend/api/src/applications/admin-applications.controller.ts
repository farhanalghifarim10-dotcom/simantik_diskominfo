import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { AdminApplicationsService } from './admin-applications.service.js';
import type {
  AddInternalNoteDto,
  ExecuteStageTransitionDto,
  ExecuteTransitionDto,
  RequestRevisionDto,
} from './workflow/workflow.types.js';
import type {
  ListApplicationsQueryDto,
  ReissueTrackingCodeDto,
} from './admin-applications.types.js';

type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};

@Controller('admin/applications')
@UseGuards(AuthGuard, RolesGuard)
export class AdminApplicationsController {
  constructor(
    private readonly adminApplicationsService: AdminApplicationsService,
  ) {}

  @Get()
  @Roles('SUPER_ADMIN', 'TECHNICIAN')
  async listApplications(
    @Query() query: ListApplicationsQueryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const result = await this.adminApplicationsService.listApplications(
      query,
      req.user,
    );
    return {
      success: true,
      data: result,
    };
  }

  @Get('stats')
  @Roles('SUPER_ADMIN', 'TECHNICIAN')
  async getDashboardStats(
    @Query('year') year: string | undefined,
    @Req() req: AuthenticatedRequest,
  ) {
    const stats = await this.adminApplicationsService.getDashboardStats(
      { year: year ? Number(year) : undefined },
      req.user,
    );
    return {
      success: true,
      data: stats,
    };
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'TECHNICIAN')
  async getApplicationDetail(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const detail = await this.adminApplicationsService.getApplicationDetail(
      id,
      req.user,
    );
    return {
      success: true,
      data: detail,
    };
  }

  @Post(':id/transitions')
  @Roles('SUPER_ADMIN', 'TECHNICIAN')
  async executeTransition(
    @Param('id') id: string,
    @Body() dto: ExecuteTransitionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const updated = await this.adminApplicationsService.executeTransition(
      id,
      dto,
      req.user,
    );
    return {
      success: true,
      data: updated,
      message: `Status permohonan berhasil diperbarui menjadi ${dto.target_status}.`,
    };
  }

  @Post(':id/stage-transitions')
  @Roles('SUPER_ADMIN', 'TECHNICIAN')
  async executeStageTransition(
    @Param('id') id: string,
    @Body() dto: ExecuteStageTransitionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const updated = await this.adminApplicationsService.executeStageTransition(
      id,
      dto,
      req.user,
    );
    return {
      success: true,
      data: updated,
      message: `Tahapan lifecycle SPBE berhasil diperbarui ke ${dto.target_stage}.`,
    };
  }

  @Post(':id/verify')
  @Roles('SUPER_ADMIN')
  async verifyApplication(
    @Param('id') id: string,
    @Body() body: { note?: string },
    @Req() req: AuthenticatedRequest,
  ) {
    const updated = await this.adminApplicationsService.executeTransition(
      id,
      { target_status: 'VERIFICATION', note: body?.note },
      req.user,
    );
    return {
      success: true,
      data: updated,
      message: 'Permohonan masuk ke tahap verifikasi berkas.',
    };
  }

  @Post(':id/request-revision')
  @Roles('SUPER_ADMIN')
  async requestRevision(
    @Param('id') id: string,
    @Body() dto: RequestRevisionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const updated = await this.adminApplicationsService.executeTransition(
      id,
      { target_status: 'REVISION_REQUIRED', note: dto.note },
      req.user,
    );
    return {
      success: true,
      data: updated,
      message: 'Permintaan revisi berhasil dikirimkan kepada pemohon OPD.',
    };
  }

  @Post(':id/approve')
  @Roles('SUPER_ADMIN')
  async approveApplication(
    @Param('id') id: string,
    @Body() body: { note?: string },
    @Req() req: AuthenticatedRequest,
  ) {
    const updated = await this.adminApplicationsService.executeTransition(
      id,
      { target_status: 'APPROVED', note: body?.note },
      req.user,
    );
    return {
      success: true,
      data: updated,
      message: 'Permohonan layanan disetujui.',
    };
  }

  @Post(':id/reject')
  @Roles('SUPER_ADMIN')
  async rejectApplication(
    @Param('id') id: string,
    @Body() body: { note: string },
    @Req() req: AuthenticatedRequest,
  ) {
    const updated = await this.adminApplicationsService.executeTransition(
      id,
      { target_status: 'REJECTED', note: body.note },
      req.user,
    );
    return {
      success: true,
      data: updated,
      message: 'Permohonan layanan ditolak.',
    };
  }

  @Post(':id/notes')
  @Roles('SUPER_ADMIN', 'TECHNICIAN')
  async addInternalNote(
    @Param('id') id: string,
    @Body() dto: AddInternalNoteDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const note = await this.adminApplicationsService.addInternalNote(
      id,
      dto.message,
      req.user,
    );
    return {
      success: true,
      data: note,
      message: 'Catatan internal berhasil disimpan.',
    };
  }

  @Get(':id/documents/:docId/signed-url')
  @Roles('SUPER_ADMIN', 'TECHNICIAN')
  async getDocumentSignedUrl(
    @Param('id') id: string,
    @Param('docId') docId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const result = await this.adminApplicationsService.getDocumentSignedUrl(
      id,
      docId,
      req.user,
    );
    return {
      success: true,
      data: result,
    };
  }

  @Post(':id/reissue-tracking-code')
  @Roles('SUPER_ADMIN')
  async reissueTrackingCode(
    @Param('id') id: string,
    @Body() dto: ReissueTrackingCodeDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const result = await this.adminApplicationsService.reissueTrackingCode(
      id,
      dto,
      req.user,
    );
    return {
      success: true,
      data: result,
      message: result.message,
    };
  }
}
