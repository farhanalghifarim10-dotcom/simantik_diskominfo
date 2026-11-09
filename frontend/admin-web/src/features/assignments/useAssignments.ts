import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import type {
  ApplicationDetail,
  ApplicationStage,
  ApplicationStatus,
} from '../applications/useAdminApplications';

export interface TechnicianProfileItem {
  id: string;
  full_name: string;
  email: string | null;
  role: 'TECHNICIAN';
  is_active: boolean;
  active_assignments_count: number;
}

export interface AssignmentHistoryItem {
  id: string;
  application_id: string;
  technician_id: string;
  technician_name: string;
  technician_email?: string | null;
  assigned_by_id: string | null;
  assigned_by_name: string | null;
  note: string | null;
  assigned_at: string;
  unassigned_at: string | null;
  is_current: boolean;
}

export interface ApplicationAssignmentsResponse {
  current_assignment: AssignmentHistoryItem | null;
  assignment_history: AssignmentHistoryItem[];
}

export interface TechnicianWorkSummary {
  total_assigned: number;
  in_progress_count: number;
  approved_pending_count: number;
  completed_count: number;
}

export interface TechnicianWorkItem {
  id: string;
  ticket_number: string;
  title: string;
  current_status: ApplicationStatus;
  current_stage: ApplicationStage | null;
  submitted_at: string;
  assigned_at: string;
  assignment_note: string | null;
  service: {
    id: string;
    code: string;
    name: string;
    type: 'DEVELOPMENT' | 'ENHANCEMENT';
  };
  applicant: {
    id: string;
    full_name: string;
    opd_name: string;
    opd_code: string;
    email: string;
    phone: string | null;
  };
}

export interface PaginatedTechnicianWork {
  items: TechnicianWorkItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ListTechnicianWorkQuery {
  search?: string;
  status?: ApplicationStatus | '';
  stage?: ApplicationStage | '';
  page?: number;
  page_size?: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export function useTechniciansList(options?: { enabled?: boolean }) {
  return useQuery<TechnicianProfileItem[], Error>({
    queryKey: ['admin-technicians'],
    queryFn: async () => {
      const res = await apiFetch<ApiResponse<TechnicianProfileItem[]>>('/admin/technicians');
      return res.data;
    },
    enabled: options?.enabled !== undefined ? options.enabled : true,
  });
}

export function useApplicationAssignments(applicationId: string | undefined) {
  return useQuery<ApplicationAssignmentsResponse, Error>({
    queryKey: ['application-assignments', applicationId],
    queryFn: async () => {
      if (!applicationId) throw new Error('Application ID is required');
      const res = await apiFetch<ApiResponse<ApplicationAssignmentsResponse>>(
        `/admin/applications/${applicationId}/assignments`,
      );
      return res.data;
    },
    enabled: Boolean(applicationId),
  });
}

export function useAssignTechnician() {
  const queryClient = useQueryClient();

  return useMutation<
    AssignmentHistoryItem,
    Error,
    { applicationId: string; technician_id: string; note?: string }
  >({
    mutationFn: async ({ applicationId, technician_id, note }) => {
      const res = await apiFetch<ApiResponse<AssignmentHistoryItem>>(
        `/admin/applications/${applicationId}/assignments`,
        {
          method: 'POST',
          body: JSON.stringify({ technician_id, note }),
        },
      );
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['application-assignments', variables.applicationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['admin-technicians'],
      });
      queryClient.invalidateQueries({
        queryKey: ['admin-application-detail', variables.applicationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['admin-applications'],
      });
    },
  });
}

export function useTechnicianWorkSummary() {
  return useQuery<TechnicianWorkSummary, Error>({
    queryKey: ['technician-work-summary'],
    queryFn: async () => {
      const res = await apiFetch<ApiResponse<TechnicianWorkSummary>>('/technician/my-work/summary');
      return res.data;
    },
  });
}

export function useTechnicianMyWork(query: ListTechnicianWorkQuery) {
  const queryParams = new URLSearchParams();
  if (query.search) queryParams.set('search', query.search);
  if (query.status) queryParams.set('status', query.status);
  if (query.stage) queryParams.set('stage', query.stage);
  if (query.page) queryParams.set('page', String(query.page));
  if (query.page_size) queryParams.set('page_size', String(query.page_size));

  const qs = queryParams.toString();
  const endpoint = `/technician/my-work${qs ? `?${qs}` : ''}`;

  return useQuery<PaginatedTechnicianWork, Error>({
    queryKey: ['technician-my-work', query],
    queryFn: async () => {
      const res = await apiFetch<ApiResponse<PaginatedTechnicianWork>>(endpoint);
      return res.data;
    },
  });
}

export function useTechnicianApplicationDetail(id: string | undefined) {
  return useQuery<ApplicationDetail, Error>({
    queryKey: ['technician-application-detail', id],
    queryFn: async () => {
      if (!id) throw new Error('Application ID is required');
      const res = await apiFetch<ApiResponse<ApplicationDetail>>(`/technician/applications/${id}`);
      return res.data;
    },
    enabled: Boolean(id),
  });
}
