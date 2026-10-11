import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';

export interface TechnicianAccount {
  id: string;
  full_name: string;
  email: string;
  role: 'TECHNICIAN';
  is_active: boolean;
  active_assignments_count: number;
  total_assignments_count: number;
  created_at: string;
  updated_at: string;
}

export interface TechnicianDetail extends TechnicianAccount {
  recent_assignments?: Array<{
    id: string;
    application_id: string;
    ticket_number: string;
    title: string;
    is_current: boolean;
    assigned_at: string;
  }>;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export function useAdminTechnicians(params?: { search?: string; is_active?: boolean }) {
  return useQuery<TechnicianAccount[], Error>({
    queryKey: ['admin-technicians', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.search) searchParams.append('search', params.search);
      if (params?.is_active !== undefined) {
        searchParams.append('is_active', String(params.is_active));
      }

      const queryString = searchParams.toString();
      const path = queryString ? `/admin/technicians?${queryString}` : '/admin/technicians';

      const res = await apiFetch<ApiResponse<TechnicianAccount[]>>(path);
      return res.data;
    },
  });
}

export function useTechnicianDetail(id: string) {
  return useQuery<TechnicianDetail, Error>({
    queryKey: ['admin-technician-detail', id],
    queryFn: async () => {
      const res = await apiFetch<ApiResponse<TechnicianDetail>>(`/admin/technicians/${id}`);
      return res.data;
    },
    enabled: Boolean(id),
  });
}

export function useCreateTechnician() {
  const queryClient = useQueryClient();
  return useMutation<
    ApiResponse<TechnicianAccount>,
    Error,
    { full_name: string; email: string; password?: string; is_active?: boolean }
  >({
    mutationFn: async (data) => {
      return apiFetch<ApiResponse<TechnicianAccount>>('/admin/technicians', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-technicians'] });
      queryClient.invalidateQueries({ queryKey: ['technicians-list'] });
    },
  });
}

export function useUpdateTechnician() {
  const queryClient = useQueryClient();
  return useMutation<
    ApiResponse<TechnicianAccount>,
    Error,
    { id: string; data: { full_name?: string; email?: string; password?: string; is_active?: boolean } }
  >({
    mutationFn: async ({ id, data }) => {
      return apiFetch<ApiResponse<TechnicianAccount>>(`/admin/technicians/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-technicians'] });
      queryClient.invalidateQueries({ queryKey: ['admin-technician-detail', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['technicians-list'] });
    },
  });
}

export function useToggleTechnicianStatus() {
  const queryClient = useQueryClient();
  return useMutation<
    ApiResponse<TechnicianAccount>,
    Error,
    { id: string; is_active: boolean }
  >({
    mutationFn: async ({ id, is_active }) => {
      return apiFetch<ApiResponse<TechnicianAccount>>(`/admin/technicians/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active }),
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-technicians'] });
      queryClient.invalidateQueries({ queryKey: ['admin-technician-detail', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['technicians-list'] });
    },
  });
}
