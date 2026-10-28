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
import { OpdService } from './opd.service.js';
import type { CreateOpdDto, UpdateOpdDto } from './opd.types.js';
import { SkipThrottle } from '@nestjs/throttler';

type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};

@SkipThrottle()
@Controller('admin/opd')
@UseGuards(AuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class AdminOpdController {
  constructor(private readonly opdService: OpdService) {}

  @Get()
  async getAdminOpds(
    @Query('search') search?: string,
    @Query('is_active') isActive?: string,
  ) {
    const activeFilter =
      isActive === 'true' ? true : isActive === 'false' ? false : undefined;

    const data = await this.opdService.listOpds(
      { search, is_active: activeFilter },
      true,
    );

    return {
      success: true,
      data,
    };
  }

  @Get(':id')
  async getOpdDetail(@Param('id') id: string) {
    const data = await this.opdService.getOpdDetail(id);
    return {
      success: true,
      data,
    };
  }

  @Post()
  async createOpd(
    @Body() body: Record<string, unknown>,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!body.code || typeof body.code !== 'string') {
      throw new BadRequestException('Kode Perangkat Daerah wajib diisi.');
    }
    if (!body.name || typeof body.name !== 'string') {
      throw new BadRequestException('Nama Perangkat Daerah wajib diisi.');
    }

    const dto: CreateOpdDto = {
      code: body.code.trim(),
      name: body.name.trim(),
      is_active: body.is_active !== undefined ? Boolean(body.is_active) : true,
    };

    const data = await this.opdService.createOpd(dto, req.user?.id);
    return {
      success: true,
      data,
      message: `Perangkat Daerah "${data.name}" (${data.code}) berhasil ditambahkan.`,
    };
  }

  @Patch(':id')
  async updateOpd(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @Req() req: AuthenticatedRequest,
  ) {
    const dto: UpdateOpdDto = {
      code: body.code !== undefined ? String(body.code).trim() : undefined,
      name: body.name !== undefined ? String(body.name).trim() : undefined,
      is_active: body.is_active !== undefined ? Boolean(body.is_active) : undefined,
    };

    const data = await this.opdService.updateOpd(id, dto, req.user?.id);
    return {
      success: true,
      data,
      message: `Data Perangkat Daerah "${data.name}" berhasil diperbarui.`,
    };
  }

  @Patch(':id/status')
  async toggleOpdStatus(
    @Param('id') id: string,
    @Body('is_active') isActive: boolean,
    @Req() req: AuthenticatedRequest,
  ) {
    if (isActive === undefined) {
      throw new BadRequestException('Nilai is_active wajib disertakan.');
    }

    const data = await this.opdService.toggleOpdStatus(id, Boolean(isActive), req.user?.id);
    return {
      success: true,
      data,
      message: data.is_active
        ? `Perangkat Daerah "${data.name}" telah diaktifkan kembali.`
        : `Perangkat Daerah "${data.name}" telah dinonaktifkan (arsip historis tetap terjaga).`,
    };
  }
}
