import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import type { ApplicationStage, ApplicationStatus } from '../applications/useAdminApplications';

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

// ------------------------------------------------------------
// 1. ANALYSIS
// ------------------------------------------------------------
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

// ------------------------------------------------------------
// 2. PLANNING (Project Plan)
// ------------------------------------------------------------
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

// ------------------------------------------------------------
// 3. DESIGN
// ------------------------------------------------------------
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

// ------------------------------------------------------------
// 4. IMPLEMENTATION
// ------------------------------------------------------------
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

// ------------------------------------------------------------
// 5. TESTING
// ------------------------------------------------------------
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
  attachment_base64?: string;
  attachment_filename?: string;
}

// ------------------------------------------------------------
// 6. MAINTENANCE
// ------------------------------------------------------------
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
  attachment_base64?: string;
  attachment_filename?: string;
}

// ------------------------------------------------------------
// 7. EVALUATION
// ------------------------------------------------------------
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
  attachment_base64?: string;
  attachment_filename?: string;
}

// ------------------------------------------------------------
// 8. TECHNICAL DOCUMENTS
// ------------------------------------------------------------
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

// ------------------------------------------------------------
// 9. OVERVIEW SUMMARY
// ------------------------------------------------------------
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

// ------------------------------------------------------------
// HOOKS
// ------------------------------------------------------------
export function useLifecycleOverview(applicationId?: string) {
  return useQuery({
    queryKey: ['lifecycle-overview', applicationId],
    queryFn: async () => {
      const res = await apiFetch<{ data: LifecycleOverview }>(
        `/applications/${applicationId}/lifecycle`,
      );
      return res.data;
    },
    enabled: Boolean(applicationId),
  });
}

export function useLifecycleAnalysis(applicationId?: string) {
  return useQuery({
    queryKey: ['lifecycle-analysis', applicationId],
    queryFn: async () => {
      const res = await apiFetch<{ data: AnalysisRecord | null }>(
        `/applications/${applicationId}/lifecycle/analysis`,
      );
      return res.data;
    },
    enabled: Boolean(applicationId),
  });
}

export function useUpsertAnalysis(applicationId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: UpsertAnalysisDto) => {
      const res = await apiFetch<{ data: AnalysisRecord }>(
        `/applications/${applicationId}/lifecycle/analysis`,
        {
          method: 'PUT',
          body: JSON.stringify(dto),
        },
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lifecycle-analysis', applicationId] });
      queryClient.invalidateQueries({ queryKey: ['lifecycle-overview', applicationId] });
    },
  });
}

export function useLifecyclePlanning(applicationId?: string) {
  return useQuery({
    queryKey: ['lifecycle-planning', applicationId],
    queryFn: async () => {
      const res = await apiFetch<{ data: ProjectPlanRecord | null }>(
        `/applications/${applicationId}/lifecycle/planning`,
      );
      return res.data;
    },
    enabled: Boolean(applicationId),
  });
}

export function useUpsertPlanning(applicationId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: UpsertProjectPlanDto) => {
      const res = await apiFetch<{ data: ProjectPlanRecord }>(
        `/applications/${applicationId}/lifecycle/planning`,
        {
          method: 'PUT',
          body: JSON.stringify(dto),
        },
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lifecycle-planning', applicationId] });
      queryClient.invalidateQueries({ queryKey: ['lifecycle-overview', applicationId] });
    },
  });
}

export function useLifecycleDesign(applicationId?: string) {
  return useQuery({
    queryKey: ['lifecycle-design', applicationId],
    queryFn: async () => {
      const res = await apiFetch<{ data: DesignRecord | null }>(
        `/applications/${applicationId}/lifecycle/design`,
      );
      return res.data;
    },
    enabled: Boolean(applicationId),
  });
}

export function useUpsertDesign(applicationId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: UpsertDesignDto) => {
      const res = await apiFetch<{ data: DesignRecord }>(
        `/applications/${applicationId}/lifecycle/design`,
        {
          method: 'PUT',
          body: JSON.stringify(dto),
        },
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lifecycle-design', applicationId] });
      queryClient.invalidateQueries({ queryKey: ['lifecycle-overview', applicationId] });
    },
  });
}

export function useLifecycleImplementation(applicationId?: string) {
  return useQuery({
    queryKey: ['lifecycle-implementation', applicationId],
    queryFn: async () => {
      const res = await apiFetch<{ data: ImplementationRecord | null }>(
        `/applications/${applicationId}/lifecycle/implementation`,
      );
      return res.data;
    },
    enabled: Boolean(applicationId),
  });
}

export function useUpsertImplementation(applicationId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: UpsertImplementationDto) => {
      const res = await apiFetch<{ data: ImplementationRecord }>(
        `/applications/${applicationId}/lifecycle/implementation`,
        {
          method: 'PUT',
          body: JSON.stringify(dto),
        },
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lifecycle-implementation', applicationId] });
      queryClient.invalidateQueries({ queryKey: ['lifecycle-overview', applicationId] });
    },
  });
}

// ------------------------------------------------------------
// TESTING HOOKS
// ------------------------------------------------------------
export function useLifecycleTests(
  applicationId?: string,
  filters?: { type?: TestType; result?: TestResult },
) {
  return useQuery({
    queryKey: ['lifecycle-tests', applicationId, filters?.type, filters?.result],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.type) params.set('type', filters.type);
      if (filters?.result) params.set('result', filters.result);
      const queryStr = params.toString() ? `?${params.toString()}` : '';
      const res = await apiFetch<{ data: TestRecordItem[] }>(
        `/applications/${applicationId}/lifecycle/tests${queryStr}`,
      );
      return res.data;
    },
    enabled: Boolean(applicationId),
  });
}

export function useTestDetail(applicationId?: string, testId?: string) {
  return useQuery({
    queryKey: ['lifecycle-test-detail', applicationId, testId],
    queryFn: async () => {
      const res = await apiFetch<{ data: TestRecordItem }>(
        `/applications/${applicationId}/lifecycle/tests/${testId}`,
      );
      return res.data;
    },
    enabled: Boolean(applicationId && testId),
  });
}

export function useCreateTest(applicationId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateTestRecordDto) => {
      const res = await apiFetch<{ data: TestRecordItem }>(
        `/applications/${applicationId}/lifecycle/tests`,
        {
          method: 'POST',
          body: JSON.stringify(dto),
        },
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lifecycle-tests', applicationId] });
      queryClient.invalidateQueries({ queryKey: ['lifecycle-overview', applicationId] });
    },
  });
}

export function useUpdateTest(applicationId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ testId, dto }: { testId: string; dto: UpdateTestRecordDto }) => {
      const res = await apiFetch<{ data: TestRecordItem }>(
        `/applications/${applicationId}/lifecycle/tests/${testId}`,
        {
          method: 'PUT',
          body: JSON.stringify(dto),
        },
      );
      return res.data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['lifecycle-tests', applicationId] });
      queryClient.invalidateQueries({ queryKey: ['lifecycle-test-detail', applicationId, vars.testId] });
      queryClient.invalidateQueries({ queryKey: ['lifecycle-overview', applicationId] });
    },
  });
}

export function useDeleteTest(applicationId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (testId: string) => {
      await apiFetch(
        `/applications/${applicationId}/lifecycle/tests/${testId}`,
        {
          method: 'DELETE',
        },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lifecycle-tests', applicationId] });
      queryClient.invalidateQueries({ queryKey: ['lifecycle-overview', applicationId] });
    },
  });
}

export async function fetchTestAttachmentUrl(
  applicationId: string,
  testId: string,
): Promise<{ signed_url: string; filename: string }> {
  const res = await apiFetch<{
    data: { signed_url: string; expires_in: number; filename: string };
  }>(`/applications/${applicationId}/lifecycle/tests/${testId}/attachment`);
  return res.data;
}

// ------------------------------------------------------------
// MAINTENANCE HOOKS
// ------------------------------------------------------------
export function useLifecycleMaintenance(
  applicationId?: string,
  filters?: { type?: MaintenanceType },
) {
  return useQuery({
    queryKey: ['lifecycle-maintenance', applicationId, filters?.type],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.type) params.set('type', filters.type);
      const queryStr = params.toString() ? `?${params.toString()}` : '';
      const res = await apiFetch<{ data: MaintenanceRecordItem[] }>(
        `/applications/${applicationId}/lifecycle/maintenance${queryStr}`,
      );
      return res.data;
    },
    enabled: Boolean(applicationId),
  });
}

export function useMaintenanceDetail(applicationId?: string, recordId?: string) {
  return useQuery({
    queryKey: ['lifecycle-maintenance-detail', applicationId, recordId],
    queryFn: async () => {
      const res = await apiFetch<{ data: MaintenanceRecordItem }>(
        `/applications/${applicationId}/lifecycle/maintenance/${recordId}`,
      );
      return res.data;
    },
    enabled: Boolean(applicationId && recordId),
  });
}

export function useCreateMaintenance(applicationId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateMaintenanceRecordDto) => {
      const res = await apiFetch<{ data: MaintenanceRecordItem }>(
        `/applications/${applicationId}/lifecycle/maintenance`,
        {
          method: 'POST',
          body: JSON.stringify(dto),
        },
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lifecycle-maintenance', applicationId] });
      queryClient.invalidateQueries({ queryKey: ['lifecycle-overview', applicationId] });
    },
  });
}

export function useUpdateMaintenance(applicationId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ recordId, dto }: { recordId: string; dto: UpdateMaintenanceRecordDto }) => {
      const res = await apiFetch<{ data: MaintenanceRecordItem }>(
        `/applications/${applicationId}/lifecycle/maintenance/${recordId}`,
        {
          method: 'PUT',
          body: JSON.stringify(dto),
        },
      );
      return res.data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['lifecycle-maintenance', applicationId] });
      queryClient.invalidateQueries({ queryKey: ['lifecycle-maintenance-detail', applicationId, vars.recordId] });
      queryClient.invalidateQueries({ queryKey: ['lifecycle-overview', applicationId] });
    },
  });
}

export function useDeleteMaintenance(applicationId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (recordId: string) => {
      await apiFetch(
        `/applications/${applicationId}/lifecycle/maintenance/${recordId}`,
        {
          method: 'DELETE',
        },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lifecycle-maintenance', applicationId] });
      queryClient.invalidateQueries({ queryKey: ['lifecycle-overview', applicationId] });
    },
  });
}

export async function fetchMaintenanceAttachmentUrl(
  applicationId: string,
  recordId: string,
): Promise<{ signed_url: string; filename: string }> {
  const res = await apiFetch<{
    data: { signed_url: string; expires_in: number; filename: string };
  }>(`/applications/${applicationId}/lifecycle/maintenance/${recordId}/attachment`);
  return res.data;
}

// ------------------------------------------------------------
// EVALUATION HOOKS
// ------------------------------------------------------------
export function useLifecycleEvaluations(applicationId?: string) {
  return useQuery({
    queryKey: ['lifecycle-evaluations', applicationId],
    queryFn: async () => {
      const res = await apiFetch<{ data: EvaluationRecordItem[] }>(
        `/applications/${applicationId}/lifecycle/evaluations`,
      );
      return res.data;
    },
    enabled: Boolean(applicationId),
  });
}

export function useEvaluationDetail(applicationId?: string, evalId?: string) {
  return useQuery({
    queryKey: ['lifecycle-evaluation-detail', applicationId, evalId],
    queryFn: async () => {
      const res = await apiFetch<{ data: EvaluationRecordItem }>(
        `/applications/${applicationId}/lifecycle/evaluations/${evalId}`,
      );
      return res.data;
    },
    enabled: Boolean(applicationId && evalId),
  });
}

export function useCreateEvaluation(applicationId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateEvaluationDto) => {
      const res = await apiFetch<{ data: EvaluationRecordItem }>(
        `/applications/${applicationId}/lifecycle/evaluations`,
        {
          method: 'POST',
          body: JSON.stringify(dto),
        },
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lifecycle-evaluations', applicationId] });
      queryClient.invalidateQueries({ queryKey: ['lifecycle-overview', applicationId] });
    },
  });
}

export function useUpdateEvaluation(applicationId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ evalId, dto }: { evalId: string; dto: UpdateEvaluationDto }) => {
      const res = await apiFetch<{ data: EvaluationRecordItem }>(
        `/applications/${applicationId}/lifecycle/evaluations/${evalId}`,
        {
          method: 'PUT',
          body: JSON.stringify(dto),
        },
      );
      return res.data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['lifecycle-evaluations', applicationId] });
      queryClient.invalidateQueries({ queryKey: ['lifecycle-evaluation-detail', applicationId, vars.evalId] });
      queryClient.invalidateQueries({ queryKey: ['lifecycle-overview', applicationId] });
    },
  });
}

export function useDeleteEvaluation(applicationId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (evalId: string) => {
      await apiFetch(
        `/applications/${applicationId}/lifecycle/evaluations/${evalId}`,
        {
          method: 'DELETE',
        },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lifecycle-evaluations', applicationId] });
      queryClient.invalidateQueries({ queryKey: ['lifecycle-overview', applicationId] });
    },
  });
}

export async function fetchEvaluationAttachmentUrl(
  applicationId: string,
  evalId: string,
): Promise<{ signed_url: string; filename: string }> {
  const res = await apiFetch<{
    data: { signed_url: string; expires_in: number; filename: string };
  }>(`/applications/${applicationId}/lifecycle/evaluations/${evalId}/attachment`);
  return res.data;
}

// ------------------------------------------------------------
// TECHNICAL DOCS HOOKS
// ------------------------------------------------------------
export function useLifecycleTechnicalDocs(applicationId?: string) {
  return useQuery({
    queryKey: ['lifecycle-tech-docs', applicationId],
    queryFn: async () => {
      const res = await apiFetch<{ data: TechnicalDocumentItem[] }>(
        `/applications/${applicationId}/lifecycle/technical-documents`,
      );
      return res.data;
    },
    enabled: Boolean(applicationId),
  });
}

export function useUploadTechnicalDoc(applicationId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: UploadTechnicalDocumentDto) => {
      const res = await apiFetch<{ data: TechnicalDocumentItem }>(
        `/applications/${applicationId}/lifecycle/technical-documents`,
        {
          method: 'POST',
          body: JSON.stringify(dto),
        },
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lifecycle-tech-docs', applicationId] });
      queryClient.invalidateQueries({ queryKey: ['lifecycle-overview', applicationId] });
    },
  });
}

export function useDeleteTechnicalDoc(applicationId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (docId: string) => {
      await apiFetch(
        `/applications/${applicationId}/lifecycle/technical-documents/${docId}`,
        {
          method: 'DELETE',
        },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lifecycle-tech-docs', applicationId] });
      queryClient.invalidateQueries({ queryKey: ['lifecycle-overview', applicationId] });
    },
  });
}

export async function fetchTechnicalDocDownloadUrl(
  applicationId: string,
  docId: string,
): Promise<{ signed_url: string; filename: string }> {
  const res = await apiFetch<{
    data: { signed_url: string; expires_in: number; filename: string };
  }>(`/applications/${applicationId}/lifecycle/technical-documents/${docId}/download`);
  return res.data;
}
