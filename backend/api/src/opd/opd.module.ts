import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { OpdService } from './opd.service.js';
import { AdminOpdController } from './admin-opd.controller.js';
import { OpdController } from './opd.controller.js';

@Module({
  imports: [SupabaseModule, AuditModule],
  controllers: [AdminOpdController, OpdController],
  providers: [OpdService],
  exports: [OpdService],
})
export class OpdModule {}
