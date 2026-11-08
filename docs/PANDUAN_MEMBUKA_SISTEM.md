# PANDUAN PENGOPERASIAN & TAHAPAN MEMBUKA SISTEM SIMANTIK
## Sistem Manajemen Layanan Teknologi Informasi
**Dinas Komunikasi dan Informatika (Diskominfo) Pemerintah Kabupaten Bandung**

---

## 1. Ringkasan Ekosistem & Pemetaan Port Lokal

SIMANTIK beroperasi menggunakan arsitektur tiga lapis (*three-tier architecture*). Ketika dijalankan melalui skrip otomatis PowerShell, berikut adalah pemetaan port aktifnya:

| Komponen | Peran & Pengguna | Port Aktif | URL Akses di Browser |
| :--- | :--- | :---: | :--- |
| **Web Admin** | Konsol internal staf Diskominfo (Verifikasi, penugasan Tenaga Ahli, 7 siklus SPBE) | `5173` | **`http://localhost:5173`** |
| **Web Layanan** | Portal publik pemohon OPD (Pendaftaran layanan & pelacakan status tanpa login) | `5174` | **`http://127.0.0.1:5174`** |
| **Backend API** | Mesin otoritatif NestJS (Pengelola aturan bisnis, keamanan, dan storage) | `3001` | **`http://localhost:3001/api/v1`** |
| **Supabase Local** | PostgreSQL 15, Auth engine, dan S3 Storage emulator | `54321` / `54323` | **`http://localhost:54323`** *(Studio)* |

---

## 2. Prasyarat Perangkat Lunak (*Prerequisites*)

Pastikan perangkat lunak berikut telah siap di komputer/laptop:
1. **Docker Desktop**: Berstatus *Running / Engine Running* (dibutuhkan untuk database Supabase lokal).
2. **Node.js**: Versi `20 LTS` atau lebih baru.
3. **Web Browser**: Google Chrome atau Microsoft Edge.

---

## 3. METODE UTAMA: Menjalankan Sistem via Skrip Otomatis (Rekomendasi)

Jalankan ketiga skrip PowerShell berikut di tiga jendela terminal terpisah dari root folder proyek (`D:\Projects\simantik`):

### Terminal 1: Menjalankan Backend API NestJS
> **Catatan jika muncul error ExecutionPolicy / UnauthorizedAccess**:
> Jalankan perintah ini sekali di PowerShell: `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned` (pilih `A` / Yes to All).

```powershell
PS D:\Projects\simantik> .\scripts\start-local-backend.ps1
```
* **Fungsi**: Otomatis mengekstrak status Supabase lokal, mengonfigurasi `JWT_SECRET` aman, dan menjalankan NestJS pada port **3001**.
* **Indikator Sukses**: Muncul baris log `[NestApplication] Nest application successfully started`.
* **Cek Kesehatan**: `http://localhost:3001/api/v1/health` &rarr; `{"status":"ok"}`.

---

### Terminal 2: Menjalankan Web Layanan (Portal Publik OPD)
```powershell
PS D:\Projects\simantik> .\scripts\start-local-service-web.ps1
```
* **Fungsi**: Menjalankan portal pendaftaran dan pelacakan tiket publik pada port **5174**.
* **URL Akses**: Buka peramban di **`http://127.0.0.1:5174`**.
* **Fitur Utama**:
  - Pendaftaran Permohonan Baru via 6-Step Submission Wizard (`/ajukan`).
  - Pelacakan Status Permohonan via Nomor Tiket & Kode Pelacakan (`/tracking`).
  - Konsultasi daring / Helpdesk publik OPD.

---

### Terminal 3: Menjalankan Web Admin (Konsol Internal Diskominfo)
```powershell
PS D:\Projects\simantik> .\scripts\start-local-admin-web.ps1
```
* **Fungsi**: Menjalankan konsol administrasi staf Diskominfo pada port **5173**.
* **URL Akses**: Buka peramban di **`http://localhost:5173`**.
* **Fitur Utama**:
  - Dashboard statistik antrean tiket dan rekapitulasi beban kerja.
  - Verifikasi berkas administrasi dan telaah teknis kelayakan sistem.
  - Penugasan Tenaga Ahli penanggung jawab permohonan.
  - Lembar kerja 7 tahapan siklus hidup SPBE (Analisis, Perencanaan, Desain, Implementasi, Pengujian, Pemeliharaan, Evaluasi).
  - Modal penerbitan ulang kode pelacakan darurat (*One-Time Reissue Modal*).

---

## 4. Kredensial Akun Login Lokal (Supabase Local Docker)

Gunakan akun resmi yang terdaftar di Supabase lokal untuk masuk ke **Web Admin (`http://localhost:5173`)**:

| Peran (*Role*) | Nama Personel | Alamat Email | Kata Sandi (*Password*) | Hak Akses Utama |
| :--- | :--- | :--- | :--- | :--- |
| **Super Admin** | Super Administrator SIMANTIK | `superadmin.local@simantik.test` | **`admin123`** | Akses penuh verifikasi permohonan, penugasan teknisi, master data, dan audit trail. |
| **Tenaga Ahli** | Tenaga Ahli SIMANTIK | `tenagaahli.local@simantik.test` | **`admin123`** | Akses lembar kerja "Pekerjaan Saya", update 7 siklus SPBE, dan unggah dokumen pengujian. |

---

## 5. Alur Uji Coba Pengoperasian Sistem (*End-to-End Walkthrough*)

Untuk menguji dan memvalidasi alur bisnis sistem secara menyeluruh dari awal hingga akhir:

```text
1. Ajukan Permohonan Baru
   Buka http://127.0.0.1:5174/ajukan → Pilih OPD (Dinas Kesehatan) → Isi data penanggung jawab → Unggah KAK dummy (PDF) → Kirim.
   Catat NOMOR TIKET (misal: SIM-2026-000101) dan KODE PELACAKAN (misal: TRK-A1B2C3D4).

2. Lacak Permohonan sebagai Publik OPD
   Buka http://127.0.0.1:5174/tracking → Masukkan tiket dan kode pelacakan → Verifikasi status "DIAJUKAN (SUBMITTED)".

3. Verifikasi & Penugasan Staf di Web Admin
   Buka http://localhost:5173 → Login sebagai Super Admin (`superadmin.local@simantik.test` / `admin123`).
   Buka tiket yang baru masuk → Telaah berkas KAK → Klik Setujui Permohonan → Tugaskan Tenaga Ahli.

4. Eksekusi Lembar Kerja Siklus Hidup SPBE
   Buka http://localhost:5173 → Login sebagai Tenaga Ahli (`tenagaahli.local@simantik.test` / `admin123`).
   Buka menu "Pekerjaan Saya" → Klik "Mulai Pengerjaan" → Isi lembar Analisis Kebutuhan dan Catatan Pengujian Kelaikan.
```

---

## 6. Tips & Penanganan Kendala (*Troubleshooting*)

1. **Galat PowerShell Script UnauthorizedAccess / Not Digitally Signed**:
   - Penyebab: Kebijakan keamanan default Windows memblokir file skrip `.ps1`.
   - Solusi: Jalankan `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned` lalu ketik `A` (Yes to All).
2. **Memastikan Supabase Lokal Nyala**:
   - Jika terminal menampilkan galat koneksi basis data, pastikan container menyala dengan perintah: `npx supabase status`.
   - Untuk menyalakan ulang database lokal: `npx supabase stop` lalu `npx supabase start`.
3. **Dashboard Supabase Studio**:
   - Untuk melihat isi tabel database PostgreSQL atau data akun secara visual, buka: **`http://localhost:54323`**.
4. **Menghentikan Layanan**:
   - Untuk mematikan server backend atau frontend, cukup tekan kombinasi tombol **`Ctrl + C`** di jendela terminal masing-masing.
