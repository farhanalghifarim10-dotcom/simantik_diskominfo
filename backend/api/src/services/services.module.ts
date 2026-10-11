import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { ServicesService } from './services.service.js';
import { ServicesController } from './services.controller.js';
import { AdminServicesController } from './admin-services.controller.js';

@Module({
  imports: [SupabaseModule, AuthModule, AuditModule],
  controllers: [ServicesController, AdminServicesController],
  providers: [ServicesService],
  exports: [ServicesService],
})
export class ServicesModule {}
