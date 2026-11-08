# SIMANTIK — Sistem Manajemen Layanan Teknologi Informasi

**Pemerintah Daerah Kabupaten Bandung — Dinas Komunikasi dan Informatika (Diskominfo)**  
*Sistem Pengelolaan Permohonan Pembangunan dan Pengembangan Aplikasi Berbasis Arsitektur SPBE (Perpres 95/2018)*

---

## 1. Arsitektur & Gambaran Sistem

SIMANTIK dirancang untuk mengelola tata kelola siklus hidup perangkat lunak pemerintahan secara terstruktur, akuntabel, dan terlacak. Sistem terdiri dari tiga komponen utama yang saling terintegrasi:

```text
┌─────────────────────────────────┐       ┌─────────────────────────────────┐
│     Web Layanan (Publik)        │       │       Web Admin (Diskominfo)    │
│  - Katalog Layanan SPBE         │       │  - Dashboard & Antrean Verifikasi│
│  - Wizard Formulir Pengajuan    │       │  - Penugasan Tenaga Ahli & Work │
│  - Pelacakan Tiket (Tanpa Login)│       │  - 7 Tahapan Lifecycle Workspace│
│  - Tanggapan Revisi & Diskusi   │       │  - Master Data, Akun & Jejak Audit│
│   (React 19 + Vite, Port 5174)  │       │   (React 19 + Vite, Port 5173)  │
└────────────────┬────────────────┘       └────────────────┬────────────────┘
                 │                                         │
                 │ HTTP / REST                             │ HTTP / REST + Bearer JWT
                 ▼                                         ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                          Backend API (NestJS)                             │
│  - Port 3001 (Lokal) / 3000 (Prod) | Global Prefix: `/api/v1`             │
│  - Centralized Workflow Engine (Validasi Status & Transisi Peran)         │
│  - Anti-Brute Force Rate Limiter & Constant-Time Hash Token (HMAC-SHA256) │
│  - Assignment Authorization Boundary Enforcement (Backend Authoritative)  │
│  - Isolasi Komunikasi (Pesan Publik vs Catatan Internal)                  │
│  - Atomic Reissue Engine (Transaksi RPC PostgreSQL untuk Kode Pelacakan)  │
│  - Signed URL Generator (Penyimpanan Berkas Privat 15 Menit)              │
│  - Global Exception Filter (Penyensoran Error Database & Penyeragaman API)│
└─────────────────────────────────────┬─────────────────────────────────────┘
                                      │
                                      ▼ Service Role (Direct Client Denied)
┌───────────────────────────────────────────────────────────────────────────┐
│                        Supabase / PostgreSQL                              │
│  - 20 Tabel Skema Publik dengan Row Level Security (RLS) Default-Deny     │
│  - 15 Berkas Migrasi SQL Terkelola                                        │
│  - Storage Bucket Privat: `simantik-documents` (Signed URL Only, Max 10MB)│
│  - Append-Only Audit Trail: `audit_logs` (Anti-Tampering Trigger)         │
│  - Supabase Auth: RBAC Terpusat (SUPER_ADMIN, TECHNICIAN / Tenaga Ahli)   │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Struktur Repositori

```text
simantik/
├── backend/
│   └── api/                    # NestJS REST API Server
│       ├── src/
│       │   ├── applications/   # Pengajuan, Workflow Engine, Verifikasi & Reissue
│       │   ├── assignments/    # Penugasan Tenaga Ahli & Workspace "Pekerjaan Saya"
│       │   ├── audit/          # Layanan Audit Logging Append-Only
│       │   ├── auth/           # Supabase Auth Guards & Roles Guard
│       │   ├── common/         # Global Exception Filter & Security Suite
│       │   ├── config/         # Konfigurasi Lingkungan Peladen
│       │   ├── lifecycle/      # 7 Tahapan Siklus Hidup SPBE & Uji Kelaikan
│       │   ├── messages/       # Komunikasi Tiket Publik & Internal
│       │   ├── notifications/  # Notifikasi In-App & Email (Resend)
│       │   ├── opd/            # Master Data Perangkat Daerah (OPD)
│       │   ├── services/       # Master Katalog Layanan & Persyaratan
│       │   ├── supabase/       # Supabase Client Service Role Adapter
│       │   ├── technicians/    # Manajemen Profil & Akun Tenaga Ahli
│       │   └── tracking/       # Pelacakan Publik, Rate Limiter & Sesi HMAC
│       └── test/               # Konfigurasi Pengujian Vitest
├── frontend/
│   ├── service-web/            # Web Layanan untuk Pemohon OPD (Publik - Port 5174)
│   │   └── src/
│   │       ├── pages/          # Home Sabilulungan, Layanan, Ajukan, Tracking, Bantuan
│   │       ├── components/     # Shell UI, Header, Footer, Stepper
│   │       └── hooks/          # React Query API Connectors
│   └── admin-web/              # Web Admin Konsol Diskominfo (Internal - Port 5173)
│       └── src/
│           ├── pages/          # Dashboard, Applications, Detail, My Work,
│           │                   # Lifecycle, Messages, Notifications, Master, Audit
│           ├── features/       # Workflow Actions, Assignment Modal, Reissue Modal, RBAC
│           └── components/     # AdminLayout, Sidebar, Navigation
├── scripts/                    # Skrip Startup Otomatis PowerShell (.ps1)
│   ├── start-local-backend.ps1     # Startup Backend API (Port 3001)
│   ├── start-local-service-web.ps1 # Startup Web Layanan (Port 5174)
│   ├── start-local-admin-web.ps1   # Startup Web Admin (Port 5173)
│   └── set-local-test-passwords.ps1# Setup Kata Sandi Akun Uji Lokal
├── supabase/
│   └── migrations/             # 15 Berkas Migrasi SQL (Skema, RLS, Storage, Hardening & Atomic RPC)
└── docs/                       # Dokumentasi Resmi Sistem
    ├── PRD.md                  # Product Requirements Document Baseline
    ├── TECHNICAL-SPEC.md       # Arsitektur & Spesifikasi Desain Teknis Lengkap
    ├── HANDOVER.md             # Dokumen Serah Terima, Batasan & Panduan Rilis
    ├── PANDUAN_MEMBUKA_SISTEM.md # SOP & Langkah Menjalankan Ekosistem Lokal
    ├── SIMANTIK_SYSTEM_CONTEXT.md # Panduan Arsitektur Master C4 & Alur Bisnis
    └── SIMANTIK_DECISIONS_AND_CHANGELOG.md # Log Keputusan Arsitektur & Riwayat Perubahan
```

---

## 3. Prasyarat Lingkungan

* **Node.js**: Versi `20.x` LTS atau lebih baru
* **Package Manager**: `npm` versi `10+` atau `bun` versi `1.2+`
* **Basis Data**: Akun Supabase (atau Supabase CLI lokal / Docker Desktop) dengan PostgreSQL 15+

---

## 4. Konfigurasi Lingkungan (Environment Variables)

### A. Backend (`backend/api/.env`)
Salin berkas contoh konfigurasi:
```bash
cp backend/api/.env.example backend/api/.env
```
Isi variabel berikut:
```ini
PORT=3001
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5174,http://localhost:5174

# Supabase (Service Role Key - HANYA DI BACKEND, JANGAN DIEKSPOS KE CLIENT)
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SECRET_KEY=<your-service-role-secret-key>

# Kunci Rahasia Sesi Pelacakan Publik (HMAC-SHA256, Minimal 32 Karakter)
JWT_SECRET=simantik-production-tracking-secret-key-min-32chars!

# Resend Email Integration (Opsional, fallback simulasi logger aktif)
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=SIMANTIK Diskominfo <noreply@simantik.bandungkab.go.id>
```

### B. Web Layanan Publik (`frontend/service-web/.env.local`)
```ini
VITE_API_BASE_URL=http://127.0.0.1:3001/api/v1
```
*(Catatan: Web Layanan tidak memerlukan koneksi langsung ke Supabase demi prinsip keamanan data publik)*

### C. Web Admin Diskominfo (`frontend/admin-web/.env.local`)
```ini
VITE_API_BASE_URL=http://localhost:3001/api/v1
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=<your-anon-publishable-key>
```

---

## 5. Menjalankan Database Migrations (Supabase)

Seluruh 15 berkas migrasi tersimpan terurut di `supabase/migrations/`:
```bash
# Menggunakan Supabase CLI
supabase db push

# Atau terapkan file SQL secara berurutan via Supabase SQL Editor:
# 1. 20261007102923_initial_schema.sql
# 2. 20261007103425_applications.sql
# 3. 20261007103947_workflow.sql
# 4. 20261007104344_lifecycle.sql
# 5. 20261007104547_communication_audit.sql
# 6. 20261007104906_security_rls.sql
# 7. 20261007105722_storage.sql
# 8. 20261008150000_seed_services.sql
# 9. 20261008160000_seed_opd_units.sql
# 10. 20261008170000_lifecycle_stages.sql
# 11. 20261008180000_lifecycle_attachments.sql
# 12. 20261008190000_notifications_applicant_email.sql
# 13. 20261008200000_master_data_requirements_enhancement.sql
# 14. 20261008210000_security_hardening.sql
# 15. 20261019161000_reissue_tracking_code_atomic.sql
```

---

## 6. Menjalankan Server Pengembangan Lokal

### Metode Rekomendasi: Skrip Otomatis PowerShell (Windows)
Jalankan ketiga skrip berikut pada jendela terminal terpisah:
```powershell
# Terminal 1: Backend API (Port 3001)
.\scripts\start-local-backend.ps1

# Terminal 2: Web Layanan Publik OPD (Port 5174 -> http://127.0.0.1:5174)
.\scripts\start-local-service-web.ps1

# Terminal 3: Web Admin Diskominfo (Port 5173 -> http://localhost:5173)
.\scripts\start-local-admin-web.ps1
```

### Metode Alternatif: NPM Scripts
```bash
# 1. Jalankan Backend API
npm run dev:backend

# 2. Jalankan Web Layanan Publik
npm run dev:service

# 3. Jalankan Web Admin Diskominfo
npm run dev:admin
```

---

## 7. Pengujian dan Kompilasi (Build & Tests)

```bash
# Menjalankan seluruh pengujian unit otomatis backend (286 tests / 16 suites)
npm run test:backend

# Menjalankan linter oxlint (Web Admin & Web Layanan)
npm run lint:admin
npm run lint:service

# Kompilasi bundel produksi seluruh komponen
npm run build:all
```

---

## 8. Matriks Hak Akses Peran Pengguna (RBAC)

| Modul / Fitur | Publik (Pemohon OPD) | Tenaga Ahli (Diskominfo) | Super Admin (Diskominfo) |
| :--- | :---: | :---: | :---: |
| Katalog Layanan & Persyaratan | Baca | Baca | Kelola Penuh |
| Pengajuan Usulan Permohonan | Ajukan Baru | - | - |
| Pelacakan Tiket Publik | Akses (Kode Rahasia) | - | - |
| Tanggapan Revisi Publik | Kirim (Saat Revisi) | - | - |
| Verifikasi Berkas Administrasi | - | - | Eksekusi |
| Keputusan Persetujuan / Penolakan | - | - | Eksekusi |
| Penugasan & Re-Assignment Tenaga Ahli | - | - | Eksekusi |
| Lembar Kerja "Pekerjaan Saya" | - | Akses Penugasan Sendiri | Akses Menyeluruh |
| Mutasi Pengerjaan & Selesai | - | Hanya Tiket Penugasan | Eksekusi Bebas |
| 7 Tahapan Lifecycle Workspace | - | Hanya Tiket Penugasan | Kelola Penuh |
| Pencatatan Pengujian Kelaikan Sistem | - | Hanya Tiket Penugasan | Kelola Penuh |
| Pemeliharaan & Evaluasi SPBE | - | Hanya Tiket Penugasan | Kelola Penuh |
| Komunikasi Publik (Balas OPD) | Kirim ke Tiket Sendiri | Hanya Tiket Penugasan | Balas Bebas |
| Catatan Internal (Staff Only) | **Ditolak Total (403)** | Hanya Tiket Penugasan | Tulis / Baca Bebas |
| Penerbitan Ulang Kode Pelacakan | - | - | **Eksekusi Eksklusif (Modal 1x)** |
| Master OPD, Layanan & Tenaga Ahli | - | - | Kelola Penuh |
| Jejak Audit Sistem (*Append-Only*) | - | - | Akses Menyeluruh |

---

## 9. Tautan Dokumentasi Resmi Terkait

Seluruh dokumentasi teknis dan operasional tersimpan lengkap di direktori [`docs/`](docs/):

1. **[Product Requirements Document (PRD)](docs/PRD.md)** — Dokumen baseline spesifikasi kebutuhan produk, proses bisnis, dan aturan regulasi SPBE.
2. **[Technical Specification](docs/TECHNICAL-SPEC.md)** — Cetak biru arsitektur komprehensif, desain basis data, kontrak endpoint API, dan aturan keamanan.
3. **[Handover & Architecture Documentation](docs/HANDOVER.md)** — Dokumen serah terima resmi sistem, batasan teknis, dan lembar periksa kesiapan rilis.
4. **[Panduan Pengoperasian & Membuka Sistem](docs/PANDUAN_MEMBUKA_SISTEM.md)** — SOP praktis langkah demi langkah untuk menjalankan ekosistem lokal dari awal hingga akhir.
5. **[System Context & Master Architectural Guide](docs/SIMANTIK_SYSTEM_CONTEXT.md)** — Diagram konteks sistem C4, arsitektur tiga lapis, dan pemetaan proses SPBE.
6. **[Log Keputusan Arsitektur & Changelog](docs/SIMANTIK_DECISIONS_AND_CHANGELOG.md)** — Rekam jejak keputusan rekayasa perangkat lunak (ADR) dan kronologi perbaikan sistem.
