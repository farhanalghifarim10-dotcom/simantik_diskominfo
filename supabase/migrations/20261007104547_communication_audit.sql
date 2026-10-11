-- ============================================================
-- SIMANTIK - Communication, Notification & Audit
-- Chat per tiket, notifikasi, dan audit log
-- ============================================================


-- ------------------------------------------------------------
-- 1. MESSAGE VISIBILITY
-- PUBLIC    : dapat dilihat pemohon
-- INTERNAL  : hanya internal Diskominfo
-- ------------------------------------------------------------

create type public.message_visibility as enum (
  'PUBLIC',
  'INTERNAL'
);


-- ------------------------------------------------------------
-- 2. MESSAGE SENDER TYPE
-- ------------------------------------------------------------

create type public.message_sender_type as enum (
  'PUBLIC_APPLICANT',
  'ADMIN',
  'TECHNICIAN',
  'SYSTEM'
);


-- ------------------------------------------------------------
-- 3. MESSAGES
-- Komunikasi yang terikat ke satu pengajuan/tiket
-- ------------------------------------------------------------

create table public.messages (
  id uuid primary key default gen_random_uuid(),

  application_id uuid not null
    references public.applications(id)
    on delete cascade,

  sender_type public.message_sender_type not null,

  -- Diisi jika pengirim adalah admin/teknisi.
  sender_profile_id uuid
    references public.profiles(id)
    on delete set null,

  -- Snapshot untuk pengirim publik.
  sender_name text,
  sender_email text,

  visibility public.message_visibility not null default 'PUBLIC',

  message text not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_messages_updated_at
before update on public.messages
for each row
execute function public.set_updated_at();


-- ------------------------------------------------------------
-- 4. NOTIFICATION TYPES
-- ------------------------------------------------------------

create type public.notification_type as enum (
  'APPLICATION_SUBMITTED',
  'APPLICATION_STATUS_CHANGED',
  'APPLICATION_STAGE_CHANGED',
  'REVISION_REQUIRED',
  'APPLICATION_ASSIGNED',
  'NEW_MESSAGE',
  'TEST_RESULT_UPDATED',
  'APPLICATION_COMPLETED',
  'APPLICATION_CLOSED',
  'SYSTEM'
);


-- ------------------------------------------------------------
-- 5. NOTIFICATION CHANNEL
-- MVP menggunakan IN_APP dan EMAIL
-- ------------------------------------------------------------

create type public.notification_channel as enum (
  'IN_APP',
  'EMAIL'
);


-- ------------------------------------------------------------
-- 6. NOTIFICATION DELIVERY STATUS
-- ------------------------------------------------------------

create type public.notification_delivery_status as enum (
  'PENDING',
  'SENT',
  'FAILED'
);


-- ------------------------------------------------------------
-- 7. NOTIFICATIONS
-- Notifikasi internal untuk admin/teknisi
-- ------------------------------------------------------------

create table public.notifications (
  id uuid primary key default gen_random_uuid(),

  recipient_profile_id uuid not null
    references public.profiles(id)
    on delete cascade,

  application_id uuid
    references public.applications(id)
    on delete cascade,

  type public.notification_type not null,
  channel public.notification_channel not null,

  title text not null,
  body text not null,

  delivery_status public.notification_delivery_status
    not null default 'PENDING',

  read_at timestamptz,
  sent_at timestamptz,

  delivery_error text,

  created_at timestamptz not null default now()
);


-- ------------------------------------------------------------
-- 8. AUDIT LOGS
-- Mencatat tindakan penting di dalam sistem
-- ------------------------------------------------------------

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),

  actor_profile_id uuid
    references public.profiles(id)
    on delete set null,

  application_id uuid
    references public.applications(id)
    on delete set null,

  action text not null,

  entity_type text not null,
  entity_id uuid,

  old_data jsonb,
  new_data jsonb,

  ip_address inet,
  user_agent text,

  created_at timestamptz not null default now()
);


-- ------------------------------------------------------------
-- 9. INDEXES - MESSAGES
-- ------------------------------------------------------------

create index idx_messages_application_id
  on public.messages(application_id);

create index idx_messages_created_at
  on public.messages(created_at);

create index idx_messages_public_chat
  on public.messages(application_id, visibility, created_at);


-- ------------------------------------------------------------
-- 10. INDEXES - NOTIFICATIONS
-- ------------------------------------------------------------

create index idx_notifications_recipient
  on public.notifications(recipient_profile_id);

create index idx_notifications_unread
  on public.notifications(recipient_profile_id, read_at);

create index idx_notifications_application_id
  on public.notifications(application_id);

create index idx_notifications_created_at
  on public.notifications(created_at desc);


-- ------------------------------------------------------------
-- 11. INDEXES - AUDIT
-- ------------------------------------------------------------

create index idx_audit_logs_application_id
  on public.audit_logs(application_id);

create index idx_audit_logs_actor_profile_id
  on public.audit_logs(actor_profile_id);

create index idx_audit_logs_created_at
  on public.audit_logs(created_at desc);

create index idx_audit_logs_entity
  on public.audit_logs(entity_type, entity_id);