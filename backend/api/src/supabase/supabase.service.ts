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

        if (process.env.REQUIRE_LOCAL_SUPABASE === 'true') {
            let parsedUrl: URL;
            try {
                parsedUrl = new URL(url);
            } catch {
                throw new Error(
                    'FAIL-SAFE ABORT: SUPABASE_URL is not a valid URL.',
                );
            }

            const hostname = parsedUrl.hostname.toLowerCase();
            const allowedHosts = ['127.0.0.1', 'localhost'];
            if (
                !allowedHosts.includes(hostname) ||
                parsedUrl.port !== '54321' ||
                hostname.includes('supabase.co')
            ) {
                throw new Error(
                    `FAIL-SAFE ABORT: Backend startup aborted! REQUIRE_LOCAL_SUPABASE=true is active ` +
                    `but target host "${hostname}:${parsedUrl.port}" is not local Supabase (127.0.0.1:54321). ` +
                    `Aborting startup to prevent connecting to Cloud or external databases.`,
                );
            }
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