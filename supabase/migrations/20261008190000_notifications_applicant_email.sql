-- ============================================================
-- SIMANTIK - Notifications Applicant Email & Visibility Support
-- ============================================================

-- 1. Mengizinkan recipient_profile_id null untuk email notifikasi ke pemohon publik luar
alter table public.notifications
  alter column recipient_profile_id drop not null;

-- 2. Menambahkan kolom recipient_email untuk pengiriman email pemohon
alter table public.notifications
  add column if not exists recipient_email text;

create index if not exists idx_notifications_recipient_email
  on public.notifications(recipient_email);

-- 3. Menambahkan index untuk deduplikasi notifikasi
create index if not exists idx_notifications_app_type
  on public.notifications(application_id, type, channel, delivery_status);
