import { Route, Routes } from 'react-router';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { DesignSystemShowcasePage } from '../pages/DesignSystemShowcasePage';
import { UnauthorizedPage } from '../pages/UnauthorizedPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { AdminServicesPage } from '../pages/AdminServicesPage';
import { AdminApplicationsListPage } from '../pages/AdminApplicationsListPage';
import { AdminApplicationDetailPage } from '../pages/AdminApplicationDetailPage';
import { AdminAssignmentsOverviewPage } from '../pages/AdminAssignmentsOverviewPage';
import { TechnicianMyWorkPage } from '../pages/TechnicianMyWorkPage';
import { ProtectedRoute } from '../features/auth/ProtectedRoute';
import { AdminLayout } from '../components/layout/AdminLayout';
import { AdminOpdPage } from '../pages/AdminOpdPage';
import { AdminTechniciansPage } from '../pages/AdminTechniciansPage';
import { AdminAuditLogsPage } from '../pages/AdminAuditLogsPage';
import { AdminLifecycleOverviewPage } from '../pages/AdminLifecycleOverviewPage';
import { AdminMessagesOverviewPage } from '../pages/AdminMessagesOverviewPage';
import { AdminNotificationsPage } from '../pages/AdminNotificationsPage';

export function AppRouter() {
  return (
    <Routes>
      {/* Public Auth & Design System Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="/design-system" element={<DesignSystemShowcasePage />} />

      {/* Protected Admin Shell Layout */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        {/* Common Dashboard (SUPER_ADMIN & TECHNICIAN) */}
        <Route index element={<DashboardPage />} />

        {/* Permohonan Layanan */}
        <Route path="applications" element={<AdminApplicationsListPage />} />
        <Route path="applications/:id" element={<AdminApplicationDetailPage />} />

        {/* Penugasan Teknisi (Khusus SUPER_ADMIN) */}
        <Route
          path="assignments"
          element={
            <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
              <AdminAssignmentsOverviewPage />
            </ProtectedRoute>
          }
        />

        {/* Lembar Kerja Teknisi / My Work (Khusus TECHNICIAN & SUPER_ADMIN) */}
        <Route
          path="my-work"
          element={
            <ProtectedRoute allowedRoles={['TECHNICIAN', 'SUPER_ADMIN']}>
              <TechnicianMyWorkPage />
            </ProtectedRoute>
          }
        />

        {/* Siklus Hidup TI (SUPER_ADMIN & TECHNICIAN) */}
        <Route
          path="lifecycle"
          element={
            <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'TECHNICIAN']}>
              <AdminLifecycleOverviewPage />
            </ProtectedRoute>
          }
        />

        {/* Komunikasi & Pesan */}
        <Route
          path="messages"
          element={
            <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'TECHNICIAN']}>
              <AdminMessagesOverviewPage />
            </ProtectedRoute>
          }
        />

        {/* Notifikasi */}
        <Route
          path="notifications"
          element={
            <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'TECHNICIAN']}>
              <AdminNotificationsPage />
            </ProtectedRoute>
          }
        />

        {/* Master Layanan TI (Khusus SUPER_ADMIN) */}
        <Route
          path="master/services"
          element={
            <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
              <AdminServicesPage />
            </ProtectedRoute>
          }
        />

        {/* Master Unit OPD (Khusus SUPER_ADMIN) */}
        <Route
          path="master/opd"
          element={
            <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
              <AdminOpdPage />
            </ProtectedRoute>
          }
        />

        {/* Manajemen Teknisi (Khusus SUPER_ADMIN) */}
        <Route
          path="technicians"
          element={
            <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
              <AdminTechniciansPage />
            </ProtectedRoute>
          }
        />

        {/* Jejak Audit (Khusus SUPER_ADMIN) */}
        <Route
          path="audit"
          element={
            <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
              <AdminAuditLogsPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* 404 Catch-All */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}