# Panduan Pemulihan & Rollback Perbaikan SIMANTIK

Dokumen ini mencatat seluruh rangkaian perbaikan kode yang dilakukan pada branch `perbaikan-kerja-praktek` oleh mahasiswa Kerja Praktek atas izin Pembimbing Lapangan Diskominfo Kabupaten Bandung, beserta prosedur pemulihan (rollback) jika diperlukan.

---

## 1. Titik Awal Pemulihan (Baseline)

* **Tag Baseline**: `pra-perbaikan-2026-10-28`
* **Commit Hash Baseline**: `3a695a7bdb25fb4652c3c9b9bcaa7c61d219cea0`
* **Deskripsi Baseline**: Status repositori sebelum implementasi perbaikan F1–F6 (seluruh 18 file test bawaan lulus dengan 289 pengujian).
* **Catatan Skema Basis Data**: Seluruh perbaikan F1–F6 **TIDAK** mengubah skema database (`supabase/migrations/`) maupun data tabel Supabase. Tidak ada prosedur *down-migration* SQL yang diperlukan saat melakukan rollback.

---

## 2. Tabel Riwayat Commit Perbaikan

| Kode | Commit Hash | Tipe | Judul Perbaikan & Rangkuman Perubahan |
| :--- | :--- | :--- | :--- |
| **F1** | `2fe12fc` | `fix` | **Wajibkan JWT_SECRET Tanpa Nilai Default**<br>- Menghapus fallback hardcoded `simantik-dev-secret-key-change-in-production-min-32-chars!`.<br>- Validasi ketat minimal 32 karakter saat boot NestJS (`onModuleInit`), aplikasi gagal start jika secret tidak aman.<br>- Test baru: `backend/api/test/f1-jwt-secret.spec.ts`. |
| **F2** | `d3dc992` | `fix` | **Safeguard Database Supabase & Batasi Fallback In-Memory**<br>- Tambah helper `assertSupabaseOk` di `backend/api/src/common/utils/supabase-error.utils.ts` untuk memeriksa error mutasi DB.<br>- Fallback in-memory dibatasi hanya untuk lingkungan non-produksi via flag `ALLOW_IN_MEMORY_FALLBACK`.<br>- Pembersihan storage lampiran otomatis jika metadata DB gagal disimpan.<br>- Test baru: `backend/api/test/f2-database-safeguards.spec.ts`. |
| **F3** | `c97c4c9` | `fix` | **Escape HTML Template Email, CRLF Sanitation & Rate Limit Helpdesk**<br>- Utilitas `escapeHtml`, `formatHtmlParagraph`, dan `sanitizeEmailSubject` di `backend/api/src/common/utils/html.utils.ts`.<br>- Seluruh interpolasi variabel dinamis pada email notifikasi (nama, tiket, judul, catatan) diescape.<br>- Rate limiter helpdesk publik (maksimal 5 tiket per IP per 10 menit).<br>- Test baru: `backend/api/test/f3-email-security.spec.ts`. |
| **F4** | `ba8b2bb` | `fix` | **Helmet Header, Rate Limiting, Trust Proxy & Validasi Input**<br>- Pasang `helmet` (dipin ke versi `8.3.0`, rilis 2026-07-12) dengan CSP aman.<br>- Pasang `@nestjs/throttler` (dipin ke versi `6.7.1`, rilis 2026-09-24) dengan default rate limiter global (100 req/menit).<br>- Konfigurasi `app.set('trust proxy', ...)` via env `TRUST_PROXY`.<br>- Validasi ketat payload pengajuan: batasan teks, format nomor telepon ID, dan batas ukuran decode Base64 file.<br>- Test baru: `backend/api/test/f4-security-hardening.spec.ts`. |
| **Chore F1** | `d2e8613` | `chore` | **Generator JWT_SECRET Acak Sesi Lokal**<br>- Skrip `scripts/start-local-backend.ps1` otomatis membuat kunci acak kuat 32 byte jika `JWT_SECRET` belum diset di sesi shell.<br>- Kunci diekspor ke env sesi tanpa dicetak nilainya dan tidak disimpan ke disk. |
| **F5** | `6995254` | `fix` | **Default Visibilitas Pesan Staf INTERNAL & Panduan UI**<br>- Dropdown visibilitas pesan staf/admin di `TicketDiscussionPanel.tsx` default ke `INTERNAL`.<br>- Banner peringatan visual jika staf memilih `PUBLIC`.<br>- Panduan di modal catatan revisi `AdminApplicationDetailPage.tsx` bahwa catatan dapat dibaca langsung oleh pemohon.<br>- Test baru: `backend/api/test/f5-message-visibility.spec.ts`. |
| **F6** | `650a42f` | `fix` | **Audit Log Penghapusan Lifecycle & Pembersihan Berkas Storage**<br>- `deleteTest`: hapus berkas lampiran dari bucket `simantik-documents` & catat `LIFECYCLE_TEST_DELETED`.<br>- `deleteMaintenanceRecord`: hapus berkas lampiran & catat `LIFECYCLE_MAINTENANCE_DELETED`.<br>- `deleteEvaluation`: hapus berkas lampiran & catat `LIFECYCLE_EVALUATION_DELETED`.<br>- `deleteTechnicalDocument`: hapus berkas dokumen teknis & catat `LIFECYCLE_TECHNICAL_DOCUMENT_DELETED`.<br>- Test baru: `backend/api/test/f6-lifecycle-cleanup.spec.ts`. |

---

## 3. Skenario & Langkah-Langkah Rollback

### Skenario A: Membatalkan Satu Perbaikan Tertentu (Granular Revert)

Jika ingin membatalkan satu commit tertentu tanpa memengaruhi perbaikan lainnya, gunakan `git revert`:

```powershell
# Contoh: membatalkan F5 saja
git revert 6995254 --no-edit

# Jalankan pengujian ulang
$env:Path += ";C:\Program Files\nodejs"
npm run test:backend
npm --prefix backend/api run build
```

### Skenario B: Mengembalikan Seluruh Branch ke Baseline Asli

Jika ingin mengembalikan repositori ke kondisi awal sebelum perbaikan sama sekali:

```powershell
# 1. Pastikan Anda berada di branch perbaikan-kerja-praktek
git branch --show-current

# 2. Buat branch baru untuk rollback atau revert commit secara berurutan mundur
# Urutan revert: F6 -> F5 -> Chore F1 -> F4 -> F3 -> F2 -> F1
git revert --no-commit 650a42f
git revert --no-commit 6995254
git revert --no-commit d2e8613
git revert --no-commit ba8b2bb
git revert --no-commit c97c4c9
git revert --no-commit d3dc992
git revert --no-commit 2fe12fc
git commit -m "revert: kembalikan seluruh kode ke baseline pra-perbaikan-2026-10-28"

# 3. Verifikasi kondisi pengujian sama dengan baseline (18 file, 289 passed)
$env:Path += ";C:\Program Files\nodejs"
npm run test:backend
```

---

## 4. Verifikasi Pasca-Rollback

Setelah melakukan rollback, pastikan:
1. `npm run test:backend` menghasilkan 100% test lulus.
2. Build NestJS `npm --prefix backend/api run build` berhasil tanpa error kompilasi TypeScript.
3. Aplikasi web front-end dapat dibuild dengan `npm run build:all`.
