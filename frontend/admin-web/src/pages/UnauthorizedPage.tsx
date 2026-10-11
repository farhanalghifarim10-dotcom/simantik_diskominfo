import { Link } from 'react-router';
import { Button, Heading, LogoHierarchy, ShieldIcon, Text } from '../components/ui';
import type { AppRole } from '../types/auth';

interface UnauthorizedPageProps {
  userRole?: AppRole;
}

export function UnauthorizedPage({ userRole }: UnauthorizedPageProps) {
  const roleLabel =
    userRole === 'TECHNICIAN'
      ? 'Teknisi (TECHNICIAN)'
      : userRole === 'SUPER_ADMIN'
      ? 'Super Admin (SUPER_ADMIN)'
      : 'Pengguna Terotentikasi';

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center space-y-6">
        <div className="flex justify-center">
          <LogoHierarchy layout="compact" />
        </div>

        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-full bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center">
            <ShieldIcon size={32} />
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
            Pemberitahuan Otorisasi Sistem
          </span>
          <Heading level={2}>Akses Terbatas (403)</Heading>
          <Text variant="body" className="text-slate-600">
            Peran Anda terdaftar sebagai{' '}
            <strong className="text-slate-900 font-semibold">{roleLabel}</strong>.
            Halaman atau fungsi administratif ini memerlukan kewenangan khusus yang tidak tercakup dalam profil peran Anda saat ini.
          </Text>
        </div>

        <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-xs text-slate-600 text-left space-y-1">
          <p className="font-semibold text-slate-800">Prinsip Keamanan SIMANTIK:</p>
          <p>
            Hak akses operasional dan administratif dibatasi ketat berdasarkan tugas pokok dan fungsi dinas. Jika Anda memerlukan akses ke modul ini, silakan koordinasikan dengan Administrator SIMANTIK Diskominfo.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <Link to="/">
            <Button variant="primary">
              Kembali ke Dashboard
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="outline">
              Ganti Akun
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
