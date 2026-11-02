# Log Pengujian Sistem SIMANTIK (Local Testing)

Dokumen ini mencatat data isian yang digunakan selama sesi pengujian alur permohonan layanan SIMANTIK di lingkungan lokal.

---

## 1. Data Permohonan Layanan

### Langkah 1: Kategori Layanan
- **Jenis Layanan**: Pembangunan Aplikasi Baru (`SRV-DEV`)
- **Deskripsi**: Layanan perancangan dan pembangunan sistem informasi baru dari tahap awal untuk mendukung operasional atau inovasi OPD.

### Langkah 2: Identitas Pemohon (PIC OPD)
- **Asal Organisasi Perangkat Daerah (OPD)**: Dinas Kesehatan (DINKES)
- **Nama Lengkap PIC**: Farhan
- **NIP / Identitas Pegawai**: `123456789101121314`
- **Jabatan di OPD**: Pranata Komputer Ahli Pertama
- **Alamat Email Kedinasan**: `tester.pic@bandungkab.go.id`
- **Nomor WhatsApp / Kontak Aktif**: `082262121094`

### Langkah 3: Rincian Kebutuhan Aplikasi
- **Judul Permohonan / Usulan Nama Sistem**: `Pembangunan Sistem Informasi Pemantauan Gizi dan Stunting Terpadu (SI-PENTING)`
- **Latar Belakang Kebutuhan**: Saat ini pencatatan dan pelaporan data gizi balita di tingkat Puskesmas masih dilakukan secara manual dan terfragmentasi menggunakan berkas spreadsheet, sehingga proses rekapitulasi data ke Dinas Kesehatan membutuhkan waktu lama dan menyulitkan pemantauan status gizi balita secara real-time.
- **Rumusan Permasalahan**:
  1. Keterlambatan rekapitulasi data stunting dari tingkat Puskesmas ke Dinas Kesehatan.
  2. Tingginya risiko duplikasi data balita dan ketidaksinkronan riwayat pengukuran.
  3. Belum tersedianya dasbor terpusat untuk monitoring intervensi gizi lintas sektor.
- **Maksud & Tujuan**:
  1. Membangun sistem pencatatan digital data pertumbuhan balita yang terpusat dan valid.
  2. Menyediakan dasbor pemantauan indikator stunting secara real-time per kecamatan/desa.
  3. Mempercepat pengambilan keputusan intervensi bantuan gizi dan pelaporan pimpinan.
- **Ruang Lingkup Sistem**:
  1. Modul Pencatatan Data Balita dan Riwayat Pengukuran (KMS Digital).
  2. Modul Pemetaan Sebaran Kasus Stunting (Peta zonasi tingkat desa/kecamatan).
  3. Modul Laporan dan Ekspor Rekapitulasi Berkala (PDF dan Excel).
  4. Manajemen hak akses pengguna: Petugas Puskesmas, Bidan Desa, dan Admin Dinkes.
- **Keluaran (Output) yang Diharapkan**: Aplikasi berbasis web responsif, dasbor indikator stunting real-time, ekspor laporan rekapitulasi bulanan berformat PDF/Excel, serta kesiapan integrasi Satu Data Daerah.
- **Perkiraan Target Batas Waktu**: `2026-11-30` (30/11/2026)
- **Catatan Tambahan**: Uji coba sistem direncanakan melibatkan 5 Puskesmas percontohan pada tahap awal peluncuran.

### Langkah 4: Unggah Dokumen Persyaratan
Berkas dokumen pengujian telah dibuat dalam format PDF resmi dan tersimpan di folder `testing/dokumen/`:
1. **Surat Permohonan Resmi OPD (Wajib)**:
   - Berkas: [`Surat_Permohonan_Resmi_Dinkes.pdf`](file:///d:/Projects/simantik/testing/dokumen/Surat_Permohonan_Resmi_Dinkes.pdf)
   - Deskripsi: Surat dinas resmi berkop Dinas Kesehatan Kab. Bandung dan ditandatangani Kepala Dinas (stempel BSrE).
2. **Kerangka Acuan Kerja / KAK (Wajib)**:
   - Berkas: [`Kerangka_Acuan_Kerja_KAK_SI-PENTING.pdf`](file:///d:/Projects/simantik/testing/dokumen/Kerangka_Acuan_Kerja_KAK_SI-PENTING.pdf)
   - Deskripsi: Memuat latar belakang, maksud & tujuan, ruang lingkup modul, dan jadwal tentatif 4 tahapan pengembangan.
3. **Bagan Alur Bisnis / SOP Pelayanan (Opsional)**:
   - Berkas: [`Bagan_Alur_Bisnis_SOP_SI-PENTING.pdf`](file:///d:/Projects/simantik/testing/dokumen/Bagan_Alur_Bisnis_SOP_SI-PENTING.pdf)
   - Deskripsi: Diagram 4 tahapan alur operasional posyandu, verifikasi TPG puskesmas, intervensi PMT, dan monitoring dinas.

### Langkah 5: Syarat & Ketentuan Layanan
- **Versi Syarat**: `v1.0-2026`
- **Persetujuan**: Diceklis (*"Saya menyatakan telah membaca, memahami, dan menyetujui seluruh ketentuan di atas serta menjamin keabsahan seluruh berkas dan data yang dilampirkan"*).

### Langkah 6: Tinjau Rekapitulasi Permohonan
- Seluruh ringkasan data permohonan, profil PIC, rincian fungsional, dan 3 berkas PDF lampiran telah divalidasi dan siap dikirimkan ke sistem.

### Hasil Pendaftaran Permohonan (Uji Coba Pertama)
- **Status Permohonan**: `SUBMITTED` (Permohonan Berhasil Terkirim ke Diskominfo)
- **Nomor Tiket Permohonan**: `SIM-2026-852200`
- **Waktu Pendaftaran**: 29 Oktober 2026 pukul 16.11 WIB
- **Judul Sistem**: Pembangunan Sistem Informasi Pemantauan Gizi dan Stunting Terpadu (SI-PENTING)
- **Instansi**: Dinas Kesehatan (PIC: Farhan)

---

### Hasil Pengujian Penerbitan Ulang Kode Pelacakan (Reissue Tracking Code)
- **Aktor**: Super Admin Diskominfo (`superadmin.local@simantik.test`) via Web Admin
- **Nomor Tiket**: `SIM-2026-852200`
- **Kode Pelacakan Baru**: **`TRK-DDA7E4DF`**
- **Waktu Penerbitan**: 29 Oktober 2026 pukul 16.31.21 WIB
- **Hasil Verifikasi**:
  1. Kode pelacakan baru terbukti berformat ringkas **`TRK-XXXXXXXX`** (tepat 8 digit hex kapital).
  2. Kode tampil sempurna di dalam modal tanpa *overflow* atau pemotongan teks.
  3. Kode lama secara otomatis dinonaktifkan (atomik via SHA-256 hash update).

### Hasil Pengujian Pelacakan Tiket (Portal Publik OPD)
- **Halaman**: Web Layanan (`http://127.0.0.1:5174/tracking`)
- **Kredensial Akses**: Nomor Tiket `SIM-2026-852200` + Kode Pelacakan `TRK-DDA7E4DF`
- **Hasil Verifikasi Portal**:
  1. **Autentikasi Ringan Tanpa Login**: Sesi pelacakan aktif (15 menit token HMAC) berhasil dibuka.
  2. **Privasi Data PIC**: Nama dan email otomatis dimasking (`Fa***` / `te***@bandungkab.go.id`) demi keamanan informasi.
  3. **Visualisasi 7 Siklus Hidup SPBE**: Menampilkan indikator tahapan SPBE secara transparan.
  4. **Kronologi Permohonan**: Status aktif berada pada tahap awal (*Permohonan Didaftarkan* / *Menunggu Telaah Administrasi*).
  5. **Berkas Lampiran**: Ketiga dokumen PDF pengujian terdaftar dan dapat diunduh oleh pemohon.
  6. **Ruang Komunikasi Real-time**: Tersedia kolom pesan dua arah antara pemohon OPD dan Diskominfo.

---

*Log ini akan terus diperbarui pada pengujian alur verifikasi berkas dan penugasan Tenaga Ahli di Web Admin.*
