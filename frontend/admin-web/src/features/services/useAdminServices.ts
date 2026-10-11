import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';

export type ServiceType = 'DEVELOPMENT' | 'ENHANCEMENT';
export type RequirementType = 'DOCUMENT' | 'DATA' | 'CONFIRMATION';

export interface ServiceRequirement {
  id: string;
  service_id: string;
  name: string;
  description: string | null;
  type: RequirementType;
  is_required: boolean;
  sort_order: number;
  is_active?: boolean;
  allowed_file_types?: string | null;
  max_file_size_mb?: number | null;
  is_placeholder?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  code: string;
  slug: string;
  name: string;
  type: ServiceType;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  requirements?: ServiceRequirement[];
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export function useAdminServices() {
  return useQuery<Service[], Error>({
    queryKey: ['admin-services'],
    queryFn: async () => {
      const res = await apiFetch<ApiResponse<Service[]>>('/admin/services');
      return res.data;
    },
  });
}

export function useAdminServiceDetail(id: string) {
  return useQuery<Service, Error>({
    queryKey: ['admin-service-detail', id],
    queryFn: async () => {
      const res = await apiFetch<ApiResponse<Service>>(`/admin/services/${id}`);
      return res.data;
    },
    enabled: Boolean(id),
  });
}

export function useCreateService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      code: string;
      name: string;
      type: ServiceType;
      description?: string;
      sort_order?: number;
      is_active?: boolean;
    }) => {
      const res = await apiFetch<ApiResponse<Service>>('/admin/services', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-services'] });
    },
  });
}

export function useUpdateService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: {
        name?: string;
        description?: string;
        is_active?: boolean;
        sort_order?: number;
      };
    }) => {
      const res = await apiFetch<ApiResponse<Service>>(`/admin/services/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      return res.data;
    },
    onSuccess: (updatedService) => {
      queryClient.invalidateQueries({ queryKey: ['admin-services'] });
      queryClient.invalidateQueries({
        queryKey: ['admin-service-detail', updatedService.id],
      });
    },
  });
}

export function useCreateRequirement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      serviceId,
      data,
    }: {
      serviceId: string;
      data: {
        name: string;
        description?: string;
        type: RequirementType;
        is_required?: boolean;
        sort_order?: number;
        is_active?: boolean;
        allowed_file_types?: string;
        max_file_size_mb?: number;
        is_placeholder?: boolean;
      };
    }) => {
      const res = await apiFetch<ApiResponse<ServiceRequirement>>(
        `/admin/services/${serviceId}/requirements`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
      );
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-services'] });
      queryClient.invalidateQueries({
        queryKey: ['admin-service-detail', variables.serviceId],
      });
    },
  });
}

export function useUpdateRequirement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      serviceId,
      reqId,
      data,
    }: {
      serviceId: string;
      reqId: string;
      data: {
        name?: string;
        description?: string;
        type?: RequirementType;
        is_required?: boolean;
        sort_order?: number;
        is_active?: boolean;
        allowed_file_types?: string;
        max_file_size_mb?: number;
        is_placeholder?: boolean;
      };
    }) => {
      const res = await apiFetch<ApiResponse<ServiceRequirement>>(
        `/admin/services/${serviceId}/requirements/${reqId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(data),
        },
      );
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-services'] });
      queryClient.invalidateQueries({
        queryKey: ['admin-service-detail', variables.serviceId],
      });
    },
  });
}

export function useDeleteRequirement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      serviceId,
      reqId,
    }: {
      serviceId: string;
      reqId: string;
    }) => {
      const res = await apiFetch<ApiResponse<{ success: boolean; id: string }>>(
        `/admin/services/${serviceId}/requirements/${reqId}`,
        {
          method: 'DELETE',
        },
      );
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-services'] });
      queryClient.invalidateQueries({
        queryKey: ['admin-service-detail', variables.serviceId],
      });
    },
  });
}
