export type ApplicationStatus =
  | 'SUBMITTED'
  | 'VERIFICATION'
  | 'REVISION_REQUIRED'
  | 'APPROVED'
  | 'REJECTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CLOSED'
  | 'CANCELLED';

export type ApplicationStage =
  | 'ANALYSIS'
  | 'PLANNING'
  | 'DESIGN'
  | 'IMPLEMENTATION'
  | 'TESTING'
  | 'MAINTENANCE'
  | 'EVALUATION';

export interface VerifyTrackingDto {
  ticket_number: string;
  tracking_code: string;
}

export interface TrackingSessionPayload {
  ticket_number: string;
  application_id: string;
  iat: number;
  exp: number;
}

export interface TrackingVerificationResult {
  tracking_token: string;
  expires_in: number; // in seconds
  ticket_number: string;
  expires_at: string;
}

export interface PublicDocumentItem {
  requirement_name: string;
  original_filename: string;
  size_bytes?: number;
  uploaded_at: string;
}

export interface PublicTicketSummary {
  ticket_number: string;
  title: string;
  service_name: string;
  opd_name: string;
  applicant_name_masked: string;
  applicant_email_masked?: string;
  current_status: ApplicationStatus;
  status_label: string;
  current_stage: ApplicationStage | null;
  stage_label: string | null;
  submitted_at: string;
  updated_at: string;
  next_step: string;
  can_revise: boolean;
  revision_reason: string | null;
  documents: PublicDocumentItem[];
}

export interface PublicTimelineMilestone {
  step_number: number;
  stage: string;
  title: string;
  description: string;
  status: 'completed' | 'current' | 'upcoming';
  date?: string;
}

export interface PublicTimelineResponse {
  ticket_number: string;
  current_status: ApplicationStatus;
  milestones: PublicTimelineMilestone[];
  last_updated: string;
}

export interface SubmitRevisionDto {
  revision_notes: string;
  updated_title?: string;
  updated_background?: string;
  updated_problem_statement?: string;
  updated_objective?: string;
  updated_scope?: string;
  updated_expected_output?: string;
  additional_documents?: {
    original_filename: string;
    mime_type: string;
    size_bytes: number;
    base64_data?: string;
  }[];
}

export interface SubmitRevisionResult {
  ticket_number: string;
  previous_status: ApplicationStatus;
  current_status: ApplicationStatus;
  message: string;
  submitted_at: string;
}
