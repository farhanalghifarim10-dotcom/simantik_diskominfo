import type { AppRole } from '../../types/auth';

export interface NavItem {
  title: string;
  href: string;
  iconName: string;
  allowedRoles: AppRole[];
  badge?: string;
  section?: 'main' | 'operations' | 'administration';
}

export const navigationItems: NavItem[] = [
  // Utama
  {
    title: 'Dashboard',
    href: '/',
    iconName: 'home',
    allowedRoles: ['SUPER_ADMIN', 'TECHNICIAN'],
    section: 'main',
  },
  {
    title: 'Permohonan Layanan',
    href: '/applications',
    iconName: 'file-text',
    allowedRoles: ['SUPER_ADMIN', 'TECHNICIAN'],
    section: 'main',
  },
  {
    title: 'Pekerjaan Saya',
    href: '/my-work',
    iconName: 'layers',
    allowedRoles: ['TECHNICIAN'],
    section: 'main',
  },

  // Operasional & Lifecycle
  {
    title: 'Penugasan Tenaga Ahli',
    href: '/assignments',
    iconName: 'users',
    allowedRoles: ['SUPER_ADMIN'], // Hanya SUPER_ADMIN yang menugaskan
    section: 'operations',
  },
  {
    title: 'Siklus Hidup TI',
    href: '/lifecycle',
    iconName: 'layers',
    allowedRoles: ['SUPER_ADMIN', 'TECHNICIAN'],
    section: 'operations',
  },
  {
    title: 'Komunikasi & Pesan',
    href: '/messages',
    iconName: 'message-square',
    allowedRoles: ['SUPER_ADMIN', 'TECHNICIAN'],
    section: 'operations',
  },
  {
    title: 'Notifikasi',
    href: '/notifications',
    iconName: 'bell',
    allowedRoles: ['SUPER_ADMIN', 'TECHNICIAN'],
    section: 'operations',
  },

  // Administrasi Sistem (Hanya SUPER_ADMIN)
  {
    title: 'Master Layanan TI',
    href: '/master/services',
    iconName: 'server',
    allowedRoles: ['SUPER_ADMIN'],
    section: 'administration',
  },
  {
    title: 'Master Unit OPD',
    href: '/master/opd',
    iconName: 'building',
    allowedRoles: ['SUPER_ADMIN'],
    section: 'administration',
  },
  {
    title: 'Manajemen Tenaga Ahli',
    href: '/technicians',
    iconName: 'user-check',
    allowedRoles: ['SUPER_ADMIN'],
    section: 'administration',
  },
  {
    title: 'Jejak Audit',
    href: '/audit',
    iconName: 'shield',
    allowedRoles: ['SUPER_ADMIN'],
    section: 'administration',
  },
];
