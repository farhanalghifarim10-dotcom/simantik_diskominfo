import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from '../supabase/supabase.module.js';
import { TrackingTokenService } from './tracking-token.service.js';
import { TrackingRateLimiter } from './tracking-rate-limiter.js';
import { TrackingService } from './tracking.service.js';
import { TrackingController } from './tracking.controller.js';
import { TrackingAuthGuard } from './tracking.guard.js';

@Module({
  imports: [ConfigModule, SupabaseModule],
  controllers: [TrackingController],
  providers: [
    TrackingTokenService,
    TrackingRateLimiter,
    TrackingService,
    TrackingAuthGuard,
  ],
  exports: [TrackingService, TrackingTokenService],
})
export class TrackingModule {}
