import { Badge } from '../../components/ui';
import type { ApplicationStage, ApplicationStatus } from './useAdminApplications';

export function getStatusBadge(status: ApplicationStatus) {
  switch (status) {
    case 'SUBMITTED':
      return <Badge variant="neutral">Diajukan (Baru)</Badge>;
    case 'VERIFICATION':
      return <Badge variant="primary">Verifikasi Berkas</Badge>;
    case 'REVISION_REQUIRED':
      return <Badge variant="warning">Perlu Revisi OPD</Badge>;
    case 'APPROVED':
      return <Badge variant="success">Disetujui</Badge>;
    case 'REJECTED':
      return <Badge variant="danger">Ditolak</Badge>;
    case 'IN_PROGRESS':
      return <Badge variant="primary">Dalam Pengerjaan</Badge>;
    case 'COMPLETED':
      return <Badge variant="success">Pekerjaan Selesai</Badge>;
    case 'CLOSED':
      return <Badge variant="neutral">Ditutup</Badge>;
    case 'CANCELLED':
      return <Badge variant="neutral">Dibatalkan</Badge>;
    default:
      return <Badge variant="neutral">{status}</Badge>;
  }
}

export function getStageBadge(stage: ApplicationStage | null) {
  if (!stage) {
    return <span className="text-xs text-slate-400 italic">Belum dimulai</span>;
  }
  const stageLabels: Record<ApplicationStage, string> = {
    ANALYSIS: '1. Analisis',
    PLANNING: '2. Perencanaan',
    DESIGN: '3. Perancangan',
    IMPLEMENTATION: '4. Implementasi',
    TESTING: '5. Pengujian',
    MAINTENANCE: '6. Pemeliharaan',
    EVALUATION: '7. Evaluasi',
  };
  return (
    <Badge variant="info" className="text-[11px] font-mono">
      {stageLabels[stage] || stage}
    </Badge>
  );
}

export function formatDateTime(isoString: string | null | undefined): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return isoString;
  }
}

export function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return isoString;
  }
}
