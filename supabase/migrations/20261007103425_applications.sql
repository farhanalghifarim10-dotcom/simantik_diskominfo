-- ============================================================
-- SIMANTIK - Applications
-- Pemohon, pengajuan, dan dokumen pendukung
-- ============================================================


-- ------------------------------------------------------------
-- 1. APPLICANTS
-- Identitas pemohon dari OPD
-- ------------------------------------------------------------

create table public.applicants (
  id uuid primary key default gen_random_uuid(),

  opd_unit_id uuid not null
    references public.opd_units(id)
    on delete restrict,

  full_name text not null,
  employee_id text,
  position text,

  email text not null,
  phone text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_applicants_updated_at
before update on public.applicants
for each row
execute function public.set_updated_at();


-- ------------------------------------------------------------
-- 2. APPLICATIONS
-- Data utama permohonan pembangunan/pengembangan aplikasi
-- ------------------------------------------------------------

create table public.applications (
  id uuid primary key default gen_random_uuid(),

  ticket_number text not null unique,

  -- Hash dari tracking code.
  -- Tracking code asli hanya diberikan kepada pemohon.
  tracking_code_hash text not null unique,

  service_id uuid not null
    references public.services(id)
    on delete restrict,

  applicant_id uuid not null
    references public.applicants(id)
    on delete restrict,

  -- Snapshot identitas untuk menjaga histori pengajuan.
  applicant_name text not null,
  applicant_employee_id text,
  applicant_position text,
  applicant_email text not null,
  applicant_phone text,

  title text not null,

  background text,
  problem_statement text,
  objective text,
  scope text,
  expected_output text,

  -- Digunakan terutama untuk layanan pengembangan.
  existing_application_name text,

  requested_deadline date,
  additional_notes text,

  -- Bukti bahwa pemohon menyetujui syarat layanan
  terms_accepted_at timestamptz not null,
  terms_version text not null,

  submitted_at timestamptz not null default now(),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_applications_updated_at
before update on public.applications
for each row
execute function public.set_updated_at();


-- ------------------------------------------------------------
-- 3. APPLICATION DOCUMENTS
-- Dokumen/bukti resmi yang dilampirkan pada pengajuan
-- ------------------------------------------------------------

create table public.application_documents (
  id uuid primary key default gen_random_uuid(),

  application_id uuid not null
    references public.applications(id)
    on delete cascade,

  requirement_id uuid
    references public.service_requirements(id)
    on delete restrict,

  original_filename text not null,
  storage_path text not null,

  mime_type text not null,
  size_bytes bigint not null,

  version integer not null default 1,
  is_current boolean not null default true,

  uploaded_at timestamptz not null default now()
);


-- ------------------------------------------------------------
-- 4. INDEXES
-- ------------------------------------------------------------

create index idx_applicants_opd_unit_id
  on public.applicants(opd_unit_id);

create index idx_applications_service_id
  on public.applications(service_id);

create index idx_applications_applicant_id
  on public.applications(applicant_id);

create index idx_applications_submitted_at
  on public.applications(submitted_at desc);

create index idx_application_documents_application_id
  on public.application_documents(application_id);

create index idx_application_documents_requirement_id
  on public.application_documents(requirement_id);