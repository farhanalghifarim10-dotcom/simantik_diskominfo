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
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="/design-system" element={<DesignSystemShowcasePage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />

        <Route path="applications" element={<AdminApplicationsListPage />} />
        <Route path="applications/:id" element={<AdminApplicationDetailPage />} />

        <Route
          path="assignments"
          element={
            <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
              <AdminAssignmentsOverviewPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="my-work"
          element={
            <ProtectedRoute allowedRoles={['TECHNICIAN', 'SUPER_ADMIN']}>
              <TechnicianMyWorkPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="lifecycle"
          element={
            <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'TECHNICIAN']}>
              <AdminLifecycleOverviewPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="messages"
          element={
            <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'TECHNICIAN']}>
              <AdminMessagesOverviewPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="notifications"
          element={
            <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'TECHNICIAN']}>
              <AdminNotificationsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="master/services"
          element={
            <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
              <AdminServicesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="master/opd"
          element={
            <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
              <AdminOpdPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="technicians"
          element={
            <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
              <AdminTechniciansPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="audit"
          element={
            <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
              <AdminAuditLogsPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}