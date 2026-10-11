import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  Badge,
  Button,
  CheckCircleIcon,
  EmptyState,
  ErrorState,
  Heading,
  Skeleton,
  Text,
  useToast,
} from '../components/ui';
import { BellIcon } from '../components/layout/NavIcons';
import { formatDateTime } from '../features/applications/workflowHelpers';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '../features/notifications/useNotifications';

export function AdminNotificationsPage() {
  const { toast } = useToast();
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useNotifications();

  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();

  const handleMarkAsRead = async (id: string) => {
    try {
      await markReadMutation.mutateAsync(id);
      toast({
        title: 'Notifikasi Dibaca',
        message: 'Status notifikasi berhasil diperbarui.',
        type: 'info',
      });
    } catch {
      toast({
        title: 'Gagal Memperbarui',
        message: 'Tidak dapat memperbarui status notifikasi.',
        type: 'danger',
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllReadMutation.mutateAsync();
      toast({
        title: 'Semua Notifikasi Dibaca',
        message: 'Seluruh notifikasi telah ditandai sebagai dibaca.',
        type: 'info',
      });
    } catch {
      toast({
        title: 'Gagal Memperbarui',
        message: 'Tidak dapat memperbarui status seluruh notifikasi.',
        type: 'danger',
      });
    }
  };

  const notifications = data || [];

  const filteredNotifications = useMemo(() => {
    const list = data || [];
    if (filter === 'unread') return list.filter((n) => !n.read_at);
    if (filter === 'read') return list.filter((n) => Boolean(n.read_at));
    return list;
  }, [data, filter]);

  const unreadCount = useMemo(() => {
    return (data || []).filter((n) => !n.read_at).length;
  }, [data]);

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'APPLICATION_ASSIGNED':
        return { label: 'Penugasan Baru', variant: 'primary' as const };
      case 'APPLICATION_STATUS_CHANGED':
        return { label: 'Status Berubah', variant: 'success' as const };
      case 'APPLICATION_STAGE_CHANGED':
        return { label: 'Tahapan Siklus', variant: 'secondary' as const };
      case 'REVISION_REQUIRED':
        return { label: 'Perlu Revisi', variant: 'warning' as const };
      case 'NEW_MESSAGE':
        return { label: 'Pesan Baru', variant: 'info' as const };
      case 'TEST_RESULT_UPDATED':
        return { label: 'Uji Kelaikan', variant: 'primary' as const };
      default:
        return { label: type, variant: 'neutral' as const };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-sky-50 text-sky-700">
              <BellIcon size={14} />
            </span>
            <span className="text-xs font-semibold text-sky-700 uppercase tracking-wider">
              Pusat Informasi Internal
            </span>
          </div>
          <Heading level={1}>Pemberitahuan Sistem</Heading>
          <Text variant="muted" className="mt-1 max-w-2xl text-xs sm:text-sm">
            Notifikasi permohonan baru, mutasi status, penugasan teknisi, pesan masuk, dan tindak lanjut pengujian kelaikan.
          </Text>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Badge variant="primary" className="text-xs">
              {unreadCount} Belum Dibaca
            </Badge>
          )}
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={markAllReadMutation.isPending}
              className="text-xs font-medium"
            >
              {markAllReadMutation.isPending ? 'Memproses...' : 'Tandai Semua Dibaca'}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Segarkan
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
        <div className="flex items-center gap-2 text-xs">
          <Button
            variant={filter === 'all' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setFilter('all')}
            className="text-xs font-semibold"
          >
            Semua ({notifications.length})
          </Button>
          <Button
            variant={filter === 'unread' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setFilter('unread')}
            className="text-xs font-semibold"
          >
            Belum Dibaca ({unreadCount})
          </Button>
          <Button
            variant={filter === 'read' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setFilter('read')}
            className="text-xs font-semibold"
          >
            Sudah Dibaca ({notifications.length - unreadCount})
          </Button>
        </div>
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
      ) : isError ? (
        <ErrorState
          title="Gagal Memuat Notifikasi"
          description={error?.message || 'Terjadi gangguan saat mengambil data notifikasi.'}
          onRetry={() => refetch()}
        />
      ) : filteredNotifications.length === 0 ? (
        <EmptyState
          icon={<BellIcon size={40} className="text-slate-400" />}
          title={
            filter === 'unread'
              ? 'Tidak Ada Notifikasi Baru'
              : 'Belum Ada Pemberitahuan'
          }
          description={
            filter === 'unread'
              ? 'Seluruh pemberitahuan sistem telah Anda baca.'
              : 'Belum ada notifikasi yang ditujukan untuk akun Anda saat ini.'
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((n) => {
            const isUnread = !n.read_at;
            const badge = getTypeBadge(n.type);

            return (
              <div
                key={n.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-4 ${
                  isUnread
                    ? 'bg-blue-50/40 border-blue-200 shadow-xs'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={badge.variant} className="text-[10px]">
                      {badge.label}
                    </Badge>
                    {n.ticket_number && (
                      <span className="text-[11px] font-mono font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        #{n.ticket_number}
                      </span>
                    )}
                    {isUnread && (
                      <span className="h-2 w-2 rounded-full bg-blue-600 ring-2 ring-blue-100" />
                    )}
                    <span className="text-xs text-slate-400">
                      {formatDateTime(n.created_at)}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 leading-snug">
                    {n.title}
                  </h3>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {n.body}
                  </p>
                </div>

                <div className="flex sm:flex-col items-end gap-2 pt-2 sm:pt-0">
                  {n.application_id && (
                    <Link to={`/applications/${n.application_id}`}>
                      <Button variant="outline" size="sm" className="text-xs whitespace-nowrap">
                        Lihat Tiket →
                      </Button>
                    </Link>
                  )}

                  {!n.application_id && n.title.includes('Konsultasi OPD') && (
                    <Link to="/messages?tab=consultations">
                      <Button variant="outline" size="sm" className="text-xs whitespace-nowrap">
                        Buka Kotak Masuk →
                      </Button>
                    </Link>
                  )}

                  {isUnread && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMarkAsRead(n.id)}
                      disabled={markReadMutation.isPending}
                      className="text-xs text-slate-500 hover:text-slate-900"
                    >
                      <CheckCircleIcon size={12} className="mr-1" />
                      Tandai Dibaca
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
