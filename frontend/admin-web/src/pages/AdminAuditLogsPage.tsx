import { useState } from 'react';
import {
  Badge,
  Button,
  Dialog,
  EmptyState,
  ErrorState,
  Input,
  Select,
  Skeleton,
} from '../components/ui';
import {
  useAdminAuditLogs,
  type AuditLogItem,
} from '../features/audit/useAdminAudit';

export function AdminAuditLogsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [entityType, setEntityType] = useState('');

  const {
    data: auditData,
    isLoading,
    isError,
    error,
    refetch,
  } = useAdminAuditLogs({
    page,
    limit: 15,
    search: search.trim() || undefined,
    entity_type: entityType || undefined,
  });

  const [inspectLog, setInspectLog] = useState<AuditLogItem | null>(null);

  const getActionBadgeVariant = (action: string): 'primary' | 'success' | 'warning' | 'danger' | 'neutral' => {
    if (action.includes('CREATED') || action.includes('ACTIVATED')) return 'success';
    if (action.includes('DEACTIVATED') || action.includes('DELETED')) return 'danger';
    if (action.includes('UPDATED') || action.includes('ASSIGNED')) return 'primary';
    if (action.includes('REVISION')) return 'warning';
    return 'neutral';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Jejak Audit Sistem (Audit Trail)
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Rekam jejak mutasi data master, tindakan administratif pimpinan, dan riwayat operasional internal SIMANTIK.
          </p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="w-full md:w-80">
          <Input
            placeholder="Cari aksi, entitas, atau nama aktor..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Modul / Entitas:
          </span>
          <Select
            value={entityType}
            onChange={(e) => {
              setEntityType(e.target.value);
              setPage(1);
            }}
            className="text-xs"
          >
            <option value="">Semua Modul</option>
            <option value="opd_units">Perangkat Daerah (OPD)</option>
            <option value="services">Layanan TI</option>
            <option value="service_requirements">Persyaratan Layanan</option>
            <option value="profiles">Personel Tenaga Ahli</option>
            <option value="assignments">Penugasan Kerja</option>
            <option value="applications">Permohonan Aplikasi</option>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : isError ? (
        <ErrorState
          title="Gagal Memuat Jejak Audit"
          description={error?.message || 'Terjadi gangguan saat mengambil data.'}
          onRetry={refetch}
        />
      ) : !auditData?.data || auditData.data.length === 0 ? (
        <EmptyState
          title="Tidak Ada Catatan Audit"
          description={
            search || entityType
              ? 'Tidak ditemukan entri audit log sesuai kriteria filter.'
              : 'Belum ada catatan mutasi atau log audit pada sistem.'
          }
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="px-5 py-3.5">Waktu Kejadian</th>
                  <th className="px-5 py-3.5">Aksi / Operasi</th>
                  <th className="px-5 py-3.5">Modul Entitas</th>
                  <th className="px-5 py-3.5">Pelaksana / Aktor</th>
                  <th className="px-5 py-3.5 text-right">Rincian Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {auditData.data.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={getActionBadgeVariant(log.action)}>
                        {log.action}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-700">
                      <span className="font-semibold">{log.entity_type}</span>
                      {log.entity_id && (
                        <span className="block text-[11px] text-slate-400 truncate max-w-xs">
                          ID: {log.entity_id}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-semibold text-slate-900 block text-xs">
                        {log.actor_name || 'Administrator'}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {log.actor_role || 'SUPER_ADMIN'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setInspectLog(log)}
                        disabled={!log.old_data && !log.new_data}
                      >
                        Lihat Data
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 text-xs text-slate-600 flex justify-between items-center">
            <span>
              Halaman <strong>{auditData.pagination.page}</strong> dari{' '}
              <strong>{auditData.pagination.total_pages || 1}</strong> (Total{' '}
              <strong>{auditData.pagination.total}</strong> rekaman)
            </span>
            <div className="space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= (auditData.pagination.total_pages || 1)}
              >
                Selanjutnya
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog
        isOpen={Boolean(inspectLog)}
        onClose={() => setInspectLog(null)}
        title={`Rincian Mutasi: ${inspectLog?.action || ''}`}
        description={`Waktu: ${
          inspectLog ? new Date(inspectLog.created_at).toLocaleString('id-ID') : ''
        } | Modul: ${inspectLog?.entity_type || ''}`}
      >
        <div className="space-y-4 pt-2 text-xs">
          {inspectLog?.old_data && (
            <div>
              <span className="font-bold text-slate-700 block mb-1">
                Data Sebelum Perubahan (Old Data):
              </span>
              <pre className="p-3 bg-red-50 text-red-900 rounded-lg overflow-x-auto font-mono text-[11px] max-h-48 border border-red-200">
                {JSON.stringify(inspectLog.old_data, null, 2)}
              </pre>
            </div>
          )}

          {inspectLog?.new_data && (
            <div>
              <span className="font-bold text-slate-700 block mb-1">
                Data Setelah Perubahan (New Data):
              </span>
              <pre className="p-3 bg-emerald-50 text-emerald-900 rounded-lg overflow-x-auto font-mono text-[11px] max-h-48 border border-emerald-200">
                {JSON.stringify(inspectLog.new_data, null, 2)}
              </pre>
            </div>
          )}

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setInspectLog(null)}
            >
              Tutup
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
