import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import crypto from 'node:crypto';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import { AssignmentsService } from '../assignments/assignments.service.js';
import { assertSupabaseOk, isInMemoryFallbackAllowed } from '../common/utils/supabase.utils.js';
import type {
  AnalysisRecord,
  CreateEvaluationDto,
  CreateMaintenanceRecordDto,
  CreateTestRecordDto,
  DesignRecord,
  EvaluationRecordItem,
  ImplementationRecord,
  LifecycleOverview,
  MaintenanceRecordItem,
  MaintenanceType,
  ProjectPlanRecord,
  TechnicalDocumentItem,
  TestRecordItem,
  TestResult,
  TestType,
  UpdateEvaluationDto,
  UpdateMaintenanceRecordDto,
  UpdateTestRecordDto,
  UploadTechnicalDocumentDto,
  UpsertAnalysisDto,
  UpsertDesignDto,
  UpsertImplementationDto,
  UpsertProjectPlanDto,
} from './lifecycle.types.js';

@Injectable()
export class LifecycleService {
  private readonly logger = new Logger(LifecycleService.name);
  // In-memory fallback stores for test/offline resilience
  private inMemoryAnalysis = new Map<string, AnalysisRecord>();
  private inMemoryPlanning = new Map<string, ProjectPlanRecord>();
  private inMemoryDesign = new Map<string, DesignRecord>();
  private inMemoryImplementation = new Map<string, ImplementationRecord>();
  private inMemoryTests = new Map<string, TestRecordItem[]>();
  private inMemoryMaintenance = new Map<string, MaintenanceRecordItem[]>();
  private inMemoryEvaluations = new Map<string, EvaluationRecordItem[]>();
  private inMemoryTechnicalDocs = new Map<string, TechnicalDocumentItem[]>();

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly assignmentsService: AssignmentsService,
  ) {}

  /**
   * Authoritative backend access verification:
   * SUPER_ADMIN: has access to all applications.
   * TECHNICIAN: only has access if actively assigned to the application.
   */
  async assertLifecycleAccess(
    applicationId: string,
    user: AuthenticatedUser,
  ): Promise<void> {
    if (user.role === 'SUPER_ADMIN') {
      return;
    }

    if (user.role === 'TECHNICIAN') {
      const isAssigned = await this.assignmentsService.checkTechnicianAuthorization(
        applicationId,
        user.id,
      );
      if (!isAssigned) {
        throw new ForbiddenException(
          'Akses ditolak: Anda tidak ditugaskan untuk mengelola artefak lifecycle pada permohonan ini.',
        );
      }
      return;
    }

    throw new ForbiddenException(
      'Akses ditolak: Peran Anda tidak memiliki hak akses ke dokumen lifecycle internal.',
    );
  }

  // ------------------------------------------------------------
  // OVERVIEW
  // ------------------------------------------------------------
  async getLifecycleOverview(
    applicationId: string,
    user: AuthenticatedUser,
  ): Promise<LifecycleOverview> {
    await this.assertLifecycleAccess(applicationId, user);

    let ticketNumber = 'TIK-MOCK';
    let title = 'Pengembangan Sistem SPBE';
    let currentStatus = 'IN_PROGRESS';
    let currentStage = 'ANALYSIS';

    try {
      const client = this.supabaseService.getClient();
      const { data: app } = await client
        .from('applications')
        .select('id, ticket_number, title, current_status, current_stage')
        .eq('id', applicationId)
        .single();

      if (app) {
        ticketNumber = app.ticket_number || ticketNumber;
        title = app.title || title;
        currentStatus = app.current_status || currentStatus;
        currentStage = app.current_stage || currentStage;
      }
    } catch {
      // fallback
    }

    const analysis = await this.getAnalysis(applicationId, user);
    const planning = await this.getProjectPlan(applicationId, user);
    const design = await this.getDesign(applicationId, user);
    const implementation = await this.getImplementation(applicationId, user);
    const tests = await this.getTests(applicationId, user);
    const maintenance = await this.getMaintenanceRecords(applicationId, user);
    const evaluations = await this.getEvaluations(applicationId, user);
    const techDocs = await this.getTechnicalDocuments(applicationId, user);

    const isAssigned =
      user.role === 'SUPER_ADMIN' ||
      (await this.assignmentsService.checkTechnicianAuthorization(
        applicationId,
        user.id,
      ));

    return {
      application_id: applicationId,
      ticket_number: ticketNumber,
      title,
      current_status: currentStatus as any,
      current_stage: currentStage as any,
      is_assigned_to_user: isAssigned,
      user_can_edit: isAssigned,
      stages_status: {
        ANALYSIS: {
          has_record: Boolean(analysis),
          updated_at: analysis?.updated_at || null,
          summary: analysis?.objectives || analysis?.problems || null,
        },
        PLANNING: {
          has_record: Boolean(planning),
          updated_at: planning?.updated_at || null,
          summary: planning?.scope || planning?.technical_approach || null,
        },
        DESIGN: {
          has_record: Boolean(design),
          updated_at: design?.updated_at || null,
          summary: design?.architecture_model || design?.process_flow || null,
        },
        IMPLEMENTATION: {
          has_record: Boolean(implementation),
          updated_at: implementation?.updated_at || null,
          summary: implementation?.software_dev_records || null,
        },
        TESTING: {
          count: tests.length,
          pass_count: tests.filter((t) => t.result === 'PASS').length,
          fail_count: tests.filter((t) => t.result === 'FAIL').length,
          last_tested_at: tests[0]?.tested_at || null,
        },
        MAINTENANCE: {
          count: maintenance.length,
          last_performed_at: maintenance[0]?.completed_at || maintenance[0]?.started_at || null,
        },
        EVALUATION: {
          count: evaluations.length,
          last_evaluated_at: evaluations[0]?.evaluation_date || null,
        },
      },
      technical_documents_count: techDocs.length,
    };
  }

  // ------------------------------------------------------------
  // 1. ANALYSIS
  // ------------------------------------------------------------
  async getAnalysis(
    applicationId: string,
    user: AuthenticatedUser,
  ): Promise<AnalysisRecord | null> {
    await this.assertLifecycleAccess(applicationId, user);

    try {
      const client = this.supabaseService.getClient();
      const { data, error } = await client
        .from('analysis_records')
        .select(`
          *,
          created_by_profile:created_by (full_name)
        `)
        .eq('application_id', applicationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          application_id: data.application_id,
          problems: data.problems,
          needs: data.needs,
          stakeholders: data.stakeholders,
          objectives: data.objectives,
          scope: data.scope,
          risks: data.risks,
          target_users: data.target_users,
          target_timeline: data.target_timeline,
          target_location: data.target_location,
          supporting_analysis: data.supporting_analysis,
          created_by: data.created_by,
          created_by_name: data.created_by_profile?.full_name || null,
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
      }
    } catch {
      // Fallback in-memory
    }

    return this.inMemoryAnalysis.get(applicationId) || null;
  }

  async upsertAnalysis(
    applicationId: string,
    dto: UpsertAnalysisDto,
    user: AuthenticatedUser,
  ): Promise<AnalysisRecord> {
    await this.assertLifecycleAccess(applicationId, user);

    const now = new Date().toISOString();
    const existing = this.inMemoryAnalysis.get(applicationId);

    let record: AnalysisRecord = {
      id: existing?.id || crypto.randomUUID(),
      application_id: applicationId,
      problems: dto.problems ?? existing?.problems ?? null,
      needs: dto.needs ?? existing?.needs ?? null,
      stakeholders: dto.stakeholders ?? existing?.stakeholders ?? null,
      objectives: dto.objectives ?? existing?.objectives ?? null,
      scope: dto.scope ?? existing?.scope ?? null,
      risks: dto.risks ?? existing?.risks ?? null,
      target_users: dto.target_users ?? existing?.target_users ?? null,
      target_timeline: dto.target_timeline ?? existing?.target_timeline ?? null,
      target_location: dto.target_location ?? existing?.target_location ?? null,
      supporting_analysis: dto.supporting_analysis ?? existing?.supporting_analysis ?? null,
      created_by: existing?.created_by || user.id,
      created_by_name: existing?.created_by_name || user.fullName,
      created_at: existing?.created_at || now,
      updated_at: now,
    };

    try {
      const client = this.supabaseService.getClient();
      const currentDb = await this.getAnalysis(applicationId, user);

      if (currentDb) {
        const updateRes = await client
          .from('analysis_records')
          .update({
            problems: record.problems,
            needs: record.needs,
            stakeholders: record.stakeholders,
            objectives: record.objectives,
            scope: record.scope,
            risks: record.risks,
            target_users: record.target_users,
            target_timeline: record.target_timeline,
            target_location: record.target_location,
            supporting_analysis: record.supporting_analysis,
            updated_at: now,
          })
          .eq('id', currentDb.id)
          .select()
          .single();
        const data = assertSupabaseOk(updateRes, 'Gagal memperbarui catatan analisis');

        if (data) {
          record = { ...record, ...data, created_by_name: user.fullName };
        }
      } else {
        const insertRes = await client
          .from('analysis_records')
          .insert({
            id: record.id,
            application_id: applicationId,
            problems: record.problems,
            needs: record.needs,
            stakeholders: record.stakeholders,
            objectives: record.objectives,
            scope: record.scope,
            risks: record.risks,
            target_users: record.target_users,
            target_timeline: record.target_timeline,
            target_location: record.target_location,
            supporting_analysis: record.supporting_analysis,
            created_by: user.id,
            created_at: now,
            updated_at: now,
          })
          .select()
          .single();
        const data = assertSupabaseOk(insertRes, 'Gagal menyimpan catatan analisis baru');

        if (data) {
          record = { ...record, ...data, created_by_name: user.fullName };
        }
      }

      try {
        const auditRes = await client.from('audit_logs').insert({
          actor_profile_id: user.id,
          application_id: applicationId,
          action: 'LIFECYCLE_ANALYSIS_UPDATED',
          entity_type: 'analysis_records',
          entity_id: record.id,
          new_data: dto,
          created_at: now,
        });
        if (auditRes?.error) {
          this.logger.warn(`Gagal mencatat audit log analisis: ${auditRes.error.message}`);
        }
      } catch (auditErr) {
        this.logger.warn(`Gagal mencatat audit log analisis: ${auditErr}`);
      }
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      if (!isInMemoryFallbackAllowed()) {
        throw new InternalServerErrorException('Gagal menyimpan catatan analisis.');
      }
    }

    if (isInMemoryFallbackAllowed()) {
      this.inMemoryAnalysis.set(applicationId, record);
    }
    return record;
  }

  // ------------------------------------------------------------
  // 2. PLANNING (Project Plan)
  // ------------------------------------------------------------
  async getProjectPlan(
    applicationId: string,
    user: AuthenticatedUser,
  ): Promise<ProjectPlanRecord | null> {
    await this.assertLifecycleAccess(applicationId, user);

    try {
      const client = this.supabaseService.getClient();
      const { data, error } = await client
        .from('project_plans')
        .select(`
          *,
          created_by_profile:created_by (full_name)
        `)
        .eq('application_id', applicationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          application_id: data.application_id,
          scope: data.scope,
          business_process: data.business_process,
          technical_approach: data.technical_approach,
          executor: data.executor,
          roles_and_responsibilities: data.roles_and_responsibilities,
          planned_start_date: data.planned_start_date,
          planned_end_date: data.planned_end_date,
          security_plan: data.security_plan,
          resource_plan: data.resource_plan,
          success_indicators: data.success_indicators,
          knowledge_transfer_plan: data.knowledge_transfer_plan,
          monitoring_plan: data.monitoring_plan,
          reporting_plan: data.reporting_plan,
          created_by: data.created_by,
          created_by_name: data.created_by_profile?.full_name || null,
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
      }
    } catch {
      // fallback
    }

    return this.inMemoryPlanning.get(applicationId) || null;
  }

  async upsertProjectPlan(
    applicationId: string,
    dto: UpsertProjectPlanDto,
    user: AuthenticatedUser,
  ): Promise<ProjectPlanRecord> {
    await this.assertLifecycleAccess(applicationId, user);

    const now = new Date().toISOString();
    const existing = this.inMemoryPlanning.get(applicationId);

    let record: ProjectPlanRecord = {
      id: existing?.id || crypto.randomUUID(),
      application_id: applicationId,
      scope: dto.scope ?? existing?.scope ?? null,
      business_process: dto.business_process ?? existing?.business_process ?? null,
      technical_approach: dto.technical_approach ?? existing?.technical_approach ?? null,
      executor: dto.executor ?? existing?.executor ?? null,
      roles_and_responsibilities: dto.roles_and_responsibilities ?? existing?.roles_and_responsibilities ?? null,
      planned_start_date: dto.planned_start_date ?? existing?.planned_start_date ?? null,
      planned_end_date: dto.planned_end_date ?? existing?.planned_end_date ?? null,
      security_plan: dto.security_plan ?? existing?.security_plan ?? null,
      resource_plan: dto.resource_plan ?? existing?.resource_plan ?? null,
      success_indicators: dto.success_indicators ?? existing?.success_indicators ?? null,
      knowledge_transfer_plan: dto.knowledge_transfer_plan ?? existing?.knowledge_transfer_plan ?? null,
      monitoring_plan: dto.monitoring_plan ?? existing?.monitoring_plan ?? null,
      reporting_plan: dto.reporting_plan ?? existing?.reporting_plan ?? null,
      created_by: existing?.created_by || user.id,
      created_by_name: existing?.created_by_name || user.fullName,
      created_at: existing?.created_at || now,
      updated_at: now,
    };

    try {
      const client = this.supabaseService.getClient();
      const currentDb = await this.getProjectPlan(applicationId, user);

      if (currentDb) {
        const updateRes = await client
          .from('project_plans')
          .update({
            scope: record.scope,
            business_process: record.business_process,
            technical_approach: record.technical_approach,
            executor: record.executor,
            roles_and_responsibilities: record.roles_and_responsibilities,
            planned_start_date: record.planned_start_date,
            planned_end_date: record.planned_end_date,
            security_plan: record.security_plan,
            resource_plan: record.resource_plan,
            success_indicators: record.success_indicators,
            knowledge_transfer_plan: record.knowledge_transfer_plan,
            monitoring_plan: record.monitoring_plan,
            reporting_plan: record.reporting_plan,
            updated_at: now,
          })
          .eq('id', currentDb.id)
          .select()
          .single();
        const data = assertSupabaseOk(updateRes, 'Gagal memperbarui rencana proyek');

        if (data) {
          record = { ...record, ...data, created_by_name: user.fullName };
        }
      } else {
        const insertRes = await client
          .from('project_plans')
          .insert({
            id: record.id,
            application_id: applicationId,
            scope: record.scope,
            business_process: record.business_process,
            technical_approach: record.technical_approach,
            executor: record.executor,
            roles_and_responsibilities: record.roles_and_responsibilities,
            planned_start_date: record.planned_start_date,
            planned_end_date: record.planned_end_date,
            security_plan: record.security_plan,
            resource_plan: record.resource_plan,
            success_indicators: record.success_indicators,
            knowledge_transfer_plan: record.knowledge_transfer_plan,
            monitoring_plan: record.monitoring_plan,
            reporting_plan: record.reporting_plan,
            created_by: user.id,
            created_at: now,
            updated_at: now,
          })
          .select()
          .single();
        const data = assertSupabaseOk(insertRes, 'Gagal menyimpan rencana proyek baru');

        if (data) {
          record = { ...record, ...data, created_by_name: user.fullName };
        }
      }

      try {
        const auditRes = await client.from('audit_logs').insert({
          actor_profile_id: user.id,
          application_id: applicationId,
          action: 'LIFECYCLE_PLANNING_UPDATED',
          entity_type: 'project_plans',
          entity_id: record.id,
          new_data: dto,
          created_at: now,
        });
        if (auditRes?.error) {
          this.logger.warn(`Gagal mencatat audit log perencanaan: ${auditRes.error.message}`);
        }
      } catch (auditErr) {
        this.logger.warn(`Gagal mencatat audit log perencanaan: ${auditErr}`);
      }
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      if (!isInMemoryFallbackAllowed()) {
        throw new InternalServerErrorException('Gagal menyimpan rencana proyek.');
      }
    }

    if (isInMemoryFallbackAllowed()) {
      this.inMemoryPlanning.set(applicationId, record);
    }
    return record;
  }

  // ------------------------------------------------------------
  // 3. DESIGN
  // ------------------------------------------------------------
  async getDesign(
    applicationId: string,
    user: AuthenticatedUser,
  ): Promise<DesignRecord | null> {
    await this.assertLifecycleAccess(applicationId, user);

    try {
      const client = this.supabaseService.getClient();
      const { data, error } = await client
        .from('design_records')
        .select(`
          *,
          created_by_profile:created_by (full_name)
        `)
        .eq('application_id', applicationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          application_id: data.application_id,
          architecture_model: data.architecture_model,
          process_flow: data.process_flow,
          function_mapping: data.function_mapping,
          database_mapping: data.database_mapping,
          role_access_mapping: data.role_access_mapping,
          ui_navigation: data.ui_navigation,
          internal_control: data.internal_control,
          integration_design: data.integration_design,
          created_by: data.created_by,
          created_by_name: data.created_by_profile?.full_name || null,
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
      }
    } catch {
      // fallback
    }

    return this.inMemoryDesign.get(applicationId) || null;
  }

  async upsertDesign(
    applicationId: string,
    dto: UpsertDesignDto,
    user: AuthenticatedUser,
  ): Promise<DesignRecord> {
    await this.assertLifecycleAccess(applicationId, user);

    const now = new Date().toISOString();
    const existing = this.inMemoryDesign.get(applicationId);

    let record: DesignRecord = {
      id: existing?.id || crypto.randomUUID(),
      application_id: applicationId,
      architecture_model: dto.architecture_model ?? existing?.architecture_model ?? null,
      process_flow: dto.process_flow ?? existing?.process_flow ?? null,
      function_mapping: dto.function_mapping ?? existing?.function_mapping ?? null,
      database_mapping: dto.database_mapping ?? existing?.database_mapping ?? null,
      role_access_mapping: dto.role_access_mapping ?? existing?.role_access_mapping ?? null,
      ui_navigation: dto.ui_navigation ?? existing?.ui_navigation ?? null,
      internal_control: dto.internal_control ?? existing?.internal_control ?? null,
      integration_design: dto.integration_design ?? existing?.integration_design ?? null,
      created_by: existing?.created_by || user.id,
      created_by_name: existing?.created_by_name || user.fullName,
      created_at: existing?.created_at || now,
      updated_at: now,
    };

    try {
      const client = this.supabaseService.getClient();
      const currentDb = await this.getDesign(applicationId, user);

      if (currentDb) {
        const updateRes = await client
          .from('design_records')
          .update({
            architecture_model: record.architecture_model,
            process_flow: record.process_flow,
            function_mapping: record.function_mapping,
            database_mapping: record.database_mapping,
            role_access_mapping: record.role_access_mapping,
            ui_navigation: record.ui_navigation,
            internal_control: record.internal_control,
            integration_design: record.integration_design,
            updated_at: now,
          })
          .eq('id', currentDb.id)
          .select()
          .single();
        const data = assertSupabaseOk(updateRes, 'Gagal memperbarui desain sistem');

        if (data) {
          record = { ...record, ...data, created_by_name: user.fullName };
        }
      } else {
        const insertRes = await client
          .from('design_records')
          .insert({
            id: record.id,
            application_id: applicationId,
            architecture_model: record.architecture_model,
            process_flow: record.process_flow,
            function_mapping: record.function_mapping,
            database_mapping: record.database_mapping,
            role_access_mapping: record.role_access_mapping,
            ui_navigation: record.ui_navigation,
            internal_control: record.internal_control,
            integration_design: record.integration_design,
            created_by: user.id,
            created_at: now,
            updated_at: now,
          })
          .select()
          .single();
        const data = assertSupabaseOk(insertRes, 'Gagal menyimpan desain sistem baru');

        if (data) {
          record = { ...record, ...data, created_by_name: user.fullName };
        }
      }

      try {
        const auditRes = await client.from('audit_logs').insert({
          actor_profile_id: user.id,
          application_id: applicationId,
          action: 'LIFECYCLE_DESIGN_UPDATED',
          entity_type: 'design_records',
          entity_id: record.id,
          new_data: dto,
          created_at: now,
        });
        if (auditRes?.error) {
          this.logger.warn(`Gagal mencatat audit log desain: ${auditRes.error.message}`);
        }
      } catch (auditErr) {
        this.logger.warn(`Gagal mencatat audit log desain: ${auditErr}`);
      }
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      if (!isInMemoryFallbackAllowed()) {
        throw new InternalServerErrorException('Gagal menyimpan desain sistem.');
      }
    }

    if (isInMemoryFallbackAllowed()) {
      this.inMemoryDesign.set(applicationId, record);
    }
    return record;
  }

  // ------------------------------------------------------------
  // 4. IMPLEMENTATION
  // ------------------------------------------------------------
  async getImplementation(
    applicationId: string,
    user: AuthenticatedUser,
  ): Promise<ImplementationRecord | null> {
    await this.assertLifecycleAccess(applicationId, user);

    try {
      const client = this.supabaseService.getClient();
      const { data, error } = await client
        .from('implementation_records')
        .select(`
          *,
          created_by_profile:created_by (full_name)
        `)
        .eq('application_id', applicationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          application_id: data.application_id,
          software_dev_records: data.software_dev_records,
          database_implementation: data.database_implementation,
          quality_control: data.quality_control,
          installation_config: data.installation_config,
          api_interoperability: data.api_interoperability,
          documentation_notes: data.documentation_notes,
          knowledge_transfer: data.knowledge_transfer,
          handover_notes: data.handover_notes,
          created_by: data.created_by,
          created_by_name: data.created_by_profile?.full_name || null,
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
      }
    } catch {
      // fallback
    }

    return this.inMemoryImplementation.get(applicationId) || null;
  }

  async upsertImplementation(
    applicationId: string,
    dto: UpsertImplementationDto,
    user: AuthenticatedUser,
  ): Promise<ImplementationRecord> {
    await this.assertLifecycleAccess(applicationId, user);

    const now = new Date().toISOString();
    const existing = this.inMemoryImplementation.get(applicationId);

    let record: ImplementationRecord = {
      id: existing?.id || crypto.randomUUID(),
      application_id: applicationId,
      software_dev_records: dto.software_dev_records ?? existing?.software_dev_records ?? null,
      database_implementation: dto.database_implementation ?? existing?.database_implementation ?? null,
      quality_control: dto.quality_control ?? existing?.quality_control ?? null,
      installation_config: dto.installation_config ?? existing?.installation_config ?? null,
      api_interoperability: dto.api_interoperability ?? existing?.api_interoperability ?? null,
      documentation_notes: dto.documentation_notes ?? existing?.documentation_notes ?? null,
      knowledge_transfer: dto.knowledge_transfer ?? existing?.knowledge_transfer ?? null,
      handover_notes: dto.handover_notes ?? existing?.handover_notes ?? null,
      created_by: existing?.created_by || user.id,
      created_by_name: existing?.created_by_name || user.fullName,
      created_at: existing?.created_at || now,
      updated_at: now,
    };

    try {
      const client = this.supabaseService.getClient();
      const currentDb = await this.getImplementation(applicationId, user);

      if (currentDb) {
        const updateRes = await client
          .from('implementation_records')
          .update({
            software_dev_records: record.software_dev_records,
            database_implementation: record.database_implementation,
            quality_control: record.quality_control,
            installation_config: record.installation_config,
            api_interoperability: record.api_interoperability,
            documentation_notes: record.documentation_notes,
            knowledge_transfer: record.knowledge_transfer,
            handover_notes: record.handover_notes,
            updated_at: now,
          })
          .eq('id', currentDb.id)
          .select()
          .single();
        const data = assertSupabaseOk(updateRes, 'Gagal memperbarui implementasi sistem');

        if (data) {
          record = { ...record, ...data, created_by_name: user.fullName };
        }
      } else {
        const insertRes = await client
          .from('implementation_records')
          .insert({
            id: record.id,
            application_id: applicationId,
            software_dev_records: record.software_dev_records,
            database_implementation: record.database_implementation,
            quality_control: record.quality_control,
            installation_config: record.installation_config,
            api_interoperability: record.api_interoperability,
            documentation_notes: record.documentation_notes,
            knowledge_transfer: record.knowledge_transfer,
            handover_notes: record.handover_notes,
            created_by: user.id,
            created_at: now,
            updated_at: now,
          })
          .select()
          .single();
        const data = assertSupabaseOk(insertRes, 'Gagal menyimpan implementasi sistem baru');

        if (data) {
          record = { ...record, ...data, created_by_name: user.fullName };
        }
      }

      try {
        const auditRes = await client.from('audit_logs').insert({
          actor_profile_id: user.id,
          application_id: applicationId,
          action: 'LIFECYCLE_IMPLEMENTATION_UPDATED',
          entity_type: 'implementation_records',
          entity_id: record.id,
          new_data: dto,
          created_at: now,
        });
        if (auditRes?.error) {
          this.logger.warn(`Gagal mencatat audit log implementasi: ${auditRes.error.message}`);
        }
      } catch (auditErr) {
        this.logger.warn(`Gagal mencatat audit log implementasi: ${auditErr}`);
      }
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      if (!isInMemoryFallbackAllowed()) {
        throw new InternalServerErrorException('Gagal menyimpan implementasi sistem.');
      }
    }

    if (isInMemoryFallbackAllowed()) {
      this.inMemoryImplementation.set(applicationId, record);
    }
    return record;
  }

  // ------------------------------------------------------------
  // ATTACHMENT HELPERS
  // ------------------------------------------------------------
  private async uploadAttachmentIfPresent(
    applicationId: string,
    subfolder: string,
    base64?: string,
    filename?: string,
  ): Promise<{ path: string | null; name: string | null }> {
    if (!base64 || !filename) return { path: null, name: null };
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `evidence/${subfolder}/${applicationId}/${crypto.randomUUID()}_${safeName}`;
    try {
      const client = this.supabaseService.getClient();
      const buffer = Buffer.from(base64, 'base64');
      await client.storage.from('simantik-documents').upload(storagePath, buffer, {
        upsert: true,
      });
      return { path: storagePath, name: filename };
    } catch {
      return { path: storagePath, name: filename };
    }
  }

  private async createSignedUrlForAttachment(
    storagePath: string,
    filename: string,
    user: AuthenticatedUser,
    action: string,
  ): Promise<{ signed_url: string; expires_in: number; filename: string }> {
    const expiresInSeconds = 900; // 15 menit
    let signedUrl = `https://mock-storage.simantik.bandungkab.go.id/signed/${storagePath}?token=${crypto.randomUUID()}&expires=${Date.now() + expiresInSeconds * 1000}`;

    try {
      const client = this.supabaseService.getClient();
      const { data, error } = await client.storage
        .from('simantik-documents')
        .createSignedUrl(storagePath, expiresInSeconds);

      if (!error && data?.signedUrl) {
        signedUrl = data.signedUrl;
      }

      await client.from('audit_logs').insert({
        actor_profile_id: user.id,
        action,
        new_data: { filename, storage_path: storagePath },
      });
    } catch {
      // Fallback
    }

    return {
      signed_url: signedUrl,
      expires_in: expiresInSeconds,
      filename,
    };
  }

  // ------------------------------------------------------------
  // 5. TESTING (Uji Kelaikan)
  // Dimensions: FUNCTION, INTEGRATION, LOAD, SECURITY
  // ------------------------------------------------------------
  async getTests(
    applicationId: string,
    user: AuthenticatedUser,
    filters?: { type?: TestType; test_type?: TestType; result?: TestResult },
  ): Promise<TestRecordItem[]> {
    await this.assertLifecycleAccess(applicationId, user);

    let items: TestRecordItem[] = [];

    try {
      const client = this.supabaseService.getClient();
      let q = client
        .from('test_records')
        .select(`
          *,
          tested_by_profile:tested_by (full_name)
        `)
        .eq('application_id', applicationId);

      const targetType = filters?.type || filters?.test_type;
      if (targetType) {
        q = q.eq('test_type', targetType);
      }
      if (filters?.result) {
        q = q.eq('result', filters.result);
      }

      const { data, error } = await q.order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        items = data.map((t) => ({
          id: t.id,
          application_id: t.application_id,
          test_type: t.test_type,
          test_name: t.test_name,
          test_scope: t.test_scope,
          test_criteria: t.test_criteria,
          test_scenario: t.test_scenario,
          expected_result: t.expected_result,
          actual_result: t.actual_result,
          result: t.result,
          findings: t.findings,
          corrective_action: t.corrective_action,
          tested_by: t.tested_by,
          tested_by_name: t.tested_by_profile?.full_name || null,
          tester: t.tested_by_profile?.full_name || null,
          tested_at: t.tested_at,
          testing_time: t.tested_at,
          attachment_path: t.attachment_path || null,
          attachment_filename: t.attachment_filename || null,
          created_at: t.created_at,
          updated_at: t.updated_at,
        }));
      }
    } catch {
      // fallback
    }

    if (items.length === 0) {
      items = this.inMemoryTests.get(applicationId) || [];
      const targetType = filters?.type || filters?.test_type;
      if (targetType) {
        items = items.filter((t) => t.test_type === targetType);
      }
      if (filters?.result) {
        items = items.filter((t) => t.result === filters.result);
      }
    }

    return items;
  }

  async getTest(
    applicationId: string,
    testId: string,
    user: AuthenticatedUser,
  ): Promise<TestRecordItem> {
    await this.assertLifecycleAccess(applicationId, user);
    const tests = await this.getTests(applicationId, user);
    const test = tests.find((t) => t.id === testId);
    if (!test) {
      throw new NotFoundException(`Catatan pengujian dengan ID [${testId}] tidak ditemukan.`);
    }
    return test;
  }

  async createTest(
    applicationId: string,
    dto: CreateTestRecordDto,
    user: AuthenticatedUser,
  ): Promise<TestRecordItem> {
    await this.assertLifecycleAccess(applicationId, user);

    if (!dto.test_name?.trim()) {
      throw new BadRequestException('Nama pengujian (test_name) wajib diisi.');
    }

    const base64Attachment = dto.base64_attachment || dto.attachment_base64;
    const attachmentName = dto.attachment_name || dto.attachment_filename;
    const { path: attachPath, name: attachName } = await this.uploadAttachmentIfPresent(
      applicationId,
      'tests',
      base64Attachment,
      attachmentName,
    );

    const now = new Date().toISOString();
    const testerName = (dto.tester || user.fullName || 'Petugas Penguji').trim();
    const testingTime = dto.testing_time || dto.tested_at || now;

    let record: TestRecordItem = {
      id: crypto.randomUUID(),
      application_id: applicationId,
      test_type: dto.test_type,
      test_name: dto.test_name.trim(),
      test_scope: dto.test_scope || null,
      test_criteria: dto.test_criteria || null,
      test_scenario: dto.test_scenario || null,
      expected_result: dto.expected_result || null,
      actual_result: dto.actual_result || null,
      result: dto.result || null,
      findings: dto.findings || null,
      corrective_action: dto.corrective_action || null,
      tested_by: user.id,
      tested_by_name: testerName,
      tester: testerName,
      tested_at: testingTime,
      testing_time: testingTime,
      attachment_path: attachPath,
      attachment_filename: attachName,
      created_at: now,
      updated_at: now,
    };

    try {
      const client = this.supabaseService.getClient();
      const insertRes = await client
        .from('test_records')
        .insert({
          id: record.id,
          application_id: applicationId,
          test_type: record.test_type,
          test_name: record.test_name,
          test_scope: record.test_scope,
          test_criteria: record.test_criteria,
          test_scenario: record.test_scenario,
          expected_result: record.expected_result,
          actual_result: record.actual_result,
          result: record.result,
          findings: record.findings,
          corrective_action: record.corrective_action,
          tested_by: user.id,
          tested_at: record.tested_at,
          attachment_path: record.attachment_path,
          attachment_filename: record.attachment_filename,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (insertRes?.error) {
        if (attachPath) {
          try {
            await client.storage.from('simantik-documents').remove([attachPath]);
          } catch (storageErr) {
            this.logger.warn(`Gagal menghapus berkas lampiran test setelah DB insert gagal: ${storageErr}`);
          }
        }
        assertSupabaseOk(insertRes, 'Gagal menyimpan catatan pengujian');
      }

      const data = insertRes.data;
      if (data) {
        record = {
          ...record,
          ...data,
          tested_by_name: testerName,
          tester: testerName,
          testing_time: testingTime,
        };
      }

      try {
        const auditRes = await client.from('audit_logs').insert({
          actor_profile_id: user.id,
          application_id: applicationId,
          action: 'LIFECYCLE_TEST_RECORD_CREATED',
          entity_type: 'test_records',
          entity_id: record.id,
          new_data: { test_type: dto.test_type, test_name: dto.test_name, result: dto.result },
          created_at: now,
        });
        if (auditRes?.error) {
          this.logger.warn(`Gagal mencatat audit log test: ${auditRes.error.message}`);
        }
      } catch (auditErr) {
        this.logger.warn(`Gagal mencatat audit log test: ${auditErr}`);
      }
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      if (!isInMemoryFallbackAllowed()) {
        throw new InternalServerErrorException('Gagal menyimpan catatan pengujian.');
      }
    }

    if (isInMemoryFallbackAllowed()) {
      const list = this.inMemoryTests.get(applicationId) || [];
      list.unshift(record);
      this.inMemoryTests.set(applicationId, list);
    }
    return record;
  }

  async updateTest(
    applicationId: string,
    testId: string,
    dto: UpdateTestRecordDto,
    user: AuthenticatedUser,
  ): Promise<TestRecordItem> {
    await this.assertLifecycleAccess(applicationId, user);
    const existing = await this.getTest(applicationId, testId, user);

    let attachPath = existing.attachment_path;
    let attachName = existing.attachment_filename;
    const base64Attachment = dto.base64_attachment || dto.attachment_base64;
    const attachmentName = dto.attachment_name || dto.attachment_filename;
    if (base64Attachment && attachmentName) {
      const uploaded = await this.uploadAttachmentIfPresent(
        applicationId,
        'tests',
        base64Attachment,
        attachmentName,
      );
      attachPath = uploaded.path;
      attachName = uploaded.name;
    }

    const now = new Date().toISOString();
    const testerName = (dto.tester ?? existing.tester ?? existing.tested_by_name ?? user.fullName)?.trim();
    const testingTime = dto.testing_time ?? dto.tested_at ?? existing.testing_time ?? existing.tested_at;

    let updated: TestRecordItem = {
      ...existing,
      test_type: dto.test_type ?? existing.test_type,
      test_name: dto.test_name?.trim() ?? existing.test_name,
      test_scope: dto.test_scope ?? existing.test_scope,
      test_criteria: dto.test_criteria ?? existing.test_criteria,
      test_scenario: dto.test_scenario ?? existing.test_scenario,
      expected_result: dto.expected_result ?? existing.expected_result,
      actual_result: dto.actual_result ?? existing.actual_result,
      result: dto.result ?? existing.result,
      findings: dto.findings ?? existing.findings,
      corrective_action: dto.corrective_action ?? existing.corrective_action,
      tested_at: testingTime,
      testing_time: testingTime,
      tested_by_name: testerName,
      tester: testerName,
      attachment_path: attachPath,
      attachment_filename: attachName,
      updated_at: now,
    };

    try {
      const client = this.supabaseService.getClient();
      const updateRes = await client
        .from('test_records')
        .update({
          test_type: updated.test_type,
          test_name: updated.test_name,
          test_scope: updated.test_scope,
          test_criteria: updated.test_criteria,
          test_scenario: updated.test_scenario,
          expected_result: updated.expected_result,
          actual_result: updated.actual_result,
          result: updated.result,
          findings: updated.findings,
          corrective_action: updated.corrective_action,
          tested_at: updated.tested_at,
          attachment_path: updated.attachment_path,
          attachment_filename: updated.attachment_filename,
          updated_at: now,
        })
        .eq('id', testId)
        .select()
        .single();

      if (updateRes?.error) {
        if (attachPath && attachPath !== existing.attachment_path) {
          try {
            await client.storage.from('simantik-documents').remove([attachPath]);
          } catch (storageErr) {
            this.logger.warn(`Gagal menghapus berkas lampiran test setelah DB update gagal: ${storageErr}`);
          }
        }
        assertSupabaseOk(updateRes, 'Gagal memperbarui catatan pengujian');
      }

      const data = updateRes.data;
      if (data) {
        updated = {
          ...updated,
          ...data,
          tested_by_name: testerName,
          tester: testerName,
          testing_time: testingTime,
        };
      }

      try {
        const auditRes = await client.from('audit_logs').insert({
          actor_profile_id: user.id,
          application_id: applicationId,
          action: 'LIFECYCLE_TEST_RECORD_UPDATED',
          entity_type: 'test_records',
          entity_id: testId,
          new_data: dto,
          created_at: now,
        });
        if (auditRes?.error) {
          this.logger.warn(`Gagal mencatat audit log test update: ${auditRes.error.message}`);
        }
      } catch (auditErr) {
        this.logger.warn(`Gagal mencatat audit log test update: ${auditErr}`);
      }
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      if (!isInMemoryFallbackAllowed()) {
        throw new InternalServerErrorException('Gagal memperbarui catatan pengujian.');
      }
    }

    if (isInMemoryFallbackAllowed()) {
      const list = this.inMemoryTests.get(applicationId) || [];
      const idx = list.findIndex((t) => t.id === testId);
      if (idx >= 0) list[idx] = updated;
      this.inMemoryTests.set(applicationId, list);
    }
    return updated;
  }

  async deleteTest(
    applicationId: string,
    testId: string,
    user: AuthenticatedUser,
  ): Promise<void> {
    await this.assertLifecycleAccess(applicationId, user);
    const existing = await this.getTest(applicationId, testId, user).catch(() => null);

    try {
      const client = this.supabaseService.getClient();
      const deleteRes = await client
        .from('test_records')
        .delete()
        .eq('id', testId)
        .eq('application_id', applicationId);
      assertSupabaseOk(deleteRes, 'Gagal menghapus catatan pengujian');

      if (existing?.attachment_path) {
        try {
          await client.storage.from('simantik-documents').remove([existing.attachment_path]);
        } catch (storageErr) {
          this.logger.warn(`Gagal menghapus berkas lampiran test dari storage: ${storageErr}`);
        }
      }

      try {
        await client.from('audit_logs').insert({
          actor_profile_id: user.id,
          application_id: applicationId,
          action: 'LIFECYCLE_TEST_DELETED',
          entity_type: 'test_records',
          entity_id: testId,
          old_data: existing
            ? {
                test_name: existing.test_name,
                test_type: existing.test_type,
                result: existing.result,
                attachment_path: existing.attachment_path,
              }
            : null,
          created_at: new Date().toISOString(),
        });
      } catch (auditErr) {
        this.logger.warn(`Gagal mencatat audit log delete test: ${auditErr}`);
      }
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      if (!isInMemoryFallbackAllowed()) {
        throw new InternalServerErrorException('Gagal menghapus catatan pengujian.');
      }
    }

    if (isInMemoryFallbackAllowed()) {
      const list = this.inMemoryTests.get(applicationId) || [];
      this.inMemoryTests.set(
        applicationId,
        list.filter((t) => t.id !== testId),
      );
    }
  }

  async getTestAttachmentUrl(
    applicationId: string,
    testId: string,
    user: AuthenticatedUser,
  ): Promise<{ signed_url: string; expires_in: number; filename: string }> {
    const test = await this.getTest(applicationId, testId, user);
    if (!test.attachment_path) {
      throw new NotFoundException('Tidak ada berkas bukti uji kelaikan yang dilampirkan.');
    }
    return this.createSignedUrlForAttachment(
      test.attachment_path,
      test.attachment_filename || 'bukti_pengujian.pdf',
      user,
      'LIFECYCLE_TEST_ATTACHMENT_ACCESSED',
    );
  }

  // ------------------------------------------------------------
  // 6. MAINTENANCE (Pemeliharaan)
  // Types: PERFECTIVE, ADAPTIVE, CORRECTIVE, PREVENTIVE
  // ------------------------------------------------------------
  async getMaintenanceRecords(
    applicationId: string,
    user: AuthenticatedUser,
    filters?: { type?: MaintenanceType; maintenance_type?: MaintenanceType },
  ): Promise<MaintenanceRecordItem[]> {
    await this.assertLifecycleAccess(applicationId, user);

    const targetType = filters?.type || filters?.maintenance_type;
    let items: MaintenanceRecordItem[] = [];

    try {
      const client = this.supabaseService.getClient();
      let q = client
        .from('maintenance_records')
        .select(`
          *,
          performed_by_profile:performed_by (full_name)
        `)
        .eq('application_id', applicationId);

      if (targetType) {
        q = q.eq('maintenance_type', targetType);
      }

      const { data, error } = await q.order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        items = data.map((m) => {
          const executor = m.performed_by_profile?.full_name || null;
          return {
            id: m.id,
            application_id: m.application_id,
            maintenance_type: m.maintenance_type,
            title: m.title,
            description: m.description,
            reason: m.reason,
            action_taken: m.action_taken,
            action: m.action_taken,
            result: m.result,
            started_at: m.started_at,
            start: m.started_at,
            completed_at: m.completed_at,
            end: m.completed_at,
            performed_by: m.performed_by,
            performed_by_name: executor,
            executor,
            attachment_path: m.attachment_path || null,
            attachment_filename: m.attachment_filename || null,
            created_at: m.created_at,
            updated_at: m.updated_at,
          };
        });
      }
    } catch {
      // fallback
    }

    if (items.length === 0) {
      items = this.inMemoryMaintenance.get(applicationId) || [];
      if (targetType) {
        items = items.filter((m) => m.maintenance_type === targetType);
      }
    }

    return items;
  }

  async getMaintenanceRecord(
    applicationId: string,
    recordId: string,
    user: AuthenticatedUser,
  ): Promise<MaintenanceRecordItem> {
    await this.assertLifecycleAccess(applicationId, user);
    const records = await this.getMaintenanceRecords(applicationId, user);
    const rec = records.find((m) => m.id === recordId);
    if (!rec) {
      throw new NotFoundException(`Catatan pemeliharaan dengan ID [${recordId}] tidak ditemukan.`);
    }
    return rec;
  }

  async createMaintenanceRecord(
    applicationId: string,
    dto: CreateMaintenanceRecordDto,
    user: AuthenticatedUser,
  ): Promise<MaintenanceRecordItem> {
    await this.assertLifecycleAccess(applicationId, user);

    const title = (dto.title || dto.reason || 'Pemeliharaan Aplikasi').trim();
    if (!title) {
      throw new BadRequestException('Judul atau alasan pemeliharaan wajib diisi.');
    }

    const description = (dto.description || dto.reason || '').trim();
    if (!description && !dto.reason?.trim()) {
      throw new BadRequestException('Deskripsi atau alasan pemeliharaan wajib diisi.');
    }

    const base64Attachment = dto.base64_attachment || dto.attachment_base64;
    const attachmentName = dto.attachment_name || dto.attachment_filename;
    const { path: attachPath, name: attachName } = await this.uploadAttachmentIfPresent(
      applicationId,
      'maintenance',
      base64Attachment,
      attachmentName,
    );

    const now = new Date().toISOString();
    const startTime = dto.start || dto.start_time || dto.started_at || null;
    const endTime = dto.end || dto.end_time || dto.completed_at || now;
    const actionTaken = dto.action || dto.action_taken || null;
    const executorName = (dto.executor || user.fullName || 'Petugas Pemeliharaan').trim();

    let record: MaintenanceRecordItem = {
      id: crypto.randomUUID(),
      application_id: applicationId,
      maintenance_type: dto.maintenance_type,
      title,
      description: description || null,
      reason: dto.reason || null,
      action_taken: actionTaken,
      action: actionTaken,
      result: dto.result || null,
      started_at: startTime,
      start: startTime,
      completed_at: endTime,
      end: endTime,
      performed_by: user.id,
      performed_by_name: executorName,
      executor: executorName,
      attachment_path: attachPath,
      attachment_filename: attachName,
      created_at: now,
      updated_at: now,
    };

    try {
      const client = this.supabaseService.getClient();
      const insertRes = await client
        .from('maintenance_records')
        .insert({
          id: record.id,
          application_id: applicationId,
          maintenance_type: record.maintenance_type,
          title: record.title,
          description: record.description,
          reason: record.reason,
          action_taken: record.action_taken,
          result: record.result,
          started_at: record.started_at,
          completed_at: record.completed_at,
          performed_by: user.id,
          attachment_path: record.attachment_path,
          attachment_filename: record.attachment_filename,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (insertRes?.error) {
        if (attachPath) {
          try {
            await client.storage.from('simantik-documents').remove([attachPath]);
          } catch (storageErr) {
            this.logger.warn(`Gagal menghapus berkas lampiran maintenance setelah DB insert gagal: ${storageErr}`);
          }
        }
        assertSupabaseOk(insertRes, 'Gagal menyimpan catatan pemeliharaan');
      }

      const data = insertRes.data;
      if (data) {
        record = {
          ...record,
          ...data,
          performed_by_name: executorName,
          executor: executorName,
          start: record.started_at,
          end: record.completed_at,
          action: record.action_taken,
        };
      }

      try {
        const auditRes = await client.from('audit_logs').insert({
          actor_profile_id: user.id,
          application_id: applicationId,
          action: 'LIFECYCLE_MAINTENANCE_RECORD_CREATED',
          entity_type: 'maintenance_records',
          entity_id: record.id,
          new_data: { maintenance_type: dto.maintenance_type, title: record.title },
          created_at: now,
        });
        if (auditRes?.error) {
          this.logger.warn(`Gagal mencatat audit log maintenance: ${auditRes.error.message}`);
        }
      } catch (auditErr) {
        this.logger.warn(`Gagal mencatat audit log maintenance: ${auditErr}`);
      }
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      if (!isInMemoryFallbackAllowed()) {
        throw new InternalServerErrorException('Gagal menyimpan catatan pemeliharaan.');
      }
    }

    if (isInMemoryFallbackAllowed()) {
      const list = this.inMemoryMaintenance.get(applicationId) || [];
      list.unshift(record);
      this.inMemoryMaintenance.set(applicationId, list);
    }
    return record;
  }

  async updateMaintenanceRecord(
    applicationId: string,
    recordId: string,
    dto: UpdateMaintenanceRecordDto,
    user: AuthenticatedUser,
  ): Promise<MaintenanceRecordItem> {
    await this.assertLifecycleAccess(applicationId, user);
    const existing = await this.getMaintenanceRecord(applicationId, recordId, user);

    let attachPath = existing.attachment_path;
    let attachName = existing.attachment_filename;
    const base64Attachment = dto.base64_attachment || dto.attachment_base64;
    const attachmentName = dto.attachment_name || dto.attachment_filename;
    if (base64Attachment && attachmentName) {
      const uploaded = await this.uploadAttachmentIfPresent(
        applicationId,
        'maintenance',
        base64Attachment,
        attachmentName,
      );
      attachPath = uploaded.path;
      attachName = uploaded.name;
    }

    const now = new Date().toISOString();
    const startTime = dto.start ?? dto.start_time ?? dto.started_at ?? existing.started_at;
    const endTime = dto.end ?? dto.end_time ?? dto.completed_at ?? existing.completed_at;
    const actionTaken = dto.action ?? dto.action_taken ?? existing.action_taken;
    const executorName = (dto.executor ?? existing.executor ?? existing.performed_by_name ?? user.fullName)?.trim();

    let updated: MaintenanceRecordItem = {
      ...existing,
      maintenance_type: dto.maintenance_type ?? existing.maintenance_type,
      title: dto.title?.trim() ?? existing.title,
      description: dto.description ?? existing.description,
      reason: dto.reason ?? existing.reason,
      action_taken: actionTaken,
      action: actionTaken,
      result: dto.result ?? existing.result,
      started_at: startTime,
      start: startTime,
      completed_at: endTime,
      end: endTime,
      performed_by_name: executorName,
      executor: executorName,
      attachment_path: attachPath,
      attachment_filename: attachName,
      updated_at: now,
    };

    try {
      const client = this.supabaseService.getClient();
      const updateRes = await client
        .from('maintenance_records')
        .update({
          maintenance_type: updated.maintenance_type,
          title: updated.title,
          description: updated.description,
          reason: updated.reason,
          action_taken: updated.action_taken,
          result: updated.result,
          started_at: updated.started_at,
          completed_at: updated.completed_at,
          attachment_path: updated.attachment_path,
          attachment_filename: updated.attachment_filename,
          updated_at: now,
        })
        .eq('id', recordId)
        .select()
        .single();

      if (updateRes?.error) {
        if (attachPath && attachPath !== existing.attachment_path) {
          try {
            await client.storage.from('simantik-documents').remove([attachPath]);
          } catch (storageErr) {
            this.logger.warn(`Gagal menghapus berkas lampiran maintenance setelah DB update gagal: ${storageErr}`);
          }
        }
        assertSupabaseOk(updateRes, 'Gagal memperbarui catatan pemeliharaan');
      }

      const data = updateRes.data;
      if (data) {
        updated = {
          ...updated,
          ...data,
          performed_by_name: executorName,
          executor: executorName,
          start: updated.started_at,
          end: updated.completed_at,
          action: updated.action_taken,
        };
      }

      try {
        const auditRes = await client.from('audit_logs').insert({
          actor_profile_id: user.id,
          application_id: applicationId,
          action: 'LIFECYCLE_MAINTENANCE_RECORD_UPDATED',
          entity_type: 'maintenance_records',
          entity_id: recordId,
          new_data: dto,
          created_at: now,
        });
        if (auditRes?.error) {
          this.logger.warn(`Gagal mencatat audit log maintenance update: ${auditRes.error.message}`);
        }
      } catch (auditErr) {
        this.logger.warn(`Gagal mencatat audit log maintenance update: ${auditErr}`);
      }
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      if (!isInMemoryFallbackAllowed()) {
        throw new InternalServerErrorException('Gagal memperbarui catatan pemeliharaan.');
      }
    }

    if (isInMemoryFallbackAllowed()) {
      const list = this.inMemoryMaintenance.get(applicationId) || [];
      const idx = list.findIndex((m) => m.id === recordId);
      if (idx >= 0) list[idx] = updated;
      this.inMemoryMaintenance.set(applicationId, list);
    }
    return updated;
  }

  async deleteMaintenanceRecord(
    applicationId: string,
    recordId: string,
    user: AuthenticatedUser,
  ): Promise<void> {
    await this.assertLifecycleAccess(applicationId, user);
    const existing = await this.getMaintenanceRecord(applicationId, recordId, user).catch(() => null);

    try {
      const client = this.supabaseService.getClient();
      const deleteRes = await client
        .from('maintenance_records')
        .delete()
        .eq('id', recordId)
        .eq('application_id', applicationId);
      assertSupabaseOk(deleteRes, 'Gagal menghapus catatan pemeliharaan');

      if (existing?.attachment_path) {
        try {
          await client.storage.from('simantik-documents').remove([existing.attachment_path]);
        } catch (storageErr) {
          this.logger.warn(`Gagal menghapus berkas lampiran pemeliharaan dari storage: ${storageErr}`);
        }
      }

      try {
        await client.from('audit_logs').insert({
          actor_profile_id: user.id,
          application_id: applicationId,
          action: 'LIFECYCLE_MAINTENANCE_DELETED',
          entity_type: 'maintenance_records',
          entity_id: recordId,
          old_data: existing
            ? {
                title: existing.title,
                maintenance_type: existing.maintenance_type,
                attachment_path: existing.attachment_path,
              }
            : null,
          created_at: new Date().toISOString(),
        });
      } catch (auditErr) {
        this.logger.warn(`Gagal mencatat audit log delete maintenance: ${auditErr}`);
      }
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      if (!isInMemoryFallbackAllowed()) {
        throw new InternalServerErrorException('Gagal menghapus catatan pemeliharaan.');
      }
    }

    if (isInMemoryFallbackAllowed()) {
      const list = this.inMemoryMaintenance.get(applicationId) || [];
      this.inMemoryMaintenance.set(
        applicationId,
        list.filter((m) => m.id !== recordId),
      );
    }
  }

  async getMaintenanceAttachmentUrl(
    applicationId: string,
    recordId: string,
    user: AuthenticatedUser,
  ): Promise<{ signed_url: string; expires_in: number; filename: string }> {
    const rec = await this.getMaintenanceRecord(applicationId, recordId, user);
    if (!rec.attachment_path) {
      throw new NotFoundException('Tidak ada berkas bukti pemeliharaan yang dilampirkan.');
    }
    return this.createSignedUrlForAttachment(
      rec.attachment_path,
      rec.attachment_filename || 'laporan_pemeliharaan.pdf',
      user,
      'LIFECYCLE_MAINTENANCE_ATTACHMENT_ACCESSED',
    );
  }

  // ------------------------------------------------------------
  // 7. EVALUATION (Evaluasi Pasca Implementasi)
  // ------------------------------------------------------------
  async getEvaluations(
    applicationId: string,
    user: AuthenticatedUser,
  ): Promise<EvaluationRecordItem[]> {
    await this.assertLifecycleAccess(applicationId, user);

    try {
      const client = this.supabaseService.getClient();
      const { data, error } = await client
        .from('evaluations')
        .select(`
          *,
          evaluated_by_profile:evaluated_by (full_name)
        `)
        .eq('application_id', applicationId)
        .order('evaluation_date', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map((e) => {
          const evaluatorName = e.evaluated_by_profile?.full_name || null;
          return {
            id: e.id,
            application_id: e.application_id,
            evaluation_date: e.evaluation_date,
            success_indicator: e.success_indicator,
            success_indicators: e.success_indicator,
            achievement: e.achievement,
            findings: e.findings,
            recommendations: e.recommendations,
            follow_up_plan: e.follow_up_plan,
            follow_up: e.follow_up_plan,
            evaluated_by: e.evaluated_by,
            evaluated_by_name: evaluatorName,
            evaluator: evaluatorName,
            attachment_path: e.attachment_path || null,
            attachment_filename: e.attachment_filename || null,
            created_at: e.created_at,
            updated_at: e.updated_at,
          };
        });
      }
    } catch {
      // fallback
    }

    return this.inMemoryEvaluations.get(applicationId) || [];
  }

  async getEvaluation(
    applicationId: string,
    evalId: string,
    user: AuthenticatedUser,
  ): Promise<EvaluationRecordItem> {
    await this.assertLifecycleAccess(applicationId, user);
    const evals = await this.getEvaluations(applicationId, user);
    const ev = evals.find((e) => e.id === evalId);
    if (!ev) {
      throw new NotFoundException(`Catatan evaluasi dengan ID [${evalId}] tidak ditemukan.`);
    }
    return ev;
  }

  async createEvaluation(
    applicationId: string,
    dto: CreateEvaluationDto,
    user: AuthenticatedUser,
  ): Promise<EvaluationRecordItem> {
    await this.assertLifecycleAccess(applicationId, user);

    if (!dto.evaluation_date || isNaN(Date.parse(dto.evaluation_date))) {
      throw new BadRequestException('Tanggal evaluasi (evaluation_date) wajib diisi dengan format tanggal valid.');
    }

    const base64Attachment = dto.base64_attachment || dto.attachment_base64;
    const attachmentName = dto.attachment_name || dto.attachment_filename;
    const { path: attachPath, name: attachName } = await this.uploadAttachmentIfPresent(
      applicationId,
      'evaluations',
      base64Attachment,
      attachmentName,
    );

    const now = new Date().toISOString();
    const evaluatorName = (dto.evaluator || user.fullName || 'Tim Evaluasi').trim();
    const successIndicators = dto.success_indicators || dto.success_indicator || null;
    const followUpPlan = dto.follow_up || dto.follow_up_plan || null;

    let record: EvaluationRecordItem = {
      id: crypto.randomUUID(),
      application_id: applicationId,
      evaluation_date: dto.evaluation_date,
      success_indicator: successIndicators,
      success_indicators: successIndicators,
      achievement: dto.achievement || null,
      findings: dto.findings || null,
      recommendations: dto.recommendations || null,
      follow_up_plan: followUpPlan,
      follow_up: followUpPlan,
      evaluated_by: user.id,
      evaluated_by_name: evaluatorName,
      evaluator: evaluatorName,
      attachment_path: attachPath,
      attachment_filename: attachName,
      created_at: now,
      updated_at: now,
    };

    try {
      const client = this.supabaseService.getClient();
      const insertRes = await client
        .from('evaluations')
        .insert({
          id: record.id,
          application_id: applicationId,
          evaluation_date: record.evaluation_date,
          success_indicator: record.success_indicator,
          achievement: record.achievement,
          findings: record.findings,
          recommendations: record.recommendations,
          follow_up_plan: record.follow_up_plan,
          evaluated_by: user.id,
          attachment_path: record.attachment_path,
          attachment_filename: record.attachment_filename,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (insertRes?.error) {
        if (attachPath) {
          try {
            await client.storage.from('simantik-documents').remove([attachPath]);
          } catch (storageErr) {
            this.logger.warn(`Gagal menghapus berkas lampiran evaluasi setelah DB insert gagal: ${storageErr}`);
          }
        }
        assertSupabaseOk(insertRes, 'Gagal menyimpan evaluasi');
      }

      const data = insertRes.data;
      if (data) {
        record = {
          ...record,
          ...data,
          evaluated_by_name: evaluatorName,
          evaluator: evaluatorName,
          success_indicators: record.success_indicator,
          follow_up: record.follow_up_plan,
        };
      }

      try {
        const auditRes = await client.from('audit_logs').insert({
          actor_profile_id: user.id,
          application_id: applicationId,
          action: 'LIFECYCLE_EVALUATION_CREATED',
          entity_type: 'evaluations',
          entity_id: record.id,
          new_data: { evaluation_date: dto.evaluation_date, achievement: dto.achievement },
          created_at: now,
        });
        if (auditRes?.error) {
          this.logger.warn(`Gagal mencatat audit log evaluasi: ${auditRes.error.message}`);
        }
      } catch (auditErr) {
        this.logger.warn(`Gagal mencatat audit log evaluasi: ${auditErr}`);
      }
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      if (!isInMemoryFallbackAllowed()) {
        throw new InternalServerErrorException('Gagal menyimpan evaluasi.');
      }
    }

    if (isInMemoryFallbackAllowed()) {
      const list = this.inMemoryEvaluations.get(applicationId) || [];
      list.unshift(record);
      this.inMemoryEvaluations.set(applicationId, list);
    }
    return record;
  }

  async updateEvaluation(
    applicationId: string,
    evalId: string,
    dto: UpdateEvaluationDto,
    user: AuthenticatedUser,
  ): Promise<EvaluationRecordItem> {
    await this.assertLifecycleAccess(applicationId, user);
    const existing = await this.getEvaluation(applicationId, evalId, user);

    let attachPath = existing.attachment_path;
    let attachName = existing.attachment_filename;
    const base64Attachment = dto.base64_attachment || dto.attachment_base64;
    const attachmentName = dto.attachment_name || dto.attachment_filename;
    if (base64Attachment && attachmentName) {
      const uploaded = await this.uploadAttachmentIfPresent(
        applicationId,
        'evaluations',
        base64Attachment,
        attachmentName,
      );
      attachPath = uploaded.path;
      attachName = uploaded.name;
    }

    if (dto.evaluation_date && isNaN(Date.parse(dto.evaluation_date))) {
      throw new BadRequestException('Tanggal evaluasi tidak valid.');
    }

    const now = new Date().toISOString();
    const evaluatorName = (dto.evaluator ?? existing.evaluator ?? existing.evaluated_by_name ?? user.fullName)?.trim();
    const successIndicators = dto.success_indicators ?? dto.success_indicator ?? existing.success_indicator;
    const followUpPlan = dto.follow_up ?? dto.follow_up_plan ?? existing.follow_up_plan;

    let updated: EvaluationRecordItem = {
      ...existing,
      evaluation_date: dto.evaluation_date ?? existing.evaluation_date,
      success_indicator: successIndicators,
      success_indicators: successIndicators,
      achievement: dto.achievement ?? existing.achievement,
      findings: dto.findings ?? existing.findings,
      recommendations: dto.recommendations ?? existing.recommendations,
      follow_up_plan: followUpPlan,
      follow_up: followUpPlan,
      evaluated_by_name: evaluatorName,
      evaluator: evaluatorName,
      attachment_path: attachPath,
      attachment_filename: attachName,
      updated_at: now,
    };

    try {
      const client = this.supabaseService.getClient();
      const updateRes = await client
        .from('evaluations')
        .update({
          evaluation_date: updated.evaluation_date,
          success_indicator: updated.success_indicator,
          achievement: updated.achievement,
          findings: updated.findings,
          recommendations: updated.recommendations,
          follow_up_plan: updated.follow_up_plan,
          attachment_path: updated.attachment_path,
          attachment_filename: updated.attachment_filename,
          updated_at: now,
        })
        .eq('id', evalId)
        .select()
        .single();

      if (updateRes?.error) {
        if (attachPath && attachPath !== existing.attachment_path) {
          try {
            await client.storage.from('simantik-documents').remove([attachPath]);
          } catch (storageErr) {
            this.logger.warn(`Gagal menghapus berkas lampiran evaluasi setelah DB update gagal: ${storageErr}`);
          }
        }
        assertSupabaseOk(updateRes, 'Gagal memperbarui evaluasi');
      }

      const data = updateRes.data;
      if (data) {
        updated = {
          ...updated,
          ...data,
          evaluated_by_name: evaluatorName,
          evaluator: evaluatorName,
          success_indicators: updated.success_indicator,
          follow_up: updated.follow_up_plan,
        };
      }

      try {
        const auditRes = await client.from('audit_logs').insert({
          actor_profile_id: user.id,
          application_id: applicationId,
          action: 'LIFECYCLE_EVALUATION_UPDATED',
          entity_type: 'evaluations',
          entity_id: evalId,
          new_data: dto,
          created_at: now,
        });
        if (auditRes?.error) {
          this.logger.warn(`Gagal mencatat audit log evaluasi update: ${auditRes.error.message}`);
        }
      } catch (auditErr) {
        this.logger.warn(`Gagal mencatat audit log evaluasi update: ${auditErr}`);
      }
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      if (!isInMemoryFallbackAllowed()) {
        throw new InternalServerErrorException('Gagal memperbarui evaluasi.');
      }
    }

    if (isInMemoryFallbackAllowed()) {
      const list = this.inMemoryEvaluations.get(applicationId) || [];
      const idx = list.findIndex((e) => e.id === evalId);
      if (idx >= 0) list[idx] = updated;
      this.inMemoryEvaluations.set(applicationId, list);
    }
    return updated;
  }

  async deleteEvaluation(
    applicationId: string,
    evalId: string,
    user: AuthenticatedUser,
  ): Promise<void> {
    await this.assertLifecycleAccess(applicationId, user);
    const existing = await this.getEvaluation(applicationId, evalId, user).catch(() => null);

    try {
      const client = this.supabaseService.getClient();
      const deleteRes = await client.from('evaluations').delete().eq('id', evalId).eq('application_id', applicationId);
      assertSupabaseOk(deleteRes, 'Gagal menghapus evaluasi');

      if (existing?.attachment_path) {
        try {
          await client.storage.from('simantik-documents').remove([existing.attachment_path]);
        } catch (storageErr) {
          this.logger.warn(`Gagal menghapus berkas lampiran evaluasi dari storage: ${storageErr}`);
        }
      }

      try {
        await client.from('audit_logs').insert({
          actor_profile_id: user.id,
          application_id: applicationId,
          action: 'LIFECYCLE_EVALUATION_DELETED',
          entity_type: 'evaluations',
          entity_id: evalId,
          old_data: existing
            ? {
                evaluation_date: existing.evaluation_date,
                success_indicator: existing.success_indicator,
                findings: existing.findings,
                recommendations: existing.recommendations,
                attachment_path: existing.attachment_path,
              }
            : null,
          created_at: new Date().toISOString(),
        });
      } catch (auditErr) {
        this.logger.warn(`Gagal mencatat audit log delete evaluation: ${auditErr}`);
      }
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      if (!isInMemoryFallbackAllowed()) {
        throw new InternalServerErrorException('Gagal menghapus evaluasi.');
      }
    }

    if (isInMemoryFallbackAllowed()) {
      const list = this.inMemoryEvaluations.get(applicationId) || [];
      this.inMemoryEvaluations.set(
        applicationId,
        list.filter((e) => e.id !== evalId),
      );
    }
  }

  async getEvaluationAttachmentUrl(
    applicationId: string,
    evalId: string,
    user: AuthenticatedUser,
  ): Promise<{ signed_url: string; expires_in: number; filename: string }> {
    const ev = await this.getEvaluation(applicationId, evalId, user);
    if (!ev.attachment_path) {
      throw new NotFoundException('Tidak ada berkas dokumen evaluasi yang dilampirkan.');
    }
    return this.createSignedUrlForAttachment(
      ev.attachment_path,
      ev.attachment_filename || 'laporan_evaluasi.pdf',
      user,
      'LIFECYCLE_EVALUATION_ATTACHMENT_ACCESSED',
    );
  }

  // ------------------------------------------------------------
  // 8. TECHNICAL DOCUMENTS
  // ------------------------------------------------------------
  async getTechnicalDocuments(
    applicationId: string,
    user: AuthenticatedUser,
  ): Promise<TechnicalDocumentItem[]> {
    await this.assertLifecycleAccess(applicationId, user);

    try {
      const client = this.supabaseService.getClient();
      const { data, error } = await client
        .from('technical_documents')
        .select(`
          *,
          uploaded_by_profile:uploaded_by (full_name)
        `)
        .eq('application_id', applicationId)
        .order('uploaded_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map((d) => ({
          id: d.id,
          application_id: d.application_id,
          document_type: d.document_type,
          title: d.title,
          description: d.description,
          storage_path: d.storage_path,
          original_filename: d.original_filename,
          mime_type: d.mime_type,
          size_bytes: Number(d.size_bytes),
          version: d.version,
          is_current: d.is_current,
          uploaded_by: d.uploaded_by,
          uploaded_by_name: d.uploaded_by_profile?.full_name || null,
          uploaded_at: d.uploaded_at,
        }));
      }
    } catch {
      // fallback
    }

    return this.inMemoryTechnicalDocs.get(applicationId) || [];
  }

  async uploadTechnicalDocument(
    applicationId: string,
    dto: UploadTechnicalDocumentDto,
    user: AuthenticatedUser,
  ): Promise<TechnicalDocumentItem> {
    await this.assertLifecycleAccess(applicationId, user);

    if (!dto.title?.trim() || !dto.original_filename?.trim()) {
      throw new BadRequestException('Judul dokumen dan nama berkas wajib diisi.');
    }

    const docId = crypto.randomUUID();
    const storagePath = `technical/${applicationId}/${docId}_${dto.original_filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const now = new Date().toISOString();

    let record: TechnicalDocumentItem = {
      id: docId,
      application_id: applicationId,
      document_type: dto.document_type,
      title: dto.title.trim(),
      description: dto.description || null,
      storage_path: storagePath,
      original_filename: dto.original_filename,
      mime_type: dto.mime_type || 'application/pdf',
      size_bytes: dto.size_bytes || 0,
      version: 1,
      is_current: true,
      uploaded_by: user.id,
      uploaded_by_name: user.fullName,
      uploaded_at: now,
    };

    let uploadedStoragePath: string | null = null;
    try {
      const client = this.supabaseService.getClient();

      // If base64 payload provided, upload to private bucket simantik-documents
      if (dto.base64_data) {
        const buffer = Buffer.from(dto.base64_data, 'base64');
        const uploadRes = await client.storage
          .from('simantik-documents')
          .upload(storagePath, buffer, {
            contentType: dto.mime_type || 'application/pdf',
            upsert: true,
          });
        if (!uploadRes?.error) {
          uploadedStoragePath = storagePath;
        }
      }

      const insertRes = await client
        .from('technical_documents')
        .insert({
          id: docId,
          application_id: applicationId,
          document_type: dto.document_type,
          title: dto.title.trim(),
          description: dto.description || null,
          storage_path: storagePath,
          original_filename: dto.original_filename,
          mime_type: dto.mime_type || 'application/pdf',
          size_bytes: dto.size_bytes || 0,
          version: 1,
          is_current: true,
          uploaded_by: user.id,
          uploaded_at: now,
        })
        .select()
        .single();

      if (insertRes?.error) {
        if (uploadedStoragePath) {
          try {
            await client.storage.from('simantik-documents').remove([uploadedStoragePath]);
            uploadedStoragePath = null;
          } catch (storageErr) {
            this.logger.warn(`Gagal menghapus berkas dokumen teknis setelah DB insert gagal: ${storageErr}`);
          }
        }
        assertSupabaseOk(insertRes, 'Gagal menyimpan dokumen teknis');
      }

      const data = insertRes.data;
      if (data) {
        record = { ...record, ...data, uploaded_by_name: user.fullName };
      }

      try {
        const auditRes = await client.from('audit_logs').insert({
          actor_profile_id: user.id,
          application_id: applicationId,
          action: 'TECHNICAL_DOCUMENT_UPLOADED',
          entity_type: 'technical_documents',
          entity_id: docId,
          new_data: {
            title: dto.title,
            document_type: dto.document_type,
            original_filename: dto.original_filename,
          },
          created_at: now,
        });
        if (auditRes?.error) {
          this.logger.warn(`Gagal mencatat audit log dokumen teknis: ${auditRes.error.message}`);
        }
      } catch (auditErr) {
        this.logger.warn(`Gagal mencatat audit log dokumen teknis: ${auditErr}`);
      }
    } catch (err) {
      if (uploadedStoragePath) {
        try {
          const client = this.supabaseService.getClient();
          await client.storage.from('simantik-documents').remove([uploadedStoragePath]);
        } catch {
          // ignore
        }
      }
      if (err instanceof HttpException) {
        throw err;
      }
      if (!isInMemoryFallbackAllowed()) {
        throw new InternalServerErrorException('Gagal mengunggah dokumen teknis.');
      }
    }

    if (isInMemoryFallbackAllowed()) {
      const list = this.inMemoryTechnicalDocs.get(applicationId) || [];
      list.unshift(record);
      this.inMemoryTechnicalDocs.set(applicationId, list);
    }
    return record;
  }

  async getTechnicalDocumentDownloadUrl(
    applicationId: string,
    docId: string,
    user: AuthenticatedUser,
  ): Promise<{ signed_url: string; expires_in: number; filename: string }> {
    await this.assertLifecycleAccess(applicationId, user);

    const docs = await this.getTechnicalDocuments(applicationId, user);
    const doc = docs.find((d) => d.id === docId);

    if (!doc) {
      throw new NotFoundException(`Dokumen teknis dengan ID [${docId}] tidak ditemukan.`);
    }

    const expiresInSeconds = 900; // 15 menit
    let signedUrl = `https://mock-storage.simantik.bandungkab.go.id/signed/${doc.storage_path}?token=${crypto.randomUUID()}&expires=${Date.now() + expiresInSeconds * 1000}`;

    try {
      const client = this.supabaseService.getClient();
      const { data, error } = await client.storage
        .from('simantik-documents')
        .createSignedUrl(doc.storage_path, expiresInSeconds);

      if (!error && data?.signedUrl) {
        signedUrl = data.signedUrl;
      }

      await client.from('audit_logs').insert({
        actor_profile_id: user.id,
        application_id: applicationId,
        action: 'TECHNICAL_DOCUMENT_ACCESSED',
        entity_type: 'technical_documents',
        entity_id: doc.id,
        new_data: { filename: doc.original_filename, storage_path: doc.storage_path },
      });
    } catch {
      // Fallback
    }

    return {
      signed_url: signedUrl,
      expires_in: expiresInSeconds,
      filename: doc.original_filename,
    };
  }

  async deleteTechnicalDocument(
    applicationId: string,
    docId: string,
    user: AuthenticatedUser,
  ): Promise<void> {
    await this.assertLifecycleAccess(applicationId, user);
    const docs = await this.getTechnicalDocuments(applicationId, user).catch(() => []);
    const existing = docs.find((d) => d.id === docId) || null;

    try {
      const client = this.supabaseService.getClient();
      const deleteRes = await client.from('technical_documents').delete().eq('id', docId).eq('application_id', applicationId);
      assertSupabaseOk(deleteRes, 'Gagal menghapus dokumen teknis');

      if (existing?.storage_path) {
        try {
          await client.storage.from('simantik-documents').remove([existing.storage_path]);
        } catch (storageErr) {
          this.logger.warn(`Gagal menghapus berkas dokumen teknis dari storage: ${storageErr}`);
        }
      }

      try {
        await client.from('audit_logs').insert({
          actor_profile_id: user.id,
          application_id: applicationId,
          action: 'LIFECYCLE_TECHNICAL_DOCUMENT_DELETED',
          entity_type: 'technical_documents',
          entity_id: docId,
          old_data: existing
            ? {
                title: existing.title,
                document_type: existing.document_type,
                original_filename: existing.original_filename,
                storage_path: existing.storage_path,
              }
            : null,
          created_at: new Date().toISOString(),
        });
      } catch (auditErr) {
        this.logger.warn(`Gagal mencatat audit log delete technical document: ${auditErr}`);
      }
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      if (!isInMemoryFallbackAllowed()) {
        throw new InternalServerErrorException('Gagal menghapus dokumen teknis.');
      }
    }

    if (isInMemoryFallbackAllowed()) {
      const list = this.inMemoryTechnicalDocs.get(applicationId) || [];
      this.inMemoryTechnicalDocs.set(
        applicationId,
        list.filter((d) => d.id !== docId),
      );
    }
  }
}
