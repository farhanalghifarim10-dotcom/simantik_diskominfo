# SIMANTIK — Status Terkini Sistem & Lingkungan Repositori (Current State)
## Sistem Manajemen Layanan Teknologi Informasi Diskominfo Kabupaten Bandung
**Stempel Waktu Pemeriksaan:** 19 Oktober 2026, 22:00:00 WIB

Dokumen ini mencatat kondisi faktual kode sumber, hasil eksekusi pengujian otomatis, status kompilasi produksi, kondisi basis data, dan status repository Git pasca-implementasi fitur Penerbitan Ulang Kode Pelacakan dan penyusunan commit bertahap.

---

## 1. Bukti Aktual Hasil Pengujian, Linting & Build

Seluruh pengujian dan pemeriksaan kualitas kode telah dijalankan secara langsung dengan hasil aktual sebagai berikut:

### A. Pengujian Otomatis Backend (`backend/api`)
* **Runner & Perintah**: `vitest run --config backend/api/vitest.config.ts backend/api/src` (Vitest v4.1.11)
* **Waktu Verifikasi**: 19 Oktober 2026, 22:00 WIB
* **Hasil Eksekusi**:
  - **16 test files passed** (16 dari 16 test suite lulus, **[VERIFIED]**)
  - **276 tests passed** (276 dari 276 assertion lulus, **[VERIFIED]**)
  - **0 failed, 0 skipped**
  - **Durasi Eksekusi**: ~3.1 detik
* **Rincian Test Suites Backend**:
  1. `src/applications/admin-applications.spec.ts` (35 tests passed - termasuk verifikasi otorisasi Superadmin, penerbitan ulang kode pelacakan atomik, penolakan role non-Superadmin, validasi alasan min 10 karakter, proteksi tiket terminal, eksekusi RPC PostgreSQL, penanganan kegagalan atomik, dan isolasi audit)
  2. `src/common/utils/file-validator.spec.ts` (34 tests passed - termasuk strict Base64 RFC 4648, Data URL, canonical encoding, sanitasi nama berkas, & UUID Storage key)
  3. `src/tracking/tracking.spec.ts` (32 tests passed - termasuk UUID storage key, Data URL revisi, malformed Base64, verifikasi mutasi baris kondisional, isolasi cleanup, & proteksi konkurensi)
  4. `src/applications/applications.spec.ts` (31 tests passed - termasuk Data URL submission, strict Base64 rejection, storage key UUID random tanpa nama berkas asli, sanitasi Unicode, & pencegahan metadata-only)
  5. `src/assignments/assignments.spec.ts` (20 tests passed - termasuk perhitungan beban kerja aktif dan pengabaian tiket terminal)
  6. `src/services/services.spec.ts` (18 tests passed)
  7. `src/lifecycle/lifecycle.spec.ts` (17 tests passed - termasuk regression test rute kanonis)
  8. `src/scripts/local-test-users.spec.ts` (16 tests passed)
  9. `src/common/security.spec.ts` (13 tests passed)
  10. `src/messages/messages.spec.ts` (13 tests passed)
  11. `src/technicians/technicians.spec.ts` (12 tests passed)
  12. `src/helpdesk/helpdesk.spec.ts` (12 tests passed)
  13. `src/notifications/notifications.spec.ts` (11 tests passed)
  14. `src/opd/opd.spec.ts` (7 tests passed)
  15. `src/auth/roles.guard.spec.ts` (3 tests passed)
  16. `src/app.controller.spec.ts` (2 tests passed)

### B. Pengujian Otomatis Frontend Web Layanan (`frontend/service-web`)
* **Runner & Perintah**: `vitest run` via skrip `test` di `frontend/service-web`
* **Waktu Verifikasi**: 19 Oktober 2026
* **Hasil Eksekusi**:
  - **1 test file passed** (`src/lib/submissionWizard.spec.ts`, **[VERIFIED]**)
  - **7 tests passed** (7 dari 7 assertion lulus, **[VERIFIED]**)
  - **0 failed, 0 skipped**
* **Cakupan Pengujian**: Ekstraksi persyaratan dokumen layanan, pembersihan berkas lama saat pergantian kategori layanan, dan reset field form spesifik.

### C. Status Pengujian Frontend Web Admin (`frontend/admin-web`)
* **Status Suite**: Tidak memiliki skrip test Vitest mandiri di `package.json` (**[INVENTORIED]**).
* **Metode Jaminan Mutu**: Kualitas kode dan integritas tipe divalidasi melalui pemeriksaan kompilasi TypeScript (`tsc -b`), bundel Vite (`vite build`), dan static code analysis (`oxlint`).

### D. Status Pengujian E2E & Browser Automation
* **Konfigurasi**: Skrip `npm run test:e2e` tersedia pada `backend/api` (`vitest.config.e2e.ts`).
* **Status**: **[SAFELY ISOLATED / UNTESTED ON PRODUCTION DB]**. Sesuai protokol keselamatan data, pengujian E2E yang berpotensi memutasi database utama remote sengaja tidak dijalankan secara otomatis.

### E. Hasil Linting Kode (`oxlint`)
* **Backend API (`backend/api`)**: `oxlint --type-aware src/ test/` → **0 errors**, mock unbound warnings terkontrol (**[VERIFIED]**).
* **Web Admin (`frontend/admin-web`)**: `oxlint` → **0 warnings, 0 errors** (pada seluruh berkas komponen & pages, **[VERIFIED]**).
* **Web Layanan (`frontend/service-web`)**: `oxlint` → **0 warnings, 0 errors** (pada seluruh berkas publik, **[VERIFIED]**).

### F. Hasil Kompilasi Bundel Produksi (Production Build)
* **Backend API (`backend/api`)**: `nest build` → **Exit Code 0** (Kompilasi TypeScript sukses ke folder `dist/`).
* **Web Admin (`frontend/admin-web`)**: `tsc -b && vite build` → **Exit Code 0** (Kompilasi sukses).
* **Web Layanan (`frontend/service-web`)**: `tsc -b && vite build` → **Exit Code 0** (Kompilasi sukses, bundel `dist/assets/index-wf-ewf47.css` dan `dist/assets/index-BZf4LGvQ.js`).

---

## 2. Status Git dan Riwayat Commit Repositori

Pemeriksaan status repository dilakukan secara berkala dan terstruktur pada branch fitur:

### A. Branch Aktif
* **Branch**: `feat/homepage-sabilulungan-background`
* **Basis**: `origin/main` (Sinkron dengan checkpoint UAT reset)

### B. Riwayat Tiga Commit Lokal yang Telah Dibuat
1. **Commit 1 (`3a26cd6`)**
   - **Pesan**: `feat(backend): implement atomic tracking code reissue and harden file validation`
   - **Cakupan**: 31 berkas backend, file validator, exception filter, migrasi PostgreSQL atomik `20261019161000_reissue_tracking_code_atomic.sql`, serta seluruh test suites backend terkait.
2. **Commit 2 (`d555196`)**
   - **Pesan**: `feat(design-system): modernize brand assets, ui tokens, and admin workspace`
   - **Cakupan**: 79 berkas yang mencakup aset visual PNG resmi (Diskominfo, Pemkab Bandung, SIMANTIK), penghapusan 4 berkas SVG usang, token desain & komponen UI pada kedua web, workspace Web Admin lengkap, dan modal antarmuka Superadmin `ReissueTrackingCodeModal.tsx`.
3. **Commit 3 (`6b926cf`)**
   - **Pesan**: `feat(service-web): enhance sabilulungan homepage layout and public tracking flow`
   - **Cakupan**: 13 berkas portal Web Layanan Publik, aset latar belakang institusional `hero-sabilulungan.png`, tata letak beranda Sabilulungan, dan alur pelacakan publik.

### C. Status Working Tree Saat Ini
* **Staged Changes**: 0 (Bersih)
* **Unstaged Changes**: 0 (Bersih)
* **Untracked Directory / Files**:
  - `docs/` (Dokumentasi sistem dan panduan arsitektur)
  - `scripts/` (Skrip bantuan operasional lingkungan pengembangan lokal)
  - `backend/api/src/scripts/` & `backend/api/test/` (Skrip pendukung dan fixture pengujian)
  - `incoming-brand-assets/` (Master aset logo resmi asli beresolusi tinggi yang dilindungi)

---

## 3. Kondisi Basis Data dan Lingkungan Pasca-Pembersihan UAT

Hasil verifikasi kueri READ-ONLY langsung pada Supabase menunjukkan kondisi data operasional:

| Entitas Data | Kondisi Aktual di Database | Status Validasi |
| :--- | :---: | :---: |
| **Tiket Operasional Aktif** | **0 record** | **[VERIFIED]** Bersih (siap menerima alur uji baru) |
| **Total Tabel `applications`** | **0 record** | **[VERIFIED]** Kosong |
| **Total Tabel `applicants`** | **0 record** | **[VERIFIED]** Kosong |
| **Berkas di Storage `simantik-documents`** | **0 berkas** | **[VERIFIED]** Bersih dari berkas uji lama |
| **Log Audit di `audit_logs`** | **0 record** | **[VERIFIED]** Jejak audit operasional bersih |
| **Trigger Immutability `audit_logs`** | **Aktif & Memblokir Delete** | **[VERIFIED]** Error P0001 teruji |
| **Akun Autentikasi (`auth.users`)** | **2 akun** | **[VERIFIED]** Utuh: 1 Superadmin, 1 Tenaga Ahli |
| **Profil Internal (`profiles`)** | **2 profil** | **[VERIFIED]** Utuh: Ananda & Muhammad Farhan |
| **Master Perangkat Daerah (`opd_units`)** | **13 unit** | **[VERIFIED]** Utuh: 13 OPD Kabupaten Bandung |
| **Katalog Layanan SPBE (`services`)** | **2 layanan** | **[VERIFIED]** Utuh: Baru & Pengembangan |
| **Persyaratan Layanan (`service_requirements`)** | **10 checklist** | **[VERIFIED]** Utuh: KAK, SOP, Surat, dll. |
| **Total Tabel Skema `public`** | **21 tabel** | **[VERIFIED]** 4 master, 4 transaksi, 2 riwayat, 8 lifecycle, 3 audit/pesan |
| **Tabel Skema `auth` (`auth.users`)** | **1 tabel** | **[VERIFIED]** Dikelola oleh Supabase Auth |
| **Database Views** | **0 view** | **[VERIFIED]** Tidak ada objek view |
| **Custom ENUM Types** | **14 enum** | **[VERIFIED]** Seluruh enum domain SPBE aktif |
| **Database Triggers** | **15 trigger** | **[VERIFIED]** 14 updated_at triggers + 1 append-only trigger audit |
| **Fungsi RPC Keamanan Transaksional** | `reissue_tracking_code_atomic` | **[VERIFIED]** SECURITY DEFINER, search_path = '', EXECUTE service_role |
| **Total Berkas Migrasi SQL** | **15 berkas** | **[VERIFIED]** Skema dasar hingga fungsi RPC atomik |
| **Folder Placeholder Storage** | `applications/.emptyFolderPlaceholder` | **[VERIFIED]** Utuh di bucket privat |
| **Arsip Cadangan UAT** | Terisolasi di direktori arsip lokal | **[VERIFIED]** 10 item (2 JSON + 7 PDF UAT) |

---

## 4. Panduan Melanjutkan Pekerjaan Selanjutnya

Bagi pengembang yang melanjutkan pengembangan atau pemeliharaan sistem SIMANTIK:

1. **Langkah Awal Wajib**:
   - Baca dokumen `docs/SIMANTIK_SYSTEM_CONTEXT.md` untuk memahami arsitektur, regulasi SPBE, dan alur bisnis.
   - Baca dokumen `docs/SIMANTIK_FILE_MAP.md` untuk melihat peta lengkap lokasi dan tanggung jawab setiap modul.
   - Periksa `docs/SIMANTIK_DECISIONS_AND_CHANGELOG.md` agar memahami keputusan arsitektur (ADR-001 s.d. ADR-010).
2. **Kondisi Lingkungan Kerja**:
   - Lingkungan database saat ini bersih dan siap menerima pengujian alur pengajuan baru.
   - Seluruh perubahan kode aplikasi telah tersimpan rapi dalam 3 commit bertahap pada branch `feat/homepage-sabilulungan-background`.
3. **Standar Keamanan dan Kualitas Kode**:
   - Setiap mutasi basis data transaksional yang melibatkan audit log wajib mempertahankan integritas atomik.
   - Jangan menyimpan rahasia, kredensial, atau path lokal pribadi ke dalam repositori publik.
   - Seluruh perubahan logika bisnis wajib diverifikasi melalui unit test backend (`npm test` di `backend/api`).
