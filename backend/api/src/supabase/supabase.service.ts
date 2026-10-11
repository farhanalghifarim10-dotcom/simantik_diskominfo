import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
    private readonly client: SupabaseClient;

    constructor(private readonly configService: ConfigService) {
        const url = this.configService.get<string>('supabase.url');
        const secretKey = this.configService.get<string>(
            'supabase.secretKey',
        );

        if (!url) {
            throw new Error('SUPABASE_URL is not configured');
        }

        if (!secretKey) {
            throw new Error('SUPABASE_SECRET_KEY is not configured');
        }

        this.client = createClient(url, secretKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
                detectSessionInUrl: false,
            },
        });
    }

    getClient(): SupabaseClient {
        return this.client;
    }
}