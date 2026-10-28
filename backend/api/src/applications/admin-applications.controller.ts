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
import { SkipThrottle } from '@nestjs/throttler';

type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};

@SkipThrottle()
@Controller('admin/applications')
@UseGuards(AuthGuard, RolesGuard)
export class AdminApplicationsController {
  constructor(
    private readonly adminApplicationsService: AdminApplicationsService,
  ) {}

  /**
   * GET /api/v1/admin/applications
   * Mengambil daftar permohonan dengan pagination, filter, search, dan sort.
   */
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

  /**
   * GET /api/v1/admin/applications/stats
   * Mengambil agregasi metrik statistik dashboard SUPER_ADMIN & TECHNICIAN.
   */
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

  /**
   * GET /api/v1/admin/applications/:id
   * Mengambil detail lengkap permohonan, riwayat, bukti telaah, dan opsi transisi yang diizinkan.
   */
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

  /**
   * POST /api/v1/admin/applications/:id/transitions
   * Mengeksekusi transisi status permohonan melalui engine alur kerja terpusat.
   */
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

  /**
   * POST /api/v1/admin/applications/:id/stage-transitions
   * Mengeksekusi pemindahan tahapan siklus hidup (lifecycle stage) SPBE.
   */
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

  /**
   * POST /api/v1/admin/applications/:id/verify
   * Shortcut aksi: Mulai proses verifikasi berkas permohonan (SUBMITTED -> VERIFICATION).
   */
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

  /**
   * POST /api/v1/admin/applications/:id/request-revision
   * Shortcut aksi: Minta revisi kepada pemohon OPD (-> REVISION_REQUIRED).
   */
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

  /**
   * POST /api/v1/admin/applications/:id/approve
   * Shortcut aksi: Setujui permohonan layanan (-> APPROVED).
   */
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

  /**
   * POST /api/v1/admin/applications/:id/reject
   * Shortcut aksi: Tolak permohonan layanan (-> REJECTED).
   */
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

  /**
   * POST /api/v1/admin/applications/:id/notes
   * Tambahkan catatan internal khusus staf/administrator Diskominfo.
   */
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

  /**
   * GET /api/v1/admin/applications/:id/documents/:docId/signed-url
   * Mengambil URL unduh bertanda tangan (signed URL) untuk akses berkas privat.
   */
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

  /**
   * POST /api/v1/admin/applications/:id/reissue-tracking-code
   * Menerbitkan ulang kode pelacakan untuk permohonan yang sudah ada.
   * Hanya dapat diakses oleh SUPER_ADMIN setelah proses verifikasi identitas pemohon.
   * Kode baru ditampilkan hanya satu kali dalam respons agar dapat disampaikan via kanal resmi.
   */
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
