import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module.js';
import { AuditService } from './audit.service.js';
import { AdminAuditController } from './admin-audit.controller.js';

@Module({
  imports: [SupabaseModule],
  controllers: [AdminAuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
