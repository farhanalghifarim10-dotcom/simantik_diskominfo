import { Link } from 'react-router';
import { Button, Heading, LogoHierarchy, Text } from '../components/ui';

export function NotFoundPage() {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center space-y-6">
        <div className="flex justify-center">
          <LogoHierarchy layout="compact" />
        </div>

        <div className="space-y-2">
          <p className="text-4xl font-extrabold text-slate-900 tracking-tight">404</p>
          <Heading level={3}>Halaman Tidak Ditemukan</Heading>
          <Text variant="body" className="text-slate-600">
            Alamat URL yang Anda tuju tidak terdaftar atau telah dipindahkan pada portal internal SIMANTIK.
          </Text>
        </div>

        <div className="pt-2 flex justify-center">
          <Link to="/">
            <Button variant="primary">
              Kembali ke Dashboard Utama
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
