import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';

export interface AuditLogItem {
  id: string;
  actor_profile_id: string | null;
  actor_name: string | null;
  actor_role: string | null;
  application_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

interface PaginatedAuditLogsResponse {
  success: boolean;
  data: AuditLogItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export function useAdminAuditLogs(params?: {
  entity_type?: string;
  action?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery<PaginatedAuditLogsResponse, Error>({
    queryKey: ['admin-audit-logs', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.entity_type) searchParams.append('entity_type', params.entity_type);
      if (params?.action) searchParams.append('action', params.action);
      if (params?.search) searchParams.append('search', params.search);
      if (params?.page) searchParams.append('page', String(params.page));
      if (params?.limit) searchParams.append('limit', String(params.limit));

      const queryString = searchParams.toString();
      const path = queryString ? `/admin/audit?${queryString}` : '/admin/audit';

      return apiFetch<PaginatedAuditLogsResponse>(path);
    },
  });
}
