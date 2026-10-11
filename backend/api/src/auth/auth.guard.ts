import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

import { SupabaseService } from '../supabase/supabase.service.js';
import type { AppRole, AuthenticatedUser } from './auth.types.js';

type AuthenticatedRequest = Request & {
    user?: AuthenticatedUser;
};

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(
        private readonly supabaseService: SupabaseService,
    ) { }

    async canActivate(
        context: ExecutionContext,
    ): Promise<boolean> {
        const request =
            context.switchToHttp().getRequest<AuthenticatedRequest>();

        const authorization = request.headers.authorization;

        if (!authorization?.startsWith('Bearer ')) {
            throw new UnauthorizedException(
                'Authorization token is required',
            );
        }

        const accessToken = authorization.slice('Bearer '.length).trim();

        if (!accessToken) {
            throw new UnauthorizedException(
                'Authorization token is required',
            );
        }

        const supabase = this.supabaseService.getClient();

        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser(accessToken);

        if (userError || !user) {
            throw new UnauthorizedException(
                'Invalid or expired authorization token',
            );
        }

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name, role, is_active')
            .eq('id', user.id)
            .single();

        if (
            profileError ||
            !profile ||
            !profile.is_active
        ) {
            throw new UnauthorizedException(
                'Active application profile was not found',
            );
        }

        const authenticatedUser: AuthenticatedUser = {
            id: user.id,
            email: user.email ?? null,
            role: profile.role as AppRole,
            fullName: profile.full_name,
        };

        request.user = authenticatedUser;

        return true;
    }
}