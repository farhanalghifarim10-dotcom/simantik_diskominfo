# Panduan Pemulihan & Rollback Perbaikan SIMANTIK

Dokumen ini mencatat seluruh rangkaian perbaikan kode yang dilakukan pada branch `perbaikan-kerja-praktek` oleh mahasiswa Kerja Praktek atas izin Pembimbing Lapangan Diskominfo Kabupaten Bandung, beserta prosedur pemulihan (rollback) jika diperlukan.

---

## 1. Titik Awal Pemulihan (Baseline)

* **Tag Baseline**: `pra-perbaikan-2026-10-28`
* **Commit Hash Baseline (Full 40 Karakter)**: `3a695a7bdb25fb4652c3c9b9bcaa7c61d219cea0`
* **Deskripsi Baseline**: Status repositori sebelum implementasi perbaikan F1–F6 (seluruh 18 file test bawaan lulus dengan 289 pengujian).
* **Catatan Skema Basis Data**: Seluruh perbaikan pada rangkaian ini **TIDAK** mengubah skema database (`supabase/migrations/`) maupun data tabel Supabase. Tidak ada prosedur *down-migration* SQL yang diperlukan saat melakukan rollback.

---

## 2. Tabel Lengkap Riwayat Commit Perbaikan

| Kode | Commit Hash Penuh (SHA-1) | Tipe | Judul Perbaikan & Rangkuman Perubahan |
| :--- | :--- | :--- | :--- |
| **F1** | `2fe12fc6f4db115d613a81a4f89be54514c6fc9a` | `fix` | **Wajibkan JWT_SECRET Tanpa Nilai Default**<br>- Menghapus fallback rahasia hardcoded.<br>- Validasi ketat minimal 32 karakter saat boot di `configuration.ts` dan `TrackingTokenService`.<br>- Test: suite `describe('8. F1: JWT_SECRET Mandatory & Boot Validation')` di `src/tracking/tracking.spec.ts`. |
| **F2** | `d3dc992ebd9410c51461d5e6d54dd76ee6d0736d` | `fix` | **Safeguard Database Supabase & Batasi Fallback In-Memory**<br>- Tambah helper `assertSupabaseOk` di `src/common/utils/supabase.utils.ts` untuk memeriksa error mutasi DB.<br>- Fallback in-memory dibatasi hanya untuk lingkungan pengujian via `isInMemoryFallbackAllowed()`.<br>- Pembersihan storage lampiran otomatis jika metadata DB gagal disimpan.<br>- Test baru: `test/f2-database-safeguards.spec.ts`. |
| **F3** | `c97c4c9d332dab0fbf913f5799b5050c634cf4fc` | `fix` | **Escape HTML Template Email, CRLF Sanitation & Rate Limit Helpdesk**<br>- Utilitas `escapeHtml`, `formatHtmlParagraph`, dan `sanitizeEmailSubject` di `src/common/utils/html.utils.ts`.<br>- Seluruh interpolasi variabel dinamis pada email notifikasi diescape.<br>- Rate limiter helpdesk publik (maksimal 3 tiket per 10 menit per IP).<br>- Test baru: `test/f3-email-security.spec.ts`. |
| **F4** | `ba8b2bbd577f96189b571f6fac8db5732c7eb016` | `fix` | **Helmet Header, Rate Limiting, Trust Proxy & Validasi Input**<br>- Pasang `helmet` (dipin ke versi `8.3.0`, rilis 2026-07-12) dengan CSP aman.<br>- Pasang `@nestjs/throttler` (dipin ke versi `6.7.1`, rilis 2026-09-24) dengan default rate limiter global.<br>- Konfigurasi `app.set('trust proxy', ...)` via env `TRUST_PROXY`.<br>- Validasi ketat payload pengajuan: batasan teks, format telepon, batas total ukuran decode Base64 file (35MB).<br>- Test baru: `test/f4-security-hardening.spec.ts`. |
| **Chore F1** | `d2e86138387cedeae41b1af2310207fb57583c1f` | `chore` | **Generator JWT_SECRET Acak Sesi Lokal**<br>- Skrip `scripts/start-local-backend.ps1` otomatis membuat kunci acak kuat 32 byte jika `JWT_SECRET` belum diset di sesi shell.<br>- Kunci diekspor ke env sesi tanpa dicetak nilainya dan tidak disimpan ke disk. |
| **F5** | `699525475d6890a74f65c8f7f330dec28d36bc19` | `fix` | **Default Visibilitas Pesan Staf INTERNAL & Panduan UI**<br>- Dropdown visibilitas pesan staf/admin di `TicketDiscussionPanel.tsx` default ke `INTERNAL`.<br>- Banner peringatan visual jika staf memilih `PUBLIC`.<br>- Panduan di modal catatan revisi `AdminApplicationDetailPage.tsx`.<br>- Test baru: `test/f5-message-visibility.spec.ts`. |
| **F6** | `650a42f7a9a7f285df9537328c0672870bb613c3` | `fix` | **Audit Log Penghapusan Lifecycle & Pembersihan Berkas Storage**<br>- `deleteTest`: hapus berkas lampiran dari bucket `simantik-documents` & catat `LIFECYCLE_TEST_DELETED`.<br>- `deleteMaintenanceRecord`: hapus berkas lampiran & catat `LIFECYCLE_MAINTENANCE_DELETED`.<br>- `deleteEvaluation`: hapus berkas lampiran & catat `LIFECYCLE_EVALUATION_DELETED`.<br>- `deleteTechnicalDocument`: hapus berkas dokumen teknis & catat `LIFECYCLE_TECHNICAL_DOCUMENT_DELETED`.<br>- Test baru: `test/f6-lifecycle-cleanup.spec.ts`. |
| **K1** | `11272dec22aaf2fd51fe8cbeb3cac5f9ae8ada5c` | `fix` | **Koreksi Teks Modal Minta Revisi**<br>- Menghapus klaim pengiriman email pada modal minta revisi di `AdminApplicationDetailPage.tsx`.<br>- Teks bantuan: "Catatan ini akan ditampilkan kepada pemohon di halaman pelacakan sebagai alasan revisi." |
| **K2** | `5709d1ccd29d875727ca87740c7e9430c708d177` | `fix` | **Longgarkan Validasi Format Nomor Telepon Pendaftaran**<br>- Mengizinkan 8–30 karakter dengan format angka, spasi, +, -, dan kurung `/^[0-9+\-\s()]{8,30}$/`.<br>- Menghapus batasan spesifik format nomor telepon Indonesia.<br>- Menyelaraskan validasi di backend dan frontend serta menambahkan pengujian format di `f4-security-hardening.spec.ts`. |
| **K3** | `ab2d176ca2d709743a0e943e3fbca136d7f1c0eb` | `fix` | **Penyesuaian Throttling Global & Pengecualian Rute Internal**<br>- Mengatur batas global throttler ke 100 req/menit.<br>- Mengecualikan rute internal (`/api/v1/admin/*`, `/api/v1/technician/*`, `/api/v1/notifications`, `/api/v1/health`) menggunakan `@SkipThrottle()`.<br>- Melengkapi dokumentasi `TRUST_PROXY` beserta konsekuensinya di `README.md` dan `.env.example`. |

---

## 3. Skenario & Langkah-Langkah Rollback

### Skenario A: Membatalkan Satu Perbaikan Tertentu (Granular Revert)

Jika ingin membatalkan satu commit tertentu tanpa memengaruhi perbaikan lainnya, jalankan `git revert <hash>` menggunakan hash penuh dari tabel di atas:

```powershell
# Contoh 1: membatalkan K1 saja
git revert 11272dec22aaf2fd51fe8cbeb3cac5f9ae8ada5c --no-edit

# Contoh 2: membatalkan F5 saja
git revert 699525475d6890a74f65c8f7f330dec28d36bc19 --no-edit

# Verifikasi test dan build ulang pasca-revert
$env:Path += ";C:\Program Files\nodejs"
npm run test:backend
npm --prefix backend/api run build
```

### Skenario B: Mengembalikan Seluruh Branch ke Kondisi Baseline Asli

Jika ingin membatalkan seluruh commit perbaikan secara bersih dan teratur:

```powershell
# 1. Pastikan Anda berada di branch perbaikan-kerja-praktek
git branch --show-current

# 2. Revert commit secara berurutan mundur dari yang terbaru ke terlama:
git revert --no-commit ab2d176ca2d709743a0e943e3fbca136d7f1c0eb # K3
git revert --no-commit 5709d1ccd29d875727ca87740c7e9430c708d177 # K2
git revert --no-commit 11272dec22aaf2fd51fe8cbeb3cac5f9ae8ada5c # K1
git revert --no-commit 650a42f7a9a7f285df9537328c0672870bb613c3 # F6
git revert --no-commit 699525475d6890a74f65c8f7f330dec28d36bc19 # F5
git revert --no-commit d2e86138387cedeae41b1af2310207fb57583c1f # Chore F1
git revert --no-commit ba8b2bbd577f96189b571f6fac8db5732c7eb016 # F4
git revert --no-commit c97c4c9d332dab0fbf913f5799b5050c634cf4fc # F3
git revert --no-commit d3dc992ebd9410c51461d5e6d54dd76ee6d0736d # F2
git revert --no-commit 2fe12fc6f4db115d613a81a4f89be54514c6fc9a # F1

# 3. Buat commit pemulihan
git commit -m "revert: kembalikan seluruh kode ke baseline pra-perbaikan-2026-10-28"

# 4. Verifikasi kondisi pengujian kembali sama persis dengan baseline (18 file, 289 passed)
$env:Path += ";C:\Program Files\nodejs"
npm run test:backend
```

---

## 4. Verifikasi Pasca-Rollback

Setelah melakukan rollback, pastikan:
1. `npm run test:backend` menghasilkan 100% test lulus.
2. Build NestJS `npm --prefix backend/api run build` berhasil tanpa galat kompilasi TypeScript.
3. Seluruh frontend dapat dikompilasi dengan `npm run build:all`.
