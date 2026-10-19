import { Link } from 'react-router';
import { motion } from 'motion/react';
import { useAuth } from '../features/auth/useAuth';
import {
  Badge,
  Button,
  Heading,
  Text,
  FileTextIcon,
  ShieldIcon,
  Skeleton,
  RefreshCwIcon,
} from '../components/ui';
import { UsersIcon, LayersIcon } from '../components/layout/NavIcons';
import { useAdminDashboardStats } from '../features/applications/useAdminApplications';
import { useTechnicianWorkSummary } from '../features/assignments/useAssignments';

export function DashboardPage() {
  const { user } = useAuth();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  // Super Admin statistics hook
  const {
    data: adminStats,
    isLoading: isAdminLoading,
    isError: isAdminError,
    error: adminError,
    refetch: refetchAdminStats,
    isFetching: isAdminFetching,
  } = useAdminDashboardStats(undefined, { enabled: isSuperAdmin });

  // Technician work summary hook
  const {
    data: techSummary,
    isLoading: isTechLoading,
    isError: isTechError,
    error: techError,
    refetch: refetchTechSummary,
    isFetching: isTechFetching,
  } = useTechnicianWorkSummary();

  if (!user) return null;

  const isLoading = isSuperAdmin ? isAdminLoading : isTechLoading;
  const isFetching = isSuperAdmin ? isAdminFetching : isTechFetching;
  const isError = isSuperAdmin ? isAdminError : isTechError;
  const error = isSuperAdmin ? adminError : techError;

  const handleRefresh = () => {
    if (isSuperAdmin) {
      refetchAdminStats();
    } else {
      refetchTechSummary();
    }
  };

  // Metrik teragregasi
  const card1Value = isSuperAdmin
    ? adminStats?.total_applications ?? 0
    : techSummary?.total_assigned ?? 0;

  const card2Value = isSuperAdmin
    ? adminStats?.in_progress_count ?? 0
    : techSummary?.in_progress_count ?? 0;

  const card3Value = isSuperAdmin
    ? adminStats?.active_technicians_count ?? 0
    : techSummary?.approved_pending_count ?? 0;

  const card4Value = isSuperAdmin
    ? adminStats?.completed_closed_count ?? 0
    : techSummary?.completed_count ?? 0;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge
                variant={isSuperAdmin ? 'primary' : 'secondary'}
                size="sm"
                hasDot
              >
                {isSuperAdmin ? 'Super Admin' : 'Tenaga Ahli'}
              </Badge>
              <span className="text-xs text-slate-500 font-medium">
                Diskominfo Pemerintah Daerah Kabupaten Bandung
              </span>
            </div>

            <Heading level={2}>
              Selamat Datang, {user.fullName}
            </Heading>

            <Text variant="body" className="mt-2 text-slate-600 max-w-2xl">
              {isSuperAdmin
                ? 'Portal manajemen terpadu permohonan pembangunan dan pengembangan aplikasi SPBE Pemerintah Kabupaten Bandung.'
                : 'Portal kerja penugasan tenaga ahli dan pencatatan siklus hidup pembangunan aplikasi SPBE.'}
            </Text>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="md"
              onClick={handleRefresh}
              disabled={isLoading || isFetching}
              className="flex items-center gap-2 text-slate-700 hover:text-slate-900"
              title="Segarkan data metrik dashboard"
            >
              <RefreshCwIcon
                size={16}
                className={isFetching ? 'animate-spin text-[#1B5040]' : ''}
              />
              <span className="text-xs font-semibold">Segarkan</span>
            </Button>

            <Link to="/applications">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button variant="primary" size="md">
                  {isSuperAdmin ? 'Kelola Permohonan' : 'Lihat Tugas Saya'}
                </Button>
              </motion.div>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Error State Banner */}
      {isError && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
        >
          <div>
            <p className="font-semibold text-rose-900">
              Gagal memuat data ringkasan dashboard
            </p>
            <p className="text-xs text-rose-700 mt-0.5">
              {error?.message || 'Terjadi gangguan saat menghubungi peladen backend.'}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="border-rose-300 text-rose-800 hover:bg-rose-100 self-start sm:self-auto"
          >
            Coba Lagi
          </Button>
        </motion.div>
      )}

      {/* Role-Aware Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Permohonan / Tugas Ditugaskan */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ y: -4, transition: { duration: 0.18 } }}
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md transition-shadow flex items-center justify-between"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {isSuperAdmin ? 'Total Permohonan' : 'Tugas Ditugaskan'}
            </p>
            {isLoading ? (
              <Skeleton className="h-8 w-16 mt-1.5" />
            ) : (
              <p className="text-2xl font-bold text-slate-900 mt-1.5">
                {card1Value}
              </p>
            )}
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              {isSuperAdmin ? 'Semua permohonan terdaftar' : 'Menunggu pemrosesan'}
            </span>
          </div>
          <div className="h-10 w-10 rounded-lg bg-[#CAF3E4] text-[#1B5040] flex items-center justify-center">
            <FileTextIcon size={20} />
          </div>
        </motion.div>

        {/* Card 2: Dalam Pengerjaan */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ y: -4, transition: { duration: 0.18 } }}
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md transition-shadow flex items-center justify-between"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Dalam Pengerjaan
            </p>
            {isLoading ? (
              <Skeleton className="h-8 w-16 mt-1.5" />
            ) : (
              <p className="text-2xl font-bold text-slate-900 mt-1.5">
                {card2Value}
              </p>
            )}
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Tahap aktif
            </span>
          </div>
          <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <LayersIcon size={20} />
          </div>
        </motion.div>

        {/* Card 3: Tenaga Ahli Aktif / Uji Kelaikan */}
        {isSuperAdmin ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.26, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -4, transition: { duration: 0.18 } }}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md transition-shadow flex items-center justify-between"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Tenaga Ahli Aktif
              </p>
              {isLoading ? (
                <Skeleton className="h-8 w-16 mt-1.5" />
              ) : (
                <p className="text-2xl font-bold text-slate-900 mt-1.5">
                  {card3Value}
                </p>
              )}
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Tim Diskominfo
              </span>
            </div>
            <div className="h-10 w-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <UsersIcon size={20} />
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.26, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -4, transition: { duration: 0.18 } }}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md transition-shadow flex items-center justify-between"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Uji Kelaikan
              </p>
              {isLoading ? (
                <Skeleton className="h-8 w-16 mt-1.5" />
              ) : (
                <p className="text-2xl font-bold text-slate-900 mt-1.5">
                  {card3Value}
                </p>
              )}
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Antrean pengujian
              </span>
            </div>
            <div className="h-10 w-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <ShieldIcon size={20} />
            </div>
          </motion.div>
        )}

        {/* Card 4: Selesai / Ditutup */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.34, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ y: -4, transition: { duration: 0.18 } }}
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md transition-shadow flex items-center justify-between"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Selesai / Ditutup
            </p>
            {isLoading ? (
              <Skeleton className="h-8 w-16 mt-1.5" />
            ) : (
              <p className="text-2xl font-bold text-slate-900 mt-1.5">
                {card4Value}
              </p>
            )}
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Selesai &amp; ditutup
            </span>
          </div>
          <div className="h-10 w-10 rounded-lg bg-[#CAF3E4] text-[#1B5040] flex items-center justify-center">
            <ShieldIcon size={20} />
          </div>
        </motion.div>
      </div>

      {/* Role Notice & Quick Access */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4"
      >
        <Heading level={3}>Kewenangan Akses Peran Anda</Heading>
        <Text variant="body" className="text-slate-600">
          {isSuperAdmin
            ? 'Sebagai SUPER_ADMIN, Anda memiliki hak penuh untuk verifikasi pengajuan, penugasan pekerjaan kepada tenaga ahli, pengelolaan katalog master data layanan dan OPD, serta monitoring audit trail.'
            : 'Sebagai Tenaga Ahli, menu navigasi Anda dibatasi hanya untuk pekerjaan yang ditugaskan kepada Anda, pencatatan artefak teknis siklus hidup, pengujian, pemeliharaan, serta komunikasi tiket.'}
        </Text>

        <div className="pt-2 flex flex-wrap gap-3">
          <Link to="/design-system">
            <Button variant="outline" size="sm">
              Lihat Design System Primitives
            </Button>
          </Link>
          <Link to="/applications">
            <Button variant="secondary" size="sm">
              Menuju Modul Permohonan
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}