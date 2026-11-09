import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import {
  ArrowRightIcon,
  Badge,
  Button,
  CheckCircleIcon,
  ClockIcon,
  ConfirmationDialog,
  FileTextIcon,
  InfoIcon,
  Input,
  Select,
  Skeleton,
  Textarea,
  useToast,
} from '../components/ui';
import { usePublicServices, type Service } from '../hooks/useServices';
import { useOpdUnits } from '../hooks/useOpdUnits';
import {
  useSubmitApplication,
  type ApplicationSubmissionResult,
} from '../hooks/useSubmitApplication';
import {
  validateClientFile,
  computeAcceptAttribute,
  computeFormatDescription,
  BASELINE_ALLOWED_EXTENSIONS,
} from '../lib/fileValidation';
import {
  calculateServiceTransition,
  filterValidUploadedDocuments,
  getValidDocumentRequirements,
  type UploadedFileState,
} from '../lib/submissionWizard';

const STEPS = [
  { id: 1, title: 'Pilih Layanan' },
  { id: 2, title: 'Data Pemohon' },
  { id: 3, title: 'Rincian Kebutuhan' },
  { id: 4, title: 'Unggah Dokumen' },
  { id: 5, title: 'Syarat & Ketentuan' },
  { id: 6, title: 'Tinjau & Kirim' },
];

export function ApplicationSubmissionPage() {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const { data: services, isLoading: servicesLoading } = usePublicServices();
  const { data: opdUnits, isLoading: opdLoading } = useOpdUnits();

  const submitMutation = useSubmitApplication();

  const [currentStep, setCurrentStep] = useState(1);
  const [submissionResult, setSubmissionResult] = useState<ApplicationSubmissionResult | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const param = searchParams.get('service');
  const matchedFromParam = services?.find((s) => s.slug === param || s.id === param);
  const serviceId = selectedServiceId ?? (matchedFromParam?.id || (services && services.length > 0 ? services[0].id : ''));
  const [opdUnitId, setOpdUnitId] = useState('');

  const [applicantName, setApplicantName] = useState('');
  const [applicantEmployeeId, setApplicantEmployeeId] = useState('');
  const [applicantPosition, setApplicantPosition] = useState('');
  const [applicantEmail, setApplicantEmail] = useState('');
  const [applicantPhone, setApplicantPhone] = useState('');

  const [title, setTitle] = useState('');
  const [background, setBackground] = useState('');
  const [problemStatement, setProblemStatement] = useState('');
  const [objective, setObjective] = useState('');
  const [scope, setScope] = useState('');
  const [expectedOutput, setExpectedOutput] = useState('');
  const [requestedDeadline, setRequestedDeadline] = useState('');
  const [existingApplicationName, setExistingApplicationName] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  const [uploadedDocuments, setUploadedDocuments] = useState<Record<string, UploadedFileState>>({});

  const [termsAccepted, setTermsAccepted] = useState(false);
  const termsVersion = 'v1.0-2026';

  const selectedService: Service | undefined = services?.find((s) => s.id === serviceId);
  const selectedOpd = opdUnits?.find((o) => o.id === opdUnitId);

  const validDocumentRequirements = getValidDocumentRequirements(selectedService);
  const activeUploadedDocuments = filterValidUploadedDocuments(uploadedDocuments, selectedService);

  const handleSelectService = (newServiceId: string) => {
    const newService = services?.find((s) => s.id === newServiceId);
    if (!newService) return;

    const transition = calculateServiceTransition(
      newService,
      serviceId,
      uploadedDocuments,
      existingApplicationName,
    );

    setSelectedServiceId(newServiceId);

    if (transition.docsChanged) {
      setUploadedDocuments(transition.newDocs);
      if (transition.noticeMessage) {
        toast({
          type: 'info',
          title: 'Kategori Layanan Diubah',
          message: transition.noticeMessage,
        });
      }
    }

    setExistingApplicationName(transition.newExistingApplicationName);
    if (transition.resetTerms) {
      setTermsAccepted(false);
    }
  };

  const handleFileUpload = (
    requirementId: string,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const req = selectedService?.requirements?.find((r) => r.id === requirementId);
    const validation = validateClientFile(
      file,
      req?.allowed_file_types,
      req?.max_file_size_mb,
    );

    if (!validation.valid) {
      toast({
        type: 'danger',
        title: 'Format Berkas Tidak Didukung',
        message: validation.errorMessage || `Berkas "${file.name}" tidak didukung.`,
      });
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string)?.split(',')[1] || '';
      setUploadedDocuments((prev) => ({
        ...prev,
        [requirementId]: {
          requirement_id: requirementId,
          original_filename: file.name,
          mime_type: validation.resolvedMime || file.type || 'application/pdf',
          size_bytes: file.size,
          base64_data: base64,
        },
      }));
      toast({
        type: 'success',
        title: 'Berkas Terlampir',
        message: `Berkas "${file.name}" berhasil disiapkan.`,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = (requirementId: string) => {
    setUploadedDocuments((prev) => {
      const updated = { ...prev };
      delete updated[requirementId];
      return updated;
    });
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!serviceId) {
        toast({ type: 'warning', title: 'Pilih Layanan', message: 'Silakan pilih jenis permohonan layanan.' });
        return;
      }
    } else if (currentStep === 2) {
      if (!opdUnitId) {
        toast({ type: 'warning', title: 'Pilih OPD', message: 'Unit kerja OPD wajib dipilih.' });
        return;
      }
      if (!applicantName.trim() || applicantName.trim().length < 3) {
        toast({ type: 'warning', title: 'Nama Pemohon', message: 'Nama lengkap pemohon wajib diisi minimal 3 karakter.' });
        return;
      }
      if (!applicantPosition.trim()) {
        toast({ type: 'warning', title: 'Jabatan Pemohon', message: 'Jabatan pemohon di OPD wajib diisi.' });
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(applicantEmail.trim())) {
        toast({ type: 'warning', title: 'Email Tidak Valid', message: 'Harap masukkan alamat email kedinasan yang valid.' });
        return;
      }
      if (!applicantPhone.trim() || applicantPhone.trim().length < 8) {
        toast({ type: 'warning', title: 'Nomor Kontak', message: 'Nomor WhatsApp / telepon aktif wajib diisi.' });
        return;
      }
    } else if (currentStep === 3) {
      if (!title.trim() || title.trim().length < 5) {
        toast({ type: 'warning', title: 'Judul Permohonan', message: 'Judul permohonan sistem wajib diisi minimal 5 karakter.' });
        return;
      }
      if (!background.trim() || background.trim().length < 10) {
        toast({ type: 'warning', title: 'Latar Belakang', message: 'Latar belakang permohonan wajib diisi minimal 10 karakter.' });
        return;
      }
      if (!problemStatement.trim() || problemStatement.trim().length < 10) {
        toast({ type: 'warning', title: 'Rumusan Masalah', message: 'Rumusan masalah wajib diisi minimal 10 karakter.' });
        return;
      }
      if (!objective.trim() || objective.trim().length < 10) {
        toast({ type: 'warning', title: 'Maksud & Tujuan', message: 'Maksud dan tujuan permohonan wajib diisi minimal 10 karakter.' });
        return;
      }
      if (!scope.trim() || scope.trim().length < 10) {
        toast({ type: 'warning', title: 'Ruang Lingkup', message: 'Ruang lingkup sistem wajib diisi minimal 10 karakter.' });
        return;
      }
      if (!expectedOutput.trim() || expectedOutput.trim().length < 5) {
        toast({ type: 'warning', title: 'Output Sistem', message: 'Output yang diharapkan wajib diisi.' });
        return;
      }
      if (selectedService?.type === 'ENHANCEMENT' && (!existingApplicationName.trim() || existingApplicationName.trim().length < 2)) {
        toast({ type: 'warning', title: 'Aplikasi Eksisting', message: 'Nama aplikasi eksisting wajib diisi untuk layanan pengembangan.' });
        return;
      }
    } else if (currentStep === 4) {
      const requiredDocs = validDocumentRequirements.filter((r) => r.is_required);
      for (const req of requiredDocs) {
        if (!uploadedDocuments[req.id]) {
          toast({
            type: 'warning',
            title: 'Dokumen Belum Lengkap',
            message: `Dokumen wajib "${req.name}" belum dilampirkan.`,
          });
          return;
        }
      }

      for (const doc of activeUploadedDocuments) {
        const ext = doc.original_filename.slice(doc.original_filename.lastIndexOf('.') + 1).toLowerCase();
        if (!BASELINE_ALLOWED_EXTENSIONS.includes(ext)) {
          toast({
            type: 'danger',
            title: 'Berkas Tidak Didukung',
            message: `Berkas "${doc.original_filename}" memiliki format (.${ext}) yang tidak didukung. Harap ganti berkas terlebih dahulu.`,
          });
          return;
        }
      }
    } else if (currentStep === 5) {
      if (!termsAccepted) {
        toast({
          type: 'warning',
          title: 'Syarat & Ketentuan',
          message: 'Anda wajib menyetujui syarat & ketentuan SPBE sebelum melanjutkan.',
        });
        return;
      }
    }

    setCurrentStep((prev) => Math.min(prev + 1, 6));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFinalSubmit = async () => {
    setConfirmDialogOpen(false);

    const docsPayload = activeUploadedDocuments.map((d) => ({
      requirement_id: d.requirement_id,
      original_filename: d.original_filename,
      mime_type: d.mime_type,
      size_bytes: d.size_bytes,
      base64_data: d.base64_data,
    }));

    try {
      const result = await submitMutation.mutateAsync({
        service_id: serviceId,
        opd_unit_id: opdUnitId,
        applicant_name: applicantName,
        applicant_employee_id: applicantEmployeeId || undefined,
        applicant_position: applicantPosition,
        applicant_email: applicantEmail,
        applicant_phone: applicantPhone,
        title,
        background,
        problem_statement: problemStatement,
        objective,
        scope,
        expected_output: expectedOutput,
        requested_deadline: requestedDeadline || undefined,
        existing_application_name: existingApplicationName || undefined,
        additional_notes: additionalNotes || undefined,
        terms_accepted: termsAccepted,
        terms_version: termsVersion,
        idempotency_key: idempotencyKey,
        documents: docsPayload,
      });

      setSubmissionResult(result);
      toast({
        type: 'success',
        title: 'Permohonan Berhasil Diajukan',
        message: `Tiket nomor ${result.ticket_number} telah diterbitkan.`,
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: unknown) {
      toast({
        type: 'danger',
        title: 'Gagal Mengajukan Permohonan',
        message: (err as Error)?.message || 'Terjadi kendala saat mengirimkan permohonan ke peladen.',
      });
    }
  };

  if (submissionResult) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-8">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-[#1B5040] via-[#2E8A6E] to-[#1B5040] text-white p-8 sm:p-12 text-center space-y-3">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto border border-white/20">
              <CheckCircleIcon size={36} className="text-[#2BD9A5]" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#98F7D9] block">
              Pendaftaran Layanan SPBE Sukses
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Permohonan Berhasil Terkirim ke Diskominfo
            </h1>
            <p className="text-xs sm:text-sm text-[#CAF3E4] max-w-xl mx-auto">
              Simpan Nomor Tiket dan Kode Pelacakan di bawah ini. Anda dapat menggunakannya kapan saja 
              untuk memantau status telaah dan disposisi tanpa perlu login.
            </p>
          </div>

          <div className="p-6 sm:p-10 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-200">
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Nomor Tiket Permohonan
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-2xl font-black text-slate-900 select-all">
                    {submissionResult.ticket_number}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(submissionResult.ticket_number);
                      toast({ type: 'info', title: 'Disalin', message: 'Nomor tiket telah disalin ke papan klip.' });
                    }}
                    className="p-1.5 text-xs text-[#1B5040] hover:bg-[#CAF3E4] rounded border border-[#98F7D9] font-semibold cursor-pointer"
                  >
                    Salin
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Gunakan saat berkoordinasi dengan petugas atau mencari di portal.
                </p>
              </div>

              <div className="space-y-1.5 border-t md:border-t-0 md:border-l border-slate-200 pt-4 md:pt-0 md:pl-6">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Kode Pelacakan (Secret Key)
                  </span>
                  <Badge variant="warning" className="text-[10px]">Rahasia</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-2xl font-black text-[#1B5040] select-all">
                    {submissionResult.tracking_code}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(submissionResult.tracking_code);
                      toast({ type: 'info', title: 'Disalin', message: 'Kode pelacakan telah disalin.' });
                    }}
                    className="p-1.5 text-xs text-[#1B5040] hover:bg-[#CAF3E4] rounded border border-[#98F7D9] font-semibold cursor-pointer"
                  >
                    Salin
                  </button>
                </div>
                <p className="text-[11px] text-amber-700">
                  *Hanya ditampilkan saat ini. Simpan baik-baik bersama nomor tiket.
                </p>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl p-5 space-y-3 text-xs sm:text-sm">
              <h3 className="font-bold text-slate-900 uppercase tracking-wider text-xs border-b border-slate-100 pb-2">
                Rincian Registrasi
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700">
                <div>
                  <span className="text-slate-500 block text-xs">Jenis Layanan:</span>
                  <span className="font-semibold text-slate-900">{submissionResult.service_name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs">Judul Usulan:</span>
                  <span className="font-semibold text-slate-900">{submissionResult.title}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs">Penanggung Jawab (PIC):</span>
                  <span className="font-semibold text-slate-900">{submissionResult.applicant_name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs">Tanggal Pengajuan:</span>
                  <span className="font-semibold text-slate-900">
                    {new Date(submissionResult.submitted_at).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })} WIB
                  </span>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-xl bg-[#CAF3E4]/70 border border-[#98F7D9] space-y-2 text-xs sm:text-sm text-[#000408]">
              <h3 className="font-bold flex items-center gap-2 text-[#1B5040]">
                <InfoIcon size={16} className="text-[#1B5040]" />
                Tahapan Selanjutnya:
              </h3>
              <ol className="list-decimal list-inside space-y-1 text-slate-700 pl-1 leading-relaxed">
                <li>Verifikator Diskominfo melakukan pemeriksaan administrasi dan kelengkapan dokumen permohonan.</li>
                <li>Telaah teknis kesesuaian arsitektur SPBE dan rapat klarifikasi teknis bersama PIC OPD.</li>
                <li>Penerbitan surat disposisi dan penetapan tim pelaksana teknis.</li>
              </ol>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
              <Button
                variant="outline"
                size="md"
                onClick={() => window.print()}
                className="w-full sm:w-auto"
              >
                Cetak Bukti Pendaftaran
              </Button>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Link to="/" className="w-full sm:w-auto">
                  <Button variant="outline" size="md" className="w-full sm:w-auto">
                    Beranda
                  </Button>
                </Link>
                <Link
                  to={`/tracking?ticket=${submissionResult.ticket_number}&code=${submissionResult.tracking_code}`}
                  className="w-full sm:w-auto"
                >
                  <Button variant="primary" size="md" className="w-full sm:w-auto font-bold shadow-md">
                    Buka Halaman Pelacakan →
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16 space-y-10">
      <div className="border-b border-slate-200 pb-6 space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#2E8A6E] uppercase tracking-wider">
          <Link to="/" className="hover:underline text-slate-500">Beranda</Link>
          <span className="text-slate-400">/</span>
          <span>Formulir Pengajuan Layanan</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
          Pengajuan Permohonan Layanan TI
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
          Silakan lengkapi formulir permohonan berikut secara bertahap. Sistem akan menerbitkan 
          Nomor Tiket dan Kode Lacak resmi setelah berkas terkirim.
        </p>
      </div>

      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2 scrollbar-none">
          {STEPS.map((s) => {
            const isDone = currentStep > s.id;
            const isCurrent = currentStep === s.id;

            return (
              <div key={s.id} className="flex items-center gap-2 shrink-0">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    isDone
                      ? 'bg-emerald-600 text-white'
                      : isCurrent
                      ? 'bg-[#1B5040] text-white shadow-sm ring-2 ring-[#CAF3E4]'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {isDone ? '✓' : s.id}
                </div>
                <span
                  className={`text-xs font-semibold whitespace-nowrap ${
                    isCurrent ? 'text-[#1B5040] font-bold' : isDone ? 'text-slate-800' : 'text-slate-400'
                  }`}
                >
                  {s.title}
                </span>
                {s.id < STEPS.length && (
                  <span className="text-slate-300 mx-1 hidden sm:inline">→</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-8">
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[#2E8A6E]">Langkah 1 dari 6</span>
              <h2 className="text-xl font-bold text-slate-900 mt-1">Pilih Kategori Layanan</h2>
              <p className="text-xs text-slate-500">Tentukan apakah kebutuhan OPD merupakan pembangunan baru atau penyesuaian aplikasi berjalan.</p>
            </div>

            {servicesLoading && (
              <div className="space-y-3">
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
              </div>
            )}

            {!servicesLoading && services && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {services.map((srv) => {
                  const isSelected = serviceId === srv.id;
                  return (
                    <div
                      key={srv.id}
                      onClick={() => handleSelectService(srv.id)}
                      className={`p-6 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-4 ${
                        isSelected
                          ? 'border-[#1B5040] bg-[#CAF3E4]/30 shadow-sm ring-1 ring-[#1B5040]'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-[#1B5040] bg-[#CAF3E4] px-2 py-0.5 rounded">
                            {srv.code}
                          </span>
                          <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs ${
                            isSelected ? 'border-[#1B5040] bg-[#1B5040] text-white font-bold' : 'border-slate-300'
                          }`}>
                            {isSelected ? '✓' : ''}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">{srv.name}</h3>
                        <p className="text-xs text-slate-600 leading-relaxed">{srv.description}</p>
                      </div>
                      <div className="pt-2 text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                        <ClockIcon size={14} className="shrink-0" />
                        Estimasi Telaah: Menyesuaikan Kelengkapan Berkas & Antrean
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[#2E8A6E]">Langkah 2 dari 6</span>
              <h2 className="text-xl font-bold text-slate-900 mt-1">Identitas Pemohon (PIC OPD)</h2>
              <p className="text-xs text-slate-500">Pejabat atau staf teknis yang berwenang sebagai narahubung utama permohonan.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Asal Organisasi Perangkat Daerah (OPD) <span className="text-red-500">*</span>
                </label>
                {opdLoading ? (
                  <Skeleton className="h-10 w-full rounded" />
                ) : (
                  <Select
                    value={opdUnitId}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setOpdUnitId(e.target.value)}
                    required
                  >
                    <option value="">-- Pilih Instansi / OPD Pemohon --</option>
                    {(opdUnits || []).map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name} ({o.code})
                      </option>
                    ))}
                  </Select>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Nama Lengkap PIC <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="Contoh: Budi Santoso, S.Kom, M.AP"
                    value={applicantName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApplicantName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    NIP / Identitas Pegawai (Opsional)
                  </label>
                  <Input
                    placeholder="Contoh: 198501012010011005"
                    value={applicantEmployeeId}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApplicantEmployeeId(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Jabatan di OPD <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="Contoh: Pranata Komputer Ahli Muda / Kepala Seksi"
                  value={applicantPosition}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApplicantPosition(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Alamat Email Kedinasan <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="email"
                    placeholder="nama@bandungkab.go.id"
                    value={applicantEmail}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApplicantEmail(e.target.value)}
                    required
                  />
                  <p className="mt-1 text-[11px] text-slate-500">Nomor tiket & bukti pendaftaran akan dikirimkan ke email ini.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Nomor WhatsApp / Kontak Aktif <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="tel"
                    placeholder="Contoh: 081234567890"
                    value={applicantPhone}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApplicantPhone(e.target.value)}
                    required
                  />
                  <p className="mt-1 text-[11px] text-slate-500">Untuk koordinasi cepat rapat klarifikasi teknis.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[#2E8A6E]">Langkah 3 dari 6</span>
              <h2 className="text-xl font-bold text-slate-900 mt-1">Rincian Kebutuhan Aplikasi</h2>
              <p className="text-xs text-slate-500">Uraikan deskripsi fungsional sistem informasi yang diusulkan oleh OPD.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Judul Permohonan / Usulan Nama Sistem <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="Contoh: Pembangunan Sistem Informasi Manajemen Aset Desa (SIM-Aset)"
                  value={title}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                  required
                />
              </div>

              {selectedService?.type === 'ENHANCEMENT' && (
                <div className="p-4 rounded-xl bg-[#CAF3E4]/30 border border-[#98F7D9]">
                  <label className="block text-xs font-bold text-[#0D2820] mb-1">
                    Nama & Akses Aplikasi Eksisting <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="Contoh: SIM-PBB (https://simpbb.bandungkab.go.id)"
                    value={existingApplicationName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExistingApplicationName(e.target.value)}
                    required
                  />
                  <p className="mt-1 text-[11px] text-[#1B5040]">Sebutkan nama sistem dan alamat domain atau repositori jika ada.</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Latar Belakang Kebutuhan <span className="text-red-500">*</span>
                </label>
                <Textarea
                  rows={3}
                  placeholder="Uraikan kondisi saat ini dan dasar urgensi mengapa sistem ini dibutuhkan..."
                  value={background}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBackground(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Rumusan Permasalahan <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    rows={3}
                    placeholder="Kendala apa saja yang terjadi pada pelayanan yang berjalan saat ini?"
                    value={problemStatement}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setProblemStatement(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Maksud & Tujuan <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    rows={3}
                    placeholder="Sasaran dan manfaat yang ingin dicapai setelah aplikasi terimplementasi..."
                    value={objective}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setObjective(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Ruang Lingkup Sistem <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    rows={3}
                    placeholder="Modul, proses bisnis, pengguna sistem, dan integrasi yang diharapkan..."
                    value={scope}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setScope(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Keluaran (Output) yang Diharapkan <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    rows={3}
                    placeholder="Contoh: Aplikasi web responsif, laporan rekapitulasi PDF/Excel, API satu data..."
                    value={expectedOutput}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setExpectedOutput(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Perkiraan Target Batas Waktu (Opsional)
                  </label>
                  <Input
                    type="date"
                    value={requestedDeadline}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRequestedDeadline(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Catatan Tambahan (Opsional)
                  </label>
                  <Input
                    placeholder="Catatan khusus atau dasar regulasi perda pendukung..."
                    value={additionalNotes}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAdditionalNotes(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[#2E8A6E]">Langkah 4 dari 6</span>
              <h2 className="text-xl font-bold text-slate-900 mt-1">Unggah Dokumen Persyaratan</h2>
              <p className="text-xs text-slate-500">Lampirkan dokumen resmi sesuai persyaratan layanan {selectedService?.name}.</p>
            </div>

            <div className="p-4 rounded-xl bg-[#CAF3E4]/70 border border-[#98F7D9] text-xs text-[#000408] flex items-start gap-2.5">
              <InfoIcon size={18} className="text-[#1B5040] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-[#1B5040]">
                  Ketentuan Dokumen: {selectedService?.name}
                </span>
                <span className="text-slate-700 leading-relaxed">
                  Lampirkan dokumen resmi sesuai persyaratan layanan ini. Jika Anda sebelumnya mengubah kategori layanan, berkas persyaratan disesuaikan secara otomatis.
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {validDocumentRequirements.map((req) => {
                const uploaded = uploadedDocuments[req.id];

                  return (
                    <div
                      key={req.id}
                      className={`p-5 rounded-2xl border-2 transition-colors ${
                        uploaded ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-900">{req.name}</h3>
                            <Badge variant={req.is_required ? 'danger' : 'neutral'} className="text-[10px]">
                              {req.is_required ? 'Wajib' : 'Opsional'}
                            </Badge>
                          </div>
                          {req.description && (
                            <p className="text-xs text-slate-600">{req.description}</p>
                          )}
                        </div>

                        {uploaded && (
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-100/60 px-2.5 py-1 rounded-md shrink-0 flex items-center gap-1.5">
                            <CheckCircleIcon size={14} />
                            Telah Terlampir
                          </span>
                        )}
                      </div>

                      <div className="pt-3">
                        {uploaded ? (
                          <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                            <div className="flex items-center gap-2 text-slate-800 font-medium truncate">
                              <FileTextIcon size={16} className="text-[#1B5040] shrink-0" />
                              <span className="truncate">{uploaded.original_filename}</span>
                              <span className="text-slate-400 font-mono shrink-0">
                                ({(uploaded.size_bytes / 1024).toFixed(0)} KB)
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveFile(req.id)}
                              className="text-red-600 hover:text-red-800 font-semibold text-xs ml-3 shrink-0 cursor-pointer"
                            >
                              Ganti / Hapus
                            </button>
                          </div>
                        ) : (
                          <div>
                            <input
                              type="file"
                              id={`file-${req.id}`}
                              onChange={(e) => handleFileUpload(req.id, e)}
                              accept={computeAcceptAttribute(req.allowed_file_types)}
                              className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#CAF3E4] file:text-[#1B5040] hover:file:bg-[#98F7D9] cursor-pointer"
                            />
                            <p className="mt-1 text-[11px] text-slate-400">
                              {computeFormatDescription(req.allowed_file_types, req.max_file_size_mb)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {currentStep === 5 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[#2E8A6E]">Langkah 5 dari 6</span>
              <h2 className="text-xl font-bold text-slate-900 mt-1">Syarat & Ketentuan Layanan</h2>
              <p className="text-xs text-slate-500">Pernyataan kesepahaman dan komitmen penyelenggaraan SPBE Pemerintah Daerah Kabupaten Bandung.</p>
            </div>

            <div className="space-y-4">
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-700 space-y-3 leading-relaxed max-h-80 overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-bold text-slate-900">Ketentuan Penyelenggaraan SIMANTIK SPBE</span>
                  <Badge variant="neutral" className="font-mono text-[10px]">Versi: {termsVersion}</Badge>
                </div>
                <p>
                  1. <strong>Kewenangan & Keabsahan:</strong> Pemohon menyatakan dengan sadar bahwa pengajuan ini mewakili 
                  kebutuhan resmi instansi/OPD di bawah Pemerintah Daerah Kabupaten Bandung dan didasarkan atas persetujuan 
                  pimpinan instansi terkait.
                </p>
                <p>
                  2. <strong>Ketersediaan Data & PIC:</strong> Perangkat Daerah pemohon berkomitmen menugaskan staf/pejabat 
                  penghubung (PIC Teknis) yang responsif dalam menghadiri rapat koordinasi teknis, klarifikasi arsitektur data, 
                  dan proses User Acceptance Testing (UAT).
                </p>
                <p>
                  3. <strong>Standardisasi SPBE & Keamanan Informasi:</strong> Seluruh sistem yang dibangun akan mengikuti 
                  pedoman arsitektur dan standar keamanan siber Diskominfo Pemerintah Daerah Kabupaten Bandung sesuai regulasi 
                  SPBE dan ketentuan BSSN.
                </p>
                <p>
                  4. <strong>Kerahasiaan Kode Pelacakan:</strong> Nomor Tiket dan Kode Pelacakan yang diterbitkan sistem adalah 
                  instrumen identifikasi resmi. Pemohon bertanggung jawab menjaga kerahasiaan kode pelacakan.
                </p>
              </div>

              <div className="p-4 rounded-xl border-2 border-[#98F7D9] bg-[#CAF3E4]/30">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-[#1B5040] focus:ring-[#1B5040]"
                  />
                  <span className="text-xs sm:text-sm font-semibold text-slate-900 leading-normal">
                    Saya menyatakan telah membaca, memahami, dan menyetujui seluruh ketentuan di atas 
                    serta menjamin keabsahan seluruh berkas dan data yang dilampirkan. <span className="text-red-500">*</span>
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}

        {currentStep === 6 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[#2E8A6E]">Langkah 6 dari 6</span>
              <h2 className="text-xl font-bold text-slate-900 mt-1">Tinjau Rekapitulasi Permohonan</h2>
              <p className="text-xs text-slate-500">Periksa kembali seluruh informasi sebelum mengirimkan berkas resmi ke Diskominfo.</p>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3 text-xs sm:text-sm">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-bold text-slate-900 uppercase tracking-wider text-xs">1. Layanan & Instansi</span>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="text-xs font-semibold text-[#1B5040] hover:underline cursor-pointer"
                  >
                    Ubah
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700">
                  <div>
                    <span className="text-slate-500 block text-xs">Jenis Layanan:</span>
                    <span className="font-bold text-slate-900">{selectedService?.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-xs">Instansi Pemohon (OPD):</span>
                    <span className="font-bold text-slate-900">{selectedOpd?.name || '-'}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3 text-xs sm:text-sm">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-bold text-slate-900 uppercase tracking-wider text-xs">2. Identitas PIC Pemohon</span>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="text-xs font-semibold text-[#1B5040] hover:underline cursor-pointer"
                  >
                    Ubah
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700">
                  <div>
                    <span className="text-slate-500 block text-xs">Nama Lengkap PIC:</span>
                    <span className="font-semibold text-slate-900">{applicantName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-xs">NIP / Identitas:</span>
                    <span className="font-semibold text-slate-900">{applicantEmployeeId || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-xs">Jabatan di OPD:</span>
                    <span className="font-semibold text-slate-900">{applicantPosition}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-xs">Kontak Email / Telp:</span>
                    <span className="font-semibold text-slate-900">{applicantEmail} / {applicantPhone}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3 text-xs sm:text-sm">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-bold text-slate-900 uppercase tracking-wider text-xs">3. Rincian Usulan Sistem</span>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="text-xs font-semibold text-[#1B5040] hover:underline cursor-pointer"
                  >
                    Ubah
                  </button>
                </div>
                <div className="space-y-2 text-slate-700">
                  <div>
                    <span className="text-slate-500 block text-xs">Judul Usulan:</span>
                    <span className="font-bold text-slate-900 text-sm">{title}</span>
                  </div>
                  {existingApplicationName && (
                    <div>
                      <span className="text-slate-500 block text-xs">Aplikasi Eksisting:</span>
                      <span className="font-semibold text-[#1B5040]">{existingApplicationName}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-500 block text-xs">Latar Belakang:</span>
                    <p className="leading-relaxed">{background}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <span className="text-slate-500 block text-xs">Rumusan Masalah:</span>
                      <p className="leading-relaxed">{problemStatement}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-xs">Maksud & Tujuan:</span>
                      <p className="leading-relaxed">{objective}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3 text-xs sm:text-sm">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-bold text-slate-900 uppercase tracking-wider text-xs">
                    4. Berkas Persyaratan ({activeUploadedDocuments.length} Terlampir)
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(4)}
                    className="text-xs font-semibold text-[#1B5040] hover:underline cursor-pointer"
                  >
                    Ubah
                  </button>
                </div>
                {activeUploadedDocuments.length === 0 ? (
                  <p className="text-xs text-amber-700 italic">
                    Belum ada berkas persyaratan yang dilampirkan untuk layanan ini.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {activeUploadedDocuments.map((d) => {
                      const req = validDocumentRequirements.find((r) => r.id === d.requirement_id);
                      return (
                        <li key={d.requirement_id} className="flex items-center justify-between gap-2 text-slate-800">
                          <div className="flex items-center gap-2 truncate">
                            <CheckCircleIcon size={14} className="text-emerald-500 shrink-0" />
                            <span className="font-medium truncate">{d.original_filename}</span>
                            {req && (
                              <span className="text-[11px] text-slate-500 shrink-0">
                                ({req.name})
                              </span>
                            )}
                          </div>
                          <span className="text-slate-400 font-mono text-xs shrink-0">
                            {(d.size_bytes / 1024).toFixed(0)} KB
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-6 border-t border-slate-100">
          {currentStep > 1 ? (
            <Button variant="outline" size="md" onClick={handlePrevStep}>
              ← Kembali
            </Button>
          ) : (
            <div />
          )}

          {currentStep < 6 ? (
            <Button variant="primary" size="md" onClick={handleNextStep} className="font-bold">
              Lanjutkan →
            </Button>
          ) : (
            <Button
              variant="primary"
              size="lg"
              onClick={() => setConfirmDialogOpen(true)}
              isLoading={submitMutation.isPending}
              className="font-bold shadow-lg shadow-[#1B5040]/20 bg-[#1B5040] hover:bg-[#2E8A6E]"
            >
              Kirimkan Permohonan Resmi
              <ArrowRightIcon size={18} className="ml-2" />
            </Button>
          )}
        </div>
      </div>

      <ConfirmationDialog
        isOpen={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        onConfirm={handleFinalSubmit}
        title="Kirimkan Permohonan Layanan?"
        description={
          <span>
            Anda akan mendaftarkan permohonan <strong>"{title}"</strong> ke Diskominfo Pemerintah Daerah Kabupaten Bandung. 
            Pastikan seluruh data dan dokumen yang dilampirkan telah benar.
          </span>
        }
        confirmLabel="Ya, Kirim Sekarang"
        variant="primary"
        isLoading={submitMutation.isPending}
      />
    </div>
  );
}
