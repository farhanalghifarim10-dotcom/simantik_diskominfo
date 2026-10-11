import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { TechniciansService } from './technicians.service.js';
import { AdminTechniciansController } from './admin-technicians.controller.js';

@Module({
  imports: [SupabaseModule, AuditModule],
  controllers: [AdminTechniciansController],
  providers: [TechniciansService],
  exports: [TechniciansService],
})
export class TechniciansModule {}
