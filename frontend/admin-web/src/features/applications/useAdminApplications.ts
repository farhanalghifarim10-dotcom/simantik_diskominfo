import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';

export type ApplicationStatus =
  | 'SUBMITTED'
  | 'VERIFICATION'
  | 'REVISION_REQUIRED'
  | 'APPROVED'
  | 'REJECTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CLOSED'
  | 'CANCELLED';

export type ApplicationStage =
  | 'ANALYSIS'
  | 'PLANNING'
  | 'DESIGN'
  | 'IMPLEMENTATION'
  | 'TESTING'
  | 'MAINTENANCE'
  | 'EVALUATION';

export interface TransitionOption {
  to_status: ApplicationStatus;
  label: string;
  description: string;
  require_note: boolean;
  target_stage?: ApplicationStage;
  variant: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
}

export interface ListApplicationsQuery {
  search?: string;
  status?: ApplicationStatus | '';
  stage?: ApplicationStage | '';
  service_id?: string;
  sort_by?: 'submitted_at' | 'created_at' | 'ticket_number' | 'title' | 'current_status';
  sort_order?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
}

export interface ApplicationListItem {
  id: string;
  ticket_number: string;
  title: string;
  current_status: ApplicationStatus;
  current_stage: ApplicationStage | null;
  submitted_at: string;
  service: {
    id: string;
    code: string;
    name: string;
    type: 'DEVELOPMENT' | 'ENHANCEMENT';
  };
  applicant: {
    id: string;
    full_name: string;
    employee_id: string | null;
    position: string | null;
    email: string;
    phone: string | null;
    opd_name: string;
    opd_code: string;
  };
  documents_count: number;
}

export interface PaginatedApplications {
  items: ApplicationListItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface DocumentItem {
  id: string;
  requirement_id: string | null;
  requirement_name?: string;
  is_required?: boolean;
  original_filename: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  version: number;
  uploaded_at: string;
}

export interface StatusHistoryItem {
  id: string;
  from_status: ApplicationStatus | null;
  to_status: ApplicationStatus;
  note: string | null;
  changed_by_name: string | null;
  changed_by_role: string | null;
  changed_at: string;
}

export interface StageHistoryItem {
  id: string;
  from_stage: ApplicationStage | null;
  to_stage: ApplicationStage;
  note: string | null;
  changed_by_name: string | null;
  changed_by_role: string | null;
  changed_at: string;
}

export interface InternalNoteItem {
  id: string;
  sender_name: string;
  sender_type: string;
  message: string;
  created_at: string;
}

export interface AuditLogItem {
  id: string;
  action: string;
  actor_name: string | null;
  created_at: string;
  new_data: Record<string, unknown> | null;
}

export interface ApplicationDetail {
  id: string;
  ticket_number: string;
  title: string;
  background: string | null;
  problem_statement: string | null;
  objective: string | null;
  scope: string | null;
  expected_output: string | null;
  existing_application_name: string | null;
  requested_deadline: string | null;
  additional_notes: string | null;
  terms_accepted_at: string;
  terms_version: string;
  submitted_at: string;
  current_status: ApplicationStatus;
  current_stage: ApplicationStage | null;
  service: {
    id: string;
    code: string;
    name: string;
    type: 'DEVELOPMENT' | 'ENHANCEMENT';
    description: string;
  };
  applicant: {
    id: string;
    full_name: string;
    employee_id: string | null;
    position: string | null;
    email: string;
    phone: string | null;
    opd_unit_id: string;
    opd_name: string;
    opd_code: string;
  };
  documents: DocumentItem[];
  status_history: StatusHistoryItem[];
  stage_history: StageHistoryItem[];
  internal_notes: InternalNoteItem[];
  audit_logs: AuditLogItem[];
  allowed_transitions: TransitionOption[];
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

/**
 * Hook to fetch paginated applications with search, filter, sort
 */
export function useAdminApplications(query: ListApplicationsQuery) {
  const queryParams = new URLSearchParams();
  if (query.search) queryParams.set('search', query.search);
  if (query.status) queryParams.set('status', query.status);
  if (query.stage) queryParams.set('stage', query.stage);
  if (query.service_id) queryParams.set('service_id', query.service_id);
  if (query.sort_by) queryParams.set('sort_by', query.sort_by);
  if (query.sort_order) queryParams.set('sort_order', query.sort_order);
  if (query.page) queryParams.set('page', String(query.page));
  if (query.page_size) queryParams.set('page_size', String(query.page_size));

  const queryString = queryParams.toString();
  const endpoint = `/admin/applications${queryString ? `?${queryString}` : ''}`;

  return useQuery<PaginatedApplications, Error>({
    queryKey: ['admin-applications', query],
    queryFn: async () => {
      const res = await apiFetch<ApiResponse<PaginatedApplications>>(endpoint);
      return res.data;
    },
  });
}

/**
 * Hook to fetch complete application detail
 */
export function useAdminApplicationDetail(id: string | undefined) {
  return useQuery<ApplicationDetail, Error>({
    queryKey: ['admin-application-detail', id],
    queryFn: async () => {
      if (!id) throw new Error('Application ID is required');
      const res = await apiFetch<ApiResponse<ApplicationDetail>>(`/admin/applications/${id}`);
      return res.data;
    },
    enabled: Boolean(id),
  });
}

/**
 * Hook to execute workflow status transition
 */
export function useExecuteTransition() {
  const queryClient = useQueryClient();

  return useMutation<
    ApplicationDetail,
    Error,
    { id: string; target_status: ApplicationStatus; note?: string }
  >({
    mutationFn: async ({ id, target_status, note }) => {
      const res = await apiFetch<ApiResponse<ApplicationDetail>>(
        `/admin/applications/${id}/transitions`,
        {
          method: 'POST',
          body: JSON.stringify({ target_status, note }),
        },
      );
      return res.data;
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(['admin-application-detail', variables.id], data);
      queryClient.invalidateQueries({ queryKey: ['admin-applications'] });
    },
  });
}

/**
 * Hook to execute lifecycle stage transition
 */
export function useExecuteStageTransition() {
  const queryClient = useQueryClient();

  return useMutation<
    ApplicationDetail,
    Error,
    { id: string; target_stage: ApplicationStage; note?: string }
  >({
    mutationFn: async ({ id, target_stage, note }) => {
      const res = await apiFetch<ApiResponse<ApplicationDetail>>(
        `/admin/applications/${id}/stage-transitions`,
        {
          method: 'POST',
          body: JSON.stringify({ target_stage, note }),
        },
      );
      return res.data;
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(['admin-application-detail', variables.id], data);
      queryClient.invalidateQueries({ queryKey: ['admin-applications'] });
    },
  });
}

/**
 * Hook to add an internal note
 */
export function useAddInternalNote() {
  const queryClient = useQueryClient();

  return useMutation<InternalNoteItem, Error, { id: string; message: string }>({
    mutationFn: async ({ id, message }) => {
      const res = await apiFetch<ApiResponse<InternalNoteItem>>(
        `/admin/applications/${id}/notes`,
        {
          method: 'POST',
          body: JSON.stringify({ message }),
        },
      );
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-application-detail', variables.id] });
    },
  });
}

/**
 * Helper to fetch signed URL for document viewing/downloading
 */
export async function fetchDocumentSignedUrl(
  applicationId: string,
  docId: string,
): Promise<{ signed_url: string; expires_in: number; filename: string }> {
  const res = await apiFetch<
    ApiResponse<{ signed_url: string; expires_in: number; filename: string }>
  >(`/admin/applications/${applicationId}/documents/${docId}/signed-url`);
  return res.data;
}

export interface DashboardStats {
  total_applications: number;
  in_progress_count: number;
  active_technicians_count: number;
  completed_closed_count: number;
  submitted_count: number;
  total: number;
  completed_closed: number;
}

/**
 * Hook to fetch dashboard aggregation stats (SUPER_ADMIN)
 */
export function useAdminDashboardStats(year?: number, options?: { enabled?: boolean }) {
  const queryString = year ? `?year=${year}` : '';
  return useQuery<DashboardStats, Error>({
    queryKey: ['admin-dashboard-stats', year],
    queryFn: async () => {
      const res = await apiFetch<ApiResponse<DashboardStats>>(
        `/admin/applications/stats${queryString}`,
      );
      return res.data;
    },
    enabled: options?.enabled ?? true,
  });
}
