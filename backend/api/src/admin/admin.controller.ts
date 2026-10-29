import {
    Controller,
    Get,
    Optional,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { AdminApplicationsService } from '../applications/admin-applications.service.js';

type AuthenticatedRequest = Request & {
    user?: AuthenticatedUser;
};

@Controller('admin')
export class AdminController {
    constructor(
        @Optional()
        private readonly adminApplicationsService?: AdminApplicationsService,
    ) {}

    @Get('dashboard/stats')
    @UseGuards(AuthGuard, RolesGuard)
    @Roles('SUPER_ADMIN', 'TECHNICIAN')
    async getDashboardStats(
        @Query('year') year?: string,
        @Req() request?: AuthenticatedRequest,
    ) {
        if (!this.adminApplicationsService) {
            return {
                success: true,
                data: {
                    total_applications: 0,
                    in_progress_count: 0,
                    active_technicians_count: 0,
                    completed_closed_count: 0,
                    submitted_count: 0,
                    total: 0,
                    completed_closed: 0,
                },
            };
        }
        const data = await this.adminApplicationsService.getDashboardStats(
            { year: year ? Number(year) : undefined },
            request?.user,
        );
        return {
            success: true,
            data,
        };
    }

    @Get('me')
    @UseGuards(AuthGuard)
    getMe(@Req() request: AuthenticatedRequest) {
        return {
            success: true,
            data: {
                user: request.user,
            },
        };
    }

    @Get('super-admin-check')
    @UseGuards(AuthGuard, RolesGuard)
    @Roles('SUPER_ADMIN')
    checkSuperAdmin(@Req() request: AuthenticatedRequest) {
        return {
            success: true,
            data: {
                message: 'Access granted to SUPER_ADMIN',
                user: request.user,
            },
        };
    }

    @Get('technician-check')
    @UseGuards(AuthGuard, RolesGuard)
    @Roles('TECHNICIAN')
    checkTechnician(@Req() request: AuthenticatedRequest) {
        return {
            success: true,
            data: {
                message: 'Access granted to TECHNICIAN',
                user: request.user,
            },
        };
    }
}