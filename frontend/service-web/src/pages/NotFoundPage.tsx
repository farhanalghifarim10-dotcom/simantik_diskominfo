import { Link } from 'react-router';
import { Button, SearchIcon, ShieldIcon } from '../components/ui';

export function NotFoundPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center space-y-8">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#CAF3E4] border border-[#98F7D9] text-[#1B5040] text-xs font-semibold uppercase tracking-wider">
          <ShieldIcon size={14} />
          <span>SIMANTIK SPBE Kab. Bandung</span>
        </div>
        <p className="text-7xl sm:text-8xl font-black text-slate-900 tracking-tight">
          404
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          Halaman Tidak Ditemukan
        </h1>
        <p className="text-sm sm:text-base text-slate-600 max-w-lg mx-auto leading-relaxed">
          Tautan yang Anda tuju mungkin telah dipindahkan, dinonaktifkan, atau alamat URL yang dimasukkan tidak valid.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link to="/" className="w-full sm:w-auto">
          <Button variant="primary" size="md" className="w-full sm:w-auto font-bold">
            Kembali ke Beranda
          </Button>
        </Link>
        <Link to="/layanan" className="w-full sm:w-auto">
          <Button variant="outline" size="md" className="w-full sm:w-auto">
            Katalog Layanan
          </Button>
        </Link>
        <Link to="/tracking" className="w-full sm:w-auto">
          <Button variant="outline" size="md" className="w-full sm:w-auto" leftIcon={<SearchIcon size={14} />}>
            Lacak Tiket
          </Button>
        </Link>
      </div>

      <div className="pt-8 border-t border-slate-200 text-xs text-slate-500">
        <span>Jika Anda merasa ini adalah kesalahan sistem, silakan hubungi </span>
        <Link to="/kontak" className="text-[#1B5040] font-semibold hover:underline">
          Helpdesk Aptika Diskominfo
        </Link>
        <span>.</span>
      </div>
    </div>
  );
}
