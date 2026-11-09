import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';

export interface NotificationItem {
  id: string;
  recipient_profile_id: string | null;
  recipient_email: string | null;
  application_id: string | null;
  ticket_number?: string;
  type: string;
  channel: string;
  title: string;
  body: string;
  delivery_status: string;
  read_at: string | null;
  sent_at: string | null;
  delivery_error: string | null;
  created_at: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export function useNotifications() {
  return useQuery<NotificationItem[], Error>({
    queryKey: ['admin-notifications'],
    queryFn: async () => {
      const res = await apiFetch<ApiResponse<NotificationItem[]>>('/notifications');
      return res.data || [];
    },
  });
}

export function useUnreadNotificationsCount() {
  return useQuery<number, Error>({
    queryKey: ['admin-notifications-unread-count'],
    queryFn: async () => {
      const res = await apiFetch<ApiResponse<{ unread_count: number }>>(
        '/notifications/unread-count',
      );
      return res.data?.unread_count ?? 0;
    },
    refetchInterval: 30000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation<ApiResponse<{ message?: string }>, Error, string>({
    mutationFn: async (id: string) => {
      return apiFetch<ApiResponse<{ message?: string }>>(`/notifications/${id}/read`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['admin-notifications-unread-count'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation<ApiResponse<{ affected: number }>, Error, void>({
    mutationFn: async () => {
      return apiFetch<ApiResponse<{ affected: number }>>('/notifications/read-all', {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['admin-notifications-unread-count'] });
    },
  });
}
