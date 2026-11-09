import { useState, type FormEvent, type ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  Alert,
  ArrowRightIcon,
  Badge,
  Button,
  CheckCircleIcon,
  ChevronDownIcon,
  ClockIcon,
  Input,
  MapPinIcon,
  SearchIcon,
  ShieldCheckIcon,
  ShieldIcon,
  UsersIcon,
} from '../components/ui';

export function HomePage() {
  const navigate = useNavigate();
  const [quickTicket, setQuickTicket] = useState('');
  const [quickCode, setQuickCode] = useState('');
  const [quickError, setQuickError] = useState<string | null>(null);

  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const handleQuickTrackSubmit = (e: FormEvent) => {
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
      <section className="relative overflow-hidden bg-[#F5F5F5] pt-10 pb-16 lg:pt-14 lg:pb-20 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 0.4, scale: 1 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 bg-cover bg-no-repeat bg-left-bottom sm:bg-bottom pointer-events-none"
          style={{
            backgroundImage: "url('/assets/backgrounds/hero-sabilulungan.png')",
          }}
          aria-hidden="true"
        />

        <div className="relative max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-7 space-y-5 text-center lg:text-left"
            >
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.1 }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#98F7D9] shadow-xs"
              >
                <MapPinIcon size={14} className="text-[#1B5040]" />
                <span className="text-[11px] font-bold text-[#1B5040] tracking-wider uppercase">
                  PORTAL RESMI SPBE PEMKAB BANDUNG
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 }}
                className="text-3xl sm:text-4xl lg:text-[48px] font-black tracking-tight leading-[1.15] text-[#000408]"
              >
                Sistem Manajemen Layanan <br className="hidden sm:inline" />
                <span className="text-[#1B5040]">Teknologi Informasi</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-sm sm:text-base text-slate-700 leading-relaxed max-w-xl mx-auto lg:mx-0"
              >
                Layanan satu pintu bagi seluruh Organisasi Perangkat Daerah (OPD) Kabupaten Bandung untuk permohonan{' '}
                <strong className="text-[#000408] font-semibold">pembangunan</strong> dan{' '}
                <strong className="text-[#000408] font-semibold">pengembangan aplikasi</strong> secara terpadu, akuntabel, dan transparan sesuai tata kelola SPBE.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.25 }}
                className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-1"
              >
                <Link to="/ajukan" className="w-full sm:w-auto">
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      variant="primary"
                      size="lg"
                      className="w-full sm:w-auto bg-[#1B5040] hover:bg-[#143D31] text-white font-semibold text-sm h-11 px-6 rounded-lg shadow-xs transition-colors"
                    >
                      Ajukan Permohonan Layanan
                      <ArrowRightIcon size={18} className="ml-2 text-white" />
                    </Button>
                  </motion.div>
                </Link>
                <Link to="/tracking" className="w-full sm:w-auto">
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full sm:w-auto bg-white hover:bg-[#CAF3E4]/30 text-[#1B5040] border border-slate-300 hover:border-[#2E8A6E] shadow-xs font-semibold text-sm h-11 px-5 rounded-lg transition-colors"
                    >
                      <SearchIcon size={16} className="mr-2 text-[#2E8A6E]" />
                      Lacak Status Tiket
                    </Button>
                  </motion.div>
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.35 }}
                className="pt-7 grid grid-cols-1 sm:grid-cols-3 gap-5 text-left"
              >
                <div className="flex items-center gap-3 sm:border-r sm:border-slate-200/90 sm:pr-4">
                  <ShieldIcon size={22} className="text-[#2E8A6E] shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-[#000408] uppercase tracking-wider">Permendagri 6/2025</p>
                    <p className="text-[11px] text-slate-500 leading-tight mt-0.5">Kepatuhan Arsitektur SPBE</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 sm:border-r sm:border-slate-200/90 sm:pr-4">
                  <UsersIcon size={22} className="text-[#2E8A6E] shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-[#000408] uppercase tracking-wider">Akses Tanpa Akun</p>
                    <p className="text-[11px] text-slate-500 leading-tight mt-0.5">Cukup Tiket & Kode Lacak</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <ShieldCheckIcon size={22} className="text-[#2E8A6E] shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-[#000408] uppercase tracking-wider">Audit Trail Penuh</p>
                    <p className="text-[11px] text-slate-500 leading-tight mt-0.5">Transparansi Setiap Disposisi</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="lg:col-span-5"
            >
              <div className="bg-white rounded-2xl shadow-xl shadow-slate-900/5 border border-slate-100 p-6 sm:p-7 relative transition-shadow hover:shadow-2xl">
                <div className="space-y-2 mb-5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold tracking-wider uppercase text-[#1B5040] bg-[#CAF3E4] px-2.5 py-1 rounded-full">
                      PENCARIAN CEPAT
                    </span>
                    <span className="text-[11px] text-slate-500 flex items-center gap-1.5 font-normal">
                      <ClockIcon size={13} className="text-slate-400" />
                      Real-time 24/7
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-[#000408] pt-1">
                    Lacak Progres Permohonan OPD
                  </h2>
                  <p className="text-xs text-slate-500 leading-normal">
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
                    <label htmlFor="quickTicketInput" className="block text-xs font-medium text-slate-700 mb-1.5">
                      Nomor Tiket Permohonan <span className="text-red-500">*</span>
                    </label>
                    <Input
                      id="quickTicketInput"
                      type="text"
                      placeholder="Contoh: TIK-2026-00001"
                      value={quickTicket}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setQuickTicket(e.target.value)}
                      className="font-mono text-sm bg-white text-slate-900 placeholder:text-slate-400 border-slate-200 focus-visible:outline-[#1B5040] focus-visible:border-[#1B5040] rounded-lg"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="quickCodeInput" className="block text-xs font-medium text-slate-700 mb-1.5">
                      Kode Pelacakan (Tracking Code)
                    </label>
                    <Input
                      id="quickCodeInput"
                      type="text"
                      placeholder="CONTOH: TRK-8F2A9C"
                      value={quickCode}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setQuickCode(e.target.value)}
                      className="font-mono text-sm uppercase bg-white text-slate-900 placeholder:text-slate-400 border-slate-200 focus-visible:outline-[#1B5040] focus-visible:border-[#1B5040] rounded-lg"
                    />
                    <p className="mt-1 text-[11px] text-slate-500">
                      Opsional di pencarian cepat, akan diminta saat melihat detail penuh.
                    </p>
                  </div>

                  <motion.div whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.985 }}>
                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                      className="w-full font-semibold text-sm bg-[#1B5040] hover:bg-[#143D31] text-white h-11 rounded-lg shadow-xs transition-colors"
                      leftIcon={<SearchIcon size={16} className="text-white" />}
                    >
                      Periksa Status Sekarang
                    </Button>
                  </motion.div>
                </form>

                <div className="mt-5 flex items-center justify-between text-xs text-slate-500">
                  <span>Belum mengajukan?</span>
                  <Link to="/layanan" className="text-[#1B5040] font-semibold hover:text-[#2E8A6E] hover:underline">
                    Lihat Katalog Layanan →
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-3xl mx-auto space-y-3 mb-12"
        >
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
        </motion.div>

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
          ].map((track, trackIdx) => (
            <motion.div
              key={track.number}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.55, delay: trackIdx * 0.15, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-[#98F7D9] transition-all p-6 sm:p-8 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-[#CAF3E4] text-[#1B5040] flex items-center justify-center font-bold text-xl">
                  {track.number}
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#2E8A6E]">
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
                    {track.requirements.map((req) => (
                      <li key={req} className="flex items-center gap-2">
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
                  <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                    <Button variant="primary" size="sm">
                      Persyaratan & Alur →
                    </Button>
                  </motion.div>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="bg-slate-100/70 border-y border-slate-200 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-2xl mx-auto space-y-2"
          >
            <span className="text-xs font-bold uppercase tracking-wider text-[#2E8A6E]">
              Alur Standar Pelayanan
            </span>
            <h2 className="text-3xl font-bold text-slate-950">
              Bagaimana Cara Mengajukan Permohonan?
            </h2>
            <p className="text-sm text-slate-600">
              Proses dirancang sederhana bagi PIC OPD tanpa birokrasi berbelit.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                num: 1,
                title: 'Pilih Kategori Layanan',
                desc: 'Tentukan apakah kebutuhan OPD merupakan aplikasi baru atau penyempurnaan aplikasi yang sudah aktif.',
              },
              {
                num: 2,
                title: 'Isi Data & Unggah Dokumen',
                desc: 'Lengkapi identitas PIC pemohon, deskripsi kebutuhan, serta lampiran Surat Dinas dan KAK dalam format PDF.',
              },
              {
                num: 3,
                title: 'Terima Bukti & Kode Lacak',
                desc: 'Sistem memberikan bukti registrasi resmi yang memuat Nomor Tiket dan Kode Keamanan untuk disimpan.',
              },
              {
                num: 4,
                title: 'Pantau Disposisi & Hasil',
                desc: 'Pantau progres telaah staf Aptika Diskominfo kapan saja melalui fitur lacak tiket secara langsung.',
              },
            ].map((step, idx) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.45, delay: idx * 0.1, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
                className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-[#98F7D9] transition-all space-y-3"
              >
                <div className="w-10 h-10 rounded-lg bg-[#1B5040] text-white flex items-center justify-center font-bold text-base shadow-xs">
                  {step.num}
                </div>
                <h3 className="font-bold text-base text-slate-900">
                  {step.title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="bg-[#0D2820] text-white rounded-3xl p-8 sm:p-12 lg:p-16 relative overflow-hidden border border-emerald-950 shadow-xl"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[#2BD9A5]">
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
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button variant="primary" size="md" className="font-bold bg-[#1B5040] hover:bg-[#143D31]">
                      Buka Halaman Pelacakan
                    </Button>
                  </motion.div>
                </Link>
                <Link to="/bantuan">
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button variant="primary" size="md" className="font-bold bg-[#1B5040] hover:bg-[#143D31]">
                      Pelajari Keamanan Tiket
                    </Button>
                  </motion.div>
                </Link>
              </div>
            </div>

            <motion.div
              whileHover={{ y: -3 }}
              transition={{ duration: 0.2 }}
              className="lg:col-span-4 bg-[#143D31]/80 border border-[#246854] rounded-2xl p-6 space-y-4 font-mono text-xs shadow-lg"
            >
              <div className="flex items-center justify-between border-b border-[#246854] pb-3">
                <span className="text-slate-300">Contoh Format Tiket:</span>
                <span className="text-white font-bold">TIK-2026-00128</span>
              </div>
              <div className="flex items-center justify-between border-b border-[#246854] pb-3">
                <span className="text-slate-300">Kode Keamanan:</span>
                <span className="text-white font-bold">TRK-A7X92</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Status Saat Ini:</span>
                <span className="text-white font-bold">TELAAH_TEKNIS</span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-2"
        >
          <span className="text-xs font-bold uppercase tracking-wider text-[#2E8A6E]">
            Pertanyaan Yang Sering Diajukan
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-950">
            Pusat Informasi & FAQ
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            Informasi umum yang perlu diketahui sebelum mengajukan permohonan ke Diskominfo.
          </p>
        </motion.div>

        <div className="space-y-3">
          {faqItems.map((item, index) => {
            const isOpen = openFaqIndex === index;
            return (
              <motion.div
                key={item.q}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-xs hover:border-[#98F7D9] transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                  className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 font-semibold text-slate-900 hover:bg-slate-50 transition-colors"
                  aria-expanded={isOpen}
                >
                  <span className="text-sm">{item.q}</span>
                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    className="shrink-0"
                  >
                    <ChevronDownIcon size={18} className="text-slate-500" />
                  </motion.div>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 text-xs sm:text-sm text-slate-600 border-t border-slate-100 pt-3 leading-relaxed">
                        {item.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        <div className="text-center pt-2">
          <Link to="/bantuan">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="inline-block">
              <Button variant="outline" size="sm">
                Lihat Seluruh Pertanyaan & Panduan (FAQ) →
              </Button>
            </motion.div>
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5 }}
          className="bg-gradient-to-r from-[#CAF3E4]/70 to-[#98F7D9]/40 border border-[#98F7D9] rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm"
        >
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-lg font-bold text-slate-950">
              Butuh Pendampingan Teknis atau Konsultasi KAK?
            </h3>
            <p className="text-xs sm:text-sm text-slate-700 max-w-xl">
              Tim Helpdesk Aptika Diskominfo siap membantu perumusan kebutuhan sistem dan telaah awal dokumen OPD Anda.
            </p>
          </div>
          <Link to="/kontak" className="shrink-0">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button variant="primary" size="md" className="font-bold">
                Hubungi Tim Helpdesk
              </Button>
            </motion.div>
          </Link>
        </motion.div>
      </section>
    </div>
  );
}