import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module.js';
import { ServicesModule } from '../services/services.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { TrackingModule } from '../tracking/tracking.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { ApplicationsService } from './applications.service.js';
import {
  ApplicationsController,
  OpdUnitsController,
} from './applications.controller.js';
import { WorkflowEngine } from './workflow/workflow.engine.js';
import { AdminApplicationsService } from './admin-applications.service.js';
import { AdminApplicationsController } from './admin-applications.controller.js';

@Module({
  imports: [SupabaseModule, ServicesModule, AuthModule, TrackingModule, AuditModule],
  controllers: [
    ApplicationsController,
    OpdUnitsController,
    AdminApplicationsController,
  ],
  providers: [
    ApplicationsService,
    WorkflowEngine,
    AdminApplicationsService,
  ],
  exports: [ApplicationsService, AdminApplicationsService, WorkflowEngine],
})
export class ApplicationsModule {}
