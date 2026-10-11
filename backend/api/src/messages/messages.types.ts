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

export interface CreateMessageDto {
  message: string;
  visibility?: MessageVisibility;
}

export interface CreatePublicMessageDto {
  message: string;
}
