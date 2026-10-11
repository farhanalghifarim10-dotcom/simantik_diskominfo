import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  Button,
  EmptyState,
  ErrorState,
  Heading,
  Input,
  SearchIcon,
  ShieldIcon,
  Skeleton,
  Text,
} from '../components/ui';
import { LayersIcon } from '../components/layout/NavIcons';
import {
  useAdminApplications,
  type ApplicationListItem,
  type ApplicationStage,
} from '../features/applications/useAdminApplications';
import {
  getStageBadge,
  getStatusBadge,
  formatDate,
} from '../features/applications/workflowHelpers';

const LIFECYCLE_STAGES: { stage: ApplicationStage; step: number; label: string; desc: string }[] = [
  { stage: 'ANALYSIS', step: 1, label: 'Analisis Kebutuhan', desc: 'Identifikasi masalah, ruang lingkup & risiko' },
  { stage: 'PLANNING', step: 2, label: 'Perencanaan', desc: 'Jadwal kerja, arsitektur proses bisnis & tim' },
  { stage: 'DESIGN', step: 3, label: 'Perancangan', desc: 'Rancang bangun DB, UI/UX & spesifikasi API' },
  { stage: 'IMPLEMENTATION', step: 4, label: 'Implementasi', desc: 'Pengembangan kode sumber & integrasi' },
  { stage: 'TESTING', step: 5, label: 'Pengujian Kelaikan Sistem', desc: 'Uji fungsi, integrasi, beban & keamanan' },
  { stage: 'MAINTENANCE', step: 6, label: 'Pemeliharaan', desc: 'Perbaikan bug, adaptasi & pencegahan' },
  { stage: 'EVALUATION', step: 7, label: 'Evaluasi SPBE', desc: 'Capaian indikator kinerja & dampak sistem' },
];

export function AdminLifecycleOverviewPage() {
  const [selectedStage, setSelectedStage] = useState<ApplicationStage | ''>('');
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, isError, error, refetch } = useAdminApplications({
    page: 1,
    page_size: 50,
    search: searchQuery,
    stage: selectedStage,
  });

  const applications: ApplicationListItem[] = data?.items || [];

  // Hitung jumlah per stage
  const stageCounts = useMemo(() => {
    const map = new Map<ApplicationStage, number>();
    LIFECYCLE_STAGES.forEach((s) => map.set(s.stage, 0));
    (data?.items || []).forEach((app: ApplicationListItem) => {
      if (app.current_stage) {
        map.set(app.current_stage, (map.get(app.current_stage) || 0) + 1);
      }
    });
    return map;
  }, [data?.items]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-50 text-indigo-700">
              <LayersIcon size={14} />
            </span>
            <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">
              Tata Kelola SPBE Terintegrasi
            </span>
          </div>
          <Heading level={1}>Siklus Hidup Pembangunan Aplikasi</Heading>
          <Text variant="muted" className="mt-1 max-w-2xl text-xs sm:text-sm">
            Dokumentasi dan pengawasan 7 tahapan siklus hidup SPBE (Perpres 95/2018) untuk memastikan kualitas, interoperabilitas, dan keamanan sistem informasi.
          </Text>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/applications">
            <Button variant="outline" size="sm">
              Semua Permohonan
            </Button>
          </Link>
        </div>
      </div>

      {/* 7-Stage Pipeline Visual Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        {LIFECYCLE_STAGES.map((s) => {
          const isCurrent = selectedStage === s.stage;
          const count = stageCounts.get(s.stage) || 0;
          return (
            <button
              key={s.stage}
              type="button"
              onClick={() => setSelectedStage(isCurrent ? '' : s.stage)}
              className={`p-3 rounded-xl border text-left transition-all ${
                isCurrent
                  ? 'border-indigo-600 bg-indigo-50/70 shadow-xs ring-2 ring-indigo-500/20'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-mono font-bold text-slate-400">0{s.step}</span>
                <span className="px-1.5 py-0.2 rounded-full font-bold text-[10px] bg-slate-100 text-slate-700">
                  {count}
                </span>
              </div>
              <p className="font-bold text-xs text-slate-900 truncate leading-tight">
                {s.label}
              </p>
              <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                {s.desc}
              </p>
            </button>
          );
        })}
      </div>

      {/* Filter & Search Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <SearchIcon size={16} />
            </span>
            <Input
              placeholder="Cari nomor tiket, nama aplikasi, atau instansi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            {selectedStage && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedStage('')}
                className="text-xs text-slate-600"
              >
                Reset Filter Tahap
              </Button>
            )}
            <span className="text-xs text-slate-500">
              Total: <strong>{data?.total ?? 0}</strong> aplikasi
            </span>
          </div>
        </div>
      </div>

      {/* Application List by Stage */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      ) : isError ? (
        <ErrorState
          title="Gagal Memuat Data Siklus Hidup"
          description={error?.message || 'Terjadi gangguan saat mengambil data permohonan.'}
          onRetry={() => refetch()}
        />
      ) : applications.length === 0 ? (
        <EmptyState
          icon={<ShieldIcon size={40} className="text-slate-400" />}
          title="Tidak Ada Aplikasi Pada Tahapan Ini"
          description={
            selectedStage
              ? `Belum ada aplikasi yang berada pada tahapan ${selectedStage}. Pilih tahapan lain atau reset filter.`
              : 'Belum ada aplikasi yang terdaftar dalam sistem siklus hidup SPBE.'
          }
          action={
            selectedStage ? (
              <Button variant="outline" size="sm" onClick={() => setSelectedStage('')}>
                Tampilkan Semua Tahapan
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {applications.map((app: ApplicationListItem) => {
            const currentStageInfo = LIFECYCLE_STAGES.find((s) => s.stage === app.current_stage);

            return (
              <div
                key={app.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-200 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md">
                      {app.ticket_number}
                    </span>
                    {getStatusBadge(app.current_status)}
                    {getStageBadge(app.current_stage)}
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      {app.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {app.applicant.opd_name} • PIC: {app.applicant.full_name}
                    </p>
                  </div>
                </div>

                {/* Lifecycle Pipeline Progress Mini-Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="hidden md:flex items-center gap-1">
                    {LIFECYCLE_STAGES.map((s) => {
                      const isReached = currentStageInfo ? s.step <= currentStageInfo.step : false;
                      const isCurrent = s.stage === app.current_stage;
                      return (
                        <div
                          key={s.stage}
                          title={s.label}
                          className={`h-2 rounded-full transition-all ${
                            isCurrent
                              ? 'w-6 bg-indigo-600 ring-2 ring-indigo-200'
                              : isReached
                              ? 'w-3 bg-indigo-400'
                              : 'w-3 bg-slate-200'
                          }`}
                        />
                      );
                    })}
                  </div>

                  <div className="text-right flex items-center gap-3">
                    <span className="text-[11px] text-slate-400 hidden sm:inline">
                      Diajukan: {formatDate(app.submitted_at)}
                    </span>
                    <Link to={`/applications/${app.id}?tab=lifecycle`}>
                      <Button variant="primary" size="sm" className="font-semibold text-xs whitespace-nowrap">
                        Buka Workspace Lifecycle →
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
