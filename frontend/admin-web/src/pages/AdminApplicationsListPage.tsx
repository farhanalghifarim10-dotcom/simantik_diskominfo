import { useState } from 'react';
import { Link } from 'react-router';
import {
  ArrowRightIcon,
  Button,
  EmptyState,
  ErrorState,
  FileTextIcon,
  Input,
  SearchIcon,
  Select,
  Skeleton,
  KeyIcon,
} from '../components/ui';
import { useAuth } from '../features/auth/useAuth';
import {
  ReissueTrackingCodeModal,
  type TargetApplicationInfo,
} from '../features/applications/ReissueTrackingCodeModal';
import {
  useAdminApplications,
  type ApplicationStage,
  type ApplicationStatus,
} from '../features/applications/useAdminApplications';
import {
  formatDate,
  getStageBadge,
  getStatusBadge,
} from '../features/applications/workflowHelpers';

const STATUS_OPTIONS: { value: ApplicationStatus | ''; label: string }[] = [
  { value: '', label: 'Semua Status Operasional' },
  { value: 'SUBMITTED', label: 'SUBMITTED (Diajukan Baru)' },
  { value: 'VERIFICATION', label: 'VERIFICATION (Dalam Verifikasi)' },
  { value: 'REVISION_REQUIRED', label: 'REVISION_REQUIRED (Perlu Revisi OPD)' },
  { value: 'APPROVED', label: 'APPROVED (Disetujui)' },
  { value: 'IN_PROGRESS', label: 'IN_PROGRESS (Dalam Pengerjaan)' },
  { value: 'COMPLETED', label: 'COMPLETED (Pekerjaan Selesai)' },
  { value: 'REJECTED', label: 'REJECTED (Ditolak)' },
  { value: 'CLOSED', label: 'CLOSED (Ditutup)' },
  { value: 'CANCELLED', label: 'CANCELLED (Dibatalkan)' },
];

const STAGE_OPTIONS: { value: ApplicationStage | ''; label: string }[] = [
  { value: '', label: 'Semua Tahapan Lifecycle SPBE' },
  { value: 'ANALYSIS', label: '1. Analisis Kebutuhan' },
  { value: 'PLANNING', label: '2. Perencanaan Teknis' },
  { value: 'DESIGN', label: '3. Perancangan Sistem' },
  { value: 'IMPLEMENTATION', label: '4. Implementasi / Koding' },
  { value: 'TESTING', label: '5. Pengujian Kelaikan Sistem' },
  { value: 'MAINTENANCE', label: '6. Pemeliharaan Sistem' },
  { value: 'EVALUATION', label: '7. Evaluasi Dampak SPBE' },
];

export function AdminApplicationsListPage() {
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | ''>('');
  const [stageFilter, setStageFilter] = useState<ApplicationStage | ''>('');
  const [sortBy, setSortBy] = useState<'submitted_at' | 'ticket_number' | 'title' | 'current_status'>('submitted_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const [selectedReissueApp, setSelectedReissueApp] = useState<TargetApplicationInfo | null>(null);

  const { data, isLoading, isError, error, refetch } = useAdminApplications({
    search: searchInput,
    status: statusFilter,
    stage: stageFilter,
    sort_by: sortBy,
    sort_order: sortOrder,
    page,
    page_size: pageSize,
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const resetFilters = () => {
    setSearchInput('');
    setStatusFilter('');
    setStageFilter('');
    setSortBy('submitted_at');
    setSortOrder('desc');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Daftar Permohonan Layanan
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Kelola, verifikasi berkas, dan tindak lanjuti usulan pembangunan serta modifikasi aplikasi dari Perangkat Daerah.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            Segarkan Data
          </Button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div className="md:col-span-5">
            <Input
              placeholder="Cari nomor tiket, judul usulan, nama pemohon, OPD..."
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

          <div className="md:col-span-1 flex items-center gap-2">
            <Button type="submit" variant="primary" size="md" className="w-full">
              Cari
            </Button>
          </div>
        </form>

        <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 gap-2">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-700">Urutkan:</span>
            <button
              type="button"
              onClick={() => {
                setSortBy('submitted_at');
                setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
              }}
              className={`hover:underline ${sortBy === 'submitted_at' ? 'font-bold text-[#1B5040]' : ''}`}
            >
              Tanggal Masuk ({sortOrder === 'desc' && sortBy === 'submitted_at' ? 'Terbaru' : 'Terlama'})
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => {
                setSortBy('ticket_number');
                setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
              }}
              className={`hover:underline ${sortBy === 'ticket_number' ? 'font-bold text-[#1B5040]' : ''}`}
            >
              No. Tiket
            </button>
          </div>

          {(searchInput || statusFilter || stageFilter) && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-[#1B5040] font-semibold hover:underline"
            >
              Reset Semua Filter
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading && (
          <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-1/3 rounded" />
            <Skeleton className="h-14 w-full rounded" />
            <Skeleton className="h-14 w-full rounded" />
            <Skeleton className="h-14 w-full rounded" />
          </div>
        )}

        {isError && (
          <div className="p-8">
            <ErrorState
              title="Gagal Memuat Permohonan"
              description={error?.message || 'Terjadi gangguan saat mengambil data dari server.'}
              action={
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  Coba Lagi
                </Button>
              }
            />
          </div>
        )}

        {!isLoading && !isError && data && data.items.length === 0 && (
          <div className="p-12">
            <EmptyState
              icon={<FileTextIcon size={40} className="text-slate-400" />}
              title="Tidak Ada Permohonan Ditemukan"
              description="Tidak ada usulan permohonan yang sesuai dengan filter pencarian Anda saat ini."
              action={
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  Bersihkan Filter
                </Button>
              }
            />
          </div>
        )}

        {!isLoading && !isError && data && data.items.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-700 text-xs uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th scope="col" className="px-5 py-3.5 font-bold">
                      Tiket & Tanggal
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
                    <th scope="col" className="px-5 py-3.5 font-bold text-center">
                      Dokumen
                    </th>
                    <th scope="col" className="px-5 py-3.5 font-bold text-right">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.items.map((item) => (
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
                          {formatDate(item.submitted_at)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-medium text-slate-900 line-clamp-1">
                          {item.applicant.opd_name}
                        </div>
                        <div className="text-xs text-slate-500">
                          {item.applicant.full_name}
                          {item.applicant.employee_id ? ` (NIP: ${item.applicant.employee_id})` : ''}
                        </div>
                      </td>

                      <td className="px-5 py-4 max-w-xs">
                        <Link
                          to={`/applications/${item.id}`}
                          className="font-semibold text-slate-900 hover:text-[#1B5040] line-clamp-2 leading-snug block"
                        >
                          {item.title}
                        </Link>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="text-[11px] font-mono text-slate-500">
                            {item.service.code}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-xs text-slate-500">
                            {item.service.name}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        {getStatusBadge(item.current_status)}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        {getStageBadge(item.current_stage)}
                      </td>

                      <td className="px-5 py-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                          {item.documents_count} berkas
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {isSuperAdmin && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedReissueApp({
                                  id: item.id,
                                  ticket_number: item.ticket_number,
                                  title: item.title,
                                  applicant: item.applicant,
                                });
                              }}
                              className="font-semibold text-xs border-amber-300 text-amber-800 hover:bg-amber-50"
                              title="Terbitkan Ulang Kode Pelacakan (Khusus Super Admin)"
                            >
                              <KeyIcon size={13} className="mr-1 text-amber-700" />
                              Kode
                            </Button>
                          )}
                          <Link to={`/applications/${item.id}`} onClick={(e) => e.stopPropagation()}>
                            <Button variant="outline" size="sm" className="font-semibold text-xs">
                              Detail
                              <ArrowRightIcon size={14} className="ml-1" />
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-5 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
              <div>
                Menampilkan halaman <strong>{data.page}</strong> dari <strong>{data.total_pages}</strong> (Total <strong>{data.total}</strong> permohonan)
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={data.page <= 1}
                >
                  ← Sebelumnya
                </Button>
                <span className="px-2 font-mono font-bold text-slate-800">
                  {data.page} / {data.total_pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
                  disabled={data.page >= data.total_pages}
                >
                  Selanjutnya →
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {isSuperAdmin && (
        <ReissueTrackingCodeModal
          isOpen={Boolean(selectedReissueApp)}
          onClose={() => setSelectedReissueApp(null)}
          application={selectedReissueApp}
        />
      )}
    </div>
  );
}
