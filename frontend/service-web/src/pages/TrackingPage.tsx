import { useCallback, useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router';
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  ErrorState,
  FileTextIcon,
  InfoIcon,
  Input,
  SearchIcon,
  ShieldIcon,
  Skeleton,
  Textarea,
  useToast,
} from '../components/ui';
import {
  usePublicMessages,
  usePublicTicket,
  usePublicTimeline,
  useSendPublicMessage,
  useSubmitRevision,
  useVerifyTracking,
  verifyTrackingCredential,
  type ApplicationStatus,
} from '../hooks/useTracking';
import { validateClientFile } from '../lib/fileValidation';

function formatDateTime(dateString?: string) {
  if (!dateString) return '-';
  try {
    return (
      new Date(dateString).toLocaleString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }) + ' WIB'
    );
  } catch {
    return dateString;
  }
}

function getStatusBadge(status: ApplicationStatus) {
  switch (status) {
    case 'SUBMITTED':
      return { variant: 'neutral' as const, label: 'Permohonan Diterima' };
    case 'VERIFICATION':
      return { variant: 'info' as const, label: 'Verifikasi Administrasi' };
    case 'REVISION_REQUIRED':
      return { variant: 'warning' as const, label: 'Perlu Revisi / Perbaikan' };
    case 'APPROVED':
      return { variant: 'success' as const, label: 'Permohonan Disetujui' };
    case 'REJECTED':
      return { variant: 'danger' as const, label: 'Tidak Disetujui' };
    case 'IN_PROGRESS':
      return { variant: 'primary' as const, label: 'Dalam Pengerjaan Teknis' };
    case 'COMPLETED':
      return { variant: 'success' as const, label: 'Selesai & Serah Terima' };
    case 'CLOSED':
      return { variant: 'neutral' as const, label: 'Tiket Ditutup' };
    case 'CANCELLED':
      return { variant: 'neutral' as const, label: 'Permohonan Dibatalkan' };
    default:
      return { variant: 'neutral' as const, label: status };
  }
}

export function TrackingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  const urlTicket = searchParams.get('ticket') || '';
  const urlCode = searchParams.get('code') || '';

  // Form input states
  const [ticketInput, setTicketInput] = useState(urlTicket);
  const [codeInput, setCodeInput] = useState(urlCode);

  // Active verified tracking context
  const [activeTicket, setActiveTicket] = useState<string | null>(() => {
    return sessionStorage.getItem('simantik_tracking_ticket') || null;
  });
  const [trackingToken, setTrackingToken] = useState<string | null>(() => {
    return sessionStorage.getItem('simantik_tracking_token') || null;
  });

  // Revision form states
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [updatedTitle, setUpdatedTitle] = useState('');
  const [revisionFile, setRevisionFile] = useState<File | null>(null);

  // Mutations & Queries
  const verifyMutation = useVerifyTracking();
  const {
    data: ticketData,
    isLoading: isTicketLoading,
    error: ticketError,
    refetch: refetchTicket,
  } = usePublicTicket(activeTicket || undefined, trackingToken);

  const {
    data: timelineData,
    isLoading: isTimelineLoading,
  } = usePublicTimeline(activeTicket || undefined, trackingToken);

  const revisionMutation = useSubmitRevision(activeTicket || undefined, trackingToken);

  // Chat message states
  const [chatInput, setChatInput] = useState('');
  const {
    data: messagesData,
    isLoading: isMessagesLoading,
    isFetching: isMessagesFetching,
  } = usePublicMessages(activeTicket || undefined, trackingToken);
  const sendMessageMutation = useSendPublicMessage(activeTicket || undefined, trackingToken);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    try {
      await sendMessageMutation.mutateAsync(chatInput.trim());
      setChatInput('');
    } catch (err: any) {
      toast({
        title: 'Gagal Mengirim Pesan',
        message: err?.message || 'Gagal mengirim pesan.',
        type: 'danger',
      });
    }
  };

  const handleClearSession = () => {
    setActiveTicket(null);
    setTrackingToken(null);
    sessionStorage.removeItem('simantik_tracking_ticket');
    sessionStorage.removeItem('simantik_tracking_token');
    setTicketInput('');
    setCodeInput('');
    setSearchParams({});
    setShowRevisionForm(false);
    toast({
      title: 'Sesi Berakhir',
      message: 'Anda telah keluar dari sesi pelacakan tiket.',
      type: 'info',
    });
  };

  const handleVerify = useCallback(async (ticket: string, code: string) => {
    if (!ticket.trim() || !code.trim()) {
      toast({
        title: 'Form Belum Lengkap',
        message: 'Mohon masukkan nomor tiket dan kode pelacakan.',
        type: 'warning',
      });
      return;
    }

    try {
      const res = await verifyMutation.mutateAsync({
        ticketNumber: ticket.trim().toUpperCase(),
        trackingCode: code.trim(),
      });
      setActiveTicket(res.ticket_number);
      setTrackingToken(res.tracking_token);
      sessionStorage.setItem('simantik_tracking_ticket', res.ticket_number);
      sessionStorage.setItem('simantik_tracking_token', res.tracking_token);
      toast({
        title: 'Sesi Pelacakan Aktif',
        message: 'Kredensial valid. Sesi pelacakan Anda aktif selama 15 menit.',
        type: 'success',
      });
      setSearchParams({ ticket: res.ticket_number });
    } catch (err: any) {
      let msg = err?.message || 'Nomor tiket atau kode pelacakan tidak valid.';
      if (err?.code === 'TRACKING_RATE_LIMITED' || err?.status === 429) {
        msg = 'Terlalu banyak percobaan yang gagal. Demi keamanan, silakan tunggu beberapa menit.';
      }
      toast({
        title: 'Verifikasi Gagal',
        message: msg,
        type: 'danger',
      });
    }
  }, [verifyMutation, setSearchParams, toast]);

  // Auto-verify if url params exist and no active session
  useEffect(() => {
    let isMounted = true;
    if (urlTicket && urlCode && !trackingToken) {
      verifyTrackingCredential(urlTicket, urlCode)
        .then((res) => {
          if (!isMounted) return;
          setActiveTicket(res.ticket_number);
          setTrackingToken(res.tracking_token);
          sessionStorage.setItem('simantik_tracking_ticket', res.ticket_number);
          sessionStorage.setItem('simantik_tracking_token', res.tracking_token);
        })
        .catch(() => {
          // ignore auto-verification error, user can manually submit
        });
    }
    return () => {
      isMounted = false;
    };
  }, [urlTicket, urlCode, trackingToken]);

  const handleRevisionFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setRevisionFile(null);
      return;
    }
    const validation = validateClientFile(file);
    if (!validation.valid) {
      toast({
        type: 'danger',
        title: 'Format Berkas Tidak Didukung',
        message: validation.errorMessage || `Berkas "${file.name}" tidak didukung.`,
      });
      e.target.value = '';
      setRevisionFile(null);
      return;
    }
    setRevisionFile(file);
  };

  const handleRevisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisionNotes.trim()) {
      toast({
        title: 'Validasi',
        message: 'Catatan tanggapan revisi wajib diisi.',
        type: 'warning',
      });
      return;
    }

    try {
      let additionalDocs: any[] | undefined = undefined;

      if (revisionFile) {
        const validation = validateClientFile(revisionFile);
        if (!validation.valid) {
          toast({
            title: 'Format Berkas Tidak Didukung',
            message: validation.errorMessage || 'Berkas tidak didukung.',
            type: 'danger',
          });
          return;
        }

        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.readAsDataURL(revisionFile);
        });

        const base64Data = await base64Promise;
        additionalDocs = [
          {
            original_filename: revisionFile.name,
            mime_type: validation.resolvedMime || 'application/pdf',
            size_bytes: revisionFile.size,
            base64_data: base64Data,
          },
        ];
      }

      await revisionMutation.mutateAsync({
        revision_notes: revisionNotes.trim(),
        updated_title: updatedTitle.trim() || undefined,
        additional_documents: additionalDocs,
      });

      toast({
        title: 'Revisi Terkirim',
        message:
          'Tanggapan perbaikan berhasil dikirimkan. Permohonan Anda masuk kembali ke antrean verifikasi.',
        type: 'success',
      });

      setShowRevisionForm(false);
      setRevisionNotes('');
      setUpdatedTitle('');
      setRevisionFile(null);
      refetchTicket();
    } catch (err: any) {
      toast({
        title: 'Gagal Mengirimkan Revisi',
        message: err?.message || 'Terjadi kesalahan saat mengirimkan revisi.',
        type: 'danger',
      });
    }
  };

  const isSessionExpired =
    ticketError &&
    ((ticketError as any)?.code === 'TRACKING_SESSION_EXPIRED' ||
      (ticketError as any)?.status === 401);

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* HEADER SECTION */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold uppercase tracking-wider">
            <SearchIcon className="w-3.5 h-3.5" />
            <span>Portal Pelacakan Permohonan SPBE</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight">
            Lacak Status Permohonan
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto">
            Pantau perkembangan telaah teknis, arsitektur, dan tahapan siklus hidup aplikasi secara transparan tanpa perlu login.
          </p>
        </div>

        {/* 1. VERIFICATION / CREDENTIAL INPUT CARD */}
        {!trackingToken || isSessionExpired ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <ShieldIcon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Verifikasi Kredensial Tiket
                </h2>
                <p className="text-xs text-slate-500">
                  Masukkan nomor tiket dan kode pelacakan rahasia yang tertera pada tanda bukti pendaftaran Anda.
                </p>
              </div>
            </div>

            {isSessionExpired && (
              <Alert
                variant="warning"
                title="Sesi Pelacakan Telah Berakhir"
                className="text-xs"
              >
                Sesi pelacakan Anda telah kedaluwarsa demi keamanan data (15 menit). Silakan masukkan kembali kredensial Anda.
              </Alert>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleVerify(ticketInput, codeInput);
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-xs text-slate-700 block mb-1">
                    Nomor Tiket Permohonan *
                  </label>
                  <Input
                    placeholder="Contoh: SIM-2026-000101"
                    value={ticketInput}
                    onChange={(e) => setTicketInput(e.target.value.toUpperCase())}
                    className="font-mono text-sm uppercase"
                    required
                  />
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
                    Format: SIM-YYYY-XXXXXX
                  </span>
                </div>

                <div>
                  <label className="font-bold text-xs text-slate-700 block mb-1">
                    Kode Pelacakan (Tracking Code) *
                  </label>
                  <Input
                    placeholder="Contoh: TRK-A1B2C3D4"
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                    className="font-mono text-sm uppercase"
                    required
                  />
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
                    Kredensial rahasia diterbitkan saat pendaftaran
                  </span>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <InfoIcon className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>
                    Kredensial pelacakan dienkripsi dengan standar SHA-256 dan pembatasan laju akses.
                  </span>
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={verifyMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  {verifyMutation.isPending ? 'Memverifikasi...' : 'Lacak Tiket'}
                </Button>
              </div>
            </form>
          </div>
        ) : (
          /* 2. ACTIVE SESSION HEADER & CONTROLS */
          <div className="flex items-center justify-between bg-blue-50/70 border border-blue-200 rounded-2xl p-4 px-6 text-xs">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <span className="font-bold text-blue-950 block">
                  Sesi Pelacakan Aktif: {activeTicket}
                </span>
                <span className="text-blue-700 text-[11px]">
                  Konteks terotorisasi (15 menit). Data internal teknisi terlindungi.
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearSession}
              className="text-xs text-blue-800 border-blue-300 hover:bg-blue-100"
            >
              Keluar Sesi
            </Button>
          </div>
        )}

        {/* 3. TICKET RESULT & DETAIL VIEW */}
        {trackingToken && !isSessionExpired && (
          <>
            {isTicketLoading ? (
              <div className="bg-white rounded-2xl p-8 border border-slate-200 space-y-4">
                <Skeleton className="h-6 w-1/3 rounded-lg" />
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-40 w-full rounded-xl" />
              </div>
            ) : ticketData ? (
              <div className="space-y-6">
                {/* A. REVISION REQUIRED ALERT BANNER */}
                {ticketData.can_revise && (
                  <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-6 text-amber-950 space-y-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl mt-0.5">⚠️</span>
                      <div className="space-y-1">
                        <h3 className="font-extrabold text-base text-amber-900">
                          Tindakan Diperlukan: Permintaan Perbaikan Dokumen / KAK
                        </h3>
                        <p className="text-xs sm:text-sm text-amber-800 leading-relaxed">
                          Tim verifikator Diskominfo membutuhkan perbaikan atau kelengkapan tambahan untuk permohonan ini sebelum dapat diproses ke tahapan selanjutnya.
                        </p>
                      </div>
                    </div>

                    {ticketData.revision_reason && (
                      <div className="bg-white/80 p-4 rounded-xl border border-amber-200">
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-900 block mb-1">
                          Catatan Perbaikan dari Verifikator:
                        </span>
                        <p className="text-sm font-medium text-amber-950 whitespace-pre-wrap">
                          {ticketData.revision_reason}
                        </p>
                      </div>
                    )}

                    <div className="pt-1 flex justify-end">
                      <Button
                        variant="primary"
                        size="md"
                        onClick={() => setShowRevisionForm(!showRevisionForm)}
                        className="bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        {showRevisionForm ? 'Tutup Form Revisi' : 'Tanggapi Perbaikan Sekarang'}
                      </Button>
                    </div>
                  </div>
                )}

                {/* B. REVISION RESPONSE FORM ACCORDION */}
                {showRevisionForm && ticketData.can_revise && (
                  <div className="bg-white rounded-2xl border-2 border-amber-400 p-6 sm:p-8 space-y-5 shadow-md">
                    <div className="pb-3 border-b border-slate-100">
                      <h3 className="text-base font-bold text-slate-900">
                        Formulir Tanggapan Perbaikan Permohonan
                      </h3>
                      <p className="text-xs text-slate-500">
                        Kirimkan penjelasan perbaikan dan lampirkan dokumen pendukung terbaru jika diperlukan.
                      </p>
                    </div>

                    <form onSubmit={handleRevisionSubmit} className="space-y-4 text-xs sm:text-sm">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">
                          Penjelasan Tanggapan Perbaikan (Notes) *
                        </label>
                        <Textarea
                          rows={3}
                          placeholder="Jelaskan perbaikan yang telah dilakukan, misalnya: 'Surat tugas pimpinan OPD dan KAK bertanda tangan basah telah kami lampirkan ulang...'"
                          value={revisionNotes}
                          onChange={(e) => setRevisionNotes(e.target.value)}
                          required
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">
                            Penyesuaian Judul Usulan (Opsional)
                          </label>
                          <Input
                            placeholder={ticketData.title}
                            value={updatedTitle}
                            onChange={(e) => setUpdatedTitle(e.target.value)}
                          />
                        </div>

                        <div>
                          <label className="font-bold text-slate-700 block mb-1">
                            Unggah Dokumen Perbaikan (PDF/DOCX)
                          </label>
                          <Input
                            type="file"
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                            onChange={handleRevisionFileChange}
                          />
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          type="button"
                          onClick={() => setShowRevisionForm(false)}
                        >
                          Batal
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          type="submit"
                          disabled={revisionMutation.isPending}
                        >
                          {revisionMutation.isPending ? 'Mengirimkan...' : 'Kirim Tanggapan Revisi'}
                        </Button>
                      </div>
                    </form>
                  </div>
                )}

                {/* C. MAIN TICKET SUMMARY CARD */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
                  {/* Status Banner */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-500 uppercase">
                          {ticketData.ticket_number}
                        </span>
                        <Badge
                          variant={getStatusBadge(ticketData.current_status).variant}
                        >
                          {ticketData.status_label}
                        </Badge>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                        {ticketData.title}
                      </h2>
                    </div>
                    {ticketData.current_stage && (
                      <div className="sm:text-right">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                          Tahapan Siklus Hidup SPBE
                        </span>
                        <Badge variant="neutral" className="mt-0.5">
                          {ticketData.stage_label || ticketData.current_stage}
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs sm:text-sm">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-slate-400 text-[11px] uppercase tracking-wider font-bold block mb-0.5">
                        Instansi Pemohon (OPD)
                      </span>
                      <p className="font-bold text-slate-800">{ticketData.opd_name}</p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-slate-400 text-[11px] uppercase tracking-wider font-bold block mb-0.5">
                        Penanggung Jawab (PIC)
                      </span>
                      <p className="font-bold text-slate-800">
                        {ticketData.applicant_name_masked}
                      </p>
                      {ticketData.applicant_email_masked && (
                        <span className="text-[11px] text-slate-500">
                          {ticketData.applicant_email_masked}
                        </span>
                      )}
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-slate-400 text-[11px] uppercase tracking-wider font-bold block mb-0.5">
                        Jenis Layanan
                      </span>
                      <p className="font-bold text-slate-800">{ticketData.service_name}</p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-slate-400 text-[11px] uppercase tracking-wider font-bold block mb-0.5">
                        Waktu Pendaftaran
                      </span>
                      <p className="font-bold text-slate-800">
                        {formatDateTime(ticketData.submitted_at)}
                      </p>
                    </div>
                  </div>

                  {/* Next Step Information Advisory */}
                  <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-xs sm:text-sm text-blue-900 flex items-start gap-3">
                    <InfoIcon className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-bold mb-0.5 text-blue-950">
                        Instruksi & Prosedur Tahapan Berikutnya:
                      </strong>
                      <p className="text-blue-800 leading-relaxed">
                        {ticketData.next_step}
                      </p>
                    </div>
                  </div>
                </div>

                {/* D. INTENTIONAL PUBLIC TIMELINE */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
                  <div className="pb-4 border-b border-slate-100">
                    <h3 className="text-base font-bold text-slate-900">
                      Kronologi & Kemajuan Permohonan
                    </h3>
                    <p className="text-xs text-slate-500">
                      Jejak tahapan resmi yang mencerminkan proses penelaahan administrasi hingga penyelesaian aplikasi.
                    </p>
                  </div>

                  {isTimelineLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-14 w-full rounded-xl" />
                      <Skeleton className="h-14 w-full rounded-xl" />
                      <Skeleton className="h-14 w-full rounded-xl" />
                    </div>
                  ) : timelineData && timelineData.milestones.length > 0 ? (
                    <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                      {timelineData.milestones.map((m) => {
                        const isDone = m.status === 'completed';
                        const isCurr = m.status === 'current';

                        return (
                          <div key={m.step_number} className="relative group">
                            {/* Marker Icon */}
                            <div
                              className={`absolute -left-6 sm:-left-8 top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                                isDone
                                  ? 'bg-emerald-500 border-emerald-500 text-white'
                                  : isCurr
                                  ? 'bg-blue-600 border-blue-600 text-white ring-4 ring-blue-100'
                                  : 'bg-white border-slate-300 text-slate-400'
                              }`}
                            >
                              {isDone ? '✓' : m.step_number}
                            </div>

                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4
                                  className={`text-sm sm:text-base font-bold ${
                                    isCurr
                                      ? 'text-blue-700'
                                      : isDone
                                      ? 'text-slate-900'
                                      : 'text-slate-400'
                                  }`}
                                >
                                  {m.title}
                                </h4>
                                {isCurr && (
                                  <Badge variant="primary" className="text-[10px]">
                                    Tahap Aktif
                                  </Badge>
                                )}
                                {m.date && (
                                  <span className="text-xs text-slate-400">
                                    {formatDateTime(m.date)}
                                  </span>
                                )}
                              </div>
                              <p
                                className={`text-xs sm:text-sm leading-relaxed ${
                                  isDone || isCurr ? 'text-slate-600' : 'text-slate-400'
                                }`}
                              >
                                {m.description}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <EmptyState
                      title="Timeline Belum Tersedia"
                      description="Proyeksi tahapan akan ditampilkan seiring pembaruan status oleh verifikator."
                    />
                  )}
                </div>

                {/* E. PUBLIC DOCUMENTS LIST */}
                {ticketData.documents && ticketData.documents.length > 0 && (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-4">
                    <div className="pb-3 border-b border-slate-100">
                      <h3 className="text-base font-bold text-slate-900">
                        Berkas Permohonan Terdaftar
                      </h3>
                      <p className="text-xs text-slate-500">
                        Daftar dokumen yang telah diunggah oleh instansi Anda untuk verifikasi.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {ticketData.documents.map((doc, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            <FileTextIcon className="w-5 h-5 text-blue-600 shrink-0" />
                            <div className="truncate">
                              <span className="font-bold text-xs text-slate-800 block truncate">
                                {doc.original_filename}
                              </span>
                              <span className="text-[11px] text-slate-500 block truncate">
                                {doc.requirement_name}
                              </span>
                            </div>
                          </div>
                          {doc.size_bytes && (
                            <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                              {Math.round(doc.size_bytes / 1024)} KB
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* F. TICKET DISCUSSION & MESSAGES (PUBLIC CHAT) */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 gap-2">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Ruang Komunikasi & Konsultasi Tiket
                      </h3>
                      <p className="text-xs text-slate-500">
                        Saluran tanya-jawab teknis antara pemohon OPD dan tim Diskominfo.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[11px] text-slate-500">
                        Polling Otomatis (5 dtk) {isMessagesFetching ? '• Memperbarui...' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Chat messages scrollable window */}
                  <div className="bg-slate-50/70 rounded-xl border border-slate-200 p-4 max-h-80 min-h-[160px] overflow-y-auto space-y-3">
                    {isMessagesLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-10 w-2/3 rounded-xl ml-auto" />
                        <Skeleton className="h-10 w-2/3 rounded-xl mr-auto" />
                      </div>
                    ) : (!messagesData || messagesData.length === 0) ? (
                      <EmptyState
                        title="Belum Ada Percakapan"
                        description="Ajukan pertanyaan atau konfirmasi teknis terkait permohonan ini melalui form di bawah."
                      />
                    ) : (
                      messagesData.map((msg) => {
                        const isApplicant = msg.sender_type === 'PUBLIC_APPLICANT';
                        return (
                          <div
                            key={msg.id}
                            className={`flex flex-col ${isApplicant ? 'items-end' : 'items-start'}`}
                          >
                            <div className="flex items-center gap-2 mb-1 text-[11px]">
                              <span className={`font-bold ${isApplicant ? 'text-blue-700' : 'text-slate-700'}`}>
                                {isApplicant ? 'Pemohon (Anda)' : msg.sender_name || 'Tim Teknis Diskominfo'}
                              </span>
                              <span className="text-slate-400 font-mono text-[10px]">
                                {formatDateTime(msg.created_at)}
                              </span>
                            </div>
                            <div
                              className={`max-w-[85%] sm:max-w-[75%] p-3.5 text-xs sm:text-sm rounded-2xl leading-relaxed whitespace-pre-wrap ${
                                isApplicant
                                  ? 'bg-blue-600 text-white rounded-tr-sm shadow-sm'
                                  : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm'
                              }`}
                            >
                              {msg.message}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Send Message Form */}
                  <form onSubmit={handleSendMessage} className="flex gap-2 pt-2">
                    <Input
                      placeholder="Ketik pesan atau pertanyaan untuk tim Diskominfo..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      disabled={sendMessageMutation.isPending}
                      className="text-xs sm:text-sm flex-1"
                    />
                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                      disabled={sendMessageMutation.isPending || !chatInput.trim()}
                    >
                      {sendMessageMutation.isPending ? 'Mengirim...' : 'Kirim'}
                    </Button>
                  </form>
                </div>
              </div>
            ) : (
              <ErrorState
                title="Gagal Memuat Detail Tiket"
                description="Terjadi kendala saat memuat data pelacakan tiket. Pastikan kredensial masih valid."
                onRetry={() => refetchTicket()}
              />
            )}
          </>
        )}

        {/* FOOTER HELP LINKS */}
        <div className="text-center pt-4 border-t border-slate-200 text-xs text-slate-500 space-y-2">
          <p>
            Kehilangan nomor tiket atau kode pelacakan? Hubungi helpdesk Diskominfo melalui{' '}
            <Link to="/contact" className="text-blue-600 hover:underline font-semibold">
              Layanan Bantuan & Kontak
            </Link>
            .
          </p>
          <p className="text-[11px] text-slate-400">
            SIMANTIK — Sistem Manajemen Layanan Teknologi Informasi. Aman, transparan, dan akuntabel.
          </p>
        </div>
      </div>
    </div>
  );
}
