-- ============================================================
-- SIMANTIK - Lifecycle Stages Extension
-- Analysis, Design, and Implementation Records
-- ============================================================

-- ------------------------------------------------------------
-- 1. ANALYSIS RECORDS
-- Dokumentasi analisis kebutuhan SPBE awal
-- ------------------------------------------------------------

create table if not exists public.analysis_records (
  id uuid primary key default gen_random_uuid(),

  application_id uuid not null
    references public.applications(id)
    on delete cascade,

  problems text,
  needs text,
  stakeholders text,
  objectives text,
  scope text,
  risks text,
  target_users text,
  target_timeline text,
  target_location text,
  supporting_analysis text,

  created_by uuid
    references public.profiles(id)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_analysis_records_updated_at
before update on public.analysis_records
for each row
execute function public.set_updated_at();

create index if not exists idx_analysis_records_application_id
  on public.analysis_records(application_id);


-- ------------------------------------------------------------
-- 2. DESIGN RECORDS
-- Dokumentasi rancang bangun & arsitektur aplikasi
-- ------------------------------------------------------------

create table if not exists public.design_records (
  id uuid primary key default gen_random_uuid(),

  application_id uuid not null
    references public.applications(id)
    on delete cascade,

  architecture_model text,
  process_flow text,
  function_mapping text,
  database_mapping text,
  role_access_mapping text,
  ui_navigation text,
  internal_control text,
  integration_design text,

  created_by uuid
    references public.profiles(id)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_design_records_updated_at
before update on public.design_records
for each row
execute function public.set_updated_at();

create index if not exists idx_design_records_application_id
  on public.design_records(application_id);


-- ------------------------------------------------------------
-- 3. IMPLEMENTATION RECORDS
-- Dokumentasi pelaksanaan pembangunan & penyerahan
-- ------------------------------------------------------------

create table if not exists public.implementation_records (
  id uuid primary key default gen_random_uuid(),

  application_id uuid not null
    references public.applications(id)
    on delete cascade,

  software_dev_records text,
  database_implementation text,
  quality_control text,
  installation_config text,
  api_interoperability text,
  documentation_notes text,
  knowledge_transfer text,
  handover_notes text,

  created_by uuid
    references public.profiles(id)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_implementation_records_updated_at
before update on public.implementation_records
for each row
execute function public.set_updated_at();

create index if not exists idx_implementation_records_application_id
  on public.implementation_records(application_id);


-- ------------------------------------------------------------
-- 4. RLS & PRIVILEGES
-- ------------------------------------------------------------

alter table public.analysis_records enable row level security;
alter table public.design_records enable row level security;
alter table public.implementation_records enable row level security;

revoke all privileges on public.analysis_records from anon, authenticated;
revoke all privileges on public.design_records from anon, authenticated;
revoke all privileges on public.implementation_records from anon, authenticated;
