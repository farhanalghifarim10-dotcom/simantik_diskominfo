-- ============================================================
-- SIMANTIK - Lifecycle
-- Detail perencanaan, dokumen teknis, pengujian,
-- pemeliharaan, dan evaluasi
-- ============================================================


-- ------------------------------------------------------------
-- 1. PROJECT PLANS
-- Perencanaan pekerjaan pengembangan/pembangunan aplikasi
-- ------------------------------------------------------------

create table public.project_plans (
  id uuid primary key default gen_random_uuid(),

  application_id uuid not null
    references public.applications(id)
    on delete cascade,

  scope text,
  business_process text,
  technical_approach text,

  executor text,
  roles_and_responsibilities text,

  planned_start_date date,
  planned_end_date date,

  security_plan text,
  resource_plan text,

  success_indicators text,
  knowledge_transfer_plan text,

  monitoring_plan text,
  reporting_plan text,

  created_by uuid
    references public.profiles(id)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_project_plans_updated_at
before update on public.project_plans
for each row
execute function public.set_updated_at();


-- ------------------------------------------------------------
-- 2. TECHNICAL DOCUMENTS
-- Dokumen teknis selama lifecycle
-- ------------------------------------------------------------

create type public.technical_document_type as enum (
  'REQUIREMENTS',
  'ARCHITECTURE',
  'DESIGN',
  'API',
  'DATABASE',
  'INSTALLATION',
  'USER_MANUAL',
  'TROUBLESHOOTING',
  'OTHER'
);

create table public.technical_documents (
  id uuid primary key default gen_random_uuid(),

  application_id uuid not null
    references public.applications(id)
    on delete cascade,

  document_type public.technical_document_type not null,

  title text not null,
  description text,

  storage_path text not null,
  original_filename text not null,

  mime_type text not null,
  size_bytes bigint not null,

  version integer not null default 1,
  is_current boolean not null default true,

  uploaded_by uuid
    references public.profiles(id)
    on delete set null,

  uploaded_at timestamptz not null default now()
);


-- ------------------------------------------------------------
-- 3. TEST RECORDS
-- Catatan uji kelaikan
--
-- Jenis pengujian mengikuti aspek yang sudah kita bahas:
-- function, integration, load, security.
-- ------------------------------------------------------------

create type public.test_type as enum (
  'FUNCTION',
  'INTEGRATION',
  'LOAD',
  'SECURITY'
);

create type public.test_result as enum (
  'PASS',
  'FAIL',
  'PASS_WITH_NOTES'
);

create table public.test_records (
  id uuid primary key default gen_random_uuid(),

  application_id uuid not null
    references public.applications(id)
    on delete cascade,

  test_type public.test_type not null,

  test_name text not null,
  test_scope text,

  test_criteria text,
  test_scenario text,

  expected_result text,
  actual_result text,

  result public.test_result,

  findings text,
  corrective_action text,

  tested_by uuid
    references public.profiles(id)
    on delete set null,

  tested_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_test_records_updated_at
before update on public.test_records
for each row
execute function public.set_updated_at();


-- ------------------------------------------------------------
-- 4. MAINTENANCE RECORDS
-- Riwayat pemeliharaan aplikasi
-- ------------------------------------------------------------

create type public.maintenance_type as enum (
  'PERFECTIVE',
  'ADAPTIVE',
  'CORRECTIVE',
  'PREVENTIVE'
);

create table public.maintenance_records (
  id uuid primary key default gen_random_uuid(),

  application_id uuid not null
    references public.applications(id)
    on delete cascade,

  maintenance_type public.maintenance_type not null,

  title text not null,
  description text,

  reason text,
  action_taken text,
  result text,

  started_at timestamptz,
  completed_at timestamptz,

  performed_by uuid
    references public.profiles(id)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_maintenance_records_updated_at
before update on public.maintenance_records
for each row
execute function public.set_updated_at();


-- ------------------------------------------------------------
-- 5. EVALUATIONS
-- Evaluasi hasil pembangunan/pengembangan aplikasi
-- ------------------------------------------------------------

create table public.evaluations (
  id uuid primary key default gen_random_uuid(),

  application_id uuid not null
    references public.applications(id)
    on delete cascade,

  evaluation_date date not null,

  success_indicator text,
  achievement text,

  findings text,
  recommendations text,
  follow_up_plan text,

  evaluated_by uuid
    references public.profiles(id)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_evaluations_updated_at
before update on public.evaluations
for each row
execute function public.set_updated_at();


-- ------------------------------------------------------------
-- 6. INDEXES
-- ------------------------------------------------------------

create index idx_project_plans_application_id
  on public.project_plans(application_id);

create index idx_technical_documents_application_id
  on public.technical_documents(application_id);

create index idx_test_records_application_id
  on public.test_records(application_id);

create index idx_test_records_test_type
  on public.test_records(test_type);

create index idx_maintenance_records_application_id
  on public.maintenance_records(application_id);

create index idx_maintenance_records_type
  on public.maintenance_records(maintenance_type);

create index idx_evaluations_application_id
  on public.evaluations(application_id);

create index idx_evaluations_date
  on public.evaluations(evaluation_date desc);