# SIMANTIK — Sistem Manajemen Layanan Teknologi Informasi

**Pemerintah Daerah Kabupaten Bandung — Dinas Komunikasi dan Informatika (Diskominfo)**  
*Sistem Pengelolaan Permohonan Pembangunan dan Pengembangan Aplikasi Berbasis Arsitektur SPBE (Perpres 95/2018)*

---

## 1. Arsitektur & Gambaran Sistem

SIMANTIK dirancang untuk mengelola tata kelola siklus hidup perangkat lunak pemerintahan secara terstruktur, akuntabel, dan terlacak. Sistem terdiri dari tiga komponen utama yang saling terintegrasi:

```
┌─────────────────────────────────┐       ┌─────────────────────────────────┐
│     Web Layanan (Publik)        │       │       Web Admin (Diskominfo)    │
│  - Katalog Layanan SPBE         │       │  - Dashboard & Antrean Verifikasi│
│  - Wizard Formulir Pengajuan    │       │  - Penugasan Teknisi & My Work   │
│  - Pelacakan Tiket (Tanpa Login)│       │  - 7 Tahapan Lifecycle Workspace │
│  - Tanggapan Revisi & Chat      │       │  - Master Data, Akun & Jejak Audit│
│   (React 19 + Vite + Tailwind)  │       │   (React 19 + Vite + Tailwind)  │
└────────────────┬────────────────┘       └────────────────┬────────────────┘
                 │                                         │
                 │ HTTP / REST                             │ HTTP / REST + Bearer JWT
                 ▼                                         ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                          Backend API (NestJS)                             │
│  - Centralized Workflow Engine (Validasi Status & Transisi Peran)         │
│  - Anti-Brute Force Rate Limiter & Constant-Time Hash Token (HMAC-SHA256) │
│  - Assignment Authorization Boundary Enforcement (Backend Authoritative)  │
│  - Isolasi Komunikasi (Pesan Publik vs Catatan Internal)                  │
│  - Signed URL Generator (Penyimpanan Berkas Privat 15 Menit)              │
│  - Global Exception Filter (Penyensoran Error Database & Penyeragaman API)│
└─────────────────────────────────────┬─────────────────────────────────────┘
                                      │
                                      ▼ Service Role (Direct Client Denied)
┌───────────────────────────────────────────────────────────────────────────┐
│                        Supabase / PostgreSQL                              │
│  - 18 Tabel dengan Row Level Security (RLS) Aktif                         │
│  - Default Deny: Akses langsung dari anon & authenticated ditolak         │
│  - Storage Bucket Privat: `simantik-documents` (Signed URL Only)          │
│  - Append-Only Audit Trail: `audit_logs` (Anti-Tampering Trigger)         │
│  - Supabase Auth: RBAC Terpusat (SUPER_ADMIN, TECHNICIAN)                 │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Struktur Repositori

```text
simantik/
├── backend/
│   └── api/                    # NestJS REST API Server
│       ├── src/
│       │   ├── applications/   # Pengajuan, Workflow Engine, Verifikasi
│       │   ├── assignments/    # Penugasan Teknisi & Workspace "My Work"
│       │   ├── audit/          # Layanan Audit Logging Append-Only
│       │   ├── auth/           # Supabase Auth Guards & Roles Guard
│       │   ├── common/         # Global Exception Filter & Security Suite
│       │   ├── lifecycle/      # 7 Tahapan Siklus Hidup SPBE & Uji Kelaikan
│       │   ├── messages/       # Komunikasi Tiket Publik & Internal
│       │   ├── notifications/  # Notifikasi In-App & Email (Resend)
│       │   ├── opd/            # Master Data Perangkat Daerah (OPD)
│       │   ├── services/       # Master Katalog Layanan & Persyaratan
│       │   ├── supabase/       # Supabase Client Service Role Adapter
│       │   ├── technicians/    # Manajemen Akun Teknisi
│       │   └── tracking/       # Pelacakan Publik & Anti-Brute Force
│       └── test/               # Konfigurasi Pengujian Vitest
├── frontend/
│   ├── service-web/            # Web Layanan untuk Pemohon OPD (Publik)
│   │   └── src/
│   │       ├── pages/          # Home, Layanan, Ajukan, Tracking, Bantuan
│   │       ├── components/     # Shell UI, Header, Footer, Stepper
│   │       └── hooks/          # React Query API Connectors
│   └── admin-web/              # Web Admin Konsol Diskominfo
│       └── src/
│           ├── pages/          # Dashboard, Applications, Detail, My Work,
│           │                   # Lifecycle, Messages, Notifications, Master, Audit
│           ├── features/       # Workflow Actions, Assignment Modal, RBAC
│           └── components/     # AdminLayout, Sidebar, Navigation
├── supabase/
│   └── migrations/             # Migrasi Skema SQL, RLS, Storage & Hardening
└── docs/
    ├── PRD.md                  # Product Requirements Document Baseline
    ├── TECHNICAL-SPEC.md       # Arsitektur & Spesifikasi Desain Teknis
    └── HANDOVER.md             # Dokumen Handover, Batasan & Panduan Rilis
```

---

## 3. Prasyarat Lingkungan

* **Node.js**: Versi `20.x` LTS atau lebih baru
* **Package Manager**: `npm` versi `10+` atau `bun` versi `1.2+`
* **Basis Data**: Akun Supabase (atau Supabase CLI lokal) dengan PostgreSQL 15+

---

## 4. Konfigurasi Lingkungan (Environment Variables)

### A. Backend (`backend/api/.env`)
Salin berkas contoh konfigurasi:
```bash
cp backend/api/.env.example backend/api/.env
```
Isi variabel berikut:
```ini
PORT=3000
CORS_ORIGINS=http://localhost:5173,http://localhost:5174

# Supabase (Service Role Key - HANYA DI BACKEND)
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SECRET_KEY=<your-service-role-secret-key>

# Kunci Rahasia Sesi Pelacakan Publik (HMAC-SHA256, Minimal 32 Karakter)
JWT_SECRET=simantik-production-tracking-secret-key-min-32chars!

# Resend Email Integration (Opsional, fallback simulasi aktif)
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=SIMANTIK Diskominfo <noreply@simantik.bandungkab.go.id>
```

### B. Web Layanan Publik (`frontend/service-web/.env`)
```bash
cp frontend/service-web/.env.example frontend/service-web/.env
```
```ini
VITE_API_BASE_URL=http://localhost:3000/api/v1
```
*(Catatan: Web Layanan tidak memerlukan koneksi langsung ke Supabase demi prinsip keamanan data publik)*

### C. Web Admin Diskominfo (`frontend/admin-web/.env`)
```bash
cp frontend/admin-web/.env.example frontend/admin-web/.env
```
```ini
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your-anon-publishable-key>
```

---

## 5. Menjalankan Database Migrations (Supabase)

Seluruh migrasi tersimpan urut di `supabase/migrations/`:
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
```

---

## 6. Menjalankan Server Pengembangan Lokal

Gunakan skrip terpadu dari akar repositori:
```bash
# 1. Jalankan Backend API (Port 3000)
npm run dev:backend

# 2. Jalankan Web Layanan Publik (Port 5173)
npm run dev:service

# 3. Jalankan Web Admin Diskominfo (Port 5174)
npm run dev:admin
```

---

## 7. Pengujian dan Kompilasi (Build & Tests)

```bash
# Menjalankan seluruh pengujian otomatis backend (125 tests)
npm run test:backend

# Menjalankan linter oxlint (Web Admin & Web Layanan)
npm run lint:admin
npm run lint:service

# Kompilasi bundel produksi seluruh komponen
npm run build:all
```

---

## 8. Matriks Hak Akses Peran Pengguna (RBAC)

| Modul / Fitur | Publik (Pemohon OPD) | TEKNISI (Diskominfo) | SUPER_ADMIN (Diskominfo) |
| :--- | :---: | :---: | :---: |
| Katalog Layanan & Persyaratan | Baca | Baca | Kelola Penuh |
| Pengajuan Usulan Permohonan | Ajukan Baru | - | - |
| Pelacakan Tiket Publik | Akses (Kode Rahasia) | - | - |
| Tanggapan Revisi Publik | Kirim (Saat Revisi) | - | - |
| Verifikasi Berkas Administrasi | - | - | Eksekusi |
| Keputusan Persetujuan / Penolakan | - | - | Eksekusi |
| Penugasan & Re-Assignment Teknisi | - | - | Eksekusi |
| Lembar Kerja "My Work" | - | Akses Penugasan Sendiri | Akses Menyeluruh |
| Mutasi Pengerjaan & Selesai | - | Hanya Tiket Penugasan | Eksekusi Bebas |
| 7 Tahapan Lifecycle Workspace | - | Hanya Tiket Penugasan | Kelola Penuh |
| Pencatatan Pengujian Kelaikan Sistem | - | Hanya Tiket Penugasan | Kelola Penuh |
| Pemeliharaan & Evaluasi SPBE | - | Hanya Tiket Penugasan | Kelola Penuh |
| Komunikasi Publik (Balas OPD) | Kirim ke Tiket Sendiri | Hanya Tiket Penugasan | Balas Bebas |
| Catatan Internal (Staff Only) | **Ditolak Total (403)** | Hanya Tiket Penugasan | Tulis / Baca Bebas |
| Master OPD, Layanan & Teknisi | - | - | Kelola Penuh |
| Jejak Audit Sistem | - | - | Akses Menyeluruh |

---

## 9. Tautan Dokumentasi Terkait

* [Product Requirements Document (PRD)](docs/PRD.md)
* [Technical Specification](docs/TECHNICAL-SPEC.md)
* [Handover, Architecture & Release Documentation](docs/HANDOVER.md)
