import { useState } from 'react';
import { Link } from 'react-router';
import { motion } from 'motion/react';
import {
  Alert,
  ArrowRightIcon,
  Badge,
  Button,
  CheckCircleIcon,
  ClockIcon,
  Dialog,
  EmptyState,
  ErrorState,
  FileTextIcon,
  ShieldIcon,
  Skeleton,
  Tab,
  TabList,
  TabPanel,
  Tabs,
} from '../components/ui';
import { usePublicServices, type Service, type ServiceRequirement } from '../hooks/useServices';

export function ServicesPage() {
  const [selectedServiceForModal, setSelectedServiceForModal] = useState<Service | null>(null);

  const {
    data: services,
    isLoading,
    isError,
    error,
    refetch,
  } = usePublicServices();

  const getRequirementTypeBadge = (type: string) => {
    switch (type) {
      case 'DOCUMENT':
        return <Badge variant="primary">Dokumen (PDF)</Badge>;
      case 'DATA':
        return <Badge variant="info">Data / Isian Formulir</Badge>;
      case 'CONFIRMATION':
        return <Badge variant="warning">Pernyataan Komitmen</Badge>;
      default:
        return <Badge variant="neutral">{type}</Badge>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16 space-y-12">
      {/* =========================================================================
          PAGE HEADER
         ========================================================================= */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="border-b border-slate-200 pb-8 space-y-3"
      >
        <div className="flex items-center gap-2 text-xs font-semibold text-[#1B5040] uppercase tracking-wider">
          <Link to="/" className="hover:underline text-slate-500">Beranda</Link>
          <span className="text-slate-400">/</span>
          <span>Katalog Layanan</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight">
          Katalog Layanan Teknologi Informasi
        </h1>
        <p className="text-sm sm:text-base text-slate-600 max-w-3xl leading-relaxed">
          Pilih kategori layanan yang sesuai dengan kebutuhan digitalisasi pada unit kerja Anda. 
          Pastikan seluruh berkas kelengkapan wajib telah disiapkan sebelum memulai formulir pengajuan.
        </p>
      </motion.div>

      {/* =========================================================================
          SPBE REGULATION NOTICE
         ========================================================================= */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      >
        <Alert variant="info" title="Pemberitahuan Penyelenggaraan SPBE Terpadu">
          <div className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-1">
            <p>
              Sesuai amanat <strong>Permenkomdigi No. 6 Tahun 2025</strong> dan regulasi SPBE Pemerintah Daerah Kabupaten Bandung,
              seluruh inisiatif perangkat lunak harus melalui telaah arsitektur Diskominfo guna mencegah duplikasi fungsi dan
              memastikan standar interoperabilitas data daerah.
            </p>
          </div>
        </Alert>
      </motion.div>

      {/* =========================================================================
          LOADING STATE
         ========================================================================= */}
      {isLoading && (
        <div className="space-y-8">
          <div className="flex gap-3">
            <Skeleton className="h-10 w-48 rounded-lg" />
            <Skeleton className="h-10 w-48 rounded-lg" />
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-8 space-y-6">
            <Skeleton className="h-8 w-1/3 rounded" />
            <Skeleton className="h-16 w-3/4 rounded" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              <Skeleton className="h-32 rounded-xl" />
              <Skeleton className="h-32 rounded-xl" />
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          ERROR STATE
         ========================================================================= */}
      {!isLoading && isError && (
        <div className="bg-white rounded-2xl border border-red-200 p-8 shadow-sm">
          <ErrorState
            title="Gagal Memuat Katalog Layanan"
            description={error?.message || 'Terjadi kendala saat mengambil data layanan dari peladen.'}
            onRetry={() => refetch()}
          />
        </div>
      )}

      {/* =========================================================================
          EMPTY STATE
         ========================================================================= */}
      {!isLoading && !isError && (!services || services.length === 0) && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <EmptyState
            title="Katalog Layanan Belum Tersedia"
            description="Saat ini belum ada layanan aktif yang dipublikasikan dalam katalog sistem."
          />
        </div>
      )}

      {/* =========================================================================
          SERVICES TABS & DETAILED BREAKDOWN
         ========================================================================= */}
      {!isLoading && !isError && services && services.length > 0 && (
        <Tabs defaultValue={services[0].slug} variant="pills" className="w-full">
          <TabList className="mb-8 w-full sm:w-auto">
            {services.map((srv, idx) => (
              <Tab key={srv.id} value={srv.slug} className="text-xs sm:text-sm font-bold">
                {String(idx + 1).padStart(2, '0')}. {srv.name}
              </Tab>
            ))}
          </TabList>

          {services.map((srv) => {
            const reqs = srv.requirements || [];
            const requiredDocs = reqs.filter((r) => r.is_required);
            const optionalDocs = reqs.filter((r) => !r.is_required);

            return (
              <TabPanel key={srv.id} value={srv.slug} className="space-y-8">
                {/* Top Card Summary */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-mono text-xs font-bold text-[#1B5040] bg-[#CAF3E4] px-2 py-0.5 rounded">
                          {srv.code}
                        </span>
                        <Badge variant="primary" className="uppercase font-bold text-[11px]">
                          {srv.type === 'DEVELOPMENT' ? 'Pembangunan Baru' : 'Pengembangan Eksisting'}
                        </Badge>
                        <span className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                          <ClockIcon size={14} className="shrink-0" />
                          Estimasi Telaah: Menyesuaikan Kelengkapan Berkas & Antrean
                        </span>
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                        {srv.name}
                      </h2>
                      <p className="text-sm text-slate-600 max-w-3xl leading-relaxed">
                        {srv.description}
                      </p>
                    </div>

                    <div className="shrink-0 flex flex-col sm:flex-row gap-3">
                      <Link to={`/ajukan?service=${srv.slug}`}>
                        <Button
                          variant="primary"
                          size="md"
                          className="font-bold shadow-md"
                        >
                          Mulai Ajukan Permohonan
                          <ArrowRightIcon size={16} className="ml-2" />
                        </Button>
                      </Link>
                    </div>
                  </div>

                  {/* 2 Kolom: Kriteria Kelayakan & Alur Tahapan */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6">
                    {/* Column 1: Kriteria */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                        <ShieldIcon size={16} className="text-[#2E8A6E]" />
                        Kriteria & Ketentuan SPBE
                      </h3>
                      <ul className="space-y-3">
                        <li className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-600">
                          <CheckCircleIcon size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                          <span>Mendukung pelaksanaan tugas pokok dan fungsi (Tupoksi) resmi instansi pemohon.</span>
                        </li>
                        <li className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-600">
                          <CheckCircleIcon size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                          <span>
                            {srv.type === 'DEVELOPMENT'
                              ? 'Fungsi sistem belum pernah dibangun dan tidak menduplikasi aplikasi daerah/pusat lainnya.'
                              : 'Aplikasi eksisting telah terdaftar dalam sistem inventarisasi aplikasi daerah.'}
                          </span>
                        </li>
                        <li className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-600">
                          <CheckCircleIcon size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                          <span>Penunjukan personil narahubung (PIC Teknis) yang menguasai proses bisnis pelayanan.</span>
                        </li>
                      </ul>
                    </div>

                    {/* Column 2: Alur Pelaksanaan */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                        <ClockIcon size={16} className="text-[#2E8A6E]" />
                        Tahapan Pelaksanaan
                      </h3>
                      <ol className="space-y-3 text-xs sm:text-sm text-slate-600">
                        <li className="flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                          <span>Pengajuan formulir dan berkas dokumen persyaratan pada portal SIMANTIK.</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                          <span>Verifikasi administrasi dan kelayakan arsitektur oleh Tim Aptika Diskominfo.</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                          <span>Rapat klarifikasi teknis bersama Tim Pengembang & PIC OPD pemohon.</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">4</span>
                          <span>Pelaksanaan teknis, pengujian fungsi (UAT), dan Berita Acara Serah Terima.</span>
                        </li>
                      </ol>
                    </div>
                  </div>
                </div>

                {/* =========================================================================
                    SERVICE REQUIREMENTS SECTION: WAJIB VS OPSIONAL
                   ========================================================================= */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-slate-950">
                      Persyaratan Dokumen & Data Pengajuan
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600">
                      Daftar kelengkapan yang wajib dan disarankan untuk diunggah sebelum pengajuan diproses.
                    </p>
                  </div>

                  {/* Bagian 1: Persyaratan Wajib */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-red-600 bg-red-50 px-2 py-0.5 rounded">
                        Persyaratan Wajib ({requiredDocs.length})
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {requiredDocs.map((doc: ServiceRequirement) => (
                        <motion.div
                          key={doc.id}
                          whileHover={{ y: -3, transition: { duration: 0.18 } }}
                          className="p-5 rounded-xl border-2 border-slate-200 bg-white shadow-sm space-y-2 hover:border-[#98F7D9] transition-all"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <div className="p-2 rounded-lg bg-[#CAF3E4] text-[#1B5040]">
                                <FileTextIcon size={18} />
                              </div>
                              <h4 className="text-sm font-bold text-slate-900">
                                {doc.name}
                              </h4>
                            </div>
                            <div className="shrink-0 flex items-center gap-1.5">
                              {getRequirementTypeBadge(doc.type)}
                              <Badge variant="danger" className="text-[10px]">Wajib</Badge>
                            </div>
                          </div>
                          {doc.description && (
                            <p className="text-xs text-slate-600 leading-relaxed pl-9">
                              {doc.description}
                            </p>
                          )}
                          {doc.is_placeholder && (
                            <span className="inline-block text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded ml-9">
                              *Data konfigurasi implementasi
                            </span>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Bagian 2: Persyaratan Opsional / Pendukung */}
                  {optionalDocs.length > 0 && (
                    <div className="space-y-3 pt-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          Dokumen Pendukung / Opsional ({optionalDocs.length})
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {optionalDocs.map((doc: ServiceRequirement) => (
                          <motion.div
                            key={doc.id}
                            whileHover={{ y: -3, transition: { duration: 0.18 } }}
                            className="p-5 rounded-xl border border-slate-200 bg-white/80 shadow-sm space-y-2 hover:border-slate-300 transition-all"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
                                  <FileTextIcon size={18} />
                                </div>
                                <h4 className="text-sm font-bold text-slate-800">
                                  {doc.name}
                                </h4>
                              </div>
                              <div className="shrink-0 flex items-center gap-1.5">
                                {getRequirementTypeBadge(doc.type)}
                                <Badge variant="neutral" className="text-[10px]">Opsional</Badge>
                              </div>
                            </div>
                            {doc.description && (
                              <p className="text-xs text-slate-500 leading-relaxed pl-9">
                                {doc.description}
                              </p>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </TabPanel>
            );
          })}
        </Tabs>
      )}

      {/* =========================================================================
          HELP & ASSISTANCE BANNER
         ========================================================================= */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.5 }}
        className="rounded-2xl bg-slate-100 border border-slate-200 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6"
      >
        <div className="space-y-1 text-center sm:text-left">
          <h4 className="text-base font-bold text-slate-900">
            Perlu Template Dokumen KAK atau Panduan Penyusunan?
          </h4>
          <p className="text-xs sm:text-sm text-slate-600">
            Kunjungi pusat bantuan untuk mengunduh format standar KAK atau hubungi desk konsultasi Diskominfo.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link to="/bantuan">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button variant="outline" size="sm">
                Bantuan & FAQ
              </Button>
            </motion.div>
          </Link>
          <Link to="/kontak">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button variant="primary" size="sm">
                Kontak Helpdesk
              </Button>
            </motion.div>
          </Link>
        </div>
      </motion.div>

      {/* Modal Dialog for Guidance & Clear Call to Action */}
      <Dialog
        isOpen={Boolean(selectedServiceForModal)}
        onClose={() => setSelectedServiceForModal(null)}
        title={`Pengajuan: ${selectedServiceForModal?.name}`}
        description="Panduan Kesiapan Dokumen Pengajuan OPD"
        footer={
          <>
            <Link to="/kontak" onClick={() => setSelectedServiceForModal(null)}>
              <Button variant="outline" size="sm">
                Hubungi Helpdesk
              </Button>
            </Link>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setSelectedServiceForModal(null)}
            >
              Mengerti & Siapkan Berkas
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-xs sm:text-sm text-slate-600">
          <p>
            Pastikan seluruh dokumen kelengkapan telah siap sebelum melanjutkan ke formulir pengajuan layanan.
          </p>
          <div className="p-3.5 rounded-lg bg-[#CAF3E4]/60 border border-[#98F7D9] text-[#000408] space-y-2 text-xs">
            <p className="font-bold">Persyaratan Utama Yang Perlu Disiapkan OPD:</p>
            <ul className="space-y-1 text-[#1B5040] list-disc list-inside">
              {(selectedServiceForModal?.requirements || [])
                .filter((r) => r.is_required)
                .map((r) => (
                  <li key={r.id}>
                    <strong>{r.name}</strong> ({r.type === 'DOCUMENT' ? 'Berkas PDF' : r.type})
                  </li>
                ))}
            </ul>
          </div>
          <p className="text-xs text-slate-500">
            Jika OPD Anda memerlukan konsultasi pra-pengajuan atau perumusan KAK, silakan hubungi tim Helpdesk Aptika Diskominfo.
          </p>
        </div>
      </Dialog>
    </div>
  );
}
