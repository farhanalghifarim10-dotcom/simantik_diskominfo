import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

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

export function usePublicServices() {
  return useQuery<Service[], Error>({
    queryKey: ['public-services'],
    queryFn: async () => {
      const res = await apiFetch<ApiResponse<Service[]>>('/services');
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function usePublicServiceDetail(slugOrId: string) {
  return useQuery<Service, Error>({
    queryKey: ['public-service-detail', slugOrId],
    queryFn: async () => {
      const res = await apiFetch<ApiResponse<Service>>(`/services/${slugOrId}`);
      return res.data;
    },
    enabled: Boolean(slugOrId),
    staleTime: 5 * 60 * 1000,
  });
}
