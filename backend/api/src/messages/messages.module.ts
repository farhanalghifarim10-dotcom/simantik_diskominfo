import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { TrackingModule } from '../tracking/tracking.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { AssignmentsModule } from '../assignments/assignments.module.js';
import { MessagesService } from './messages.service.js';
import { MessagesController } from './messages.controller.js';

@Module({
  imports: [
    SupabaseModule,
    AuthModule,
    TrackingModule,
    NotificationsModule,
    AssignmentsModule,
  ],
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
