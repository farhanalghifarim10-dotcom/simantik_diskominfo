-- ============================================================
-- SIMANTIK - Seed OPD Units & Applications Idempotency
-- ============================================================

-- 1. Tambah kolom idempotency_key pada applications jika belum ada
ALTER TABLE public.applications
ADD COLUMN IF NOT EXISTS idempotency_key text UNIQUE;

-- 2. Seed OPD Units Pemerintah Daerah Kabupaten Bandung
INSERT INTO public.opd_units (id, code, name, is_active)
VALUES
  ('c1111111-1111-1111-1111-111111111111', 'DISKOMINFO', 'Dinas Komunikasi dan Informatika', true),
  ('c2222222-2222-2222-2222-222222222222', 'BAPENDA', 'Badan Pendapatan Daerah', true),
  ('c3333333-3333-3333-3333-333333333333', 'BKPSDM', 'Badan Kepegawaian dan Pengembangan Sumber Daya Manusia', true),
  ('c4444444-4444-4444-4444-444444444444', 'DINKES', 'Dinas Kesehatan', true),
  ('c5555555-5555-5555-5555-555555555555', 'DISDIK', 'Dinas Pendidikan', true),
  ('c6666666-6666-6666-6666-666666666666', 'DINSOS', 'Dinas Sosial', true),
  ('c7777777-7777-7777-7777-777777777777', 'SETDA', 'Sekretariat Daerah', true),
  ('c8888888-8888-8888-8888-888888888888', 'BAPPERIDA', 'Badan Perencanaan Pembangunan, Riset dan Inovasi Daerah', true),
  ('c9999999-9999-9999-9999-999999999999', 'INSPEKTORAT', 'Inspektorat Daerah', true),
  ('caaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'DPUTR', 'Dinas Pekerjaan Umum dan Tata Ruang', true),
  ('cbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'DISDUKCAPIL', 'Dinas Kependudukan dan Pencatatan Sipil', true),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'DISHUB', 'Dinas Perhubungan', true),
  ('cddddddd-dddd-dddd-dddd-dddddddddddd', 'SATPOLPP', 'Satuan Polisi Pamong Praja', true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  is_active = EXCLUDED.is_active;
