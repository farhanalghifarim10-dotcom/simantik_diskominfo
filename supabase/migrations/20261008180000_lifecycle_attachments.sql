-- ============================================================
-- SIMANTIK - Lifecycle Quality Records Extension
-- Attachments for Test Records, Maintenance, and Evaluations
-- ============================================================

alter table public.test_records
add column if not exists attachment_path text,
add column if not exists attachment_filename text;

alter table public.maintenance_records
add column if not exists attachment_path text,
add column if not exists attachment_filename text;

alter table public.evaluations
add column if not exists attachment_path text,
add column if not exists attachment_filename text;
