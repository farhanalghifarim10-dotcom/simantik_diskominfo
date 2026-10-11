import { Link } from 'react-router';
import { Badge, Button, Heading, Text } from '../components/ui';
import type { AppRole } from '../types/auth';

interface ModulePlaceholderProps {
  title: string;
  description: string;
  phase: string;
  allowedRoles: AppRole[];
}

export function ModulePlaceholderPage({
  title,
  description,
  phase,
  allowedRoles,
}: ModulePlaceholderProps) {
  const isSuperAdminOnly =
    allowedRoles.length === 1 && allowedRoles[0] === 'SUPER_ADMIN';

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={isSuperAdminOnly ? 'primary' : 'secondary'} size="sm">
                {isSuperAdminOnly ? 'SUPER_ADMIN Saja' : 'SUPER_ADMIN & TECHNICIAN'}
              </Badge>
              <span className="text-xs font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded">
                Target: {phase}
              </span>
            </div>
            <Heading level={2}>{title}</Heading>
            <Text variant="muted" className="mt-1">
              {description}
            </Text>
          </div>

          <Link to="/">
            <Button variant="outline" size="sm">
              Kembali ke Dashboard
            </Button>
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 font-bold">
          TI
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            Fondasi Admin Shell dan otorisasi RBAC untuk modul ini telah aktif. Implementasi fungsional vertikal slice modul ini dijadwalkan pada {phase}.
          </p>
        </div>
      </div>
    </div>
  );
}
