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
