import type { ApplicationStage, ApplicationStatus } from '../applications/workflow/workflow.types.js';

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

export interface CreateAssignmentDto {
  technician_id: string;
  note?: string;
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

export interface ListTechnicianWorkQueryDto {
  search?: string;
  status?: ApplicationStatus;
  stage?: ApplicationStage;
  page?: number;
  page_size?: number;
}

export interface PaginatedTechnicianWorkResponse {
  items: TechnicianWorkItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
