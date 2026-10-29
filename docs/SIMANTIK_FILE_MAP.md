# SIMANTIK — Peta File dan Inventaris Hubungan Modul (Master File Map)
## Sistem Manajemen Layanan Teknologi Informasi Diskominfo Kabupaten Bandung

Dokumen ini memetakan seluruh berkas penting pada repositori SIMANTIK, fungsi aktualnya berdasarkan kode sumber, hubungan ketergantungan antarberkas, klasifikasi, peran arsitektural, serta risiko teknis jika berkas diubah atau dihapus.

### Metodologi dan Kalibrasi Tingkat Audit
Setiap berkas dalam inventaris ini dikelompokkan berdasarkan bukti aktual pemeriksaan:
- **`[VERIFIED]`**: Berkas yang telah dibaca langsung baris demi baris, diuji eksekusinya, diverifikasi logikanya, dan dicocokkan antar-lapis secara mendalam.
- **`[INVENTORIED]`**: Berkas yang telah diverifikasi eksistensi fisik dan lokasinya pada repositori Git/tree proyek tanpa analisis seluruh baris kode.
- **`[SAMPLED]`**: Berkas yang telah diuji melalui sampel representatif kode atau tampilannya (misal: komponen UI atomik, dialog modal).
- **`[NEEDS VERIFICATION]`**: Komponen yang konfigurasinya tersedia namun perilakunya belum dapat dipastikan secara definitif pada basis data produksi (misal: pengujian E2E interaktif remote).

---

## 1. Backend API (`backend/api/`)

### A. Root & Konfigurasi Backend
| Path Berkas | Klasifikasi | Audit | Tanggung Jawab & Fungsi Aktual | Dependensi / Dipanggil Oleh | Risiko Jika Diubah/Dihapus |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `backend/api/src/main.ts` | Production Code | `[VERIFIED]` | Entry point aplikasi NestJS (Express adapter). Mengatur limit body JSON 50MB (dukung upload dokumen base64), global prefix `/api/v1`, CORS, dan `HttpExceptionFilter`. | Dijalankan saat server start (`node dist/main.js`). | **KRITIS**: Server gagal menyala, CORS rusak, error database bocor ke publik, atau upload dokumen gagal karena payload terlalu besar. |
| `backend/api/src/app.module.ts` | Production Code | `[VERIFIED]` | Root module NestJS yang mendaftarkan seluruh submodul aplikasi dan memuat `ConfigModule` global. | `main.ts` | **KRITIS**: Seluruh endpoint aplikasi mati jika modul tidak terdaftar. |
| `backend/api/src/config/configuration.ts` | Configuration | `[VERIFIED]` | Membaca variabel environment (`PORT`, `CORS_ORIGINS`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `JWT_SECRET`, `RESEND_API_KEY`) ke objek konfigurasi bertipe data aman. | `app.module.ts`, `supabase.service.ts` | Konfigurasi runtime hilang atau gagal koneksi ke basis data. |
| `backend/api/src/supabase/supabase.service.ts` | Production Code | `[VERIFIED]` | Menginisialisasi dan menyediakan `SupabaseClient` dengan service-role key tanpa auto-refresh token untuk akses backend berwenang penuh. | Digunakan oleh seluruh service backend. | **KRITIS**: Seluruh kueri basis data dan akses Storage gagal total. |

---

### B. Modul Permohonan, Penerbitan Kode & Workflow Engine (`backend/api/src/applications/`)
| Path Berkas | Klasifikasi | Audit | Tanggung Jawab & Fungsi Aktual | Dependensi / Dipanggil Oleh | Risiko Jika Diubah/Dihapus |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `src/applications/workflow/workflow.engine.ts` | Production Code | `[VERIFIED]` | **Sentral Mesin Alur Kerja**: Memvalidasi aturan transisi status (`validateTransition`), mengevaluasi kewajiban catatan telaah, dan memvalidasi transisi tahapan siklus hidup SPBE (`validateStageTransition`). Menolak perubahan stage pada status terminal (`COMPLETED`, `CLOSED`, `REJECTED`, `CANCELLED`). | `admin-applications.service.ts`, `assignments.service.ts` | **KRITIS**: Logika bisnis dan kepatuhan alur permohonan SPBE rusak; status tidak sah dapat lolos ke database. |
| `src/applications/workflow/workflow.types.ts` | Type Definition | `[VERIFIED]` | Tipe data TypeScript untuk enum `ApplicationStatus`, `ApplicationStage`, aturan transisi, dan DTO eksekusi mutasi alur kerja. | Seluruh modul backend & workflow engine. | Error kompilasi tipe data di seluruh backend. |
| `src/applications/admin-applications.controller.ts` | Production Code | `[VERIFIED]` | Endpoint manajemen permohonan untuk admin: `GET /api/v1/admin/applications`, `GET :id`, `POST :id/transitions`, `POST :id/stage-transitions`, shortcut verify/approve/reject, catatan internal, signed URL berkas, serta endpoint khusus Superadmin `POST :id/reissue-tracking-code` (penerbitan ulang kode pelacakan). | Dipanggil oleh frontend Web Admin (`useAdminApplications`). | Administrator kehilangan kendali atas verifikasi, penolakan, dan penerbitan ulang kode pelacakan. |
| `src/applications/admin-applications.service.ts` | Production Code | `[VERIFIED]` | Logika bisnis daftar permohonan, filtering, detail tiket, eksekusi transisi status, pencatatan status history, notifikasi, audit logging, penegakan batas penugasan teknisi, dan **penerbitan ulang kode pelacakan atomik**: menghasilkan kode acak 128-bit (`TRK-...`), menghitung hash SHA-256, dan memanggil fungsi RPC PostgreSQL `reissue_tracking_code_atomic`. | `admin-applications.controller.ts`, `assignments.service.ts` | Fitur verifikasi admin dan penerbitan ulang kode pelacakan darurat tidak berfungsi. |
| `src/applications/admin-applications.types.ts` | Type Definition | `[VERIFIED]` | DTO dan interface TypeScript untuk penerbitan ulang kode pelacakan (`ReissueTrackingCodeDto`, `ReissueTrackingCodeResult`) dan manajemen admin. | `admin-applications.controller.ts`, `admin-applications.service.ts` | Tipe data endpoint penerbitan ulang tidak sinkron. |
| `src/applications/applications.controller.ts` | Production Code | `[VERIFIED]` | Endpoint publik untuk pemohon OPD: `GET /api/v1/applications/opd-units` dan `POST /api/v1/applications` (pengajuan tiket baru via wizard). Memeriksa format Base64/Data URL dan mendekode secara ketat via `file-validator`. | Dipanggil oleh Web Layanan (`useSubmitApplication`). | Pemohon OPD tidak dapat mengirim usulan aplikasi baru. |
| `src/applications/applications.service.ts` | Production Code | `[VERIFIED]` | Validasi integritas pengajuan publik (cek OPD, layanan, syarat KAK, validasi Base64 ketat, mewajibkan buffer biner > 0 dan lolos magic bytes sebelum mutasi DB), generate nomor tiket unik (`SIM-YYYY-XXXXXX`), generate kode pelacakan acak 128-bit (`TRK-...`), hashing tracking code SHA-256, insert atomic pemohon dan tiket, Storage key acak UUID buatan server tanpa nama asli di path, sanitasi nama berkas, rollback cleanup kompensasi, audit logging. | `applications.controller.ts` | Registrasi permohonan baru gagal, nomor tiket duplikat, atau record yatim tersimpan saat upload korup. |
| `src/applications/admin-applications.spec.ts` | Test Suite | `[VERIFIED]` | Unit test Vitest untuk verifikasi listing, filtering, detail permohonan, proteksi tiket terminal, eksekusi transisi status, otorisasi Superadmin pada reissue tracking code, validasi alasan min 10 char, penolakan role teknisi, eksekusi RPC atomik, penanganan error RPC, dan integritas audit log (35 tests). | Dijalankan via `npm test`. | Menurunkan kepastian regresi pada fitur verifikasi admin dan penerbitan ulang kode pelacakan. |
| `src/applications/applications.spec.ts` | Test Suite | `[VERIFIED]` | Unit test Vitest untuk validasi permohonan publik, penolakan metadata-only, validasi magic bytes, pembuatan kode acak 128-bit, pembuatan nomor tiket unik, mitigasi idempotency key, dan audit logging (31 tests). | Dijalankan via `npm test`. | Menurunkan kepastian regresi pada alur submit pemohon. |

---

### C. Modul Penugasan & Lembar Kerja Tenaga Ahli (`backend/api/src/assignments/`)
| Path Berkas | Klasifikasi | Audit | Tanggung Jawab & Fungsi Aktual | Dependensi / Dipanggil Oleh | Risiko Jika Diubah/Dihapus |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `src/assignments/admin-assignments.controller.ts` | Production Code | `[VERIFIED]` | Endpoint penugasan untuk `SUPER_ADMIN`: `GET /api/v1/admin/technicians`, `GET applications/:id/assignments`, `POST applications/:id/assignments`. | Web Admin (`AdminAssignmentsOverviewPage`, modal penugasan). | Super Admin tidak dapat menugaskan atau mereassign Tenaga Ahli. |
| `src/assignments/technician-workspace.controller.ts` | Production Code | `[VERIFIED]` | Endpoint lembar kerja "Pekerjaan Saya": `GET /api/v1/technician/my-work/summary`, `GET /api/v1/technician/my-work`, `GET applications/:id`, mutasi status dan stage oleh Tenaga Ahli penanggung jawab. | Web Admin (`TechnicianMyWorkPage`). | Tenaga Ahli tidak dapat melihat daftar pekerjaan aktifnya atau memperbarui progres teknis. |
| `src/assignments/assignments.service.ts` | Production Code | `[VERIFIED]` | **Sentral Perhitungan Beban Kerja & Batas Akses**: Menghitung beban kerja aktif (`active_assignments_count`) hanya pada tiket aktif (`!terminalStatuses.includes(status)`), menugaskan tenaga ahli, mengarsipkan penugasan lama (`unassigned_at`), memfilter daftar Pekerjaan Saya agar tiket terminal tidak muncul, dan memverifikasi batas otorisasi teknisi. | `admin-assignments.controller.ts`, `technician-workspace.controller.ts` | **KRITIS**: Regresi bug beban kerja Tenaga Ahli (tiket CLOSED terhitung aktif) atau pembobolan batas akses penugasan. |
| `src/assignments/assignments.spec.ts` | Test Suite | `[VERIFIED]` | Unit test Vitest untuk penugasan, perhitungan beban kerja aktif, pengabaian tiket terminal, isolasi Pekerjaan Saya, dan proteksi otorisasi penugasan (20 tests). | Dijalankan via `npm test`. | Menurunkan kepastian uji pada modul penugasan. |

---

### D. Modul Siklus Hidup SPBE (`backend/api/src/lifecycle/`)
| Path Berkas | Klasifikasi | Audit | Tanggung Jawab & Fungsi Aktual | Dependensi / Dipanggil Oleh | Risiko Jika Diubah/Dihapus |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `src/lifecycle/lifecycle.controller.ts` | Production Code | `[VERIFIED]` | Endpoint REST untuk 7 tahapan siklus hidup pada rute kanonis `/api/v1/applications/:id/lifecycle` (via `@Controller('applications/:id/lifecycle')` + global prefix `/api/v1`): overview, analisis, perencanaan, desain, implementasi, pengujian kelaikan (CRUD), pemeliharaan (CRUD), evaluasi, dan upload dokumen teknis. | Web Admin (`LifecycleWorkspace`, `useLifecycle.ts`). | 7 tahapan dokumentasi SPBE tidak dapat diakses atau diperbarui. |
| `src/lifecycle/lifecycle.service.ts` | Production Code | `[VERIFIED]` | Logika bisnis penyimpanan dokumen analisis, perencanaan proyek, rancang bangun arsitektur, implementasi koding, uji kelaikan 4 aspek (Fungsi, Integrasi, Beban, Keamanan), pemeliharaan, evaluasi, serta upload berkas teknis ke Storage privat. | `lifecycle.controller.ts` | Dokumentasi kepatuhan SPBE (Permenkomdigi 6/2025) tidak tersimpan ke database. |
| `src/lifecycle/lifecycle.spec.ts` | Test Suite | `[VERIFIED]` | Unit test Vitest untuk validasi 7 tahapan lifecycle, penyimpanan dokumen teknis, pencatatan hasil pengujian, dan regresi metadata rute kanonis (17 tests). | Dijalankan via `npm test`. | Kehilangan penjaminan mutu pada modul siklus hidup SPBE. |

---

### E. Modul Pelacakan Publik & Keamanan Sesi (`backend/api/src/tracking/`)
| Path Berkas | Klasifikasi | Audit | Tanggung Jawab & Fungsi Aktual | Dependensi / Dipanggil Oleh | Risiko Jika Diubah/Dihapus |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `src/tracking/tracking.controller.ts` | Production Code | `[VERIFIED]` | Endpoint pelacakan publik tanpa login: `POST /api/v1/tracking/verify` (verifikasi nomor tiket + kode rahasia), `GET /api/v1/tracking/:ticketNumber`, `GET .../timeline`, `POST .../revision`. | Web Layanan (`TrackingPage`, `useTracking`). | Pemohon OPD tidak dapat melacak status tiket atau mengirim berkas revisi. |
| `src/tracking/tracking.service.ts` | Production Code | `[VERIFIED]` | Verifikasi timing-safe hash kode pelacakan (`safeHashCompare`), rate limiting anti brute-force, penerbitan tracking session token (15 menit), masking data sensitif pemohon, pemblokiran akses tiket `CLOSED` (403), penyusunan proyeksi timeline publik intensional, validasi Base64 ketat (`parseAndValidateBase64`), persistensi berkas revisi ke bucket Storage privat `simantik-documents` dengan Storage key acak UUID buatan server tanpa nama asli di path, penyimpanan `original_filename` tersanitasi di `application_documents`, kompensasi rollback multi-step parsial (revert status ke `REVISION_REQUIRED`, penghapusan selektif history dan message via UUID, proteksi konkurensi, dan logging aman). | `tracking.controller.ts` | Kerentanan timing attack, pembobolan kode pelacakan brute force, kebocoran catatan teknis internal, atau desinkronisasi status saat revisi gagal sebagian. |
| `src/tracking/tracking-rate-limiter.ts` | Production Code | `[VERIFIED]` | Menyimpan counter percobaan gagal verifikasi kode pelacakan per IP dan nomor tiket; memicu HTTP 429 jika gagal >= 5 kali berturut-turut. | `tracking.service.ts` | Server rentan terhadap serangan brute force kamus kode pelacakan. |
| `src/tracking/tracking-token.service.ts` | Production Code | `[VERIFIED]` | Menerbitkan dan memvalidasi token sesi pelacakan berbasis HMAC-SHA256 berumur 15 menit (`expires_in: 900`). | `tracking.service.ts`, `tracking.guard.ts` | Token sesi pelacakan tidak dapat diverifikasi atau tidak kedaluwarsa. |
| `src/tracking/tracking.guard.ts` | Production Code | `[VERIFIED]` | Guard yang memverifikasi header `Authorization: Bearer <tracking_token>` untuk endpoint publik terlindungi (pesan diskusi dan submit revisi). | `tracking.controller.ts`, `messages.controller.ts` | Pihak luar tanpa kode pelacakan sah dapat mengirim pesan atau dokumen revisi palsu. |
| `src/tracking/tracking.spec.ts` | Test Suite | `[VERIFIED]` | Unit test Vitest untuk verifikasi timing-safe, mitigasi rate limit 429, proyeksi timeline publik, isolasi status CLOSED, validasi biner revisi, validasi ketat Base64 & Data URL, Storage key acak UUID, mitigasi magic bytes spoofing, dan kompensasi rollback saat gagal sebagian (32 tests). | Dijalankan via `npm test`. | Celah keamanan atau regresi inkonsistensi data pada pelacakan publik tidak terdeteksi. |

---

### F. Modul Komunikasi, Notifikasi, Akun & Keamanan Bersama
| Path Berkas | Klasifikasi | Audit | Tanggung Jawab & Fungsi Aktual | Dependensi / Dipanggil Oleh | Risiko Jika Diubah/Dihapus |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `src/messages/messages.service.ts` | Production Code | `[VERIFIED]` | Pengelolaan pesan diskusi permohonan. Menegakkan isolasi ketat antara visibilitas `PUBLIC` (terlihat oleh pemohon) dan `INTERNAL` (khusus staf Diskominfo). Menyamarkan nama staf pada kanal publik menjadi "Tim Teknis Diskominfo". | `messages.controller.ts` | Kebocoran catatan internal staf ke pemohon publik atau impersonasi pesan. |
| `src/notifications/notifications.service.ts` | Production Code | `[VERIFIED]` | Pengiriman notifikasi in-app kepada staf internal dan pengiriman email transaksional pemohon via Resend API dengan deduplikasi dan graceful fallback simulasi. | Seluruh modul backend saat terjadi event. | Staf tidak menerima notifikasi penugasan baru; pemohon tidak menerima update status via email. |
| `src/technicians/technicians.service.ts` | Production Code | `[VERIFIED]` | Manajemen profil dan akun Tenaga Ahli Diskominfo, pembuatan akun, dan agregasi statistik beban kerja yang mengabaikan tiket terminal. | `admin-technicians.controller.ts` | Super Admin tidak dapat menambah atau mengelola akun Tenaga Ahli. |
| `src/auth/auth.guard.ts` & `roles.guard.ts` | Production Code | `[VERIFIED]` | Validasi autentikasi Supabase JWT Bearer, pengecekan profil aktif, dan penegakan batas peran `SUPER_ADMIN` vs `TECHNICIAN`. | Seluruh controller berstatus terproteksi. | **KRITIS**: Seluruh endpoint admin menjadi terbuka tanpa otentikasi atau hak akses bocor. |
| `src/common/filters/http-exception.filter.ts` | Production Code | `[VERIFIED]` | Global Exception Filter yang menangani seluruh error, menyensor error internal driver basis data PostgreSQL, dan mengembalikan format respon seragam `{ success: false, error: { ... } }`. | `main.ts` | Kebocoran informasi sensitif database (nama tabel/kolom) ke respons klien. |
| `src/common/utils/file-validator.ts` | Production Code | `[VERIFIED]` | Validasi berkas biner & enkoding: validasi Base64 ketat RFC 4648 (`parseAndValidateBase64`) mendukung raw Base64 & Data URL, penolakan non-canonical padding bits & trailing garbage, sanitasi nama berkas (maksimal 255 karakter, pembersihan kontrol/null byte), ekstraksi ekstensi allowlist (`extractSafeExtension`), pembentukan Storage key acak buatan server berbasis UUID (`generateSecureStorageKey`), batas ukuran 10MB, kewajiban buffer > 0, dan verifikasi magic bytes signature (PDF, PNG, JPEG, DOCX/XLSX). | `applications.service.ts`, `lifecycle.service.ts`, `tracking.service.ts` | Berkas berbahaya (.exe, script, file korup, Base64 malformed, path traversal) lolos tersimpan ke Storage. |
| `src/common/utils/file-validator.spec.ts` | Test Suite | `[VERIFIED]` | Unit test Vitest untuk validasi berkas, magic bytes, ukuran berkas, sanitasi nama berkas, null bytes, karakter kontrol, dukungan nama Unicode, strict Base64 RFC 4648, Data URL prefix, penolakan bit non-kanonis, allowlist ekstensi, dan format Storage key UUID acak (34 tests). | Dijalankan via `npm test`. | Menurunkan kepastian proteksi keamanan berkas unggahan. |
| `src/audit/audit.service.ts` | Production Code | `[VERIFIED]` | Mencatat seluruh aktivitas mutasi sistem ke tabel `audit_logs` secara otomatis (actor, action, entity, snapshot data lama/baru). | Seluruh modul saat mutasi data terjadi. | Hilangnya jejak forensik dan kepatuhan audit sistem SPBE. |

---

## 2. Frontend Admin Web (`frontend/admin-web/`)

### A. Layout, Navigasi & Fitur Permohonan Admin
| Path Berkas | Klasifikasi | Audit | Tanggung Jawab & Fungsi Aktual | Dependensi / Dipanggil Oleh | Risiko Jika Diubah/Dihapus |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `src/app/router.tsx` | Production Code | `[VERIFIED]` | Deklarasi rute aplikasi React Router v7, pembagian rute publik (`/login`, `/unauthorized`, `/design-system`) dan rute terproteksi dalam `AdminLayout`, serta proteksi role per rute. | `main.tsx` | **KRITIS**: Navigasi aplikasi admin tidak berfungsi atau halaman terproteksi dapat diakses tanpa login. |
| `src/components/layout/AdminLayout.tsx` | Production Code | `[VERIFIED]` | Shell layout admin yang memuat `Sidebar`, `Header`, dan area konten utama berdesain institusional modern. | `router.tsx` | Tampilan layout admin pecah. |
| `src/components/layout/Sidebar.tsx` | Production Code | `[VERIFIED]` | Navigasi samping berbasis peran: menampilkan menu permohonan, penugasan tenaga ahli, lembar kerja "Pekerjaan Saya", siklus hidup SPBE, pesan, notifikasi, master data OPD, master layanan, manajemen tenaga ahli, dan audit log. | `AdminLayout.tsx` | Menu navigasi tidak muncul atau label peran tidak konsisten ("Tenaga Ahli"). |
| `src/components/layout/navigation.ts` | Production Code | `[VERIFIED]` | Metadata daftar rute menu admin, ikon, badge, dan filter peran yang diizinkan (`SUPER_ADMIN` vs `TECHNICIAN`). | `Sidebar.tsx` | Link navigasi salah sasaran atau teknisi melihat menu khusus Super Admin. |
| `src/features/applications/ReissueTrackingCodeModal.tsx` | UI Component | `[VERIFIED]` | **Modal Penerbitan Ulang Kode Pelacakan**: Dialog khusus Superadmin untuk menerbitkan kode baru. Memvalidasi input alasan (min 10 karakter), menampilkan ringkasan risiko kode lama tidak berlaku, mengeksekusi mutasi API, dan menampilkan kode baru 128-bit yang hanya bisa disalin satu kali (*one-time display*). | `AdminApplicationDetailPage.tsx` | Superadmin tidak memiliki antarmuka aman untuk menerbitkan ulang kode pelacakan yang hilang. |
| `src/features/applications/useAdminApplications.ts` | React Hook | `[VERIFIED]` | React Query hooks untuk mutasi admin permohonan: verifikasi, persetujuan, penolakan, penugasan, dan `useReissueTrackingCode` yang memanggil `POST /api/v1/admin/applications/:id/reissue-tracking-code`. | `AdminApplicationDetailPage.tsx`, `AdminApplicationsListPage.tsx` | Komunikasi frontend admin dengan API permohonan dan reissue terputus. |
| `src/features/auth/ProtectedRoute.tsx` | Production Code | `[VERIFIED]` | Komponen pembungkus rute yang memeriksa sesi login Supabase Auth dan mencocokkan peran pengguna dengan `allowedRoles`. | `router.tsx` | Pengguna yang belum login atau tidak memiliki peran sah dapat membuka halaman sensitif. |
| `src/features/auth/useAuth.ts` | Production Code | `[VERIFIED]` | Hook penyedia state otentikasi pengguna, login dengan email/password, logout, pemuatan profil dari tabel `profiles`, dan listener perubahan sesi Supabase. | Seluruh komponen admin yang membutuhkan data user. | State login hilang saat refresh halaman atau gagal mengambil profil. |

---

### B. Halaman-Halaman Admin (`frontend/admin-web/src/pages/`)
| Path Berkas | Klasifikasi | Audit | Tanggung Jawab & Fungsi Aktual | Dependensi / Dipanggil Oleh | Risiko Jika Diubah/Dihapus |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `src/pages/DashboardPage.tsx` | Production Code | `[VERIFIED]` | Menampilkan statistik agregat permohonan, grafik beban kerja tenaga ahli, antrean verifikasi, ringkasan pekerjaan aktif, dan ucapan selamat datang peran "Sebagai Tenaga Ahli / Super Admin". | `/` (Index route) | Dashboard kosong atau menampilkan data usang. |
| `src/pages/AdminApplicationsListPage.tsx` | Production Code | `[VERIFIED]` | Daftar tabel seluruh permohonan dengan pagination, filter status, filter OPD, pencarian nomor tiket/judul, dan sorting tanggal. Bebas dari label internal "Phase 07". | `/applications` | Administrator tidak dapat mencari atau membuka daftar permohonan. |
| `src/pages/AdminApplicationDetailPage.tsx` | Production Code | `[VERIFIED]` | **Sentral Detail Permohonan**: Menampilkan identitas pemohon, dokumen pengajuan, kartu Tenaga Ahli penanggung jawab, tombol eksekusi verifikasi/revisi/approve/reject, tombol penugasan tenaga ahli, transisi lifecycle, serta **tombol Terbitkan Ulang Kode** yang memicu `ReissueTrackingCodeModal` (hanya untuk Superadmin pada tiket non-terminal). | `/applications/:id` | Detail permohonan tidak dapat ditinjau atau Super Admin tidak dapat mengambil keputusan persetujuan. |
| `src/pages/AdminAssignmentsOverviewPage.tsx` | Production Code | `[VERIFIED]` | Monitoring beban kerja Tenaga Ahli, daftar teknisi aktif, kartu beban kerja tiket aktif, dan delegasi tiket. Bebas dari label internal "Phase 08". | `/assignments` (SUPER_ADMIN) | Super Admin tidak dapat memantau distribusi beban kerja tim teknis. |
| `src/pages/TechnicianMyWorkPage.tsx` | Production Code | `[VERIFIED]` | Lembar kerja pribadi Tenaga Ahli ("Pekerjaan Saya"): menampilkan ringkasan metrik, filter status & tahap, serta kartu tiket aktif yang ditugaskan kepada teknisi login (mengabaikan tiket terminal). | `/my-work` (TECHNICIAN & SUPER_ADMIN) | Tenaga Ahli tidak dapat melihat daftar tugasnya. |
| `src/pages/AdminLifecycleOverviewPage.tsx` | Production Code | `[VERIFIED]` | Ringkasan pemantauan aplikasi yang sedang berada dalam 7 tahapan siklus hidup SPBE. | `/lifecycle` | Pemantauan progres siklus hidup aplikasi tidak dapat diakses secara global. |
| `src/features/lifecycle/LifecycleWorkspace.tsx` | Production Code | `[VERIFIED]` | **Workspace 7 Tahapan Lifecycle SPBE**: Antarmuka interaktif tabulasi untuk mengisi dan memperbarui dokumen Analisis, Perencanaan, Desain, Implementasi, formulir Uji Kelaikan 4 aspek, formulir Pemeliharaan, dan Evaluasi. | `AdminApplicationDetailPage.tsx` | Pengisian dokumen kepatuhan SPBE tidak dapat dilakukan oleh tim teknis. |
| `src/pages/AdminMessagesOverviewPage.tsx` | Production Code | `[VERIFIED]` | Pusat pemantauan komunikasi tiket masuk, unread messages, dan navigasi cepat ke diskusi permohonan. | `/messages` | Pesan pertanyaan dari pemohon OPD terlewatkan. |
| `src/pages/AdminNotificationsPage.tsx` | Production Code | `[VERIFIED]` | Halaman daftar seluruh notifikasi in-app staf dengan tombol tandai telah dibaca dan filter status baca. | `/notifications` | Staf tidak dapat meninjau riwayat pemberitahuan sistem. |
| `src/pages/AdminOpdPage.tsx` | Production Code | `[VERIFIED]` | Manajemen Master Data Perangkat Daerah (OPD): daftar 13 OPD, tambah unit baru, ubah nama, dan status aktif. | `/master/opd` (SUPER_ADMIN) | Master OPD tidak dapat dikelola. |
| `src/pages/AdminServicesPage.tsx` | Production Code | `[VERIFIED]` | Manajemen Master Katalog Layanan SPBE & Persyaratan: pengaturan 2 layanan, konfigurasi dokumen persyaratan wajib/opsional, dan SLA estimasi. | `/master/services` (SUPER_ADMIN) | Checklist persyaratan dokumen layanan tidak dapat disesuaikan. |
| `src/pages/AdminTechniciansPage.tsx` | Production Code | `[VERIFIED]` | Manajemen akun Tenaga Ahli Diskominfo: daftar profil, beban kerja, tambah akun Tenaga Ahli baru. Menggunakan label user-facing "Role: Tenaga Ahli". | `/technicians` (SUPER_ADMIN) | Super Admin tidak dapat mendaftarkan akun personel Tenaga Ahli baru. |
| `src/pages/AdminAuditLogsPage.tsx` | Production Code | `[VERIFIED]` | Penampil log audit sistem forensik: tabel kronologis seluruh aksi, aktor, entitas, IP address, user agent, dan perbandingan JSON data lama vs data baru. | `/audit` (SUPER_ADMIN) | Hilangnya transparansi pengawasan inspektorat terhadap riwayat perubahan sistem. |
| `src/pages/LoginPage.tsx` | Production Code | `[VERIFIED]` | Halaman masuk staf Diskominfo berdesain institusional modern Kabupaten Bandung dengan latar belakang teal elegan, validasi form, dan proteksi sesi. | `/login` | Staf Diskominfo tidak dapat login ke sistem. |
| `src/pages/DesignSystemShowcasePage.tsx` | Production Code | `[VERIFIED]` | Galeri komponen UI, token warna, tipografi, dan hierarki tiga logo resmi Pemkab Bandung dengan badge "Standar Desain UI". | `/design-system` | Referensi implementasi visual komponen UI hilang. |

---

## 3. Frontend Service Web (`frontend/service-web/`)

### A. Komponen Shell, Layout & Hooks Publik
| Path Berkas | Klasifikasi | Audit | Tanggung Jawab & Fungsi Aktual | Dependensi / Dipanggil Oleh | Risiko Jika Diubah/Dihapus |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `src/components/layout/PublicLayout.tsx` | Production Code | `[VERIFIED]` | Shell layout portal publik: Header dengan hierarki tiga logo resmi, navigasi publik (Beranda, Layanan, Ajukan, Lacak, Bantuan, Kontak), dan Footer institusional Diskominfo. | Seluruh halaman portal publik. | Tampilan layout portal layanan publik rusak. |
| `src/hooks/useServices.ts` | Production Code | `[VERIFIED]` | React Query hook untuk memanggil `GET /api/v1/services` guna memuat katalog layanan aktif dan daftar dokumen persyaratan. | `ApplicationSubmissionPage`, `ServicesPage` | Dropdown layanan dan checklist persyaratan dokumen tidak muncul. |
| `src/hooks/useOpdUnits.ts` | Production Code | `[VERIFIED]` | React Query hook untuk memanggil `GET /api/v1/applications/opd-units` guna memuat daftar unit kerja Perangkat Daerah. | `ApplicationSubmissionPage` | Pilihan unit kerja OPD pemohon kosong saat mengajukan permohonan. |
| `src/hooks/useSubmitApplication.ts` | Production Code | `[VERIFIED]` | React Query mutation untuk memanggil `POST /api/v1/applications` (mengirim data pemohon, rincian sistem, dan array dokumen base64). | `ApplicationSubmissionPage` | Wizard pengajuan gagal mengirim permohonan ke server. |
| `src/hooks/useTracking.ts` | Production Code | `[VERIFIED]` | Hook manajemen pelacakan tiket publik: mutasi verifikasi nomor tiket + kode rahasia (`useVerifyTracking`), query data tiket terverifikasi (`useTrackingData`), query timeline publik (`usePublicTimeline`), query pesan publik (`usePublicMessages`), dan mutasi kirim perbaikan berkas revisi (`useSubmitRevision`). | `TrackingPage` | Halaman pelacakan publik tidak dapat memuat data atau memvalidasi sesi. |

---

### B. Halaman-Halaman Layanan Publik (`frontend/service-web/src/pages/`)
| Path Berkas | Klasifikasi | Audit | Tanggung Jawab & Fungsi Aktual | Dependensi / Dipanggil Oleh | Risiko Jika Diubah/Dihapus |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `src/pages/HomePage.tsx` | Production Code | `[VERIFIED]` | Beranda portal SIMANTIK: Hero banner visual bertema Sabilulungan Kabupaten Bandung, pencarian cepat lacak tiket, kartu ringkasan 2 layanan SPBE, panduan alur 4 langkah mudah, statistik transparansi, dan CTA pengajuan. | `/` | Tampilan beranda utama portal layanan publik rusak. |
| `src/pages/ServicesPage.tsx` | Production Code | `[VERIFIED]` | Halaman katalog layanan lengkap: rincian layanan Pembangunan Baru vs Pengembangan Eksisting, checklist dokumen wajib, panduan penyusunan KAK, dan tombol ajukan. | `/layanan` | Pemohon OPD tidak dapat mempelajari kriteria dan persyaratan layanan. |
| `src/pages/ApplicationSubmissionPage.tsx` | Production Code | `[VERIFIED]` | **Wizard Pengajuan Permohonan 6 Langkah**: Step 1 (Pilih Layanan), Step 2 (Data Pemohon PIC OPD), Step 3 (Rincian Masalah & Tujuan), Step 4 (Unggah Dokumen KAK/SOP maks 10MB), Step 5 (Syarat & Ketentuan v1.0-2026), Step 6 (Tinjau & Kirim). Menampilkan Nomor Tiket dan Kode Rahasia 128-bit setelah berhasil kirim. | `/ajukan` | Fitur utama pengajuan digital SIMANTIK tidak dapat digunakan oleh OPD. |
| `src/pages/TrackingPage.tsx` | Production Code | `[VERIFIED]` | **Portal Pelacakan Tiket Publik**: Formulir verifikasi 2 input (Nomor Tiket + Kode Rahasia), tampilan status aktif, saran langkah berikutnya (*next-step advisory*), timeline progres 7 tahapan intensional, panel diskusi publik dengan Diskominfo, dan panel pengiriman berkas revisi jika status `REVISION_REQUIRED`. Menolak tiket `CLOSED` dengan pesan informatif 403. | `/tracking` | Pemohon OPD tidak dapat memantau progres permohonannya. |
| `src/pages/HelpPage.tsx` | Production Code | `[VERIFIED]` | Pusat Bantuan & FAQ: pertanyaan umum seputar KAK, masa berlaku pengajuan, peran Tenaga Ahli, dan unduhan template dokumen panduan. | `/bantuan` | Pemohon OPD kesulitan mencari panduan pengisian berkas. |
| `src/pages/ContactPage.tsx` | Production Code | `[VERIFIED]` | Halaman kontak desk bantuan Diskominfo: alamat kantor Soreang, jam layanan kerja, kanal email, dan nomor konsultasi. | `/kontak` | Pemohon OPD kehilangan kontak bantuan langsung jika mengalami kendala sistem. |
| `src/pages/DesignSystemShowcasePage.tsx` | Production Code | `[VERIFIED]` | Galeri komponen UI publik dengan token warna Pemkab Bandung dan badge "Standar Desain UI". | `/design-system` | Referensi desain publik hilang. |

---

## 4. Skema Basis Data & Migrasi (`supabase/`)

Seluruh perubahan struktur basis data dikelola melalui 15 berkas migrasi SQL yang terurut secara kronologis:

| Path Berkas | Tanggung Jawab & Fungsi SQL Aktual | Dampak Arsitektur |
| :--- | :--- | :--- |
| `supabase/migrations/20261007102923_initial_schema.sql` | Membuat fungsi utilitas `set_updated_at()`, tabel `opd_units`, `profiles`, `services`, `service_requirements`, serta trigger perbaruan waktu otomatis. | Fondasi master data organisasi dan skema profil pengguna. |
| `supabase/migrations/20261007103425_applications.sql` | Membuat tabel `applicants`, `applications`, dan `application_documents` lengkap dengan foreign key relasional dan indeks pencarian. | Fondasi inti entitas permohonan dan berkas pengajuan. |
| `supabase/migrations/20261007103947_workflow.sql` | Mendefinisikan tipe enum `application_status` dan `application_stage`, menambahkan kolom status/stage pada `applications`, serta membuat tabel `application_status_history`, `application_stage_history`, dan `assignments`. | Fondasi mesin alur kerja status dan penugasan teknisi. |
| `supabase/migrations/20261007104344_lifecycle.sql` | Mendefinisikan enum `technical_document_type`, `test_type`, `test_result`, `maintenance_type`, dan membuat tabel `project_plans`, `technical_documents`, `test_records`, `maintenance_records`, `evaluations`. | Fondasi pencatatan teknis 7 tahapan siklus hidup SPBE. |
| `supabase/migrations/20261007104547_communication_audit.sql` | Mendefinisikan enum pesan/notifikasi dan membuat tabel `messages`, `notifications`, dan `audit_logs` untuk jejak rekam sistem. | Fondasi kanal komunikasi tiket, notifikasi, dan jejak audit. |
| `supabase/migrations/20261007104906_security_rls.sql` | Mengaktifkan RLS pada seluruh tabel publik dan menerapkan `revoke all privileges from anon, authenticated`. | Fondasi keamanan Default-Deny (hanya service-role backend yang dapat mengakses DB). |
| `supabase/migrations/20261007105722_storage.sql` | Mendaftarkan private bucket `simantik-documents` pada skema Storage Supabase dengan batas ukuran 10MB dan whitelist MIME type. | Penyimpanan berkas privat permohonan dan dokumen teknis. |
| `supabase/migrations/20261008150000_seed_services.sql` | Mengisi data awal 2 layanan SPBE (`Pembangunan Aplikasi Baru` dan `Pengembangan Aplikasi Eksisting`) beserta checklist dokumen persyaratannya. | Data master katalog layanan awal. |
| `supabase/migrations/20261008160000_seed_opd_units.sql` | Mengisi data awal 13 unit kerja Perangkat Daerah di lingkungan Pemerintah Kabupaten Bandung. | Data master unit kerja OPD awal. |
| `supabase/migrations/20261008170000_lifecycle_stages.sql` | Membuat tabel `analysis_records`, `design_records`, dan `implementation_records` untuk melengkapi 7 tahapan SPBE. | Kelengkapan dokumentasi Analisis, Desain, dan Implementasi. |
| `supabase/migrations/20261008180000_lifecycle_attachments.sql` | Menambahkan kolom lampiran berkas pada tabel `test_records`, `maintenance_records`, dan `evaluations`. | Dukungan upload bukti pengujian dan dokumen evaluasi. |
| `supabase/migrations/20261008190000_notifications_applicant_email.sql` | Menambahkan dukungan pengiriman email ke pemohon luar (`recipient_email`) pada tabel notifikasi. | Pengiriman pemberitahuan email transaksional pemohon. |
| `supabase/migrations/20261008200000_master_data_requirements_enhancement.sql` | Penyempurnaan metadata checklist persyaratan layanan SPBE. | Penyesuaian persyaratan KAK per layanan. |
| `supabase/migrations/20261008210000_security_hardening.sql` | Pengetatan keamanan: RLS storage default-deny eksplisit dan pembuatan trigger `trg_prevent_audit_log_update_delete` (menjamin tabel `audit_logs` berstatus append-only immutable). | Menjamin integritas hukum rekam jejak sistem dari modifikasi ilegal. |
| `supabase/migrations/20261019161000_reissue_tracking_code_atomic.sql` | Membuat fungsi database PostgreSQL `public.reissue_tracking_code_atomic` dengan `SECURITY DEFINER`, `search_path = ''`, hak eksekusi eksklusif `service_role`, pembaruan `tracking_code_hash` atomik, dan pencatatan audit `TRACKING_CODE_REISSUED` dalam satu transaksi. | **KRITIS**: Menjamin penerbitan ulang kode pelacakan dan audit logging bersifat ACID dan konsisten secara transaksional. |

---

## 5. Berkas Aset Visual, Latar Belakang & Branding

| Path Berkas | Jenis Aset | Peruntukan & Integrasi Antarmuka |
| :--- | :--- | :--- |
| `frontend/service-web/public/assets/backgrounds/hero-sabilulungan.png` | Banner Latar Belakang PNG | Gambar visual institusional Sabilulungan Kabupaten Bandung pada hero section Beranda Web Layanan (`HomePage.tsx`). |
| `frontend/admin-web/public/assets/backgrounds/admin-login-teal.png` | Banner Latar Belakang PNG | Gambar latar belakang gradien teal institusional pada halaman login staf Diskominfo (`LoginPage.tsx`). |
| `frontend/admin-web/public/assets/logos/simantik-logo.png` & `service-web/...` | Gambar PNG (Transparan) | Logo resmi produk SIMANTIK (lambang & wordmark). Digunakan pada header portal, halaman login, dan branding. |
| `frontend/admin-web/public/assets/logos/simantik-emblem.png` & `service-web/...` | Gambar PNG (Transparan) | Emblem lambang SIMANTIK untuk ikon ringkas dan favicon. |
| `frontend/admin-web/public/assets/logos/kabupaten-bandung.png` & `service-web/...` | Gambar PNG | Lambang resmi Pemerintah Daerah Kabupaten Bandung. Identitas induk kelembagaan di sebelah kiri header. |
| `frontend/admin-web/public/assets/logos/kabupaten-bandung-transparent.png` | Gambar PNG (Transparan) | Lambang Pemkab Bandung berlatar transparan untuk penempatan di atas latar belakang berwarna. |
| `frontend/admin-web/public/assets/logos/diskominfo.png` & `service-web/...` | Gambar PNG (Transparan) | Logo resmi Dinas Komunikasi dan Informatika Kabupaten Bandung pada header sekunder dan footer. |
| `frontend/admin-web/public/favicon.png` & `service-web/public/favicon.png` | Favicon PNG | Ikon tab peramban resmi SIMANTIK Kabupaten Bandung beresolusi tajam. |
| `incoming-brand-assets/` | Master Brand Repository | Direktori master aset resolusi tinggi asli dan panduan integrasi branding yang dilindungi secara fisik di disk. |
