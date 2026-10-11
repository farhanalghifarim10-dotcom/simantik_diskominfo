import { Navigate, useLocation } from 'react-router';
import type { ReactNode } from 'react';
import { useAuth } from './useAuth';
import type { AppRole } from '../../types/auth';
import { UnauthorizedPage } from '../../pages/UnauthorizedPage';
import { SimantikLogo, SpinnerIcon } from '../../components/ui';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: AppRole[];
}

export function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="flex flex-col items-center gap-4">
          <SimantikLogo size={48} />
          <div className="flex items-center gap-2.5 text-slate-700 font-medium text-sm">
            <SpinnerIcon size={18} className="text-slate-900" />
            <span>Memverifikasi otentikasi SIMANTIK...</span>
          </div>
          <span className="text-xs text-slate-500">
            Diskominfo Pemerintah Daerah Kabupaten Bandung
          </span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <UnauthorizedPage userRole={user.role} />;
  }

  return <>{children}</>;
}
