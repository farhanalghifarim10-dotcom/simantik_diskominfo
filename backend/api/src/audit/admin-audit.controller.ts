import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { AuditService } from './audit.service.js';
import type { ListAuditLogsQueryDto } from './audit.types.js';

@Controller('admin/audit')
@UseGuards(AuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class AdminAuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  async getAuditLogs(@Query() query: ListAuditLogsQueryDto) {
    const data = await this.auditService.listLogs({
      entity_type: query.entity_type,
      action: query.action,
      search: query.search,
      page: query.page ? Number(query.page) : 1,
      limit: query.limit ? Number(query.limit) : 20,
    });

    return {
      success: true,
      data: data.items,
      pagination: data.pagination,
    };
  }
}
