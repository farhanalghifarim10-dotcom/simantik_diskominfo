import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  Alert,
  ArrowRightIcon,
  Badge,
  Button,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  Input,
  SearchIcon,
  ShieldIcon,
} from '../components/ui';

export function HomePage() {
  const navigate = useNavigate();
  const [quickTicket, setQuickTicket] = useState('');
  const [quickCode, setQuickCode] = useState('');
  const [quickError, setQuickError] = useState<string | null>(null);

  // FAQ Accordion State for landing page preview
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const handleQuickTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTicket.trim()) {
      setQuickError('Nomor tiket permohonan wajib diisi.');
      return;
    }
    setQuickError(null);
    const params = new URLSearchParams();
    params.set('ticket', quickTicket.trim());
    if (quickCode.trim()) {
      params.set('code', quickCode.trim());
    }
    navigate(`/tracking?${params.toString()}`);
  };

  const faqItems = [
    {
      q: 'Siapa yang berhak mengajukan permohonan melalui SIMANTIK?',
      a: 'SIMANTIK diperuntukkan khusus bagi seluruh Organisasi Perangkat Daerah (OPD), Bagian, dan Unit Kerja di lingkungan Pemerintah Daerah Kabupaten Bandung untuk standardisasi pembangunan dan pengembangan aplikasi SPBE.',
    },
    {
      q: 'Apakah pemohon dari OPD wajib memiliki akun login terlebih dahulu?',
      a: 'Tidak. Untuk mempermudah OPD, pengajuan dilakukan secara terbuka dengan mengunggah dokumen persyaratan resmi. Setelah pengajuan diajukan, sistem secara otomatis menerbitkan Nomor Tiket dan Kode Pelacakan unik untuk memantau status secara transparan.',
    },
    {
      q: 'Dokumen apa saja yang wajib disiapkan sebelum mengajukan permohonan?',
      a: 'Dokumen utama meliputi: (1) Surat Permohonan Resmi yang ditandatangani Kepala OPD, (2) Kerangka Acuan Kerja (KAK) atau Dokumen Spesifikasi Kebutuhan, dan (3) Penunjukan Pejabat/Staf Teknis Penghubung (PIC) dari OPD pemohon.',
    },
  ];

  return (
    <div className="space-y-16 lg:space-y-24 pb-16">
      {/* =========================================================================
          1. HERO SECTION WITH OFFICIAL VALUE PROPOSITION & QUICK TRACK JUMP
         ========================================================================= */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white pt-12 pb-20 lg:pt-20 lg:pb-32 px-4 sm:px-6 lg:px-8">
        {/* Subtle decorative grid background */}
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:24px_24px]" />
        
        <div className="relative max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Column: Heading & Value Proposition */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/30 text-blue-300 text-xs font-semibold tracking-wide uppercase">
                <ShieldIcon size={16} className="text-blue-400" />
                <span>Portal Resmi SPBE Pemkab Bandung</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight sm:leading-none text-white">
                Sistem Manajemen Layanan <br className="hidden sm:inline" />
                <span className="text-blue-400">Teknologi Informasi</span>
              </h1>

              <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                Layanan satu pintu bagi seluruh Organisasi Perangkat Daerah (OPD) 
                Kabupaten Bandung untuk permohonan <strong>pembangunan</strong> dan <strong>pengembangan aplikasi</strong> secara 
                terpadu, akuntabel, dan transparan sesuai tata kelola SPBE.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <Link to="/ajukan" className="w-full sm:w-auto">
                  <Button variant="primary" size="lg" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 font-bold shadow-lg shadow-blue-600/30">
                    Ajukan Permohonan Layanan
                    <ArrowRightIcon size={18} className="ml-2" />
                  </Button>
                </Link>
                <Link to="/tracking" className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white">
                    <SearchIcon size={16} className="mr-2" />
                    Lacak Status Tiket
                  </Button>
                </Link>
              </div>

              {/* 3 Government Trust Badges */}
              <div className="pt-6 border-t border-slate-800/80 grid grid-cols-3 gap-3 text-left">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-white uppercase tracking-wider">Permenkomdigi 6/2025</p>
                  <p className="text-[11px] text-slate-400">Kepatuhan Arsitektur SPBE</p>
                </div>
                <div className="space-y-1 border-l border-slate-800 pl-3">
                  <p className="text-xs font-bold text-white uppercase tracking-wider">Akses Tanpa Akun</p>
                  <p className="text-[11px] text-slate-400">Cukup Tiket & Kode Lacak</p>
                </div>
                <div className="space-y-1 border-l border-slate-800 pl-3">
                  <p className="text-xs font-bold text-white uppercase tracking-wider">Audit Trail Penuh</p>
                  <p className="text-[11px] text-slate-400">Transparansi Setiap Disposisi</p>
                </div>
              </div>
            </div>

            {/* Right Column: Quick Tracker Widget Card */}
            <div className="lg:col-span-5">
              <div className="bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-100 p-6 sm:p-8 relative">
                <div className="space-y-2 mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold tracking-wider uppercase text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
                      Pencarian Cepat
                    </span>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <ClockIcon size={13} />
                      Real-time 24/7
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-950">
                    Lacak Progres Permohonan OPD
                  </h2>
                  <p className="text-xs text-slate-600 leading-normal">
                    Masukkan nomor tiket dan kode keamanan yang tercantum pada bukti pendaftaran Anda.
                  </p>
                </div>

                {quickError && (
                  <div className="mb-4">
                    <Alert variant="danger" title="Kesalahan Formulir">
                      {quickError}
                    </Alert>
                  </div>
                )}

                <form onSubmit={handleQuickTrackSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="quickTicketInput" className="block text-xs font-semibold text-slate-700 mb-1">
                      Nomor Tiket Permohonan <span className="text-red-500">*</span>
                    </label>
                    <Input
                      id="quickTicketInput"
                      type="text"
                      placeholder="Contoh: TIK-2026-00001"
                      value={quickTicket}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuickTicket(e.target.value)}
                      className="font-mono text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="quickCodeInput" className="block text-xs font-semibold text-slate-700 mb-1">
                      Kode Pelacakan (Tracking Code)
                    </label>
                    <Input
                      id="quickCodeInput"
                      type="text"
                      placeholder="Contoh: TRK-8F2A9C"
                      value={quickCode}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuickCode(e.target.value)}
                      className="font-mono text-sm uppercase"
                    />
                    <p className="mt-1 text-[11px] text-slate-500">
                      Opsional di pencarian cepat, akan diminta saat melihat detail penuh.
                    </p>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    className="w-full font-bold shadow-md"
                    leftIcon={<SearchIcon size={16} />}
                  >
                    Periksa Status Sekarang
                  </Button>
                </form>

                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Belum mengajukan?</span>
                  <Link to="/layanan" className="text-blue-600 font-semibold hover:underline">
                    Lihat Katalog Layanan →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          2. CORE SERVICES CATALOG PREVIEW (WHAT SERVICES ARE AVAILABLE)
         ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
          <Badge variant="neutral" className="uppercase tracking-widest text-[11px] font-bold">
            Ruang Lingkup Layanan
          </Badge>
          <h2 className="text-3xl font-extrabold text-slate-950 tracking-tight sm:text-4xl">
            2 Jalur Layanan Resmi Diskominfo
          </h2>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Sesuai regulasi SPBE Pemerintah Daerah Kabupaten Bandung, Diskominfo memfasilitasi 
            dua jenis permohonan digital bagi seluruh unit kerja OPD.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[
            {
              number: '01',
              category: 'Layanan Inovasi Baru',
              title: 'Pembangunan Aplikasi Baru',
              description:
                'Pengembangan perangkat lunak baru dari tahap perancangan awal untuk mendukung pelaksanaan tugas dan fungsi baru, otomatisasi layanan publik, atau inovasi daerah yang belum terakomodasi dalam sistem eksisting.',
              requirements: [
                'Surat Permohonan Resmi bertandatangan Kepala OPD',
                'Kerangka Acuan Kerja (KAK) & Spesifikasi Kebutuhan',
                'Bagan Alir Bisnis / SOP Pelayanan yang Dimigrasikan',
              ],
            },
            {
              number: '02',
              category: 'Layanan Pemeliharaan & Perubahan',
              title: 'Pengembangan Aplikasi Eksisting',
              description:
                'Permohonan penambahan modul, perubahan alur bisnis, integrasi interoperabilitas API, penyesuaian regulasi baru, atau penyempurnaan fungsi pada aplikasi yang telah beroperasi di lingkungan Pemkab Bandung.',
              requirements: [
                'Surat Permohonan Perubahan Resmi dari OPD',
                'Identitas & Informasi Akses Aplikasi Eksisting',
                'Uraian Detail Perubahan Fitur / Change Request',
              ],
            },
          ].map((track) => (
            <div
              key={track.number}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl">
                  {track.number}
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                    {track.category}
                  </span>
                  <h3 className="text-2xl font-bold text-slate-900 mt-1">
                    {track.title}
                  </h3>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {track.description}
                </p>

                <div className="pt-2">
                  <p className="text-xs font-semibold text-slate-800 uppercase tracking-wider mb-2">
                    Dokumen Persyaratan Utama:
                  </p>
                  <ul className="space-y-2 text-xs text-slate-600">
                    {track.requirements.map((req, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <CheckCircleIcon size={14} className="text-emerald-500 shrink-0" />
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-8 mt-6 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">
                  Estimasi Telaah: Menyesuaikan Kelengkapan Berkas & Antrean
                </span>
                <Link to="/layanan">
                  <Button variant="primary" size="sm">
                    Persyaratan & Alur →
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =========================================================================
          3. HOW TO SUBMIT: 4-STEP TRANSPARENT WORKFLOW
         ========================================================================= */}
      <section className="bg-slate-100/70 border-y border-slate-200 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
              Alur Standar Pelayanan
            </span>
            <h2 className="text-3xl font-bold text-slate-950">
              Bagaimana Cara Mengajukan Permohonan?
            </h2>
            <p className="text-sm text-slate-600">
              Proses dirancang sederhana bagi PIC OPD tanpa birokrasi berbelit.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Step 1 */}
            <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-base">
                1
              </div>
              <h3 className="font-bold text-base text-slate-900">
                Pilih Kategori Layanan
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Tentukan apakah kebutuhan OPD merupakan aplikasi baru atau penyempurnaan aplikasi yang sudah aktif.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-base">
                2
              </div>
              <h3 className="font-bold text-base text-slate-900">
                Isi Data & Unggah Dokumen
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Lengkapi identitas PIC pemohon, deskripsi kebutuhan, serta lampiran Surat Dinas dan KAK dalam format PDF.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-base">
                3
              </div>
              <h3 className="font-bold text-base text-slate-900">
                Terima Bukti & Kode Lacak
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Sistem memberikan bukti registrasi resmi yang memuat Nomor Tiket dan Kode Keamanan untuk disimpan.
              </p>
            </div>

            {/* Step 4 */}
            <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-base">
                4
              </div>
              <h3 className="font-bold text-base text-slate-900">
                Pantau Disposisi & Hasil
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Pantau progres telaah staf Aptika Diskominfo kapan saja melalui fitur lacak tiket secara langsung.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. HOW TO TRACK (DATA MINIMIZATION & ACCESSIBILITY)
         ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-900 text-white rounded-3xl p-8 sm:p-12 lg:p-16 relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                Transparansi Publik
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                Pantau Status Permohonan Tanpa Akun OPD
              </h2>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                Untuk menjamin kemudahan akses seluruh perangkat daerah tanpa beban administrasi 
                manajemen akun, SIMANTIK menggunakan kombinasi aman <strong>Nomor Tiket</strong> dan <strong>Kode Pelacakan Rahasia</strong>. 
                Data pemohon tetap terlindungi dan progres tahapan dapat diaudit sewaktu-waktu.
              </p>
              <div className="pt-4 flex flex-wrap gap-4">
                <Link to="/tracking">
                  <Button variant="primary" size="md" className="font-bold">
                    Buka Halaman Pelacakan
                  </Button>
                </Link>
                <Link to="/bantuan">
                  <Button variant="outline" size="md" className="border-slate-700 text-slate-200 hover:bg-slate-800">
                    Pelajari Keamanan Tiket
                  </Button>
                </Link>
              </div>
            </div>

            <div className="lg:col-span-4 bg-slate-800/80 border border-slate-700 rounded-2xl p-6 space-y-4 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                <span className="text-slate-400">Contoh Format Tiket:</span>
                <span className="text-emerald-400 font-bold">TIK-2026-00128</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                <span className="text-slate-400">Kode Keamanan:</span>
                <span className="text-blue-400 font-bold">TRK-A7X92</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Status Saat Ini:</span>
                <span className="text-amber-400 font-bold">TELAAH_TEKNIS</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          5. FAQ PREVIEW & HELPDESK BANNER (HOW TO GET HELP)
         ========================================================================= */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
            Pertanyaan Yang Sering Diajukan
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-950">
            Pusat Informasi & FAQ
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            Informasi umum yang perlu diketahui sebelum mengajukan permohonan ke Diskominfo.
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-3">
          {faqItems.map((item, index) => {
            const isOpen = openFaqIndex === index;
            return (
              <div
                key={index}
                className="border border-slate-200 rounded-xl bg-white overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                  className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 font-semibold text-slate-900 hover:bg-slate-50 transition-colors"
                  aria-expanded={isOpen}
                >
                  <span className="text-sm">{item.q}</span>
                  {isOpen ? (
                    <ChevronUpIcon size={18} className="text-slate-500 shrink-0" />
                  ) : (
                    <ChevronDownIcon size={18} className="text-slate-500 shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-xs sm:text-sm text-slate-600 border-t border-slate-100 pt-3 leading-relaxed">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="text-center pt-2">
          <Link to="/bantuan">
            <Button variant="outline" size="sm">
              Lihat Seluruh Pertanyaan & Panduan (FAQ) →
            </Button>
          </Link>
        </div>

        {/* Official Helpdesk Banner */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-lg font-bold text-slate-950">
              Butuh Pendampingan Teknis atau Konsultasi KAK?
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 max-w-xl">
              Tim Helpdesk Aptika Diskominfo siap membantu perumusan kebutuhan sistem dan telaah awal dokumen OPD Anda.
            </p>
          </div>
          <Link to="/kontak" className="shrink-0">
            <Button variant="primary" size="md" className="font-bold">
              Hubungi Tim Helpdesk
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}