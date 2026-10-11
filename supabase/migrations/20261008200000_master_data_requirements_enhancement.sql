-- ============================================================
-- SIMANTIK - Phase 13 Master Data & Requirements Enhancement
-- Menambahkan kolom pendukung validasi berkas pada service_requirements
-- dan email pelengkap pada profil internal.
-- ============================================================

-- 1. Tambah kolom konfigurasi berkas & status aktif pada service_requirements
alter table public.service_requirements
  add column if not exists is_active boolean not null default true,
  add column if not exists allowed_file_types text default 'application/pdf,image/png,image/jpeg',
  add column if not exists max_file_size_mb integer default 10;

-- Indeks status aktif persyaratan
create index if not exists idx_service_requirements_is_active
  on public.service_requirements(is_active);

-- 2. Tambah kolom email pada profiles jika belum ada untuk efisiensi query
alter table public.profiles
  add column if not exists email text;

-- Index profil aktif
create index if not exists idx_profiles_role_active
  on public.profiles(role, is_active);
