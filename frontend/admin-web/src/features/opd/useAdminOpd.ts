import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';

export interface OpdUnit {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
  application_count?: number;
  created_at: string;
  updated_at: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export function useAdminOpds(params?: { search?: string; is_active?: boolean }) {
  return useQuery<OpdUnit[], Error>({
    queryKey: ['admin-opds', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.search) searchParams.append('search', params.search);
      if (params?.is_active !== undefined) {
        searchParams.append('is_active', String(params.is_active));
      }

      const queryString = searchParams.toString();
      const path = queryString ? `/admin/opd?${queryString}` : '/admin/opd';

      const res = await apiFetch<ApiResponse<OpdUnit[]>>(path);
      return res.data;
    },
  });
}

export function useCreateOpd() {
  const queryClient = useQueryClient();
  return useMutation<
    ApiResponse<OpdUnit>,
    Error,
    { code: string; name: string; is_active?: boolean }
  >({
    mutationFn: async (data) => {
      return apiFetch<ApiResponse<OpdUnit>>('/admin/opd', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-opds'] });
    },
  });
}

export function useUpdateOpd() {
  const queryClient = useQueryClient();
  return useMutation<
    ApiResponse<OpdUnit>,
    Error,
    { id: string; data: { code?: string; name?: string; is_active?: boolean } }
  >({
    mutationFn: async ({ id, data }) => {
      return apiFetch<ApiResponse<OpdUnit>>(`/admin/opd/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-opds'] });
    },
  });
}

export function useToggleOpdStatus() {
  const queryClient = useQueryClient();
  return useMutation<
    ApiResponse<OpdUnit>,
    Error,
    { id: string; is_active: boolean }
  >({
    mutationFn: async ({ id, is_active }) => {
      return apiFetch<ApiResponse<OpdUnit>>(`/admin/opd/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-opds'] });
    },
  });
}
