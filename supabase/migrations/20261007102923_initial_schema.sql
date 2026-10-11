-- ============================================================
-- SIMANTIK - Initial Schema
-- Fondasi database: role, OPD, layanan, dan persyaratan layanan
-- ============================================================

-- ------------------------------------------------------------
-- 1. ENUMS
-- ------------------------------------------------------------

create type public.app_role as enum (
  'SUPER_ADMIN',
  'TECHNICIAN'
);

create type public.service_type as enum (
  'DEVELOPMENT',
  'ENHANCEMENT'
);

create type public.requirement_type as enum (
  'DOCUMENT',
  'DATA',
  'CONFIRMATION'
);


-- ------------------------------------------------------------
-- 2. HELPER: updated_at
-- ------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ------------------------------------------------------------
-- 3. OPD UNITS
-- ------------------------------------------------------------

create table public.opd_units (
  id uuid primary key default gen_random_uuid(),

  code text not null unique,
  name text not null,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_opd_units_updated_at
before update on public.opd_units
for each row
execute function public.set_updated_at();


-- ------------------------------------------------------------
-- 4. PROFILES
-- Terhubung dengan Supabase Auth
-- ------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,

  full_name text not null,
  role public.app_role not null default 'TECHNICIAN',

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();


-- ------------------------------------------------------------
-- 5. SERVICES
-- Katalog layanan SIMANTIK
-- ------------------------------------------------------------

create table public.services (
  id uuid primary key default gen_random_uuid(),

  code text not null unique,
  slug text not null unique,
  name text not null,

  type public.service_type not null,
  description text,

  is_active boolean not null default true,
  sort_order integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_services_updated_at
before update on public.services
for each row
execute function public.set_updated_at();


-- ------------------------------------------------------------
-- 6. SERVICE REQUIREMENTS
-- Persyaratan yang harus dipenuhi pemohon
-- ------------------------------------------------------------

create table public.service_requirements (
  id uuid primary key default gen_random_uuid(),

  service_id uuid not null
    references public.services(id)
    on delete cascade,

  name text not null,
  description text,

  type public.requirement_type not null,

  is_required boolean not null default true,
  sort_order integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_service_requirements_updated_at
before update on public.service_requirements
for each row
execute function public.set_updated_at();


-- ------------------------------------------------------------
-- 7. INDEXES
-- ------------------------------------------------------------

create index idx_opd_units_is_active
  on public.opd_units(is_active);

create index idx_services_is_active
  on public.services(is_active);

create index idx_services_sort_order
  on public.services(sort_order);

create index idx_service_requirements_service_id
  on public.service_requirements(service_id);

create index idx_service_requirements_sort_order
  on public.service_requirements(sort_order);