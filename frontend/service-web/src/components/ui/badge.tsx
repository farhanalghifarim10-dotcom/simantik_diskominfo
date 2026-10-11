import type { HTMLAttributes, ReactNode } from 'react';

export type BadgeVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'outline';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  hasDot?: boolean;
  children: ReactNode;
}

export function Badge({
  variant = 'default',
  size = 'md',
  hasDot = false,
  className = '',
  children,
  ...props
}: BadgeProps) {
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[11px]',
    md: 'px-2.5 py-0.5 text-xs',
  };

  const variantStyles: Record<BadgeVariant, { container: string; dot: string }> = {
    default: {
      container: 'bg-slate-100 text-slate-800 border-slate-200',
      dot: 'bg-slate-500',
    },
    primary: {
      container: 'bg-slate-900 text-white border-transparent',
      dot: 'bg-white',
    },
    secondary: {
      container: 'bg-sky-50 text-sky-800 border-sky-200',
      dot: 'bg-sky-600',
    },
    success: {
      container: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      dot: 'bg-emerald-600',
    },
    warning: {
      container: 'bg-amber-50 text-amber-800 border-amber-200',
      dot: 'bg-amber-600',
    },
    danger: {
      container: 'bg-red-50 text-red-800 border-red-200',
      dot: 'bg-red-600',
    },
    info: {
      container: 'bg-blue-50 text-blue-800 border-blue-200',
      dot: 'bg-blue-600',
    },
    neutral: {
      container: 'bg-slate-50 text-slate-600 border-slate-200',
      dot: 'bg-slate-400',
    },
    outline: {
      container: 'bg-transparent text-slate-700 border-slate-300',
      dot: 'bg-slate-400',
    },
  };

  const { container, dot } = variantStyles[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border tracking-normal select-none ${sizeStyles[size]} ${container} ${className}`}
      {...props}
    >
      {hasDot && (
        <span
          className={`h-1.5 w-1.5 rounded-full shrink-0 ${dot}`}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}

/**
 * Pemetaan Status Operasional SIMANTIK
 */
export type ApplicationStatus =
  | 'SUBMITTED'
  | 'VERIFICATION'
  | 'REVISION_REQUIRED'
  | 'APPROVED'
  | 'REJECTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CLOSED'
  | 'CANCELLED';

const statusConfig: Record<
  ApplicationStatus,
  { label: string; variant: BadgeVariant }
> = {
  SUBMITTED: { label: 'Diajukan', variant: 'neutral' },
  VERIFICATION: { label: 'Verifikasi', variant: 'info' },
  REVISION_REQUIRED: { label: 'Perlu Revisi', variant: 'warning' },
  APPROVED: { label: 'Disetujui', variant: 'success' },
  REJECTED: { label: 'Ditolak', variant: 'danger' },
  IN_PROGRESS: { label: 'Dalam Pengerjaan', variant: 'secondary' },
  COMPLETED: { label: 'Selesai', variant: 'success' },
  CLOSED: { label: 'Ditutup', variant: 'default' },
  CANCELLED: { label: 'Dibatalkan', variant: 'danger' },
};

export function StatusBadge({
  status,
  size = 'md',
  className = '',
}: {
  status: ApplicationStatus | string;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const config = statusConfig[status as ApplicationStatus] ?? {
    label: status,
    variant: 'neutral' as BadgeVariant,
  };

  return (
    <Badge variant={config.variant} size={size} hasDot className={className}>
      {config.label}
    </Badge>
  );
}

/**
 * Pemetaan Tahapan Lifecycle Aplikasi (Permenkomdigi No. 6 Tahun 2025)
 */
export type ApplicationStage =
  | 'ANALYSIS'
  | 'PLANNING'
  | 'DESIGN'
  | 'IMPLEMENTATION'
  | 'TESTING'
  | 'MAINTENANCE'
  | 'EVALUATION';

const stageConfig: Record<
  ApplicationStage,
  { label: string; variant: BadgeVariant }
> = {
  ANALYSIS: { label: 'Analisis Kebutuhan', variant: 'info' },
  PLANNING: { label: 'Perencanaan', variant: 'secondary' },
  DESIGN: { label: 'Rancang Bangun', variant: 'primary' },
  IMPLEMENTATION: { label: 'Implementasi', variant: 'secondary' },
  TESTING: { label: 'Uji Kelaikan', variant: 'warning' },
  MAINTENANCE: { label: 'Pemeliharaan', variant: 'info' },
  EVALUATION: { label: 'Evaluasi', variant: 'success' },
};

export function StageBadge({
  stage,
  size = 'md',
  className = '',
}: {
  stage?: ApplicationStage | string | null;
  size?: 'sm' | 'md';
  className?: string;
}) {
  if (!stage) {
    return (
      <Badge variant="neutral" size={size} className={className}>
        Belum Masuk Lifecycle
      </Badge>
    );
  }

  const config = stageConfig[stage as ApplicationStage] ?? {
    label: stage,
    variant: 'neutral' as BadgeVariant,
  };

  return (
    <Badge variant={config.variant} size={size} className={className}>
      {config.label}
    </Badge>
  );
}
