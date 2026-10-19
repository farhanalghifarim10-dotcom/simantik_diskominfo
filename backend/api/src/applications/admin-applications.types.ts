import type { ApplicationStage, ApplicationStatus, TransitionOption } from './workflow/workflow.types.js';

export interface ListApplicationsQueryDto {
  search?: string;
  status?: ApplicationStatus;
  stage?: ApplicationStage;
  service_id?: string;
  opd_unit_id?: string;
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

export interface PaginatedApplicationsResponse {
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

export interface ApplicationDetailResponse {
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

export interface DashboardStatsQueryDto {
  year?: number;
}

export interface DashboardStatsResponse {
  total_applications: number;
  in_progress_count: number;
  active_technicians_count: number;
  completed_closed_count: number;
  submitted_count: number;
  total: number;
  completed_closed: number;
}

export interface ReissueTrackingCodeDto {
  reason: string;
}

export interface ReissueTrackingCodeResult {
  application_id: string;
  ticket_number: string;
  tracking_code: string;
  reissued_at: string;
  message: string;
}
