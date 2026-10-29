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
import { AssignmentsService } from './assignments.service.js';
import type {
  ExecuteStageTransitionDto,
  ExecuteTransitionDto,
} from '../applications/workflow/workflow.types.js';
import type { ListTechnicianWorkQueryDto } from './assignments.types.js';

type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};

@Controller('technician')
@UseGuards(AuthGuard, RolesGuard)
@Roles('TECHNICIAN', 'SUPER_ADMIN')
export class TechnicianWorkspaceController {
  constructor(
    private readonly assignmentsService: AssignmentsService,
  ) {}

  /**
   * GET /api/v1/technician/my-work/summary
   * Mengambil ringkasan metrik beban kerja teknisi (Total, Dalam Pengerjaan, Pending, Selesai).
   */
  @Get('my-work/summary')
  async getMyWorkSummary(@Req() req: AuthenticatedRequest) {
    const data = await this.assignmentsService.getTechnicianWorkSummary(
      req.user.id,
    );
    return {
      success: true,
      data,
    };
  }

  /**
   * GET /api/v1/technician/my-work
   * Mengambil daftar seluruh permohonan yang ditugaskan kepada teknisi login.
   */
  @Get('my-work')
  async getMyWork(
    @Query() query: ListTechnicianWorkQueryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const data = await this.assignmentsService.getTechnicianMyWork(
      req.user.id,
      query,
    );
    return {
      success: true,
      data,
    };
  }

  /**
   * GET /api/v1/technician/applications/:id
   * Mengambil detail permohonan dengan otorisasi penugasan teknisi.
   */
  @Get('applications/:id')
  async getTechnicianApplicationDetail(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const data = await this.assignmentsService.getTechnicianApplicationDetail(
      id,
      req.user,
    );
    return {
      success: true,
      data,
    };
  }

  /**
   * POST /api/v1/technician/applications/:id/transitions
   * Eksekusi perubahan status permohonan oleh teknisi (hanya pada tiket tugasannya).
   */
  @Post('applications/:id/transitions')
  async executeTechnicianTransition(
    @Param('id') id: string,
    @Body() dto: ExecuteTransitionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const data = await this.assignmentsService.executeTechnicianTransition(
      id,
      dto,
      req.user,
    );
    return {
      success: true,
      data,
      message: `Status permohonan berhasil diperbarui menjadi ${dto.target_status}.`,
    };
  }

  /**
   * POST /api/v1/technician/applications/:id/stage-transitions
   * Pemindahan tahapan siklus hidup SPBE oleh teknisi (hanya pada tiket tugasannya).
   */
  @Post('applications/:id/stage-transitions')
  async executeTechnicianStageTransition(
    @Param('id') id: string,
    @Body() dto: ExecuteStageTransitionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const data = await this.assignmentsService.executeTechnicianStageTransition(
      id,
      dto,
      req.user,
    );
    return {
      success: true,
      data,
      message: `Tahapan lifecycle SPBE berhasil dipindahkan ke ${dto.target_stage}.`,
    };
  }
}
