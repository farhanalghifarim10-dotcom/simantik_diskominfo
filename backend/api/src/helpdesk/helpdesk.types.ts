export interface CreateConsultationDto {
  opdName?: string;
  opd_name?: string;
  senderName?: string;
  sender_name?: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

export type ConsultationStatus = 'NEW' | 'READ' | 'RESPONDED';

export interface ConsultationItem {
  id: string;
  opd_name: string;
  sender_name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status: ConsultationStatus;
  read_at?: string | null;
  created_at: string;
  notification_id?: string;
}
