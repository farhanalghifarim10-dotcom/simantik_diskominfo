import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';

export type MessageVisibility = 'PUBLIC' | 'INTERNAL';

export type MessageSenderType =
  | 'PUBLIC_APPLICANT'
  | 'ADMIN'
  | 'TECHNICIAN'
  | 'SYSTEM';

export interface MessageItem {
  id: string;
  application_id: string;
  ticket_number?: string;
  sender_type: MessageSenderType;
  sender_profile_id?: string | null;
  sender_name: string;
  sender_email?: string | null;
  visibility: MessageVisibility;
  message: string;
  created_at: string;
  updated_at: string;
}

export interface SendMessagePayload {
  message: string;
  visibility: MessageVisibility;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export async function fetchApplicationMessages(
  applicationId: string,
): Promise<MessageItem[]> {
  const res = await apiFetch<ApiResponse<MessageItem[]>>(
    `/applications/${applicationId}/messages`,
  );
  return res.data;
}

export async function sendApplicationMessage(
  applicationId: string,
  payload: SendMessagePayload,
): Promise<MessageItem> {
  const res = await apiFetch<ApiResponse<MessageItem>>(
    `/applications/${applicationId}/messages`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
  return res.data;
}

export function useApplicationMessages(applicationId?: string) {
  return useQuery({
    queryKey: ['application-messages', applicationId],
    queryFn: () => fetchApplicationMessages(applicationId!),
    enabled: Boolean(applicationId),
    refetchInterval: 5000, // Live polling setiap 5 detik
    staleTime: 3000,
  });
}

export function useSendMessage(applicationId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SendMessagePayload) =>
      sendApplicationMessage(applicationId!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['application-messages', applicationId],
      });
    },
  });
}
