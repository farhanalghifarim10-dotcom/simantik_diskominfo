import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

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

export interface PublicDocumentItem {
  requirement_name: string;
  original_filename: string;
  size_bytes?: number;
  uploaded_at: string;
}

export type StageProgressStatus = 'recorded' | 'current' | 'upcoming' | 'completed';

export interface StageProgressItem {
  stage: ApplicationStage;
  label: string;
  description: string;
  status: StageProgressStatus;
  recorded_at?: string;
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
  stage_description?: string | null;
  stage_progress?: StageProgressItem[];
  action_required_by_applicant?: boolean;
  applicant_action_message?: string;
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

export interface TrackingVerificationResult {
  tracking_token: string;
  expires_in: number;
  expires_at: string;
  ticket_number: string;
}

export interface SubmitRevisionPayload {
  revision_notes: string;
  updated_title?: string;
  updated_background?: string;
  additional_documents?: {
    original_filename: string;
    mime_type: string;
    size_bytes: number;
    base64_data?: string;
  }[];
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export async function verifyTrackingCredential(
  ticketNumber: string,
  trackingCode: string,
): Promise<TrackingVerificationResult> {
  const res = await apiFetch<ApiResponse<TrackingVerificationResult>>(
    '/public/tracking/verify',
    {
      method: 'POST',
      body: JSON.stringify({
        ticket_number: ticketNumber.trim().toUpperCase(),
        tracking_code: trackingCode.trim(),
      }),
    },
  );
  return res.data;
}

export async function fetchPublicTicket(
  ticketNumber: string,
  token: string,
): Promise<PublicTicketSummary> {
  const res = await apiFetch<ApiResponse<PublicTicketSummary>>(
    `/public/tickets/${encodeURIComponent(ticketNumber.trim().toUpperCase())}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
  return res.data;
}

export async function fetchPublicTimeline(
  ticketNumber: string,
  token: string,
): Promise<PublicTimelineResponse> {
  const res = await apiFetch<ApiResponse<PublicTimelineResponse>>(
    `/public/tickets/${encodeURIComponent(ticketNumber.trim().toUpperCase())}/timeline`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
  return res.data;
}

export async function submitPublicRevision(
  ticketNumber: string,
  token: string,
  payload: SubmitRevisionPayload,
): Promise<ApiResponse<unknown>> {
  return await apiFetch<ApiResponse<unknown>>(
    `/public/tickets/${encodeURIComponent(ticketNumber.trim().toUpperCase())}/revision`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    },
  );
}

export function useVerifyTracking() {
  return useMutation({
    mutationFn: ({ ticketNumber, trackingCode }: { ticketNumber: string; trackingCode: string }) =>
      verifyTrackingCredential(ticketNumber, trackingCode),
  });
}

export function usePublicTicket(ticketNumber?: string, token?: string | null) {
  return useQuery({
    queryKey: ['public-ticket', ticketNumber, token],
    queryFn: () => fetchPublicTicket(ticketNumber!, token!),
    enabled: Boolean(ticketNumber && token),
    staleTime: 30 * 1000,
    retry: false,
  });
}

export function usePublicTimeline(ticketNumber?: string, token?: string | null) {
  return useQuery({
    queryKey: ['public-timeline', ticketNumber, token],
    queryFn: () => fetchPublicTimeline(ticketNumber!, token!),
    enabled: Boolean(ticketNumber && token),
    staleTime: 30 * 1000,
    retry: false,
  });
}

export function useSubmitRevision(ticketNumber?: string, token?: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SubmitRevisionPayload) =>
      submitPublicRevision(ticketNumber!, token!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-ticket', ticketNumber, token] });
      queryClient.invalidateQueries({ queryKey: ['public-timeline', ticketNumber, token] });
    },
  });
}

export interface PublicMessageItem {
  id: string;
  sender_type: 'PUBLIC_APPLICANT' | 'ADMIN' | 'TECHNICIAN' | 'SYSTEM';
  sender_name: string;
  message: string;
  created_at: string;
}

export async function fetchPublicMessages(
  ticketNumber: string,
  token: string,
): Promise<PublicMessageItem[]> {
  const res = await apiFetch<ApiResponse<PublicMessageItem[]>>(
    `/public/tickets/${encodeURIComponent(ticketNumber.trim().toUpperCase())}/messages`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
  return res.data;
}

export async function sendPublicMessage(
  ticketNumber: string,
  token: string,
  message: string,
): Promise<PublicMessageItem> {
  const res = await apiFetch<ApiResponse<PublicMessageItem>>(
    `/public/tickets/${encodeURIComponent(ticketNumber.trim().toUpperCase())}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message }),
    },
  );
  return res.data;
}

export function usePublicMessages(ticketNumber?: string, token?: string | null) {
  return useQuery({
    queryKey: ['public-messages', ticketNumber, token],
    queryFn: () => fetchPublicMessages(ticketNumber!, token!),
    enabled: Boolean(ticketNumber && token),
    refetchInterval: 5000, // Polling setiap 5 detik
    staleTime: 3000,
  });
}

export function useSendPublicMessage(ticketNumber?: string, token?: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (message: string) => sendPublicMessage(ticketNumber!, token!, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-messages', ticketNumber, token] });
    },
  });
}
