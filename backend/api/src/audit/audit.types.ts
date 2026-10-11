export interface AuditLogListItem {
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

export interface ListAuditLogsQueryDto {
  entity_type?: string;
  action?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedAuditLogsResponse {
  items: AuditLogListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface RecordAuditLogEntry {
  actor_profile_id?: string | null;
  application_id?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  old_data?: Record<string, unknown> | null;
  new_data?: Record<string, unknown> | null;
  ip_address?: string | null;
  user_agent?: string | null;
}
