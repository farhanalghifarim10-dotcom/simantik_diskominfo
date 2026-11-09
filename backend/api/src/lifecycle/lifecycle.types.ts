import type { ApplicationStage, ApplicationStatus } from '../applications/workflow/workflow.types.js';

export type TechnicalDocumentType =
  | 'REQUIREMENTS'
  | 'ARCHITECTURE'
  | 'DESIGN'
  | 'API'
  | 'DATABASE'
  | 'INSTALLATION'
  | 'USER_MANUAL'
  | 'TROUBLESHOOTING'
  | 'OTHER';

export type TestType = 'FUNCTION' | 'INTEGRATION' | 'LOAD' | 'SECURITY';
export type TestResult = 'PASS' | 'FAIL' | 'PASS_WITH_NOTES';

export type MaintenanceType =
  | 'PERFECTIVE'
  | 'ADAPTIVE'
  | 'CORRECTIVE'
  | 'PREVENTIVE';

export interface AnalysisRecord {
  id: string;
  application_id: string;
  problems: string | null;
  needs: string | null;
  stakeholders: string | null;
  objectives: string | null;
  scope: string | null;
  risks: string | null;
  target_users: string | null;
  target_timeline: string | null;
  target_location: string | null;
  supporting_analysis: string | null;
  created_by?: string | null;
  created_by_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpsertAnalysisDto {
  problems?: string;
  needs?: string;
  stakeholders?: string;
  objectives?: string;
  scope?: string;
  risks?: string;
  target_users?: string;
  target_timeline?: string;
  target_location?: string;
  supporting_analysis?: string;
}

export interface ProjectPlanRecord {
  id: string;
  application_id: string;
  scope: string | null;
  business_process: string | null;
  technical_approach: string | null;
  executor: string | null;
  roles_and_responsibilities: string | null;
  planned_start_date: string | null;
  planned_end_date: string | null;
  security_plan: string | null;
  resource_plan: string | null;
  success_indicators: string | null;
  knowledge_transfer_plan: string | null;
  monitoring_plan: string | null;
  reporting_plan: string | null;
  created_by?: string | null;
  created_by_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpsertProjectPlanDto {
  scope?: string;
  business_process?: string;
  technical_approach?: string;
  executor?: string;
  roles_and_responsibilities?: string;
  planned_start_date?: string;
  planned_end_date?: string;
  security_plan?: string;
  resource_plan?: string;
  success_indicators?: string;
  knowledge_transfer_plan?: string;
  monitoring_plan?: string;
  reporting_plan?: string;
}

export interface DesignRecord {
  id: string;
  application_id: string;
  architecture_model: string | null;
  process_flow: string | null;
  function_mapping: string | null;
  database_mapping: string | null;
  role_access_mapping: string | null;
  ui_navigation: string | null;
  internal_control: string | null;
  integration_design: string | null;
  created_by?: string | null;
  created_by_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpsertDesignDto {
  architecture_model?: string;
  process_flow?: string;
  function_mapping?: string;
  database_mapping?: string;
  role_access_mapping?: string;
  ui_navigation?: string;
  internal_control?: string;
  integration_design?: string;
}

export interface ImplementationRecord {
  id: string;
  application_id: string;
  software_dev_records: string | null;
  database_implementation: string | null;
  quality_control: string | null;
  installation_config: string | null;
  api_interoperability: string | null;
  documentation_notes: string | null;
  knowledge_transfer: string | null;
  handover_notes: string | null;
  created_by?: string | null;
  created_by_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpsertImplementationDto {
  software_dev_records?: string;
  database_implementation?: string;
  quality_control?: string;
  installation_config?: string;
  api_interoperability?: string;
  documentation_notes?: string;
  knowledge_transfer?: string;
  handover_notes?: string;
}

export interface TestRecordItem {
  id: string;
  application_id: string;
  test_type: TestType;
  test_name: string;
  test_scope: string | null;
  test_criteria: string | null;
  test_scenario: string | null;
  expected_result: string | null;
  actual_result: string | null;
  result: TestResult | null;
  findings: string | null;
  corrective_action: string | null;
  tested_by?: string | null;
  tested_by_name?: string | null;
  tester?: string | null;
  tested_at: string | null;
  testing_time?: string | null;
  attachment_path?: string | null;
  attachment_filename?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTestRecordDto {
  test_type: TestType;
  test_name: string;
  test_scope?: string;
  test_criteria?: string;
  test_scenario?: string;
  expected_result?: string;
  actual_result?: string;
  result?: TestResult;
  findings?: string;
  corrective_action?: string;
  tester?: string;
  tested_at?: string;
  testing_time?: string;
  base64_attachment?: string;
  attachment_name?: string;
  attachment_base64?: string;
  attachment_filename?: string;
}

export interface UpdateTestRecordDto {
  test_type?: TestType;
  test_name?: string;
  test_scope?: string;
  test_criteria?: string;
  test_scenario?: string;
  expected_result?: string;
  actual_result?: string;
  result?: TestResult;
  findings?: string;
  corrective_action?: string;
  tester?: string;
  tested_at?: string;
  testing_time?: string;
  base64_attachment?: string;
  attachment_name?: string;
  attachment_base64?: string;
  attachment_filename?: string;
}

export interface MaintenanceRecordItem {
  id: string;
  application_id: string;
  maintenance_type: MaintenanceType;
  title: string;
  description: string | null;
  reason: string | null;
  action_taken: string | null;
  action?: string | null;
  result: string | null;
  started_at: string | null;
  start?: string | null;
  completed_at: string | null;
  end?: string | null;
  performed_by?: string | null;
  performed_by_name?: string | null;
  executor?: string | null;
  attachment_path?: string | null;
  attachment_filename?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateMaintenanceRecordDto {
  maintenance_type: MaintenanceType;
  title?: string;
  description?: string;
  reason?: string;
  action_taken?: string;
  action?: string;
  result?: string;
  started_at?: string;
  start?: string;
  start_time?: string;
  completed_at?: string;
  end?: string;
  end_time?: string;
  executor?: string;
  base64_attachment?: string;
  attachment_name?: string;
  attachment_base64?: string;
  attachment_filename?: string;
}

export interface UpdateMaintenanceRecordDto {
  maintenance_type?: MaintenanceType;
  title?: string;
  description?: string;
  reason?: string;
  action_taken?: string;
  action?: string;
  result?: string;
  started_at?: string;
  start?: string;
  start_time?: string;
  completed_at?: string;
  end?: string;
  end_time?: string;
  executor?: string;
  base64_attachment?: string;
  attachment_name?: string;
  attachment_base64?: string;
  attachment_filename?: string;
}

export interface EvaluationRecordItem {
  id: string;
  application_id: string;
  evaluation_date: string;
  success_indicator: string | null;
  success_indicators?: string | null;
  achievement: string | null;
  findings: string | null;
  recommendations: string | null;
  follow_up_plan: string | null;
  follow_up?: string | null;
  evaluated_by?: string | null;
  evaluated_by_name?: string | null;
  evaluator?: string | null;
  attachment_path?: string | null;
  attachment_filename?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateEvaluationDto {
  evaluation_date: string;
  success_indicator?: string;
  success_indicators?: string;
  achievement?: string;
  findings?: string;
  recommendations?: string;
  follow_up_plan?: string;
  follow_up?: string;
  evaluator?: string;
  base64_attachment?: string;
  attachment_name?: string;
  attachment_base64?: string;
  attachment_filename?: string;
}

export interface UpdateEvaluationDto {
  evaluation_date?: string;
  success_indicator?: string;
  success_indicators?: string;
  achievement?: string;
  findings?: string;
  recommendations?: string;
  follow_up_plan?: string;
  follow_up?: string;
  evaluator?: string;
  base64_attachment?: string;
  attachment_name?: string;
  attachment_base64?: string;
  attachment_filename?: string;
}

export interface TechnicalDocumentItem {
  id: string;
  application_id: string;
  document_type: TechnicalDocumentType;
  title: string;
  description: string | null;
  storage_path: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  version: number;
  is_current: boolean;
  uploaded_by?: string | null;
  uploaded_by_name?: string | null;
  uploaded_at: string;
}

export interface UploadTechnicalDocumentDto {
  document_type: TechnicalDocumentType;
  title: string;
  description?: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  base64_data?: string;
}

export interface LifecycleOverview {
  application_id: string;
  ticket_number: string;
  title: string;
  current_status: ApplicationStatus;
  current_stage: ApplicationStage | null;
  is_assigned_to_user: boolean;
  user_can_edit: boolean;
  stages_status: {
    ANALYSIS: { has_record: boolean; updated_at: string | null; summary: string | null };
    PLANNING: { has_record: boolean; updated_at: string | null; summary: string | null };
    DESIGN: { has_record: boolean; updated_at: string | null; summary: string | null };
    IMPLEMENTATION: { has_record: boolean; updated_at: string | null; summary: string | null };
    TESTING: { count: number; pass_count: number; fail_count: number; last_tested_at: string | null };
    MAINTENANCE: { count: number; last_performed_at: string | null };
    EVALUATION: { count: number; last_evaluated_at: string | null };
  };
  technical_documents_count: number;
}
