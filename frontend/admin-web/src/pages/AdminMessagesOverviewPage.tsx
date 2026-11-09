import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import {
  Badge,
  Button,
  CheckCircleIcon,
  EmptyState,
  ErrorState,
  Heading,
  Input,
  SearchIcon,
  Skeleton,
  Text,
  useToast,
} from '../components/ui';
import {
  MessageSquareIcon,
  UsersIcon,
} from '../components/layout/NavIcons';
import {
  useAdminApplications,
  type ApplicationListItem,
} from '../features/applications/useAdminApplications';
import {
  useAdminConsultations,
  useMarkConsultationRead,
  type ConsultationItem,
} from '../features/helpdesk/useAdminConsultations';
import {
  getStatusBadge,
  formatDate,
  formatDateTime,
} from '../features/applications/workflowHelpers';

export function AdminMessagesOverviewPage() {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'consultations' ? 'consultations' : 'tickets';
  const [activeTab, setActiveTab] = useState<'tickets' | 'consultations'>(initialTab);

  const [searchQuery, setSearchQuery] = useState('');
  const [consultationFilter, setConsultationFilter] = useState<'all' | 'unread' | 'read'>('all');

  const {
    data: appsData,
    isLoading: isAppsLoading,
    isError: isAppsError,
    error: appsError,
    refetch: refetchApps,
  } = useAdminApplications({
    page: 1,
    page_size: 50,
    search: activeTab === 'tickets' ? searchQuery : '',
  });

  const {
    data: consultationsData,
    isLoading: isConsultationsLoading,
    isError: isConsultationsError,
    error: consultationsError,
    refetch: refetchConsultations,
  } = useAdminConsultations();

  const markConsultationReadMutation = useMarkConsultationRead();

  const handleTabChange = (tab: 'tickets' | 'consultations') => {
    setActiveTab(tab);
    setSearchParams(tab === 'consultations' ? { tab: 'consultations' } : {});
  };

  const handleMarkConsultationRead = async (id: string) => {
    try {
      await markConsultationReadMutation.mutateAsync(id);
      toast({
        title: 'Status Diperbarui',
        message: 'Pesan konsultasi telah ditandai sebagai dibaca.',
        type: 'info',
      });
    } catch {
      toast({
        title: 'Gagal Memperbarui',
        message: 'Tidak dapat memperbarui status konsultasi.',
        type: 'danger',
      });
    }
  };

  const applications = useMemo(() => appsData?.items || [], [appsData]);
  const consultations = useMemo(() => consultationsData || [], [consultationsData]);

  const unreadConsultationsCount = useMemo(() => {
    return consultations.filter((c) => c.status === 'NEW' || !c.read_at).length;
  }, [consultations]);

  const filteredConsultations = useMemo(() => {
    let list = consultations;

    if (consultationFilter === 'unread') {
      list = list.filter((c) => c.status === 'NEW' || !c.read_at);
    } else if (consultationFilter === 'read') {
      list = list.filter((c) => c.status === 'READ' || Boolean(c.read_at));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.opd_name.toLowerCase().includes(q) ||
          c.sender_name.toLowerCase().includes(q) ||
          c.subject.toLowerCase().includes(q) ||
          c.message.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q),
      );
    }

    return list;
  }, [consultations, consultationFilter, searchQuery]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#CAF3E4] text-[#1B5040]">
              <MessageSquareIcon size={14} />
            </span>
            <span className="text-xs font-semibold text-[#1B5040] uppercase tracking-wider">
              Pusat Komunikasi & Helpdesk
            </span>
          </div>
          <Heading level={1}>Komunikasi & Pesan Layanan</Heading>
          <Text variant="muted" className="mt-1 max-w-2xl text-xs sm:text-sm">
            Kanal resmi komunikasi dua arah per tiket permohonan, serta kotak masuk konsultasi pra-pengajuan dari narahubung OPD melalui Helpdesk.
          </Text>
        </div>

        <Link to="/applications">
          <Button variant="outline" size="sm">
            Daftar Permohonan
          </Button>
        </Link>
      </div>

      <div className="flex border-b border-slate-200 gap-4">
        <button
          type="button"
          onClick={() => handleTabChange('tickets')}
          className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'tickets'
              ? 'border-[#1B5040] text-[#1B5040]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <MessageSquareIcon size={16} />
          Diskusi Tiket Permohonan
          <span className="bg-slate-100 text-slate-700 text-[11px] font-mono px-2 py-0.5 rounded-full font-normal">
            {appsData?.total ?? 0}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('consultations')}
          className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'consultations'
              ? 'border-[#1B5040] text-[#1B5040]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <UsersIcon size={16} />
          Konsultasi OPD (Helpdesk)
          {unreadConsultationsCount > 0 ? (
            <Badge variant="primary" className="text-[10px] px-1.5 py-0.5">
              {unreadConsultationsCount} Baru
            </Badge>
          ) : (
            <span className="bg-slate-100 text-slate-700 text-[11px] font-mono px-2 py-0.5 rounded-full font-normal">
              {consultations.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'tickets' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <SearchIcon size={16} />
                </span>
                <Input
                  placeholder="Cari nomor tiket, judul permohonan, atau perangkat daerah..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>

              <span className="text-xs text-slate-500">
                Total: <strong>{appsData?.total ?? 0}</strong> tiket aktif
              </span>
            </div>
          </div>

          {isAppsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full rounded-2xl" />
              <Skeleton className="h-20 w-full rounded-2xl" />
              <Skeleton className="h-20 w-full rounded-2xl" />
            </div>
          ) : isAppsError ? (
            <ErrorState
              title="Gagal Memuat Daftar Diskusi"
              description={appsError?.message || 'Terjadi gangguan saat mengambil data tiket.'}
              onRetry={() => refetchApps()}
            />
          ) : applications.length === 0 ? (
            <EmptyState
              icon={<MessageSquareIcon size={40} className="text-slate-400" />}
              title="Tidak Ada Percakapan Tiket"
              description={
                searchQuery
                  ? `Tidak ditemukan tiket yang cocok dengan kata kunci "${searchQuery}".`
                  : 'Belum ada tiket permohonan yang aktif untuk diskusi.'
              }
            />
          ) : (
            <div className="space-y-3">
              {applications.map((app: ApplicationListItem) => {
                return (
                  <div
                    key={app.id}
                    className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-[#98F7D9] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                          {app.ticket_number}
                        </span>
                        {getStatusBadge(app.current_status)}
                        <span className="text-xs text-slate-400">• Diajukan {formatDate(app.submitted_at)}</span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 leading-snug">
                        {app.title}
                      </h3>

                      <p className="text-xs text-slate-500">
                        Instansi: <strong>{app.applicant.opd_name}</strong> • PIC: {app.applicant.full_name} ({app.applicant.email})
                      </p>
                    </div>

                    <div className="text-right">
                      <Link to={`/applications/${app.id}?tab=messages`}>
                        <Button variant="primary" size="sm" className="font-semibold text-xs whitespace-nowrap">
                          Buka Ruang Diskusi Tiket →
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'consultations' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <SearchIcon size={16} />
                </span>
                <Input
                  placeholder="Cari OPD, nama PIC, subjek, atau kata kunci pesan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>

              <div className="flex items-center gap-2 text-xs">
                <Button
                  variant={consultationFilter === 'all' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setConsultationFilter('all')}
                  className="text-xs"
                >
                  Semua ({consultations.length})
                </Button>
                <Button
                  variant={consultationFilter === 'unread' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setConsultationFilter('unread')}
                  className="text-xs"
                >
                  Belum Dibaca ({unreadConsultationsCount})
                </Button>
                <Button
                  variant={consultationFilter === 'read' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setConsultationFilter('read')}
                  className="text-xs"
                >
                  Sudah Dibaca ({consultations.length - unreadConsultationsCount})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchConsultations()}
                  className="text-xs"
                >
                  Segarkan
                </Button>
              </div>
            </div>
          </div>

          {isConsultationsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-28 w-full rounded-2xl" />
              <Skeleton className="h-28 w-full rounded-2xl" />
              <Skeleton className="h-28 w-full rounded-2xl" />
            </div>
          ) : isConsultationsError ? (
            <ErrorState
              title="Gagal Memuat Kotak Masuk Konsultasi"
              description={consultationsError?.message || 'Terjadi gangguan saat mengambil data konsultasi.'}
              onRetry={() => refetchConsultations()}
            />
          ) : filteredConsultations.length === 0 ? (
            <EmptyState
              icon={<UsersIcon size={40} className="text-slate-400" />}
              title="Tidak Ada Pesan Konsultasi"
              description={
                searchQuery
                  ? `Tidak ada pesan yang cocok dengan kata kunci "${searchQuery}".`
                  : consultationFilter === 'unread'
                  ? 'Seluruh pertanyaan konsultasi Helpdesk telah dibaca.'
                  : 'Belum ada pertanyaan konsultasi yang masuk dari portal publik.'
              }
            />
          ) : (
            <div className="space-y-4">
              {filteredConsultations.map((item: ConsultationItem) => {
                const isUnread = item.status === 'NEW' || !item.read_at;
                const cleanPhone = item.phone.replace(/[^0-9]/g, '');
                const waPhone = cleanPhone.startsWith('0') ? `62${cleanPhone.slice(1)}` : cleanPhone;

                return (
                  <div
                    key={item.id}
                    className={`p-6 rounded-2xl border transition-all space-y-4 ${
                      isUnread
                        ? 'bg-[#CAF3E4]/30 border-[#98F7D9] shadow-xs'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="primary" className="text-xs font-semibold">
                          {item.opd_name}
                        </Badge>
                        {isUnread ? (
                          <Badge variant="warning" className="text-[10px]">
                            Baru / Belum Dibaca
                          </Badge>
                        ) : (
                          <Badge variant="neutral" className="text-[10px]">
                            Sudah Dibaca
                          </Badge>
                        )}
                        <span className="text-xs text-slate-400">
                          {formatDateTime(item.created_at)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {isUnread && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMarkConsultationRead(item.id)}
                            disabled={markConsultationReadMutation.isPending}
                            className="text-xs text-[#1B5040] hover:text-[#000408] border-[#98F7D9]"
                          >
                            <CheckCircleIcon size={14} className="mr-1" />
                            Tandai Dibaca
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-base font-bold text-slate-900">
                        {item.subject}
                      </h3>
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs sm:text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {item.message}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 text-xs text-slate-600">
                      <div>
                        Narahubung (PIC): <strong>{item.sender_name}</strong> • Pos-el: <span className="font-mono">{item.email}</span> • Telepon/WA: <span className="font-mono">{item.phone}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <a
                          href={`mailto:${item.email}?subject=Tanggapan Konsultasi SPBE: ${encodeURIComponent(item.subject)}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors"
                        >
                          Balas via Pos-el
                        </a>
                        {cleanPhone.length >= 8 && (
                          <a
                            href={`https://wa.me/${waPhone}?text=Halo%20${encodeURIComponent(item.sender_name)},%20kami%20dari%20Tim%20Helpdesk%20Diskominfo%20Kabupaten%20Bandung%20menindaklanjuti%20pesan%20konsultasi%20Anda.`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors"
                          >
                            Hubungi via WhatsApp
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
