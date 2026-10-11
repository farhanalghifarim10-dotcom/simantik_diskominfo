-- ============================================================
-- SIMANTIK - Security Baseline
-- RLS + default deny untuk akses database langsung dari client
-- ============================================================


-- ------------------------------------------------------------
-- 1. ENABLE ROW LEVEL SECURITY
-- ------------------------------------------------------------

alter table public.opd_units
  enable row level security;

alter table public.profiles
  enable row level security;

alter table public.services
  enable row level security;

alter table public.service_requirements
  enable row level security;

alter table public.applicants
  enable row level security;

alter table public.applications
  enable row level security;

alter table public.application_documents
  enable row level security;

alter table public.application_status_history
  enable row level security;

alter table public.application_stage_history
  enable row level security;

alter table public.assignments
  enable row level security;

alter table public.project_plans
  enable row level security;

alter table public.technical_documents
  enable row level security;

alter table public.test_records
  enable row level security;

alter table public.maintenance_records
  enable row level security;

alter table public.evaluations
  enable row level security;

alter table public.messages
  enable row level security;

alter table public.notifications
  enable row level security;

alter table public.audit_logs
  enable row level security;


-- ------------------------------------------------------------
-- 2. DEFAULT DENY
--
-- Web Layanan dan Web Admin tidak akan mengakses tabel
-- Supabase secara langsung.
--
-- Semua akses data dilakukan melalui NestJS API.
-- ------------------------------------------------------------

revoke all privileges
on all tables in schema public
from anon, authenticated;

revoke all privileges
on all sequences in schema public
from anon, authenticated;


-- ------------------------------------------------------------
-- 3. DEFAULT PRIVILEGES
--
-- Pastikan tabel/sequence baru di schema public juga tidak
-- otomatis mendapat akses dari anon/authenticated.
-- ------------------------------------------------------------

alter default privileges in schema public
revoke all on tables from anon, authenticated;

alter default privileges in schema public
revoke all on sequences from anon, authenticated;