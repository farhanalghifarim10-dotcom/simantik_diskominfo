import { useState } from 'react';
import { Link } from 'react-router';
import { apiFetch } from '../lib/api';
import {
  Alert,
  Badge,
  Button,
  CheckCircleIcon,
  Input,
  Textarea,
  useToast,
} from '../components/ui';

export function ContactPage() {
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    opdName: '',
    senderName: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await apiFetch('/public/helpdesk/consultations', {
        method: 'POST',
        body: JSON.stringify(formData),
      });

      setIsSubmitting(false);
      setIsSubmitted(true);
      toast({
        type: 'success',
        title: 'Pesan Terkirim',
        message: 'Pertanyaan konsultasi Anda telah diterima oleh Tim Helpdesk Diskominfo.',
      });
    } catch (err: any) {
      setIsSubmitting(false);
      toast({
        type: 'danger',
        title: 'Gagal Mengirim Pesan',
        message: err.message || 'Terjadi gangguan saat mengirim formulir konsultasi.',
      });
    }
  };

  const handleReset = () => {
    setFormData({
      opdName: '',
      senderName: '',
      email: '',
      phone: '',
      subject: '',
      message: '',
    });
    setIsSubmitted(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16 space-y-12">
      {/* =========================================================================
          PAGE HEADER
         ========================================================================= */}
      <div className="border-b border-slate-200 pb-8 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider">
          <Link to="/" className="hover:underline text-slate-500">Beranda</Link>
          <span className="text-slate-400">/</span>
          <span>Kontak & Helpdesk</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight">
          Layanan Bantuan & Helpdesk Diskominfo
        </h1>
        <p className="text-sm sm:text-base text-slate-600 max-w-3xl leading-relaxed">
          Hubungi tim pengelola SPBE Bidang Aplikasi Informatika (Aptika) Diskominfo Pemerintah Daerah 
          Kabupaten Bandung untuk asistensi teknis, perumusan KAK, atau pertanyaan terkait pengajuan aplikasi.
        </p>
      </div>

      {/* =========================================================================
          CONFIGURABLE PLACEHOLDER ADVISORY
         ========================================================================= */}
      <Alert variant="warning" title="Pemberitahuan Data Kontak">
        <p className="text-xs sm:text-sm text-slate-700">
          Kontak telepon dan WhatsApp pada portal shell ini menggunakan nilai <strong>placeholder terkonfigurasi</strong>. 
          Nomor hotline resmi instansi akan diselaraskan dengan SK Tim Pelaksana SPBE Diskominfo Kabupaten Bandung pada saat perilisan produksi.
        </p>
      </Alert>

      {/* =========================================================================
          CONTACT INFO CARDS + INQUIRY FORM
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (5 cols): Official Institutional Channels */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-4">
              Kanal Pelayanan Resmi
            </h2>

            {/* Alamat Fisik */}
            <div className="space-y-1.5 text-xs sm:text-sm">
              <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block text-blue-600">
                Alamat Kantor Instansi
              </span>
              <p className="font-semibold text-slate-900">
                Dinas Komunikasi dan Informatika (Diskominfo)
              </p>
              <p className="text-slate-600 leading-relaxed">
                Pemerintah Daerah Kabupaten Bandung<br />
                Kompleks Perkantoran Pemkab Bandung, Gedung Diskominfo<br />
                Jl. Raya Soreang Km. 17, Soreang, Jawa Barat 40911
              </p>
              <p className="text-slate-500 text-xs pt-1">
                Layanan Tatap Muka: Ruang Bidang Aplikasi Informatika (Aptika) Lantai 2
              </p>
            </div>

            {/* Jam Layanan */}
            <div className="space-y-1.5 text-xs sm:text-sm pt-4 border-t border-slate-100">
              <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block text-blue-600">
                Waktu Pelayanan Operasional
              </span>
              <div className="space-y-1 text-slate-600">
                <div className="flex justify-between">
                  <span>Senin – Kamis:</span>
                  <span className="font-semibold text-slate-900">08.00 – 16.00 WIB</span>
                </div>
                <div className="flex justify-between">
                  <span>Jumat:</span>
                  <span className="font-semibold text-slate-900">08.00 – 16.30 WIB</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Sabtu, Minggu & Libur:</span>
                  <span>Tutup</span>
                </div>
                <p className="text-[11px] text-slate-500 pt-1">
                  *Istirahat: 12.00–13.00 WIB (Jumat: 11.30–13.00 WIB)
                </p>
              </div>
            </div>

            {/* Kanal Komunikasi Placeholder */}
            <div className="space-y-3 pt-4 border-t border-slate-100 text-xs sm:text-sm">
              <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block text-blue-600">
                Telepon & Komunikasi Digital
              </span>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Telepon / Hotline</span>
                  <Badge variant="neutral" className="text-[10px]">Placeholder</Badge>
                </div>
                <p className="font-mono text-slate-700">(022) 589-XXXX</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">WhatsApp Helpdesk Layanan</span>
                  <Badge variant="neutral" className="text-[10px]">Placeholder</Badge>
                </div>
                <p className="font-mono text-slate-700">+62 811-XXXX-XXXX</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Pos-el (Email) Resmi</span>
                  <Badge variant="primary" className="text-[10px]">Resmi Pemkab</Badge>
                </div>
                <p className="font-mono text-slate-700">diskominfo@bandungkab.go.id</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (7 cols): Public Inquiry Form */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="space-y-1 border-b border-slate-100 pb-4">
            <h2 className="text-xl font-bold text-slate-900">
              Kirim Pesan atau Konsultasi OPD
            </h2>
            <p className="text-xs text-slate-500">
              Gunakan formulir ini jika OPD Anda membutuhkan konsultasi pra-pengajuan atau klarifikasi teknis.
            </p>
          </div>

          {isSubmitted ? (
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircleIcon size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900">
                  Pesan Berhasil Terkirim
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
                  Terima kasih. Tim Helpdesk Diskominfo akan meninjau pesan dari OPD Anda dan menghubungi narahubung dalam waktu maksimal 1x24 jam kerja.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleReset}>
                Kirim Pesan Lain
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="opdNameInput" className="block text-xs font-semibold text-slate-800 mb-1">
                    Nama OPD / Instansi <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="opdNameInput"
                    type="text"
                    placeholder="Contoh: Dinas Kesehatan"
                    value={formData.opdName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, opdName: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="senderNameInput" className="block text-xs font-semibold text-slate-800 mb-1">
                    Nama Narahubung (PIC) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="senderNameInput"
                    type="text"
                    placeholder="Contoh: Budi Santoso, S.Kom"
                    value={formData.senderName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, senderName: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="emailInput" className="block text-xs font-semibold text-slate-800 mb-1">
                    Alamat Email Resmi <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="emailInput"
                    type="email"
                    placeholder="nama@bandungkab.go.id"
                    value={formData.email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="phoneInput" className="block text-xs font-semibold text-slate-800 mb-1">
                    Nomor WhatsApp PIC <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="phoneInput"
                    type="tel"
                    placeholder="Contoh: 081234567890"
                    value={formData.phone}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="subjectInput" className="block text-xs font-semibold text-slate-800 mb-1">
                  Topik Konsultasi <span className="text-red-500">*</span>
                </label>
                <Input
                  id="subjectInput"
                  type="text"
                  placeholder="Contoh: Konsultasi Penyusunan KAK Sistem Antrean Puskesmas"
                  value={formData.subject}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, subject: e.target.value })}
                  required
                />
              </div>

              <div>
                <label htmlFor="messageInput" className="block text-xs font-semibold text-slate-800 mb-1">
                  Uraian Pertanyaan / Kebutuhan <span className="text-red-500">*</span>
                </label>
                <Textarea
                  id="messageInput"
                  rows={4}
                  placeholder="Uraikan gambaran umum kebutuhan, kendala yang dihadapi, atau jadwal konsultasi yang diharapkan..."
                  value={formData.message}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, message: e.target.value })}
                  required
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isSubmitting}
                  className="w-full sm:w-auto font-bold"
                >
                  Kirim Pesan Konsultasi
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
