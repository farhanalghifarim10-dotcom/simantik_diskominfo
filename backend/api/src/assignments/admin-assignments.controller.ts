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
import { SkipThrottle } from '@nestjs/throttler';

type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};

@SkipThrottle()
@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class AdminAssignmentsController {
  constructor(
    private readonly assignmentsService: AssignmentsService,
  ) {}

  /**
   * GET /api/v1/admin/technicians
   * Mengambil daftar teknisi internal Diskominfo beserta beban kerja aktif.
   * Khusus SUPER_ADMIN.
   */
  @Get('technicians')
  async listTechnicians() {
    const data = await this.assignmentsService.listTechnicians();
    return {
      success: true,
      data,
    };
  }

  /**
   * GET /api/v1/admin/applications/:id/assignments
   * Mengambil riwayat dan status penugasan terkini pada permohonan.
   * TECHNICIAN diizinkan hanya jika ditugaskan pada tiket tersebut (RBAC).
   */
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

  /**
   * POST /api/v1/admin/applications/:id/assignments
   * Menugaskan atau mengalihkan teknisi penanggung jawab (Re-assignment).
   */
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
