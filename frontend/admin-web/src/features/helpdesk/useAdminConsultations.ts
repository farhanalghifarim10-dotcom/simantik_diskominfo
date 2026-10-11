import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';

export interface ConsultationItem {
  id: string;
  opd_name: string;
  sender_name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status: 'NEW' | 'READ' | 'RESPONDED';
  read_at?: string | null;
  created_at: string;
  notification_id?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

/**
 * Hook untuk memuat daftar permohonan konsultasi dari OPD melalui Helpdesk
 */
export function useAdminConsultations() {
  return useQuery<ConsultationItem[], Error>({
    queryKey: ['admin-helpdesk-consultations'],
    queryFn: async () => {
      const res = await apiFetch<ApiResponse<ConsultationItem[]>>(
        '/admin/helpdesk/consultations',
      );
      return res.data || [];
    },
  });
}

/**
 * Hook untuk menandai konsultasi sebagai telah dibaca
 */
export function useMarkConsultationRead() {
  const queryClient = useQueryClient();

  return useMutation<ApiResponse<ConsultationItem>, Error, string>({
    mutationFn: async (id: string) => {
      return apiFetch<ApiResponse<ConsultationItem>>(
        `/admin/helpdesk/consultations/${id}/read`,
        { method: 'POST' },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-helpdesk-consultations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['admin-notifications-unread-count'] });
    },
  });
}
