import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from '../supabase/supabase.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { EmailService } from './email.service.js';
import { NotificationsService } from './notifications.service.js';
import { NotificationsController } from './notifications.controller.js';

@Module({
  imports: [ConfigModule, SupabaseModule, AuthModule],
  controllers: [NotificationsController],
  providers: [EmailService, NotificationsService],
  exports: [NotificationsService, EmailService],
})
export class NotificationsModule {}
