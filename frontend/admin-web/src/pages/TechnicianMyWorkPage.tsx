import { useState } from 'react';
import { Link } from 'react-router';
import {
  ArrowRightIcon,
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Input,
  SearchIcon,
  Select,
  Skeleton,
} from '../components/ui';
import { LayersIcon } from '../components/layout/NavIcons';
import {
  useTechnicianMyWork,
  useTechnicianWorkSummary,
} from '../features/assignments/useAssignments';
import type {
  ApplicationStage,
  ApplicationStatus,
} from '../features/applications/useAdminApplications';
import {
  formatDate,
  getStageBadge,
  getStatusBadge,
} from '../features/applications/workflowHelpers';

const STATUS_OPTIONS: { value: ApplicationStatus | ''; label: string }[] = [
  { value: '', label: 'Semua Status' },
  { value: 'APPROVED', label: 'APPROVED (Menunggu Mulai)' },
  { value: 'IN_PROGRESS', label: 'IN_PROGRESS (Sedang Dikerjakan)' },
  { value: 'REVISION_REQUIRED', label: 'REVISION_REQUIRED (Perlu Revisi)' },
];

const STAGE_OPTIONS: { value: ApplicationStage | ''; label: string }[] = [
  { value: '', label: 'Semua Tahapan' },
  { value: 'ANALYSIS', label: 'ANALYSIS (Analisis)' },
  { value: 'PLANNING', label: 'PLANNING (Perencanaan)' },
  { value: 'DESIGN', label: 'DESIGN (Perancangan)' },
  { value: 'IMPLEMENTATION', label: 'IMPLEMENTATION (Implementasi)' },
  { value: 'TESTING', label: 'TESTING (Pengujian)' },
  { value: 'MAINTENANCE', label: 'MAINTENANCE (Pemeliharaan)' },
  { value: 'EVALUATION', label: 'EVALUATION (Evaluasi)' },
];

export function TechnicianMyWorkPage() {
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | ''>('');
  const [stageFilter, setStageFilter] = useState<ApplicationStage | ''>('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const {
    data: summary,
    isLoading: summaryLoading,
    refetch: refetchSummary,
  } = useTechnicianWorkSummary();

  const {
    data: workData,
    isLoading: workLoading,
    isError,
    error,
    refetch: refetchWork,
  } = useTechnicianMyWork({
    search: searchInput,
    status: statusFilter,
    stage: stageFilter,
    page,
    page_size: pageSize,
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const handleRefresh = () => {
    refetchSummary();
    refetchWork();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Pekerjaan Saya (Tenaga Ahli Workspace)
            </h1>
            <Badge variant="primary" className="text-xs font-mono">
              Role: Tenaga Ahli TI
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Daftar permohonan layanan SPBE resmi yang secara aktif didelegasikan kepada Anda untuk penanganan teknis.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={workLoading}
          >
            Segarkan Data
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Total Ditugaskan
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            {summaryLoading ? (
              <Skeleton className="h-8 w-12 rounded" />
            ) : (
              <span className="text-3xl font-extrabold text-slate-900">
                {summary?.total_assigned ?? 0}
              </span>
            )}
            <span className="text-xs text-slate-400">Tiket Aktif</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between border-l-4 border-l-[#1B5040]">
          <span className="text-xs font-bold text-[#1B5040] uppercase tracking-wider">
            Sedang Dikerjakan
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            {summaryLoading ? (
              <Skeleton className="h-8 w-12 rounded" />
            ) : (
              <span className="text-3xl font-extrabold text-[#1B5040]">
                {summary?.in_progress_count ?? 0}
              </span>
            )}
            <Badge variant="primary" className="text-[10px]">
              IN_PROGRESS
            </Badge>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between border-l-4 border-l-[#1B5040]">
          <span className="text-xs font-bold text-[#1B5040] uppercase tracking-wider">
            Disetujui / Telaah
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            {summaryLoading ? (
              <Skeleton className="h-8 w-12 rounded" />
            ) : (
              <span className="text-3xl font-extrabold text-[#1B5040]">
                {summary?.approved_pending_count ?? 0}
              </span>
            )}
            <Badge variant="info" className="text-[10px]">
              APPROVED
            </Badge>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between border-l-4 border-l-emerald-600">
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
            Tuntas Selesai
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            {summaryLoading ? (
              <Skeleton className="h-8 w-12 rounded" />
            ) : (
              <span className="text-3xl font-extrabold text-emerald-700">
                {summary?.completed_count ?? 0}
              </span>
            )}
            <Badge variant="success" className="text-[10px]">
              COMPLETED
            </Badge>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div className="md:col-span-5">
            <Input
              placeholder="Cari nomor tiket, judul usulan, nama OPD..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              leftAddon={<SearchIcon size={16} className="text-slate-400" />}
            />
          </div>

          <div className="md:col-span-3">
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as ApplicationStatus | '');
                setPage(1);
              }}
              options={STATUS_OPTIONS}
            />
          </div>

          <div className="md:col-span-3">
            <Select
              value={stageFilter}
              onChange={(e) => {
                setStageFilter(e.target.value as ApplicationStage | '');
                setPage(1);
              }}
              options={STAGE_OPTIONS}
            />
          </div>

          <div className="md:col-span-1">
            <Button type="submit" variant="primary" size="md" className="w-full">
              Cari
            </Button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {workLoading && (
          <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-1/3 rounded" />
            <Skeleton className="h-14 w-full rounded" />
            <Skeleton className="h-14 w-full rounded" />
          </div>
        )}

        {isError && (
          <div className="p-8">
            <ErrorState
              title="Gagal Memuat Daftar Tugas"
              description={error?.message || 'Terjadi gangguan saat mengambil data tugas Anda.'}
              action={
                <Button variant="outline" size="sm" onClick={handleRefresh}>
                  Coba Lagi
                </Button>
              }
            />
          </div>
        )}

        {!workLoading && !isError && workData && workData.items.length === 0 && (
          <div className="p-12">
            <EmptyState
              icon={<LayersIcon size={40} className="text-slate-400" />}
              title="Belum Ada Penugasan Aktif"
              description="Anda belum memiliki tiket permohonan yang ditugaskan secara aktif saat ini."
            />
          </div>
        )}

        {!workLoading && !isError && workData && workData.items.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-700 text-xs uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th scope="col" className="px-5 py-3.5 font-bold">
                      Tiket & Ditugaskan
                    </th>
                    <th scope="col" className="px-5 py-3.5 font-bold">
                      Perangkat Daerah (OPD)
                    </th>
                    <th scope="col" className="px-5 py-3.5 font-bold">
                      Judul Usulan & Layanan
                    </th>
                    <th scope="col" className="px-5 py-3.5 font-bold">
                      Status Operasional
                    </th>
                    <th scope="col" className="px-5 py-3.5 font-bold">
                      Tahapan SPBE
                    </th>
                    <th scope="col" className="px-5 py-3.5 font-bold text-right">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {workData.items.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    >
                      <td className="px-5 py-4 whitespace-nowrap">
                        <Link
                          to={`/applications/${item.id}`}
                          className="font-mono font-bold text-[#1B5040] hover:underline block"
                        >
                          {item.ticket_number}
                        </Link>
                        <span className="text-xs text-slate-500">
                          Ditugaskan: {formatDate(item.assigned_at)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-900 line-clamp-1">
                          {item.applicant.opd_name}
                        </div>
                        <div className="text-xs text-slate-500">
                          PIC: {item.applicant.full_name}
                        </div>
                      </td>

                      <td className="px-5 py-4 max-w-xs">
                        <Link
                          to={`/applications/${item.id}`}
                          className="font-semibold text-slate-900 hover:text-[#1B5040] line-clamp-1 block text-sm leading-snug"
                        >
                          {item.title}
                        </Link>
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                          <span className="font-mono text-[11px]">{item.service.code}</span>
                          <span>•</span>
                          <span>{item.service.name}</span>
                        </div>
                        {item.assignment_note && (
                          <div className="mt-1.5 text-[11px] text-slate-600 italic line-clamp-1 bg-slate-50 p-1 rounded border border-slate-100">
                            Catatan: "{item.assignment_note}"
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        {getStatusBadge(item.current_status)}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        {getStageBadge(item.current_stage)}
                      </td>

                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <Link to={`/applications/${item.id}`}>
                          <Button variant="primary" size="sm" className="font-semibold text-xs shadow-sm">
                            Buka Lembar Kerja
                            <ArrowRightIcon size={14} className="ml-1" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-5 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
              <div>
                Menampilkan halaman <strong>{workData.page}</strong> dari <strong>{workData.total_pages}</strong> (Total <strong>{workData.total}</strong> penugasan aktif)
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={workData.page <= 1}
                >
                  ← Sebelumnya
                </Button>
                <span className="px-2 font-mono font-bold text-slate-800">
                  {workData.page} / {workData.total_pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(workData.total_pages, p + 1))}
                  disabled={workData.page >= workData.total_pages}
                >
                  Selanjutnya →
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
