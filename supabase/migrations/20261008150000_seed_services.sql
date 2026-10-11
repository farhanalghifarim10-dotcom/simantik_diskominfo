-- ============================================================
-- SIMANTIK - Seed Service Catalog & Requirements
-- Katalog layanan dasar: Pembangunan dan Pengembangan Aplikasi
-- ============================================================

-- 1. Services Seed
INSERT INTO public.services (id, code, slug, name, type, description, is_active, sort_order)
VALUES 
  (
    '11111111-1111-1111-1111-111111111111',
    'SRV-DEV',
    'pembangunan-aplikasi',
    'Pembangunan Aplikasi Baru',
    'DEVELOPMENT',
    'Layanan perancangan dan pembangunan sistem informasi baru dari tahap awal untuk mendukung operasional atau inovasi OPD yang belum terakomodasi dalam sistem eksisting.',
    true,
    1
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'SRV-ENH',
    'pengembangan-aplikasi',
    'Pengembangan Aplikasi Eksisting',
    'ENHANCEMENT',
    'Layanan penambahan modul, perubahan alur proses bisnis, integrasi interoperabilitas API, atau penyesuaian regulasi baru pada aplikasi yang telah aktif beroperasi.',
    true,
    2
  )
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  type = EXCLUDED.type,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order;

-- 2. Service Requirements Seed: Pembangunan Aplikasi Baru
INSERT INTO public.service_requirements (id, service_id, name, description, type, is_required, sort_order)
VALUES
  (
    'a1111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'Surat Permohonan Resmi OPD',
    'Surat dinas resmi berkop OPD dan ditandatangani oleh Kepala Perangkat Daerah / minimal Pejabat Eselon II (Format PDF, maks. 5 MB).',
    'DOCUMENT',
    true,
    1
  ),
  (
    'a2222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'Kerangka Acuan Kerja (KAK)',
    'Dokumen memuat latar belakang, maksud dan tujuan, ruang lingkup proses bisnis, output, dan jadwal tentatif (Format PDF, maks. 10 MB).',
    'DOCUMENT',
    true,
    2
  ),
  (
    'a3333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    'Identitas Narahubung / PIC Teknis',
    'Nama, NIP, Jabatan, Nomor WhatsApp, dan Email pejabat/staf teknis yang ditugaskan sebagai kontak utama dari OPD.',
    'DATA',
    true,
    3
  ),
  (
    'a4444444-4444-4444-4444-444444444444',
    '11111111-1111-1111-1111-111111111111',
    'Bagan Alur Bisnis / SOP Pelayanan',
    'Diagram atau uraian alur operasional proses pelayanan yang akan didigitalkan ke dalam sistem (Opsional namun disarankan).',
    'DOCUMENT',
    false,
    4
  ),
  (
    'a5555555-5555-5555-5555-555555555555',
    '11111111-1111-1111-1111-111111111111',
    'Konfirmasi Komitmen Penyelenggaraan SPBE',
    'Pernyataan kesiapan dan komitmen perangkat daerah dalam penyediaan data, integrasi, dan pengujian sistem bersama Diskominfo.',
    'CONFIRMATION',
    true,
    5
  )
ON CONFLICT (id) DO NOTHING;

-- 3. Service Requirements Seed: Pengembangan Aplikasi Eksisting
INSERT INTO public.service_requirements (id, service_id, name, description, type, is_required, sort_order)
VALUES
  (
    'b1111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    'Surat Permohonan Perubahan / Pengembangan',
    'Surat dinas resmi dari pimpinan OPD pemohon yang menguraikan dasar permohonan pengembangan (Format PDF, maks. 5 MB).',
    'DOCUMENT',
    true,
    1
  ),
  (
    'b2222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    'Dokumen Kebutuhan Fitur (Change Request)',
    'Daftar rincian menu, field, formulir, atau laporan yang diminta untuk ditambahkan atau disesuaikan (Format PDF/Excel, maks. 10 MB).',
    'DOCUMENT',
    true,
    2
  ),
  (
    'b3333333-3333-3333-3333-333333333333',
    '22222222-2222-2222-2222-222222222222',
    'Informasi Sistem Eksisting',
    'Nama aplikasi, URL/domain aktif, dan informasi pengguna/basis data terkait.',
    'DATA',
    true,
    3
  ),
  (
    'b4444444-4444-4444-4444-444444444444',
    '22222222-2222-2222-2222-222222222222',
    'PIC Pengelola Aplikasi Eksisting',
    'Kontak narahubung teknis yang menguasai operasional harian aplikasi eksisting.',
    'DATA',
    true,
    4
  ),
  (
    'b5555555-5555-5555-5555-555555555555',
    '22222222-2222-2222-2222-222222222222',
    'Dokumentasi / Berita Acara Rilis Sebelumnya',
    'Salinan berita acara serah terima atau dokumen teknis rilis sebelumnya jika tersedia (Opsional).',
    'DOCUMENT',
    false,
    5
  )
ON CONFLICT (id) DO NOTHING;
