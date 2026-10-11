import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { ApplicationsModule } from '../applications/applications.module.js';
import { AssignmentsService } from './assignments.service.js';
import { AdminAssignmentsController } from './admin-assignments.controller.js';
import { TechnicianWorkspaceController } from './technician-workspace.controller.js';

@Module({
  imports: [SupabaseModule, AuthModule, ApplicationsModule],
  controllers: [AdminAssignmentsController, TechnicianWorkspaceController],
  providers: [AssignmentsService],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}
