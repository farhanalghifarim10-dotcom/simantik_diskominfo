import { Link, useLocation } from 'react-router';
import { useAuth } from '../../features/auth/useAuth';
import { navigationItems, type NavItem } from './navigation';
import {
  BellIcon,
  BuildingIcon,
  HomeIcon,
  LayersIcon,
  MessageSquareIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  ServerIcon,
  UserCheckIcon,
  UsersIcon,
} from './NavIcons';
import {
  Badge,
  FileTextIcon,
  LogOutIcon,
  LogoHierarchy,
  ShieldIcon,
  Tooltip,
  XIcon,
} from '../ui';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const { user, logout } = useAuth();
  const location = useLocation();

  if (!user) return null;

  // Filter navigation by role
  const filteredNav = navigationItems.filter((item) =>
    item.allowedRoles.includes(user.role),
  );

  const getIcon = (name: string, size = 18) => {
    switch (name) {
      case 'home':
        return <HomeIcon size={size} />;
      case 'file-text':
        return <FileTextIcon size={size} />;
      case 'users':
        return <UsersIcon size={size} />;
      case 'layers':
        return <LayersIcon size={size} />;
      case 'message-square':
        return <MessageSquareIcon size={size} />;
      case 'bell':
        return <BellIcon size={size} />;
      case 'server':
        return <ServerIcon size={size} />;
      case 'building':
        return <BuildingIcon size={size} />;
      case 'user-check':
        return <UserCheckIcon size={size} />;
      case 'shield':
        return <ShieldIcon size={size} />;
      default:
        return <FileTextIcon size={size} />;
    }
  };

  const renderNavSection = (items: NavItem[], sectionTitle?: string) => {
    if (items.length === 0) return null;

    return (
      <div className="space-y-1">
        {sectionTitle && !isCollapsed && (
          <p className="px-3 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {sectionTitle}
          </p>
        )}
        {items.map((item) => {
          const isActive =
            item.href === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.href);

          const linkContent = (
            <Link
              key={item.href}
              to={item.href}
              onClick={onCloseMobile}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors select-none ${
                isActive
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              } ${isCollapsed ? 'justify-center px-2' : ''}`}
            >
              <span className={`shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`}>
                {getIcon(item.iconName)}
              </span>

              {!isCollapsed && (
                <span className="truncate flex-1 text-left">{item.title}</span>
              )}

              {!isCollapsed && item.badge && (
                <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-800">
                  {item.badge}
                </span>
              )}
            </Link>
          );

          if (isCollapsed) {
            return (
              <Tooltip key={item.href} content={item.title} position="right">
                {linkContent}
              </Tooltip>
            );
          }

          return linkContent;
        })}
      </div>
    );
  };

  const mainItems = filteredNav.filter((i) => i.section === 'main');
  const opsItems = filteredNav.filter((i) => i.section === 'operations');
  const adminItems = filteredNav.filter((i) => i.section === 'administration');

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between overflow-y-auto p-4 scrollbar-none">
      <div className="space-y-6">
        {/* Header Logo */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <Link to="/" onClick={onCloseMobile} className="inline-block">
            {isCollapsed ? (
              <LogoHierarchy layout="compact" />
            ) : (
              <LogoHierarchy layout="compact" />
            )}
          </Link>

          {/* Mobile close button */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="md:hidden rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
            aria-label="Tutup navigasi mobile"
          >
            <XIcon size={18} />
          </button>
        </div>

        {/* User Role Banner */}
        {!isCollapsed && (
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 flex items-center justify-between">
            <div className="flex flex-col truncate pr-2">
              <span className="text-xs font-bold text-slate-900 truncate">
                {user.fullName}
              </span>
              <span className="text-[11px] text-slate-500 truncate">
                {user.email}
              </span>
            </div>
            <Badge
              variant={user.role === 'SUPER_ADMIN' ? 'primary' : 'secondary'}
              size="sm"
            >
              {user.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Teknisi'}
            </Badge>
          </div>
        )}

        {/* Nav Sections */}
        <nav className="space-y-4">
          {renderNavSection(mainItems, 'Menu Utama')}
          {renderNavSection(opsItems, 'Operasional & Tiket')}
          {renderNavSection(adminItems, 'Administrasi')}
        </nav>
      </div>

      {/* Footer & Logout */}
      <div className="pt-4 border-t border-slate-100 space-y-2">
        <button
          type="button"
          onClick={() => logout()}
          className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer ${
            isCollapsed ? 'justify-center px-2' : ''
          }`}
        >
          <LogOutIcon size={18} className="shrink-0 text-red-500" />
          {!isCollapsed && <span>Keluar Sistem</span>}
        </button>

        {/* Desktop Collapse Toggle */}
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? 'Buka bilah samping' : 'Perkecil bilah samping'}
          className="hidden md:flex w-full items-center justify-center gap-2 rounded-lg py-1.5 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
        >
          {isCollapsed ? (
            <PanelLeftOpenIcon size={16} />
          ) : (
            <div className="flex items-center gap-2">
              <PanelLeftCloseIcon size={16} />
              <span>Perkecil Menu</span>
            </div>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col shrink-0 border-r border-slate-200 bg-white transition-all duration-200 ease-in-out z-20 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay Drawer */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-50 flex md:hidden"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          {/* Drawer content */}
          <div className="relative flex w-full max-w-xs flex-1 flex-col bg-white shadow-xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
