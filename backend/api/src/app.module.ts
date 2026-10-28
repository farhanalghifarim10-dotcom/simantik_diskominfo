import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import configuration from './config/configuration.js';
import { HealthModule } from './health/health.module.js';
import { SupabaseModule } from './supabase/supabase.module.js';
import { AuthModule } from './auth/auth.module.js';
import { AuditModule } from './audit/audit.module.js';
import { OpdModule } from './opd/opd.module.js';
import { ServicesModule } from './services/services.module.js';
import { TechniciansModule } from './technicians/technicians.module.js';
import { ApplicationsModule } from './applications/applications.module.js';
import { AssignmentsModule } from './assignments/assignments.module.js';
import { LifecycleModule } from './lifecycle/lifecycle.module.js';
import { TrackingModule } from './tracking/tracking.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { MessagesModule } from './messages/messages.module.js';
import { HelpdeskModule } from './helpdesk/helpdesk.module.js';
import { AdminController } from './admin/admin.controller.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000, // 60 detik (1 menit)
        limit: 100, // 100 request per menit
      },
      {
        name: 'strict',
        ttl: 600000, // 600 detik (10 menit)
        limit: 5, // 5 per 10 menit
      },
      {
        name: 'helpdesk',
        ttl: 600000, // 600 detik (10 menit)
        limit: 3, // 3 per 10 menit
      },
    ]),
    HealthModule,
    SupabaseModule,
    AuthModule,
    AuditModule,
    OpdModule,
    ServicesModule,
    TechniciansModule,
    ApplicationsModule,
    AssignmentsModule,
    LifecycleModule,
    TrackingModule,
    NotificationsModule,
    MessagesModule,
    HelpdeskModule,
  ],
  controllers: [AdminController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}