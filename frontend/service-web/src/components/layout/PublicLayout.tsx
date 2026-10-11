import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import {
  Button,
  LogoHierarchy,
  MenuIcon,
  SearchIcon,
  ToastProvider,
  XIcon,
} from '../ui';

interface NavLinkItem {
  name: string;
  href: string;
}

const navLinks: NavLinkItem[] = [
  { name: 'Beranda', href: '/' },
  { name: 'Katalog Layanan', href: '/layanan' },
  { name: 'Lacak Tiket', href: '/tracking' },
  { name: 'Bantuan & FAQ', href: '/bantuan' },
  { name: 'Kontak Helpdesk', href: '/kontak' },
];

export function PublicLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <ToastProvider>
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans antialiased">
        {/* Top Government Official Strip */}
        <div className="bg-slate-900 text-slate-300 text-[11px] font-medium py-1.5 px-4 sm:px-8 border-b border-slate-800">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1 text-center sm:text-left">
            <span>
              Portal Resmi Layanan SPBE — Pemerintah Daerah Kabupaten Bandung
            </span>
            <div className="flex items-center gap-3 text-slate-400">
              <span>Diskominfo Kab. Bandung</span>
              <span aria-hidden="true">•</span>
              <span className="text-slate-300">Zona Integritas Digital</span>
            </div>
          </div>
        </div>

        {/* Main Navbar */}
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
            {/* Logo Hierarchy */}
            <Link to="/" className="inline-flex items-center select-none">
              <LogoHierarchy layout="horizontal" />
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1" aria-label="Navigasi Utama">
              {navLinks.map((link) => {
                const isActive =
                  link.href === '/'
                    ? location.pathname === '/'
                    : location.pathname.startsWith(link.href);

                return (
                  <NavLink
                    key={link.href}
                    to={link.href}
                    className={`px-3.5 py-2 text-sm font-semibold rounded-md transition-colors select-none ${
                      isActive
                        ? 'text-slate-950 bg-slate-100 font-bold'
                        : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50'
                    }`}
                  >
                    {link.name}
                  </NavLink>
                );
              })}
            </nav>

            {/* Right Actions: Quick Action */}
            <div className="hidden sm:flex items-center gap-2.5">
              <Link to="/tracking">
                <Button variant="outline" size="sm" leftIcon={<SearchIcon size={14} />}>
                  Lacak Tiket
                </Button>
              </Link>
              <Link to="/ajukan">
                <Button variant="primary" size="sm">
                  Ajukan Layanan
                </Button>
              </Link>
            </div>

            {/* Mobile Menu Toggle Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label={isMobileMenuOpen ? 'Tutup menu' : 'Buka menu navigasi'}
            >
              {isMobileMenuOpen ? <XIcon size={22} /> : <MenuIcon size={22} />}
            </button>
          </div>

          {/* Mobile Navigation Drawer / Dropdown */}
          {isMobileMenuOpen && (
            <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3">
              <nav className="flex flex-col space-y-1">
                {navLinks.map((link) => {
                  const isActive =
                    link.href === '/'
                      ? location.pathname === '/'
                      : location.pathname.startsWith(link.href);

                  return (
                    <NavLink
                      key={link.href}
                      to={link.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                        isActive
                          ? 'bg-slate-900 text-white font-semibold'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {link.name}
                    </NavLink>
                  );
                })}
              </nav>

              <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
                <Link to="/ajukan" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button variant="primary" size="md" className="w-full">
                    Ajukan Permohonan
                  </Button>
                </Link>
                <Link to="/tracking" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button variant="outline" size="md" className="w-full" leftIcon={<SearchIcon size={14} />}>
                    Lacak Status Tiket
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </header>

        {/* Page Content Outlet */}
        <main className="flex-1">
          <Outlet />
        </main>

        {/* Official Institutional Footer */}
        <footer className="border-t border-slate-200 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
              {/* Kolom 1: Profil Kelembagaan */}
              <div className="md:col-span-2 space-y-4">
                <LogoHierarchy layout="compact" />
                <p className="text-sm text-slate-600 leading-relaxed max-w-md">
                  <strong>SIMANTIK</strong> (Sistem Manajemen Layanan Teknologi Informasi)
                  adalah portal layanan resmi untuk mengelola dan memantau permohonan pembangunan
                  serta pengembangan aplikasi Organisasi Perangkat Daerah (OPD) di lingkungan
                  Pemerintah Daerah Kabupaten Bandung.
                </p>
                <div className="text-xs text-slate-500 space-y-1 pt-1">
                  <p>Dikelola oleh: <strong>Dinas Komunikasi dan Informatika (Diskominfo)</strong></p>
                  <p>Bidang Aplikasi dan Informatika (Aptika) — Pemkab Bandung</p>
                </div>
              </div>

              {/* Kolom 2: Tautan Layanan */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Layanan Publik
                </h4>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li>
                    <Link to="/layanan" className="hover:text-slate-950 transition-colors">
                      Pembangunan Aplikasi Baru
                    </Link>
                  </li>
                  <li>
                    <Link to="/layanan" className="hover:text-slate-950 transition-colors">
                      Pengembangan Aplikasi
                    </Link>
                  </li>
                  <li>
                    <Link to="/tracking" className="hover:text-slate-950 transition-colors">
                      Lacak Progres Tiket
                    </Link>
                  </li>
                  <li>
                    <Link to="/bantuan" className="hover:text-slate-950 transition-colors">
                      Panduan Pengajuan
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Kolom 3: Kanal Bantuan & Kontak */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Bantuan & Kontak
                </h4>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li>
                    <Link to="/kontak" className="hover:text-slate-950 transition-colors">
                      Helpdesk Diskominfo
                    </Link>
                  </li>
                  <li>
                    <Link to="/bantuan" className="hover:text-slate-950 transition-colors">
                      Pertanyaan Umum (FAQ)
                    </Link>
                  </li>
                  <li className="text-xs text-slate-500 pt-1">
                    <span>Jam Layanan:</span>
                    <br />
                    <span className="font-medium text-slate-700">Senin – Jumat: 08.00 – 16.00 WIB</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Bottom Disclaimer & Copyright */}
            <div className="mt-12 pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 text-center sm:text-left">
              <p>
                © 2026 Diskominfo Pemerintah Daerah Kabupaten Bandung. Seluruh hak cipta dilindungi.
              </p>
              <div className="flex items-center gap-4">
                <span>Selaras dengan Permenkomdigi No. 6 Tahun 2025 (SPBE)</span>
                <span>•</span>
                <Link to="/bantuan" className="hover:text-slate-900">
                  Ketentuan Layanan
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </ToastProvider>
  );
}
