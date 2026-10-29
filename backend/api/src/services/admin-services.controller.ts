import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { ServicesService } from './services.service.js';
import type {
  CreateRequirementDto,
  CreateServiceDto,
  RequirementType,
  ServiceType,
  UpdateRequirementDto,
  UpdateServiceDto,
} from './services.types.js';

type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};

const VALID_REQ_TYPES: RequirementType[] = ['DOCUMENT', 'DATA', 'CONFIRMATION'];
const VALID_SERVICE_TYPES: ServiceType[] = ['DEVELOPMENT', 'ENHANCEMENT'];

@Controller('admin/services')
@UseGuards(AuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class AdminServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  async getServices() {
    const data = await this.servicesService.getAdminServices();
    return {
      success: true,
      data,
    };
  }

  @Get(':id')
  async getServiceDetail(@Param('id') id: string) {
    const data = await this.servicesService.getAdminServiceDetail(id);
    return {
      success: true,
      data,
    };
  }

  @Post()
  async createService(
    @Body() body: Record<string, unknown>,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!body.code || typeof body.code !== 'string' || !body.code.trim()) {
      throw new BadRequestException('Kode layanan wajib diisi.');
    }
    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
      throw new BadRequestException('Nama layanan wajib diisi.');
    }

    const type = (body.type as string)?.toUpperCase() as ServiceType;
    if (!type || !VALID_SERVICE_TYPES.includes(type)) {
      throw new BadRequestException(
        `Tipe layanan tidak valid. Harus salah satu dari: ${VALID_SERVICE_TYPES.join(', ')}.`,
      );
    }

    const dto: CreateServiceDto = {
      code: (body.code as string).trim(),
      name: (body.name as string).trim(),
      type,
      slug: body.slug ? String(body.slug).trim() : undefined,
      description: body.description ? String(body.description) : undefined,
      sort_order: body.sort_order ? Number(body.sort_order) : undefined,
      is_active: body.is_active !== undefined ? Boolean(body.is_active) : true,
    };

    const data = await this.servicesService.createService(dto, req?.user?.id);
    return {
      success: true,
      data,
      message: `Layanan "${data.name}" (${data.code}) berhasil ditambahkan ke katalog.`,
    };
  }

  @Patch(':id')
  async updateService(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @Req() req?: AuthenticatedRequest,
  ) {
    if (body.name !== undefined && (typeof body.name !== 'string' || !body.name.trim())) {
      throw new BadRequestException('Nama layanan harus berupa teks yang valid.');
    }
    if (body.sort_order !== undefined && typeof body.sort_order !== 'number') {
      throw new BadRequestException('Urutan (sort_order) harus berupa angka.');
    }

    const dto: UpdateServiceDto = {
      name: body.name ? (body.name as string).trim() : undefined,
      description: body.description !== undefined ? String(body.description) : undefined,
      is_active: body.is_active !== undefined ? Boolean(body.is_active) : undefined,
      sort_order: body.sort_order !== undefined ? Number(body.sort_order) : undefined,
    };

    const data = await this.servicesService.updateService(id, dto, req?.user?.id);
    return {
      success: true,
      data,
      message: 'Metadata layanan berhasil diperbarui.',
    };
  }

  @Post(':id/requirements')
  async createRequirement(
    @Param('id') serviceId: string,
    @Body() body: Record<string, unknown>,
    @Req() req?: AuthenticatedRequest,
  ) {
    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
      throw new BadRequestException('Nama persyaratan wajib diisi.');
    }

    const type = (body.type as string)?.toUpperCase() as RequirementType;
    if (!type || !VALID_REQ_TYPES.includes(type)) {
      throw new BadRequestException(
        `Tipe persyaratan tidak valid. Harus salah satu dari: ${VALID_REQ_TYPES.join(', ')}.`,
      );
    }

    const dto: CreateRequirementDto = {
      name: (body.name as string).trim(),
      description: body.description !== undefined ? String(body.description) : undefined,
      type,
      is_required: body.is_required !== undefined ? Boolean(body.is_required) : true,
      sort_order: body.sort_order !== undefined ? Number(body.sort_order) : undefined,
      is_active: body.is_active !== undefined ? Boolean(body.is_active) : true,
      allowed_file_types: body.allowed_file_types !== undefined ? String(body.allowed_file_types) : undefined,
      max_file_size_mb: body.max_file_size_mb !== undefined ? Number(body.max_file_size_mb) : undefined,
      is_placeholder: body.is_placeholder !== undefined ? Boolean(body.is_placeholder) : false,
    };

    const data = await this.servicesService.createRequirement(serviceId, dto, req?.user?.id);
    return {
      success: true,
      data,
      message: 'Persyaratan layanan baru berhasil ditambahkan.',
    };
  }

  @Patch(':id/requirements/:reqId')
  async updateRequirement(
    @Param('id') serviceId: string,
    @Param('reqId') reqId: string,
    @Body() body: Record<string, unknown>,
    @Req() req?: AuthenticatedRequest,
  ) {
    if (body.name !== undefined && (typeof body.name !== 'string' || !body.name.trim())) {
      throw new BadRequestException('Nama persyaratan tidak boleh kosong.');
    }

    let type: RequirementType | undefined = undefined;
    if (body.type !== undefined) {
      const parsedType = (body.type as string)?.toUpperCase() as RequirementType;
      if (!VALID_REQ_TYPES.includes(parsedType)) {
        throw new BadRequestException(
          `Tipe persyaratan tidak valid. Harus salah satu dari: ${VALID_REQ_TYPES.join(', ')}.`,
        );
      }
      type = parsedType;
    }

    const dto: UpdateRequirementDto = {
      name: body.name !== undefined ? (body.name as string).trim() : undefined,
      description: body.description !== undefined ? String(body.description) : undefined,
      type,
      is_required: body.is_required !== undefined ? Boolean(body.is_required) : undefined,
      sort_order: body.sort_order !== undefined ? Number(body.sort_order) : undefined,
      is_active: body.is_active !== undefined ? Boolean(body.is_active) : undefined,
      allowed_file_types: body.allowed_file_types !== undefined ? String(body.allowed_file_types) : undefined,
      max_file_size_mb: body.max_file_size_mb !== undefined ? Number(body.max_file_size_mb) : undefined,
      is_placeholder: body.is_placeholder !== undefined ? Boolean(body.is_placeholder) : undefined,
    };

    const data = await this.servicesService.updateRequirement(serviceId, reqId, dto, req?.user?.id);
    return {
      success: true,
      data,
      message: 'Persyaratan layanan berhasil diperbarui.',
    };
  }

  @Delete(':id/requirements/:reqId')
  async deleteRequirement(
    @Param('id') serviceId: string,
    @Param('reqId') reqId: string,
    @Req() req?: AuthenticatedRequest,
  ) {
    const data = await this.servicesService.deleteRequirement(serviceId, reqId, req?.user?.id);
    return {
      success: true,
      data,
      message: data.deactivated
        ? 'Persyaratan dinonaktifkan (dipertahankan karena memiliki referensi pengajuan historis).'
        : 'Persyaratan layanan berhasil dihapus.',
    };
  }
}
