import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export interface OpdUnit {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export function useOpdUnits() {
  return useQuery<OpdUnit[], Error>({
    queryKey: ['opd-units'],
    queryFn: async () => {
      const res = await apiFetch<ApiResponse<OpdUnit[]>>('/opd-units');
      return res.data;
    },
    staleTime: 10 * 60 * 1000,
  });
}
