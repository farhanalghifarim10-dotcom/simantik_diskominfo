import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { AssignmentsService } from './assignments.service.js';
import type { CreateAssignmentDto } from './assignments.types.js';

type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};

@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class AdminAssignmentsController {
  constructor(
    private readonly assignmentsService: AssignmentsService,
  ) {}

  @Get('technicians')
  async listTechnicians() {
    const data = await this.assignmentsService.listTechnicians();
    return {
      success: true,
      data,
    };
  }

  @Get('applications/:id/assignments')
  @Roles('SUPER_ADMIN', 'TECHNICIAN')
  async getApplicationAssignments(
    @Param('id') applicationId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    if (req.user.role === 'TECHNICIAN') {
      const isAssigned = await this.assignmentsService.checkTechnicianAuthorization(
        applicationId,
        req.user.id,
      );
      if (!isAssigned) {
        throw new ForbiddenException(
          'Akses ditolak: Anda tidak memiliki wewenang atas informasi penugasan permohonan ini karena tidak ditugaskan sebagai tenaga ahli penanggung jawab.',
        );
      }
    }

    const data = await this.assignmentsService.getApplicationAssignments(
      applicationId,
    );
    return {
      success: true,
      data,
    };
  }

  @Post('applications/:id/assignments')
  async assignTechnician(
    @Param('id') applicationId: string,
    @Body() dto: CreateAssignmentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const result = await this.assignmentsService.assignTechnician(
      applicationId,
      dto,
      req.user,
    );
    return {
      success: true,
      data: result,
      message: `Permohonan berhasil ditugaskan kepada ${result.technician_name}.`,
    };
  }
}
