-- ============================================================
-- SIMANTIK - Workflow
-- Status, lifecycle stage, history, dan assignment teknisi
-- ============================================================


-- ------------------------------------------------------------
-- 1. ENUM STATUS
-- Status operasional permohonan.
-- Nama status ini adalah technical design awal, bukan daftar
-- status resmi SOP Diskominfo.
-- ------------------------------------------------------------

create type public.application_status as enum (
  'SUBMITTED',
  'VERIFICATION',
  'REVISION_REQUIRED',
  'APPROVED',
  'REJECTED',
  'IN_PROGRESS',
  'COMPLETED',
  'CLOSED',
  'CANCELLED'
);


-- ------------------------------------------------------------
-- 2. ENUM LIFECYCLE STAGE
-- Mengikuti tahapan lifecycle pembangunan/pengembangan aplikasi.
-- ------------------------------------------------------------

create type public.application_stage as enum (
  'ANALYSIS',
  'PLANNING',
  'DESIGN',
  'IMPLEMENTATION',
  'TESTING',
  'MAINTENANCE',
  'EVALUATION'
);


-- ------------------------------------------------------------
-- 3. CURRENT WORKFLOW STATE
-- Tambahkan kondisi terkini pada application.
-- ------------------------------------------------------------

alter table public.applications
add column current_status public.application_status
  not null default 'SUBMITTED';

alter table public.applications
add column current_stage public.application_stage;


-- ------------------------------------------------------------
-- 4. APPLICATION STATUS HISTORY
-- Mencatat semua perubahan status.
-- ------------------------------------------------------------

create table public.application_status_history (
  id uuid primary key default gen_random_uuid(),

  application_id uuid not null
    references public.applications(id)
    on delete cascade,

  from_status public.application_status,
  to_status public.application_status not null,

  note text,

  changed_by uuid
    references public.profiles(id)
    on delete set null,

  changed_at timestamptz not null default now()
);


-- ------------------------------------------------------------
-- 5. APPLICATION STAGE HISTORY
-- Mencatat perpindahan lifecycle stage.
-- ------------------------------------------------------------

create table public.application_stage_history (
  id uuid primary key default gen_random_uuid(),

  application_id uuid not null
    references public.applications(id)
    on delete cascade,

  from_stage public.application_stage,
  to_stage public.application_stage not null,

  note text,

  changed_by uuid
    references public.profiles(id)
    on delete set null,

  changed_at timestamptz not null default now()
);


-- ------------------------------------------------------------
-- 6. ASSIGNMENTS
-- Menentukan teknisi yang bertanggung jawab atas pengajuan.
-- ------------------------------------------------------------

create table public.assignments (
  id uuid primary key default gen_random_uuid(),

  application_id uuid not null
    references public.applications(id)
    on delete cascade,

  technician_id uuid not null
    references public.profiles(id)
    on delete restrict,

  assigned_by uuid
    references public.profiles(id)
    on delete set null,

  note text,

  assigned_at timestamptz not null default now(),
  unassigned_at timestamptz,

  is_current boolean not null default true
);


-- ------------------------------------------------------------
-- 7. INDEXES
-- ------------------------------------------------------------

create index idx_applications_current_status
  on public.applications(current_status);

create index idx_applications_current_stage
  on public.applications(current_stage);

create index idx_status_history_application_id
  on public.application_status_history(application_id);

create index idx_status_history_changed_at
  on public.application_status_history(changed_at desc);

create index idx_stage_history_application_id
  on public.application_stage_history(application_id);

create index idx_stage_history_changed_at
  on public.application_stage_history(changed_at desc);

create index idx_assignments_application_id
  on public.assignments(application_id);

create index idx_assignments_technician_id
  on public.assignments(technician_id);


-- ------------------------------------------------------------
-- 8. AT MOST ONE CURRENT ASSIGNMENT PER APPLICATION
-- ------------------------------------------------------------

create unique index uq_assignments_one_current
  on public.assignments(application_id)
  where is_current = true;