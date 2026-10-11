export type NotificationType =
  | 'APPLICATION_SUBMITTED'
  | 'APPLICATION_STATUS_CHANGED'
  | 'APPLICATION_STAGE_CHANGED'
  | 'REVISION_REQUIRED'
  | 'APPLICATION_ASSIGNED'
  | 'NEW_MESSAGE'
  | 'TEST_RESULT_UPDATED'
  | 'APPLICATION_COMPLETED'
  | 'APPLICATION_CLOSED'
  | 'SYSTEM';

export type NotificationChannel = 'IN_APP' | 'EMAIL';

export type NotificationDeliveryStatus = 'PENDING' | 'SENT' | 'FAILED';

export interface CreateNotificationPayload {
  application_id?: string;
  ticket_number?: string;
  type: NotificationType;
  channel: NotificationChannel;
  title?: string;
  body?: string;
  recipient_profile_id?: string;
  recipient_email?: string;
  recipient_name?: string;
  service_title?: string;
  metadata?: Record<string, unknown>;
  idempotency_key?: string;
}

export interface NotificationItem {
  id: string;
  recipient_profile_id: string | null;
  recipient_email: string | null;
  application_id: string | null;
  ticket_number?: string;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  body: string;
  delivery_status: NotificationDeliveryStatus;
  read_at: string | null;
  sent_at: string | null;
  delivery_error: string | null;
  created_at: string;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  idempotencyKey?: string;
}

export interface EmailDeliveryResult {
  id?: string;
  status: NotificationDeliveryStatus;
  error?: string;
}
