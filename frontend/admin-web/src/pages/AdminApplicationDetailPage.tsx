import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import {
  Alert,
  Badge,
  Button,
  CheckCircleIcon,
  ClockIcon,
  Dialog,
  EmptyState,
  ErrorState,
  FileTextIcon,
  Select,
  Skeleton,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Textarea,
  useToast,
  KeyIcon,
} from '../components/ui';
import { UsersIcon } from '../components/layout/NavIcons';
import { useAuth } from '../features/auth/useAuth';
import { ReissueTrackingCodeModal } from '../features/applications/ReissueTrackingCodeModal';
import {
  fetchDocumentSignedUrl,
  useAddInternalNote,
  useAdminApplicationDetail,
  useExecuteStageTransition,
  useExecuteTransition,
  type ApplicationStage,
  type TransitionOption,
} from '../features/applications/useAdminApplications';
import {
  useApplicationAssignments,
  useAssignTechnician,
  useTechniciansList,
} from '../features/assignments/useAssignments';
import {
  formatDate,
  formatDateTime,
  getStageBadge,
  getStatusBadge,
} from '../features/applications/workflowHelpers';
import { LifecycleWorkspace } from '../features/lifecycle/LifecycleWorkspace';
import { TicketDiscussionPanel } from '../features/messages/TicketDiscussionPanel';

const ALL_STAGES: { value: ApplicationStage; label: string }[] = [
  { value: 'ANALYSIS', label: '1. Analisis Kebutuhan' },
  { value: 'PLANNING', label: '2. Perencanaan Teknis' },
  { value: 'DESIGN', label: '3. Perancangan Sistem' },
  { value: 'IMPLEMENTATION', label: '4. Implementasi / Koding' },
  { value: 'TESTING', label: '5. Pengujian Kelaikan Sistem' },
  { value: 'MAINTENANCE', label: '6. Pemeliharaan Sistem' },
  { value: 'EVALUATION', label: '7. Evaluasi Dampak SPBE' },
];

export function AdminApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'overview';
  const { toast } = useToast();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const { data: application, isLoading, isError, error } = useAdminApplicationDetail(id);
  const isTerminalStatus = ['COMPLETED', 'CLOSED', 'REJECTED', 'CANCELLED'].includes(
    application?.current_status || '',
  );

  const {
    data: assignmentsData,
    isLoading: isAssignmentsLoading,
    isError: isAssignmentsError,
    error: assignmentsError,
    refetch: refetchAssignments,
  } = useApplicationAssignments(id);
  const { data: techniciansList } = useTechniciansList({ enabled: isSuperAdmin });
  const assignMutation = useAssignTechnician();

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedTechId, setSelectedTechId] = useState('');
  const [assignNote, setAssignNote] = useState('');
  const [assignError, setAssignError] = useState('');

  const transitionMutation = useExecuteTransition();
  const stageTransitionMutation = useExecuteStageTransition();
  const addNoteMutation = useAddInternalNote();

  const [activeTransition, setActiveTransition] = useState<TransitionOption | null>(null);
  const [transitionNote, setTransitionNote] = useState('');
  const [transitionError, setTransitionError] = useState('');

  const [stageModalOpen, setStageModalOpen] = useState(false);
  const [selectedTargetStage, setSelectedTargetStage] = useState<ApplicationStage>('ANALYSIS');
  const [stageNote, setStageNote] = useState('');

  const handleOpenStageModal = () => {
    setSelectedTargetStage(application?.current_stage || 'ANALYSIS');
    setStageNote('');
    setStageModalOpen(true);
  };

  const [newInternalNote, setNewInternalNote] = useState('');

  const [reissueModalOpen, setReissueModalOpen] = useState(false);

  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);

  const handleOpenAssignModal = () => {
    setSelectedTechId(
      assignmentsData?.current_assignment?.technician_id ||
        techniciansList?.[0]?.id ||
        '',
    );
    setAssignNote('');
    setAssignError('');
    setAssignModalOpen(true);
  };

  const handleConfirmAssign = async () => {
    if (!application || !selectedTechId) {
      setAssignError('Silakan tentukan tenaga ahli penanggung jawab.');
      return;
    }

    try {
      const res = await assignMutation.mutateAsync({
        applicationId: application.id,
        technician_id: selectedTechId,
        note: assignNote.trim() || undefined,
      });

      toast({
        title: 'Penugasan Berhasil',
        message: `Tiket berhasil ditugaskan kepada ${res.technician_name}.`,
        type: 'success',
      });

      setAssignModalOpen(false);
      refetchAssignments();
    } catch (err: any) {
      setAssignError(err?.message || 'Gagal menyimpan penugasan.');
    }
  };

  const handleOpenTransitionDialog = (option: TransitionOption) => {
    setActiveTransition(option);
    setTransitionNote('');
    setTransitionError('');
  };

  const handleConfirmTransition = async () => {
    if (!application || !activeTransition) return;

    if (activeTransition.require_note && (!transitionNote || transitionNote.trim().length < 5)) {
      setTransitionError('Catatan atau alasan wajib diisi minimal 5 karakter untuk aksi ini.');
      return;
    }

    try {
      await transitionMutation.mutateAsync({
        id: application.id,
        target_status: activeTransition.to_status,
        note: transitionNote.trim() || undefined,
      });

      toast({
        title: 'Status Berhasil Diperbarui',
        message: `Status permohonan kini menjadi [${activeTransition.to_status}].`,
        type: 'success',
      });

      setActiveTransition(null);
      setTransitionNote('');
    } catch (err: any) {
      setTransitionError(err?.message || 'Gagal mengeksekusi transisi status.');
    }
  };

  const handleConfirmStageTransition = async () => {
    if (!application) return;

    try {
      await stageTransitionMutation.mutateAsync({
        id: application.id,
        target_stage: selectedTargetStage,
        note: stageNote.trim() || undefined,
      });

      toast({
        title: 'Tahapan SPBE Diperbarui',
        message: `Lifecycle stage berhasil dipindahkan ke [${selectedTargetStage}].`,
        type: 'success',
      });

      setStageModalOpen(false);
      setStageNote('');
    } catch (err: any) {
      toast({
        title: 'Gagal Memperbarui Tahapan',
        message: err?.message || 'Terjadi kesalahan sistem.',
        type: 'danger',
      });
    }
  };

  const handleAddInternalNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!application || !newInternalNote.trim()) return;

    try {
      await addNoteMutation.mutateAsync({
        id: application.id,
        message: newInternalNote.trim(),
      });

      toast({
        title: 'Catatan Tersimpan',
        message: 'Catatan internal berhasil ditambahkan ke riwayat permohonan.',
        type: 'success',
      });

      setNewInternalNote('');
    } catch (err: any) {
      toast({
        title: 'Gagal Menambah Catatan',
        message: err?.message || 'Terjadi kesalahan.',
        type: 'danger',
      });
    }
  };

  const handleDownloadDocument = async (docId: string, filename: string) => {
    if (!application) return;
    setDownloadingDocId(docId);

    try {
      const res = await fetchDocumentSignedUrl(application.id, docId);
      if (res?.signed_url) {
        window.open(res.signed_url, '_blank', 'noopener,noreferrer');
        toast({
          title: 'Membuka Dokumen Aman',
          message: `URL sementara untuk file "${filename}" berhasil dibuat.`,
          type: 'info',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Gagal Mengakses Dokumen',
        message: err?.message || 'Tidak dapat membuat tautan unduh aman.',
        type: 'danger',
      });
    } finally {
      setDownloadingDocId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-1/4 rounded" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !application) {
    return (
      <div className="p-8">
        <ErrorState
          title="Permohonan Tidak Ditemukan"
          description={error?.message || 'Data permohonan tidak dapat dimuat atau telah dihapus.'}
          action={
            <Link to="/applications">
              <Button variant="outline" size="sm">
                ← Kembali ke Daftar Permohonan
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link to="/" className="hover:text-slate-900">
            Dashboard
          </Link>
          <span>/</span>
          <Link to="/applications" className="hover:text-slate-900">
            Permohonan Layanan
          </Link>
          <span>/</span>
          <span className="font-mono font-bold text-slate-800">
            {application.ticket_number}
          </span>
        </div>

        <Link to="/applications">
          <Button variant="outline" size="sm">
            ← Kembali ke Daftar
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold text-[#1B5040] bg-[#CAF3E4] px-2.5 py-1 rounded-md border border-[#98F7D9]">
                {application.ticket_number}
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500">
                Diajukan pada {formatDateTime(application.submitted_at)}
              </span>
              <span className="text-xs text-slate-400">•</span>
              <Badge variant="neutral" className="text-xs font-mono">
                {application.service.code}
              </Badge>
              {isSuperAdmin && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setReissueModalOpen(true)}
                  className="border-amber-300 text-amber-800 hover:bg-amber-50 font-bold text-xs flex items-center gap-1.5 ml-auto"
                  title="Terbitkan Ulang Kode Pelacakan (Khusus Super Admin)"
                >
                  <KeyIcon size={14} className="text-amber-700" />
                  Terbitkan Ulang Kode
                </Button>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
              {application.title}
            </h1>

            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-600">
              <span className="font-semibold text-slate-800">
                {application.applicant.opd_name}
              </span>
              <span className="text-slate-300">•</span>
              <span>
                Pemohon: <strong>{application.applicant.full_name}</strong>
              </span>
              {application.applicant.position && (
                <>
                  <span className="text-slate-300">•</span>
                  <span>{application.applicant.position}</span>
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
                <UsersIcon size={14} className="text-[#1B5040] shrink-0" />
                <span className="text-slate-500 font-medium">Tenaga Ahli Penanggung Jawab:</span>
                {isAssignmentsLoading ? (
                  <Skeleton className="h-4 w-28 rounded" />
                ) : isAssignmentsError ? (
                  <span className="text-red-500 font-medium text-[11px]">Gagal memuat penugasan</span>
                ) : assignmentsData?.current_assignment ? (
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    {assignmentsData.current_assignment.technician_name || 'Tenaga Ahli TI'}
                    {isSuperAdmin && !isTerminalStatus && (
                      <button
                        type="button"
                        onClick={handleOpenAssignModal}
                        className="text-[11px] text-[#1B5040] hover:underline font-semibold ml-1 cursor-pointer"
                        title="Alihkan / Ganti Tenaga Ahli"
                      >
                        (Ganti)
                      </button>
                    )}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[11px] font-semibold border border-amber-200">
                      Belum Ditugaskan
                    </span>
                    {isSuperAdmin && !isTerminalStatus && (
                      <button
                        type="button"
                        onClick={handleOpenAssignModal}
                        className="text-[11px] text-[#1B5040] hover:underline font-bold cursor-pointer"
                      >
                        + Tugaskan Sekarang
                      </button>
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="shrink-0 flex flex-col items-start lg:items-end gap-2 bg-slate-50 p-4 rounded-xl border border-slate-100 min-w-[240px]">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Status Terkini
            </span>
            <div>{getStatusBadge(application.current_status)}</div>

            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-2">
              Tahapan Lifecycle SPBE
            </span>
            <div className="flex items-center gap-2">
              {getStageBadge(application.current_stage)}
              {['APPROVED', 'IN_PROGRESS'].includes(application.current_status) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTargetStage(application.current_stage || 'ANALYSIS');
                    setStageModalOpen(true);
                  }}
                  className="text-xs text-[#1B5040] hover:underline font-semibold"
                >
                  (Ubah)
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-[#CAF3E4]/50 via-slate-50/60 to-slate-50 p-5 rounded-xl border border-[#98F7D9] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ClockIcon size={16} className="text-[#1B5040]" />
              Tindakan Alur Kerja Yang Diizinkan
            </h3>
            <p className="text-xs text-slate-600">
              Pilihan aksi di bawah divalidasi oleh workflow engine terpusat berdasarkan status operasional saat ini.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {application.allowed_transitions.length === 0 && (
              <span className="text-xs text-slate-500 italic bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                Tidak ada transisi lanjutan yang tersedia untuk peran Anda pada status ini.
              </span>
            )}

            {application.allowed_transitions.map((option) => (
              <Button
                key={option.to_status}
                variant={
                  option.variant === 'danger'
                    ? 'danger'
                    : option.variant === 'warning'
                    ? 'outline'
                    : option.variant === 'success'
                    ? 'primary'
                    : 'primary'
                }
                size="sm"
                className={`font-bold shadow-sm ${
                  option.variant === 'warning' ? 'border-amber-500 text-amber-700 hover:bg-amber-50' : ''
                } ${
                  option.variant === 'success' ? 'bg-emerald-600 hover:bg-emerald-700' : ''
                }`}
                onClick={() => handleOpenTransitionDialog(option)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabList className="bg-white border border-slate-200 p-1 rounded-xl shadow-sm mb-6 flex overflow-x-auto">
          <Tab value="overview" className="flex-1 py-2.5 text-xs sm:text-sm font-semibold">
            Rincian & Pemohon
          </Tab>
          <Tab value="lifecycle" className="flex-1 py-2.5 text-xs sm:text-sm font-semibold text-[#1B5040]">
            Lifecycle & Dokumen Teknis
          </Tab>
          <Tab value="documents" className="flex-1 py-2.5 text-xs sm:text-sm font-semibold">
            Dokumen Persyaratan ({application.documents.length})
          </Tab>
          <Tab value="messages" className="flex-1 py-2.5 text-xs sm:text-sm font-semibold text-[#1B5040]">
            Komunikasi & Chat
          </Tab>
          <Tab value="history" className="flex-1 py-2.5 text-xs sm:text-sm font-semibold">
            Riwayat Status & Tahapan
          </Tab>
          <Tab value="notes" className="flex-1 py-2.5 text-xs sm:text-sm font-semibold">
            Catatan Internal ({application.internal_notes.length})
          </Tab>
          <Tab value="audit" className="flex-1 py-2.5 text-xs sm:text-sm font-semibold">
            Jejak Audit ({application.audit_logs.length})
          </Tab>
        </TabList>

        <TabPanel value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                <h3 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
                  <FileTextIcon size={18} className="text-[#1B5040]" />
                  Rincian Kebutuhan Aplikasi
                </h3>

                <div className="space-y-4 text-xs sm:text-sm">
                  <div>
                    <span className="font-bold text-slate-700 block mb-1">
                      Latar Belakang:
                    </span>
                    <p className="text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl whitespace-pre-wrap">
                      {application.background || 'Tidak ada uraian latar belakang.'}
                    </p>
                  </div>

                  <div>
                    <span className="font-bold text-slate-700 block mb-1">
                      Permasalahan yang Dihadapi:
                    </span>
                    <p className="text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl whitespace-pre-wrap">
                      {application.problem_statement || 'Tidak ada uraian masalah.'}
                    </p>
                  </div>

                  <div>
                    <span className="font-bold text-slate-700 block mb-1">
                      Tujuan & Sasaran Implementasi:
                    </span>
                    <p className="text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl whitespace-pre-wrap">
                      {application.objective || 'Tidak ada uraian tujuan.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <span className="font-bold text-slate-700 block mb-1">
                        Ruang Lingkup Sistem:
                      </span>
                      <p className="text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl whitespace-pre-wrap">
                        {application.scope || '-'}
                      </p>
                    </div>

                    <div>
                      <span className="font-bold text-slate-700 block mb-1">
                        Keluaran (Output) yang Diharapkan:
                      </span>
                      <p className="text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl whitespace-pre-wrap">
                        {application.expected_output || '-'}
                      </p>
                    </div>
                  </div>

                  {application.existing_application_name && (
                    <div className="p-3.5 rounded-xl bg-[#CAF3E4]/40 border border-[#98F7D9] text-[#1B5040]">
                      <span className="font-bold block text-xs uppercase tracking-wider mb-0.5">
                        Aplikasi Eksisting Terkait:
                      </span>
                      <span className="font-medium text-sm text-[#0D2820]">
                        {application.existing_application_name}
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <span className="font-bold text-slate-700 block mb-0.5">
                        Target Batas Waktu Permintaan OPD:
                      </span>
                      <span className="font-medium text-slate-900">
                        {formatDate(application.requested_deadline)}
                      </span>
                    </div>

                    <div>
                      <span className="font-bold text-slate-700 block mb-0.5">
                        Catatan Tambahan:
                      </span>
                      <span className="text-slate-600">
                        {application.additional_notes || '-'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100">
                  Data Pemohon Resmi (PIC OPD)
                </h3>

                <div className="space-y-3 text-xs sm:text-sm">
                  <div>
                    <span className="text-slate-400 block text-xs">Perangkat Daerah (OPD):</span>
                    <span className="font-bold text-slate-900">
                      {application.applicant.opd_name}
                    </span>
                    <span className="text-xs text-slate-500 font-mono block">
                      Kode: {application.applicant.opd_code}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-xs">Nama Lengkap Pemohon:</span>
                    <span className="font-semibold text-slate-900">
                      {application.applicant.full_name}
                    </span>
                  </div>

                  {application.applicant.employee_id && (
                    <div>
                      <span className="text-slate-400 block text-xs">NIP / Identitas Pegawai:</span>
                      <span className="font-mono text-slate-800">
                        {application.applicant.employee_id}
                      </span>
                    </div>
                  )}

                  {application.applicant.position && (
                    <div>
                      <span className="text-slate-400 block text-xs">Jabatan Pemohon:</span>
                      <span className="text-slate-800">
                        {application.applicant.position}
                      </span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-slate-400 block text-xs">Email Kedinasan:</span>
                    <a
                      href={`mailto:${application.applicant.email}`}
                      className="text-[#1B5040] font-medium hover:underline break-all"
                    >
                      {application.applicant.email}
                    </a>
                  </div>

                  {application.applicant.phone && (
                    <div>
                      <span className="text-slate-400 block text-xs">Nomor Telepon / WhatsApp:</span>
                      <a
                        href={`tel:${application.applicant.phone}`}
                        className="text-slate-800 font-mono font-medium hover:underline"
                      >
                        {application.applicant.phone}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2 min-w-0">
                    <UsersIcon size={16} className="text-[#1B5040] shrink-0" />
                    <span>Tenaga Ahli Penanggung Jawab</span>
                  </h3>
                  {isSuperAdmin && !isTerminalStatus && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleOpenAssignModal}
                      className="text-xs font-semibold shrink-0"
                    >
                      {assignmentsData?.current_assignment ? 'Ganti Tenaga Ahli' : 'Tugaskan'}
                    </Button>
                  )}
                </div>

                {isAssignmentsLoading ? (
                  <div className="space-y-3 py-2 animate-pulse">
                    <div className="h-4 bg-slate-100 rounded w-1/3" />
                    <div className="h-5 bg-slate-100 rounded w-2/3" />
                    <div className="h-4 bg-slate-100 rounded w-1/2" />
                  </div>
                ) : isAssignmentsError ? (
                  <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-800 space-y-1">
                    <span className="font-semibold block text-amber-900">
                      Informasi penugasan tidak dapat dimuat
                    </span>
                    <p className="text-[11px] text-amber-700">
                      {(assignmentsError as any)?.message ||
                        'Terjadi kendala saat memuat data penugasan atau Anda tidak memiliki akses ke tiket ini.'}
                    </p>
                  </div>
                ) : assignmentsData?.current_assignment ? (
                  <div className="space-y-3 text-xs sm:text-sm">
                    <div>
                      <span className="text-slate-400 block text-xs">Tenaga Ahli Utama:</span>
                      <span className="font-bold text-slate-900 text-sm">
                        {assignmentsData.current_assignment.technician_name}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-xs">Ditugaskan Oleh:</span>
                      <span className="text-slate-700">
                        {assignmentsData.current_assignment.assigned_by_name || 'Administrator'}
                      </span>
                      <span className="text-slate-400 block text-[11px] mt-0.5">
                        Waktu: {formatDateTime(assignmentsData.current_assignment.assigned_at)}
                      </span>
                    </div>

                    {assignmentsData.current_assignment.note && (
                      <div className="p-3 rounded-xl bg-[#CAF3E4]/60 border border-[#98F7D9] text-xs text-[#000408]">
                        <span className="font-bold block text-[11px] uppercase tracking-wider text-[#1B5040] mb-0.5">
                          Instruksi Tugas:
                        </span>
                        {assignmentsData.current_assignment.note}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-4 text-center space-y-2">
                    <p className="text-xs text-slate-400 italic">
                      Belum ada tenaga ahli penanggung jawab yang ditugaskan untuk tiket ini.
                    </p>
                    {isSuperAdmin && !isTerminalStatus && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleOpenAssignModal}
                        className="text-xs font-bold"
                      >
                        Tugaskan Tenaga Ahli Sekarang
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
                  <CheckCircleIcon size={16} className="text-emerald-600" />
                  Bukti Persetujuan Syarat Layanan
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-emerald-50 text-emerald-900 rounded-xl border border-emerald-100 space-y-1">
                    <p className="font-bold">
                      Komitmen & Pernyataan SPBE Disetujui
                    </p>
                    <p className="text-[11px] text-emerald-800 leading-relaxed">
                      Pemohon menyatakan secara sadar menyetujui seluruh ketentuan tata kelola SPBE dan keabsahan berkas permohonan.
                    </p>
                  </div>

                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500">Versi Regulasi Ketentuan:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {application.terms_version}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500">Waktu Penyetujuan Digital:</span>
                    <span className="font-mono text-slate-800">
                      {formatDateTime(application.terms_accepted_at)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabPanel>

        <TabPanel value="lifecycle" className="space-y-6">
          <LifecycleWorkspace
            applicationId={application.id}
            isSuperAdmin={isSuperAdmin}
            onOpenStageModal={handleOpenStageModal}
            application={application}
          />
        </TabPanel>

        <TabPanel value="documents" className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Berkas Dokumen Persyaratan Usulan
              </h3>
              <p className="text-xs text-slate-500">
                Dokumen disimpan di penyimpanan privat terkontrol backend. Akses berkas oleh admin dilakukan via signed URL berbatas waktu 15 menit.
              </p>
            </div>

            {application.documents.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={<FileTextIcon size={36} className="text-slate-400" />}
                  title="Tidak Ada Dokumen Terlampir"
                  description="Pemohon tidak melampirkan berkas dokumen pada saat pendaftaran."
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {application.documents.map((doc) => {
                  const sizeKb = Math.round(doc.size_bytes / 1024);
                  const isDownloading = downloadingDocId === doc.id;

                  return (
                    <div
                      key={doc.id}
                      className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col justify-between gap-4"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-[#CAF3E4] text-[#1B5040]">
                              <FileTextIcon size={20} />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-slate-900 leading-snug">
                                {doc.requirement_name || doc.original_filename}
                              </h4>
                              <p className="text-xs font-mono text-slate-500 line-clamp-1">
                                {doc.original_filename}
                              </p>
                            </div>
                          </div>

                          <Badge
                            variant={doc.is_required ? 'danger' : 'neutral'}
                            className="text-[10px]"
                          >
                            {doc.is_required ? 'Wajib' : 'Opsional'}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-500 pt-1">
                          <span>Ukuran: {sizeKb} KB</span>
                          <span>•</span>
                          <span>Tipe: {doc.mime_type}</span>
                          <span>•</span>
                          <span>Versi: {doc.version}</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">
                          Diunggah: {formatDate(doc.uploaded_at)}
                        </span>

                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isDownloading}
                          onClick={() => handleDownloadDocument(doc.id, doc.original_filename)}
                          className="font-bold text-xs"
                        >
                          {isDownloading ? 'Membuat Tautan...' : 'Buka / Unduh Aman'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabPanel>

        <TabPanel value="history" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100">
                Riwayat Transisi Status Operasional
              </h3>

              <div className="space-y-4">
                {application.status_history.map((sh) => (
                  <div key={sh.id} className="relative pl-6 pb-4 border-l-2 border-[#1B5040] last:border-l-0 last:pb-0">
                    <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-[#1B5040] ring-4 ring-[#CAF3E4]" />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          {sh.to_status}
                        </span>
                        {sh.from_status && (
                          <span className="text-xs text-slate-400">
                            (dari {sh.from_status})
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        Oleh: <strong>{sh.changed_by_name || 'Sistem'}</strong> ({sh.changed_by_role || 'SISTEM'}) •{' '}
                        {formatDateTime(sh.changed_at)}
                      </p>
                      {sh.note && (
                        <div className="mt-1.5 p-2.5 rounded-lg bg-slate-50 text-xs text-slate-700 border border-slate-100">
                          "{sh.note}"
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100">
                Riwayat Tahapan Lifecycle SPBE
              </h3>

              {application.stage_history.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  Belum ada pergeseran tahapan lifecycle SPBE.
                </div>
              ) : (
                <div className="space-y-4">
                  {application.stage_history.map((sth) => (
                    <div key={sth.id} className="relative pl-6 pb-4 border-l-2 border-[#2E8A6E]/40 last:border-l-0 last:pb-0">
                      <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-[#1B5040] ring-4 ring-[#CAF3E4]" />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 font-mono">
                            {sth.to_stage}
                          </span>
                          {sth.from_stage && (
                            <span className="text-xs text-slate-400">
                              (dari {sth.from_stage})
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">
                          Oleh: <strong>{sth.changed_by_name || 'Sistem'}</strong> •{' '}
                          {formatDateTime(sth.changed_at)}
                        </p>
                        {sth.note && (
                          <div className="mt-1.5 p-2.5 rounded-lg bg-[#CAF3E4]/30 text-xs text-slate-700 border border-[#98F7D9]">
                            "{sth.note}"
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 lg:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 min-w-0">
                  <UsersIcon size={16} className="text-[#1B5040] shrink-0" />
                  <span>Riwayat Penugasan Tenaga Ahli (Assignment History)</span>
                </h3>
                {isSuperAdmin && !isTerminalStatus && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenAssignModal}
                    className="text-xs font-semibold shrink-0"
                  >
                    Tugaskan / Alihkan Tenaga Ahli
                  </Button>
                )}
              </div>

              {isAssignmentsLoading ? (
                <div className="p-6 text-center text-xs text-slate-400 animate-pulse">
                  Memuat riwayat penugasan tenaga ahli...
                </div>
              ) : isAssignmentsError ? (
                <div className="p-6 text-center text-xs text-amber-700 bg-amber-50 rounded-xl border border-amber-200">
                  Gagal memuat catatan riwayat penugasan tenaga ahli.
                </div>
              ) : !assignmentsData || assignmentsData.assignment_history.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  Belum ada catatan riwayat penugasan tenaga ahli pada permohonan ini.
                </div>
              ) : (
                <div className="space-y-4">
                  {assignmentsData.assignment_history.map((asgn) => (
                    <div
                      key={asgn.id}
                      className="relative pl-6 pb-4 border-l-2 border-emerald-500 last:border-l-0 last:pb-0"
                    >
                      <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-emerald-600 ring-4 ring-emerald-50" />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">
                            {asgn.technician_name}
                          </span>
                          <Badge
                            variant={asgn.is_current ? 'success' : 'neutral'}
                            className="text-[10px]"
                          >
                            {asgn.is_current ? 'Aktif Saat Ini' : 'Selesai / Dialihkan'}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500">
                          Ditugaskan oleh: <strong>{asgn.assigned_by_name || 'Administrator'}</strong> •{' '}
                          Mulai: {formatDateTime(asgn.assigned_at)}
                          {asgn.unassigned_at ? ` s/d ${formatDateTime(asgn.unassigned_at)}` : ''}
                        </p>
                        {asgn.note && (
                          <div className="mt-1.5 p-2 rounded-lg bg-emerald-50/50 text-xs text-slate-700 border border-emerald-100">
                            Catatan: "{asgn.note}"
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabPanel>

        <TabPanel value="notes" className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Catatan Internal Diskominfo
              </h3>
              <p className="text-xs text-slate-500">
                Pesan dan catatan pada kanal ini hanya dapat dilihat oleh Super Admin dan Tenaga Ahli internal Diskominfo (terpisah dari data publik pemohon).
              </p>
            </div>

            <form onSubmit={handleAddInternalNote} className="space-y-3">
              <Textarea
                placeholder="Tuliskan catatan teknis, temuan verifikasi, atau arahan internal..."
                rows={3}
                value={newInternalNote}
                onChange={(e) => setNewInternalNote(e.target.value)}
              />
              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={addNoteMutation.isPending || !newInternalNote.trim()}
                >
                  {addNoteMutation.isPending ? 'Menyimpan...' : 'Simpan Catatan Internal'}
                </Button>
              </div>
            </form>

            <div className="space-y-3 pt-4 border-t border-slate-100">
              {application.internal_notes.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  Belum ada catatan internal pada permohonan ini.
                </div>
              ) : (
                application.internal_notes.map((note) => (
                  <div
                    key={note.id}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">
                          {note.sender_name}
                        </span>
                        <Badge variant="neutral" className="text-[10px]">
                          {note.sender_type}
                        </Badge>
                      </div>
                      <span className="text-slate-400">
                        {formatDateTime(note.created_at)}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-700 whitespace-pre-wrap leading-relaxed pt-1">
                      {note.message}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </TabPanel>

        <TabPanel value="audit" className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Jejak Audit Sistem (Audit Trail)
              </h3>
              <p className="text-xs text-slate-500">
                Log kronologis seluruh mutasi status, pengubahan data, dan akses berkas dokumen.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Waktu</th>
                    <th className="px-4 py-3">Aksi / Tindakan</th>
                    <th className="px-4 py-3">Pelaku (Actor)</th>
                    <th className="px-4 py-3">Detail Perubahan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {application.audit_logs.map((al) => (
                    <tr key={al.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 whitespace-nowrap text-slate-500 font-mono">
                        {formatDateTime(al.created_at)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {al.action}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {al.actor_name || 'Sistem Otomatis'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-[11px] max-w-xs truncate">
                        {al.new_data ? JSON.stringify(al.new_data) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabPanel>

        <TabPanel value="messages" className="space-y-6">
          <TicketDiscussionPanel applicationId={application.id} />
        </TabPanel>
      </Tabs>

      <Dialog
        isOpen={Boolean(activeTransition)}
        onClose={() => setActiveTransition(null)}
        title={activeTransition?.label || 'Konfirmasi Transisi'}
        description={activeTransition?.description || ''}
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTransition(null)}
              disabled={transitionMutation.isPending}
            >
              Batal
            </Button>
            <Button
              variant={
                activeTransition?.variant === 'danger'
                  ? 'danger'
                  : activeTransition?.variant === 'warning'
                  ? 'primary'
                  : 'primary'
              }
              size="sm"
              onClick={handleConfirmTransition}
              disabled={transitionMutation.isPending}
            >
              {transitionMutation.isPending ? 'Memproses...' : 'Konfirmasi & Eksekusi'}
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-xs sm:text-sm">
          {activeTransition?.variant === 'danger' && (
            <Alert variant="danger">
              Perhatian: Anda akan mengubah status permohonan ke{' '}
              <strong>{activeTransition.to_status}</strong>. Tindakan ini membatalkan atau menghentikan kelanjutan pengajuan.
            </Alert>
          )}

          {activeTransition?.variant === 'warning' && (
            <Alert variant="warning">
              Pemberitahuan: Permintaan revisi akan mewajibkan pemohon OPD untuk memperbaiki berkas atau data permohonan.
            </Alert>
          )}

          {transitionError && (
            <Alert variant="danger">{transitionError}</Alert>
          )}

          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 block text-xs">
              Catatan / Alasan {activeTransition?.require_note ? '(Wajib Diisi)' : '(Opsional)'}:
            </label>
            <Textarea
              rows={4}
              placeholder={
                activeTransition?.require_note
                  ? 'Tuliskan alasan atau instruksi revisi secara lengkap (minimal 5 karakter)...'
                  : 'Tuliskan catatan pendukung perubahan status bila diperlukan...'
              }
              value={transitionNote}
              onChange={(e) => {
                setTransitionNote(e.target.value);
                setTransitionError('');
              }}
            />
          </div>
        </div>
      </Dialog>

      <Dialog
        isOpen={stageModalOpen}
        onClose={() => setStageModalOpen(false)}
        title="Ubah Tahapan Siklus Hidup SPBE"
        description="Perbarui tahapan pelaksanaan sesuai Permenkomdigi No. 6 Tahun 2025."
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStageModalOpen(false)}
              disabled={stageTransitionMutation.isPending}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmStageTransition}
              disabled={stageTransitionMutation.isPending}
            >
              {stageTransitionMutation.isPending ? 'Menyimpan...' : 'Perbarui Tahapan'}
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-xs sm:text-sm">
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 block text-xs">
              Pilih Tahapan Baru:
            </label>
            <Select
              value={selectedTargetStage}
              onChange={(e) => setSelectedTargetStage(e.target.value as ApplicationStage)}
              options={ALL_STAGES}
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 block text-xs">
              Catatan Tahapan (Opsional):
            </label>
            <Textarea
              rows={3}
              placeholder="Contoh: Dokumen perencanaan arsitektur selesai diverifikasi."
              value={stageNote}
              onChange={(e) => setStageNote(e.target.value)}
            />
          </div>
        </div>
      </Dialog>

      <Dialog
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title={
          assignmentsData?.current_assignment
            ? 'Pengalihan Tenaga Ahli Penanggung Jawab'
            : 'Penugasan Tenaga Ahli Penanggung Jawab'
        }
        description="Tetapkan personel tenaga ahli internal Diskominfo untuk menangani pelaksanaan teknis tiket ini."
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAssignModalOpen(false)}
              disabled={assignMutation.isPending}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmAssign}
              disabled={assignMutation.isPending}
            >
              {assignMutation.isPending ? 'Menyimpan...' : 'Konfirmasi Penugasan'}
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-xs sm:text-sm">
          {assignmentsData?.current_assignment && (
            <Alert variant="warning">
              Saat ini tiket sedang ditugaskan kepada{' '}
              <strong>{assignmentsData.current_assignment.technician_name}</strong>. 
              Penugasan baru akan mengarsipkan penugasan sebelumnya dan mencatatnya ke dalam jejak audit.
            </Alert>
          )}

          {assignError && (
            <Alert variant="danger">{assignError}</Alert>
          )}

          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 block text-xs">
              Pilih Tenaga Ahli Penanggung Jawab:
            </label>
            <Select
              value={selectedTechId}
              onChange={(e) => setSelectedTechId(e.target.value)}
              options={(techniciansList || []).map((t) => ({
                value: t.id,
                label: `${t.full_name} (${t.active_assignments_count} tiket aktif)`,
              }))}
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 block text-xs">
              Instruksi / Catatan Penugasan:
            </label>
            <Textarea
              rows={3}
              placeholder="Contoh: Fokuskan telaah arsitektur interoperabilitas basis data dan modul pengujian UAT."
              value={assignNote}
              onChange={(e) => {
                setAssignNote(e.target.value);
                setAssignError('');
              }}
            />
          </div>
        </div>
      </Dialog>

      {isSuperAdmin && (
        <ReissueTrackingCodeModal
          isOpen={reissueModalOpen}
          onClose={() => setReissueModalOpen(false)}
          application={{
            id: application.id,
            ticket_number: application.ticket_number,
            title: application.title,
            applicant: application.applicant,
          }}
        />
      )}
    </div>
  );
}
