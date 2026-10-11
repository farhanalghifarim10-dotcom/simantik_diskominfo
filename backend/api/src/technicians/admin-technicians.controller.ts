import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
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
import { TechniciansService } from './technicians.service.js';
import type {
  CreateTechnicianDto,
  UpdateTechnicianDto,
} from './technicians.types.js';

type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};

@Controller('admin/technicians')
@UseGuards(AuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class AdminTechniciansController {
  constructor(private readonly techniciansService: TechniciansService) {}

  @Get()
  async getTechnicians(
    @Query('search') search?: string,
    @Query('is_active') isActive?: string,
  ) {
    const activeFilter =
      isActive === 'true' ? true : isActive === 'false' ? false : undefined;

    const data = await this.techniciansService.listTechnicians({
      search,
      is_active: activeFilter,
    });

    return {
      success: true,
      data,
    };
  }

  @Get(':id')
  async getTechnicianDetail(@Param('id') id: string) {
    const data = await this.techniciansService.getTechnicianDetail(id);
    return {
      success: true,
      data,
    };
  }

  @Post()
  async createTechnician(
    @Body() body: Record<string, unknown>,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!body.full_name || typeof body.full_name !== 'string') {
      throw new BadRequestException('Nama lengkap teknisi wajib diisi.');
    }
    if (!body.email || typeof body.email !== 'string') {
      throw new BadRequestException('Alamat email teknisi wajib diisi.');
    }

    const dto: CreateTechnicianDto = {
      full_name: (body.full_name as string).trim(),
      email: (body.email as string).trim(),
      password: body.password ? String(body.password) : undefined,
      is_active: body.is_active !== undefined ? Boolean(body.is_active) : true,
    };

    const data = await this.techniciansService.createTechnician(dto, req.user?.id);
    return {
      success: true,
      data,
      message: `Akun teknisi "${data.full_name}" berhasil didaftarkan.`,
    };
  }

  @Patch(':id')
  async updateTechnician(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @Req() req: AuthenticatedRequest,
  ) {
    const dto: UpdateTechnicianDto = {
      full_name: body.full_name !== undefined ? String(body.full_name).trim() : undefined,
      email: body.email !== undefined ? String(body.email).trim() : undefined,
      password: body.password !== undefined ? String(body.password) : undefined,
      is_active: body.is_active !== undefined ? Boolean(body.is_active) : undefined,
    };

    const data = await this.techniciansService.updateTechnician(id, dto, req.user?.id);
    return {
      success: true,
      data,
      message: `Data teknisi "${data.full_name}" berhasil diperbarui.`,
    };
  }

  @Patch(':id/status')
  async toggleTechnicianStatus(
    @Param('id') id: string,
    @Body('is_active') isActive: boolean,
    @Req() req: AuthenticatedRequest,
  ) {
    if (isActive === undefined) {
      throw new BadRequestException('Nilai is_active wajib disertakan.');
    }

    const data = await this.techniciansService.toggleTechnicianStatus(
      id,
      Boolean(isActive),
      req.user?.id,
    );

    return {
      success: true,
      data,
      message: data.is_active
        ? `Akun teknisi "${data.full_name}" telah diaktifkan kembali.`
        : `Akun teknisi "${data.full_name}" telah dinonaktifkan (seluruh arsip & penugasan tetap aman).`,
    };
  }
}
