import { Link, useLocation } from 'react-router';
import { useAuth } from '../../features/auth/useAuth';
import { navigationItems } from './navigation';
import { useUnreadNotificationsCount } from '../../features/notifications/useNotifications';
import {
  Badge,
  ChevronRightIcon,
  Dropdown,
  DropdownDivider,
  DropdownItem,
  LogOutIcon,
  MenuIcon,
  UserIcon,
} from '../ui';
import { BellIcon } from './NavIcons';

interface HeaderProps {
  onOpenMobile: () => void;
}

export function Header({ onOpenMobile }: HeaderProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { data: unreadCount = 0 } = useUnreadNotificationsCount();

  if (!user) return null;

  const currentNav = navigationItems.find((i) =>
    i.href === '/' ? location.pathname === '/' : location.pathname.startsWith(i.href),
  );

  return (
    <header className="sticky top-0 z-10 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 sm:px-6 backdrop-blur-xs">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobile}
          className="md:hidden rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
          aria-label="Buka menu navigasi"
        >
          <MenuIcon size={20} />
        </button>

        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs">
          <Link
            to="/"
            className="text-slate-500 hover:text-slate-900 transition-colors font-medium"
          >
            SIMANTIK
          </Link>

          {location.pathname !== '/' && (
            <>
              <ChevronRightIcon size={12} className="text-slate-400" />
              <span className="font-semibold text-slate-900 truncate">
                {currentNav?.title ?? 'Halaman'}
              </span>
            </>
          )}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <Link
          to="/notifications"
          aria-label={
            unreadCount > 0
              ? `${unreadCount} pemberitahuan belum dibaca`
              : 'Pemberitahuan Sistem'
          }
          className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
        >
          <BellIcon size={18} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#1B5040] px-1 text-[10px] font-bold text-white ring-2 ring-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>

        <Dropdown
          align="right"
          trigger={
            <div className="flex items-center gap-2.5 rounded-lg p-1.5 hover:bg-slate-50 transition-colors cursor-pointer select-none">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1B5040] font-semibold text-xs text-white">
                {user.fullName.charAt(0).toUpperCase()}
              </div>

              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-semibold text-slate-900 leading-tight">
                  {user.fullName}
                </span>
                <span className="text-[10px] text-slate-500 font-medium leading-tight">
                  {user.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Tenaga Ahli'}
                </span>
              </div>
            </div>
          }
        >
          <div className="px-3 py-2 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-900 truncate">
              {user.fullName}
            </p>
            <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
            <div className="mt-1.5">
              <Badge
                variant={user.role === 'SUPER_ADMIN' ? 'primary' : 'secondary'}
                size="sm"
              >
                {user.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Tenaga Ahli'}
              </Badge>
            </div>
          </div>

          <Link to="/">
            <DropdownItem icon={<UserIcon size={14} />}>
              Profil Saya
            </DropdownItem>
          </Link>

          <DropdownDivider />

          <DropdownItem
            icon={<LogOutIcon size={14} />}
            destructive
            onClick={() => logout()}
          >
            Keluar Sistem
          </DropdownItem>
        </Dropdown>
      </div>
    </header>
  );
}
