export interface SubmitApplicationPayload {
  service_id: string;
  opd_unit_id: string;

  applicant_name: string;
  applicant_employee_id?: string;
  applicant_position: string;
  applicant_email: string;
  applicant_phone: string;

  title: string;
  background: string;
  problem_statement: string;
  objective: string;
  scope: string;
  expected_output: string;

  requested_deadline?: string;
  existing_application_name?: string;
  additional_notes?: string;

  terms_accepted: boolean;
  terms_version: string;
  idempotency_key?: string;
}

export interface UploadedDocumentInput {
  requirement_id: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  buffer?: Buffer;
  base64_data?: string;
}

export interface ApplicationSubmissionResult {
  id: string;
  ticket_number: string;
  tracking_code: string;
  title: string;
  service_name: string;
  applicant_name: string;
  submitted_at: string;
  current_status: 'SUBMITTED';
  terms_version: string;
  documents_count: number;
  format_note: string;
}

export interface OpdUnitEntity {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
}
