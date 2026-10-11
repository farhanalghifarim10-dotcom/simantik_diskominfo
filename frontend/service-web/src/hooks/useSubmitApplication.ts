import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export interface SubmitApplicationDto {
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

  documents: {
    requirement_id: string;
    original_filename: string;
    mime_type: string;
    size_bytes: number;
    base64_data?: string;
  }[];
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

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export function useSubmitApplication() {
  return useMutation<ApplicationSubmissionResult, Error, SubmitApplicationDto>({
    mutationFn: async (payload: SubmitApplicationDto) => {
      const res = await apiFetch<ApiResponse<ApplicationSubmissionResult>>(
        '/applications',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      );
      return res.data;
    },
  });
}
