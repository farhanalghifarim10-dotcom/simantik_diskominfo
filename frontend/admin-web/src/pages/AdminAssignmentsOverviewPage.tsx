import { useState } from 'react';
import { Link } from 'react-router';
import {
  Alert,
  ArrowRightIcon,
  Badge,
  Button,
  Dialog,
  EmptyState,
  ErrorState,
  FileTextIcon,
  Select,
  Skeleton,
  Textarea,
  useToast,
} from '../components/ui';
import { UsersIcon } from '../components/layout/NavIcons';
import {
  useAdminApplications,
  type ApplicationStatus,
} from '../features/applications/useAdminApplications';
import {
  useAssignTechnician,
  useTechniciansList,
} from '../features/assignments/useAssignments';
import {
  formatDate,
  getStageBadge,
  getStatusBadge,
} from '../features/applications/workflowHelpers';

export function AdminAssignmentsOverviewPage() {
  const { toast } = useToast();

  // Queries
  const {
    data: technicians,
    isLoading: techLoading,
    isError: techError,
    refetch: refetchTech,
  } = useTechniciansList();

  const [selectedTechFilter, setSelectedTechFilter] = useState<string>('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<ApplicationStatus | ''>('');
  const [page, setPage] = useState(1);

  const {
    data: applicationsData,
    isLoading: appsLoading,
    isError: appsError,
    refetch: refetchApps,
  } = useAdminApplications({
    page,
    page_size: 15,
    status: selectedStatusFilter,
  });

  // Assign mutation
  const assignMutation = useAssignTechnician();

  // Modal State for Quick Assignment
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [targetAppId, setTargetAppId] = useState<string>('');
  const [targetAppTitle, setTargetAppTitle] = useState<string>('');
  const [targetTicket, setTargetTicket] = useState<string>('');
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>('');
  const [assignmentNote, setAssignmentNote] = useState<string>('');
  const [assignmentError, setAssignmentError] = useState<string>('');

  const handleOpenAssign = (appId: string, ticket: string, title: string) => {
    setTargetAppId(appId);
    setTargetTicket(ticket);
    setTargetAppTitle(title);
    setSelectedTechnicianId(technicians?.[0]?.id || '');
    setAssignmentNote('');
    setAssignmentError('');
    setAssignmentModalOpen(true);
  };

  const handleConfirmAssign = async () => {
    if (!targetAppId || !selectedTechnicianId) {
      setAssignmentError('Silakan pilih tenaga ahli penanggung jawab.');
      return;
    }

    try {
      const res = await assignMutation.mutateAsync({
        applicationId: targetAppId,
        technician_id: selectedTechnicianId,
        note: assignmentNote.trim() || undefined,
      });

      toast({
        title: 'Penugasan Berhasil',
        message: `Tiket ${targetTicket} berhasil ditugaskan kepada ${res.technician_name}.`,
        type: 'success',
      });

      setAssignmentModalOpen(false);
      refetchApps();
      refetchTech();
    } catch (err: any) {
      setAssignmentError(err?.message || 'Gagal menyimpan penugasan tenaga ahli.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Penugasan Pekerjaan Tenaga Ahli
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Monitoring distribusi beban kerja personel tenaga ahli dan delegasi tiket permohonan layanan SPBE.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchTech();
              refetchApps();
            }}
          >
            Segarkan Data
          </Button>
        </div>
      </div>

      {/* TECHNICIAN WORKLOAD OVERVIEW CARDS */}
      <div>
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
          <UsersIcon size={16} className="text-[#1B5040]" />
          Beban Kerja Personel Tenaga Ahli Internal Diskominfo
        </h2>

        {techLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
          </div>
        ) : techError ? (
          <Alert variant="danger">Gagal memuat daftar personel tenaga ahli.</Alert>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {technicians?.map((tech) => {
              const isFiltered = selectedTechFilter === tech.id;
              return (
                <div
                  key={tech.id}
                  onClick={() =>
                    setSelectedTechFilter(isFiltered ? '' : tech.id)
                  }
                  className={`p-5 rounded-2xl border transition-all cursor-pointer bg-white flex flex-col justify-between gap-3 ${
                    isFiltered
                      ? 'border-[#1B5040] ring-2 ring-[#1B5040]/20 shadow-md'
                      : 'border-slate-200 hover:border-slate-300 shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm leading-snug">
                        {tech.full_name}
                      </h3>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        {tech.email || 'tenagaahli@bandungkab.go.id'}
                      </p>
                    </div>
                    <Badge variant="neutral" className="text-[10px]">
                      {tech.role}
                    </Badge>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Penugasan Aktif:</span>
                    <span className="font-bold text-sm text-[#1B5040] bg-[#CAF3E4] px-2.5 py-0.5 rounded-full border border-[#98F7D9]">
                      {tech.active_assignments_count} Tiket
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* APPLICATIONS ASSIGNMENT TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              Daftar Penugasan Permohonan
            </h3>
            <p className="text-xs text-slate-500">
              Satu permohonan memiliki maksimal satu tenaga ahli penanggung jawab aktif.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Select
              value={selectedStatusFilter}
              onChange={(e) => {
                setSelectedStatusFilter(e.target.value as ApplicationStatus | '');
                setPage(1);
              }}
              options={[
                { value: '', label: 'Semua Status Operasional' },
                { value: 'VERIFICATION', label: 'Dalam Verifikasi' },
                { value: 'APPROVED', label: 'Disetujui' },
                { value: 'IN_PROGRESS', label: 'Dalam Pengerjaan' },
                { value: 'COMPLETED', label: 'Selesai' },
              ]}
            />
          </div>
        </div>

        {appsLoading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-10 w-full rounded" />
            <Skeleton className="h-14 w-full rounded" />
            <Skeleton className="h-14 w-full rounded" />
          </div>
        ) : appsError ? (
          <div className="p-6">
            <ErrorState
              title="Gagal Memuat Permohonan"
              description="Terjadi kendala saat mengambil data permohonan."
              action={
                <Button variant="outline" size="sm" onClick={() => refetchApps()}>
                  Coba Lagi
                </Button>
              }
            />
          </div>
        ) : applicationsData && applicationsData.items.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={<FileTextIcon size={36} className="text-slate-400" />}
              title="Tidak Ada Data Permohonan"
              description="Tidak ada permohonan yang sesuai dengan filter saat ini."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-700 text-xs uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th scope="col" className="px-4 py-3 font-bold">
                    No. Tiket & Tanggal
                  </th>
                  <th scope="col" className="px-4 py-3 font-bold">
                    Perangkat Daerah (OPD)
                  </th>
                  <th scope="col" className="px-4 py-3 font-bold">
                    Judul Usulan Aplikasi
                  </th>
                  <th scope="col" className="px-4 py-3 font-bold">
                    Status & Tahapan
                  </th>
                  <th scope="col" className="px-4 py-3 font-bold text-right">
                    Tindakan Penugasan
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {applicationsData?.items.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Link
                        to={`/applications/${app.id}`}
                        className="font-mono font-bold text-[#1B5040] hover:underline block"
                      >
                        {app.ticket_number}
                      </Link>
                      <span className="text-xs text-slate-400">
                        {formatDate(app.submitted_at)}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900 text-xs sm:text-sm line-clamp-1">
                        {app.applicant.opd_name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {app.applicant.full_name}
                      </div>
                    </td>

                    <td className="px-4 py-3 max-w-xs">
                      <Link
                        to={`/applications/${app.id}`}
                        className="font-medium text-slate-900 hover:text-[#1B5040] line-clamp-1 block text-xs sm:text-sm"
                      >
                        {app.title}
                      </Link>
                      <span className="text-[11px] font-mono text-slate-400">
                        {app.service.name}
                      </span>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="space-y-1">
                        <div>{getStatusBadge(app.current_status)}</div>
                        <div>{getStageBadge(app.current_stage)}</div>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {!['COMPLETED', 'CLOSED', 'REJECTED', 'CANCELLED'].includes(app.current_status) && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs font-semibold"
                            onClick={() =>
                              handleOpenAssign(app.id, app.ticket_number, app.title)
                            }
                          >
                            Tugaskan / Alihkan
                          </Button>
                        )}
                        <Link to={`/applications/${app.id}`}>
                          <Button variant="primary" size="sm" className="text-xs font-semibold">
                            Buka Detail
                            <ArrowRightIcon size={12} className="ml-1" />
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DIALOG ASSIGN / RE-ASSIGN TECHNICIAN */}
      <Dialog
        isOpen={assignmentModalOpen}
        onClose={() => setAssignmentModalOpen(false)}
        title="Penugasan Tenaga Ahli Penanggung Jawab"
        description={`Tetapkan personel tenaga ahli utama untuk tiket ${targetTicket}`}
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAssignmentModalOpen(false)}
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
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <span className="font-bold text-slate-800 block text-xs">Judul Usulan:</span>
            <p className="text-slate-700 font-medium">{targetAppTitle}</p>
          </div>

          <Alert variant="warning">
            Sesuai aturan arsitektur SPBE SIMANTIK, setiap permohonan hanya memiliki <strong>1 tenaga ahli utama aktif</strong>.
            Jika sebelumnya telah ditugaskan, penugasan baru akan mengarsipkan penugasan lama secara otomatis.
          </Alert>

          {assignmentError && (
            <Alert variant="danger">{assignmentError}</Alert>
          )}

          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 block text-xs">
              Pilih Tenaga Ahli Penanggung Jawab:
            </label>
            <Select
              value={selectedTechnicianId}
              onChange={(e) => setSelectedTechnicianId(e.target.value)}
              options={(technicians || []).map((t) => ({
                value: t.id,
                label: `${t.full_name} (${t.active_assignments_count} tiket aktif)`,
              }))}
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 block text-xs">
              Instruksi / Catatan Penugasan (Opsional):
            </label>
            <Textarea
              rows={3}
              placeholder="Contoh: Fokuskan telaah arsitektur interoperabilitas basis data dan rancangan modul UAT."
              value={assignmentNote}
              onChange={(e) => {
                setAssignmentNote(e.target.value);
                setAssignmentError('');
              }}
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
