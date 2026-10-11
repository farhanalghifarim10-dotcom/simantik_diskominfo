import { Module } from '@nestjs/common';
import { HelpdeskController } from './helpdesk.controller.js';
import { HelpdeskService } from './helpdesk.service.js';
import { SupabaseModule } from '../supabase/supabase.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [SupabaseModule, NotificationsModule, AuthModule],
  controllers: [HelpdeskController],
  providers: [HelpdeskService],
  exports: [HelpdeskService],
})
export class HelpdeskModule {}
