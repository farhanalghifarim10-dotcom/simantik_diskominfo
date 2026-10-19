import { useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import { motion } from 'motion/react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ToastProvider } from '../ui';

export function AdminLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <ToastProvider>
      <div className="flex h-screen w-full overflow-hidden bg-slate-50">
        {/* Sidebar */}
        <Sidebar
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
          isMobileOpen={isMobileOpen}
          onCloseMobile={() => setIsMobileOpen(false)}
        />

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header */}
          <Header onOpenMobile={() => setIsMobileOpen(true)} />

          {/* Page Body with Motion Page Transitions */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="mx-auto max-w-7xl"
            >
              <Outlet />
            </motion.div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
