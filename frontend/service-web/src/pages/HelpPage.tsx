import { useState, useMemo } from 'react';
import { Link } from 'react-router';
import {
  Button,
  ChevronDownIcon,
  ChevronUpIcon,
  HelpCircleIcon,
  Input,
  SearchIcon,
  ShieldIcon,
} from '../components/ui';

interface FaqItem {
  id: string;
  category: 'umum' | 'dokumen' | 'tracking' | 'teknis';
  question: string;
  answer: string;
}

const FAQ_DATA: FaqItem[] = [
  // Kategori: Umum
  {
    id: 'u-1',
    category: 'umum',
    question: 'Apa itu SIMANTIK dan mengapa seluruh OPD wajib menggunakannya?',
    answer: 'SIMANTIK (Sistem Manajemen Layanan Teknologi Informasi) adalah portal resmi Pemerintah Daerah Kabupaten Bandung untuk mengelola seluruh permohonan pembangunan dan pengembangan aplikasi. Sesuai Permenkomdigi No. 6 Tahun 2025 dan Peraturan Daerah terkait SPBE, seluruh belanja teknologi dan sistem informasi harus terstandardisasi melalui Diskominfo untuk mencegah fragmentasi, duplikasi sistem, serta menjamin interoperabilitas satu data daerah.',
  },
  {
    id: 'u-2',
    category: 'umum',
    question: 'Apakah unit pelaksana teknis (UPTD), Puskesmas, atau Kecamatan dapat mengajukan?',
    answer: 'Ya. Seluruh unit kerja di bawah Pemerintah Daerah Kabupaten Bandung dapat mengajukan permohonan, dengan ketentuan surat permohonan diketahui dan ditandatangani oleh Kepala Dinas/Badan induk atau Camat terkait.',
  },
  {
    id: 'u-3',
    category: 'umum',
    question: 'Apakah ada biaya yang dikenakan kepada OPD untuk layanan ini?',
    answer: 'Tidak ada biaya. Seluruh layanan telaah, konsultasi arsitektur, dan pengembangan yang difasilitasi oleh Diskominfo Kabupaten Bandung bersumber dari APBD dan diselenggarakan secara cuma-cuma bagi seluruh OPD.',
  },

  // Kategori: Dokumen
  {
    id: 'd-1',
    category: 'dokumen',
    question: 'Apa saja format dokumen Kerangka Acuan Kerja (KAK) yang disyaratkan?',
    answer: 'KAK harus memuat minimal: Latar Belakang Permasalahan, Landasan Hukum, Maksud dan Tujuan, Ruang Lingkup Pengguna & Fitur, Alur Bisnis Pelayanan (SOP), Output yang diharapkan, serta Jadwal Pelaksanaan Tentatif. Dokumen diunggah dalam format PDF resmi.',
  },
  {
    id: 'd-2',
    category: 'dokumen',
    question: 'Siapa yang harus ditunjuk sebagai Pejabat Penghubung / PIC Teknis OPD?',
    answer: 'PIC Teknis disarankan adalah pejabat struktural atau fungsional pranata komputer / pengelola IT di OPD yang memahami proses bisnis pelayanan harian serta memiliki akses koordinasi langsung dengan pimpinan OPD.',
  },
  {
    id: 'd-3',
    category: 'dokumen',
    question: 'Bagaimana jika OPD belum memiliki dokumen KAK yang lengkap?',
    answer: 'OPD dapat berkonsultasi terlebih dahulu dengan Bidang Aptika Diskominfo melalui Helpdesk untuk mendapatkan asistensi dan template panduan penyusunan KAK SPBE.',
  },

  // Kategori: Tracking
  {
    id: 't-1',
    category: 'tracking',
    question: 'Mengapa pemohon membutuhkan Kode Pelacakan selain Nomor Tiket?',
    answer: 'Kode Pelacakan berfungsi sebagai kunci keamanan otentikasi ringan. Karena portal ini tidak mewajibkan login akun OPD, kode keamanan memastikan bahwa catatan telaah teknis internal OPD Anda tidak dapat dibuka oleh sembarang orang di internet.',
  },
  {
    id: 't-2',
    category: 'tracking',
    question: 'Bagaimana jika PIC OPD kehilangan bukti registrasi dan Kode Pelacakan?',
    answer: 'PIC resmi dapat mengajukan permohonan pemulihan kode melalui Helpdesk resmi Diskominfo dengan menyebutkan Nomor Surat Dinas dan nama instansi pemohon untuk diverifikasi ulang.',
  },
  {
    id: 't-3',
    category: 'tracking',
    question: 'Berapa lama waktu yang dibutuhkan untuk proses telaah teknis?',
    answer: 'Estimasi Telaah: Menyesuaikan Kelengkapan Berkas & Antrean.',
  },

  // Kategori: Teknis & Pengujian
  {
    id: 'k-1',
    category: 'teknis',
    question: 'Apa itu UAT (User Acceptance Testing) dan kapan dilaksanakan?',
    answer: 'UAT adalah pengujian kesesuaian fungsi sistem oleh tim pengguna OPD sebelum aplikasi diluncurkan. UAT dilaksanakan setelah tahap pengembangan selesai dan menjadi prasyarat penerbitan Berita Acara Serah Terima.',
  },
  {
    id: 'k-2',
    category: 'teknis',
    question: 'Apakah aplikasi akan di-hosting di Pusat Data Diskominfo?',
    answer: 'Ya. Seluruh aplikasi yang telah disetujui akan ditempatkan pada infrastruktur Pusat Data Daerah / Server SPBE Diskominfo dengan standar keamanan siber BSSN dan pencadangan berkala.',
  },
];

export function HelpPage() {
  const [activeCategory, setActiveCategory] = useState<string>('semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>('u-1');

  const filteredFaqs = useMemo(() => {
    return FAQ_DATA.filter((item) => {
      const matchCat = activeCategory === 'semua' || item.category === activeCategory;
      const matchQuery =
        item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.answer.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [activeCategory, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16 space-y-12">
      {/* =========================================================================
          PAGE HEADER
         ========================================================================= */}
      <div className="border-b border-slate-200 pb-8 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider">
          <Link to="/" className="hover:underline text-slate-500">Beranda</Link>
          <span className="text-slate-400">/</span>
          <span>Bantuan & FAQ</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight">
          Pusat Bantuan & Pertanyaan Umum
        </h1>
        <p className="text-sm sm:text-base text-slate-600 max-w-3xl leading-relaxed">
          Temukan jawaban atas pertanyaan seputar tata cara pengajuan, persyaratan berkas KAK, 
          mekanisme pelacakan tiket, dan standar SPBE di Kabupaten Bandung.
        </p>
      </div>

      {/* =========================================================================
          SEARCH & FILTER BAR
         ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="max-w-2xl">
          <label htmlFor="faqSearch" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Cari Topik Bantuan
          </label>
          <div className="relative">
            <Input
              id="faqSearch"
              type="text"
              placeholder="Ketik kata kunci (contoh: KAK, PIC, biaya, UAT, hosting)..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              className="pl-10 text-sm"
            />
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <SearchIcon size={16} />
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setActiveCategory('semua')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeCategory === 'semua'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua Topik ({FAQ_DATA.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('umum')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeCategory === 'umum'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Kebijakan SPBE
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('dokumen')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeCategory === 'dokumen'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Dokumen & KAK
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('tracking')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeCategory === 'tracking'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Pelacakan Tiket
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('teknis')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeCategory === 'teknis'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Teknis & UAT
          </button>
        </div>
      </div>

      {/* =========================================================================
          FAQ ACCORDION LIST
         ========================================================================= */}
      <div className="space-y-4">
        {filteredFaqs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
            <HelpCircleIcon size={32} className="mx-auto text-slate-400" />
            <h3 className="text-base font-bold text-slate-900">
              Tidak ada topik yang cocok
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Kata kunci "{searchQuery}" tidak ditemukan pada daftar pertanyaan umum.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setActiveCategory('semua');
              }}
            >
              Reset Pencarian
            </Button>
          </div>
        ) : (
          filteredFaqs.map((item) => {
            const isExpanded = expandedId === item.id;
            return (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  className="w-full text-left px-6 py-4.5 flex items-center justify-between gap-4 font-bold text-slate-900 hover:bg-slate-50 transition-colors"
                  aria-expanded={isExpanded}
                >
                  <span className="text-sm sm:text-base flex items-center gap-2">
                    <span className="text-blue-600">Q:</span> {item.question}
                  </span>
                  {isExpanded ? (
                    <ChevronUpIcon size={20} className="text-slate-500 shrink-0" />
                  ) : (
                    <ChevronDownIcon size={20} className="text-slate-500 shrink-0" />
                  )}
                </button>
                {isExpanded && (
                  <div className="px-6 pb-6 text-xs sm:text-sm text-slate-600 border-t border-slate-100 pt-3 leading-relaxed">
                    <div className="space-y-2">
                      <p>{item.answer}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* =========================================================================
          OPD PREPARATION CHECKLIST CARD
         ========================================================================= */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase tracking-wider">
          <ShieldIcon size={16} />
          <span>Panduan Cepat PIC OPD</span>
        </div>
        <h3 className="text-xl font-bold text-white">
          Daftar Periksa Sebelum Mengajukan Permohonan
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300 pt-2">
          <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700 space-y-1">
            <p className="font-bold text-white">✓ Validasi Kebutuhan</p>
            <p>Pastikan sistem belum pernah dibangun dan benar-benar menunjang Tupoksi dinas Anda.</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700 space-y-1">
            <p className="font-bold text-white">✓ Tanda Tangan Resmi</p>
            <p>Surat pengantar wajib ditandatangani Kepala OPD / Pejabat Eselon II terkait.</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700 space-y-1">
            <p className="font-bold text-white">✓ Kelengkapan KAK</p>
            <p>Dokumen KAK memuat ruang lingkup proses bisnis dan bagan alir yang jelas.</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700 space-y-1">
            <p className="font-bold text-white">✓ Kesiapan Personil</p>
            <p>PIC teknis ditugaskan siap menghadiri rapat klarifikasi teknis bersama Diskominfo.</p>
          </div>
        </div>
      </div>

      {/* =========================================================================
          STILL NEED HELP BANNER
         ========================================================================= */}
      <div className="border border-blue-200 bg-blue-50/70 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-1 text-center sm:text-left">
          <h4 className="text-base font-bold text-blue-950">
            Pertanyaan Anda Belum Terjawab di Sini?
          </h4>
          <p className="text-xs sm:text-sm text-blue-800">
            Hubungi langsung meja layanan Helpdesk Aptika Diskominfo untuk konsultasi lebih lanjut.
          </p>
        </div>
        <Link to="/kontak" className="shrink-0">
          <Button variant="primary" size="md" className="font-bold">
            Hubungi Helpdesk
          </Button>
        </Link>
      </div>
    </div>
  );
}
