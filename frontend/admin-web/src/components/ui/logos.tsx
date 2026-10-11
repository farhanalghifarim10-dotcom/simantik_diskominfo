import type { SVGProps } from 'react';

/**
 * Official Three-Logo Hierarchy Component
 *
 * Institutional Hierarchy:
 * 1. Pemerintah Daerah Kabupaten Bandung (Entitas Pemerintahan Tertinggi / Induk)
 * 2. Dinas Komunikasi dan Informatika (Instansi Pengampu & Penyelenggara Layanan)
 * 3. SIMANTIK (Sistem Manajemen Layanan Teknologi Informasi)
 */

export interface LogoProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
  title?: string;
}

/**
 * Lambang Resmi Pemerintah Daerah Kabupaten Bandung
 * Perisai tradisional berpadu elemen gunung Tangkuban Parahu, kujang pusaka,
 * gelombang air sungai Citarum, serta kapas & padi kemakmuran.
 */
export function PemkabBandungLogo({ size = 36, className, ...props }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-label="Lambang Pemerintah Kabupaten Bandung"
      role="img"
      {...props}
    >
      {/* Perisai Luar */}
      <path
        d="M24 3L6 9V24C6 35.5 13.8 44.2 24 47C34.2 44.2 42 35.5 42 24V9L24 3Z"
        fill="#0F1D36"
        stroke="#D97706"
        strokeWidth="1.5"
      />
      {/* Lapisan Emas Dalam */}
      <path
        d="M24 6L9 11V24C9 33.6 15.5 41.2 24 43.6C32.5 41.2 39 33.6 39 24V11L24 6Z"
        fill="#162A4D"
      />
      {/* Gunung / Siluet Alam Priangan */}
      <path
        d="M12 28L20 18L26 24L31 17L36 28H12Z"
        fill="#059669"
        opacity="0.9"
      />
      {/* Gelombang Citarum */}
      <path
        d="M12 32C16 30 20 34 24 32C28 30 32 34 36 32V35C32 37 28 33 24 35C20 37 16 33 12 35V32Z"
        fill="#38BDF8"
      />
      {/* Kujang Pusaka (Simbol Jawa Barat / Pasundan) */}
      <path
        d="M24 12V27M24 14C22 15 21 17 21 19C21 21 23 22 24 22M24 17C26 17.5 27 19 27 21C27 23 25 24 24 24"
        stroke="#FBBF24"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Bintang Ketuhanan di Puncak */}
      <polygon
        points="24,7.5 25.2,10 27.8,10.2 25.8,11.8 26.4,14.4 24,13 21.6,14.4 22.2,11.8 20.2,10.2 22.8,10"
        fill="#FDE68A"
      />
    </svg>
  );
}

/**
 * Lambang Diskominfo (Dinas Komunikasi dan Informatika)
 * Representasi menara telekomunikasi, pita gelombang radio data, dan integritas digital.
 */
export function DiskominfoLogo({ size = 36, className, ...props }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-label="Logo Diskominfo Kabupaten Bandung"
      role="img"
      {...props}
    >
      <rect width="48" height="48" rx="8" fill="#F0F4F9" />
      {/* Node & Orbit Komunikasi */}
      <circle cx="24" cy="24" r="18" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="3 3" />
      <path
        d="M14 34C18 20 30 20 34 34"
        stroke="#0284C7"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M18 34C20 25 28 25 30 34"
        stroke="#0369A1"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Menara Sinyal Digital Pusat */}
      <circle cx="24" cy="18" r="4.5" fill="#0F1D36" />
      <circle cx="24" cy="18" r="2" fill="#38BDF8" />
      <path d="M24 22.5V34" stroke="#0F1D36" strokeWidth="2.5" strokeLinecap="round" />
      {/* Gelombang Pancar */}
      <path
        d="M17 14C20.8 10.5 27.2 10.5 31 14"
        stroke="#0284C7"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Logo Resmi SIMANTIK
 * Huruf S geometris dalam perisai layanan TI terintegrasi (Modern, Tegas, Presisi).
 */
export function SimantikLogo({ size = 36, className, ...props }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-label="Logo SIMANTIK"
      role="img"
      {...props}
    >
      {/* Perisai Dasar Sistem TI */}
      <rect width="48" height="48" rx="10" fill="#0F1D36" />
      {/* Geometri 'S' Teknologi Terpadu */}
      <path
        d="M33 16C33 13.8 31.2 12 29 12H19C16.8 12 15 13.8 15 16V22C15 24.2 16.8 26 19 26H29C31.2 26 33 27.8 33 30V32C33 34.2 31.2 36 29 36H19C16.8 36 15 34.2 15 32"
        stroke="#0284C7"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Aksentuasi Node Digital */}
      <circle cx="33" cy="16" r="2.5" fill="#38BDF8" />
      <circle cx="15" cy="32" r="2.5" fill="#38BDF8" />
      <path
        d="M24 19L24 29"
        stroke="#F8FAFC"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export interface LogoHierarchyProps {
  layout?: 'horizontal' | 'vertical' | 'compact';
  subtitle?: string;
  className?: string;
}

/**
 * Komponen Terpadu Hierarki 3 Logo
 * Menampilkan hubungan kelembagaan yang sah:
 * Pemkab Bandung (Pemerintah Daerah) | Diskominfo | SIMANTIK
 */
export function LogoHierarchy({
  layout = 'horizontal',
  subtitle = 'Pemerintah Daerah Kabupaten Bandung',
  className = '',
}: LogoHierarchyProps) {
  if (layout === 'compact') {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <SimantikLogo size={32} />
        <div className="flex flex-col">
          <span className="text-base font-bold tracking-tight text-slate-900 leading-none">
            SIMANTIK
          </span>
          <span className="text-[11px] font-medium text-slate-500 mt-1 leading-none">
            Diskominfo Kab. Bandung
          </span>
        </div>
      </div>
    );
  }

  if (layout === 'vertical') {
    return (
      <div className={`flex flex-col items-center text-center gap-3 ${className}`}>
        <div className="flex items-center justify-center gap-3">
          <PemkabBandungLogo size={36} />
          <div className="h-6 w-px bg-slate-300" aria-hidden="true" />
          <DiskominfoLogo size={36} />
          <div className="h-6 w-px bg-slate-300" aria-hidden="true" />
          <SimantikLogo size={36} />
        </div>
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900">
            SIMANTIK
          </h2>
          <p className="text-xs text-slate-600 font-medium">
            Sistem Manajemen Layanan Teknologi Informasi
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {subtitle}
          </p>
        </div>
      </div>
    );
  }

  return (
    <header className={`flex items-center gap-3.5 ${className}`}>
      {/* Logo Daerah & Dinas */}
      <div className="flex items-center gap-2">
        <PemkabBandungLogo size={34} title="Pemerintah Kabupaten Bandung" />
        <div className="h-5 w-px bg-slate-200" aria-hidden="true" />
        <DiskominfoLogo size={34} title="Dinas Komunikasi dan Informatika" />
      </div>

      <div className="h-7 w-px bg-slate-200 hidden sm:block" aria-hidden="true" />

      {/* Identitas Produk SIMANTIK */}
      <div className="flex items-center gap-2.5">
        <SimantikLogo size={34} />
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-base font-bold tracking-tight text-slate-950 leading-tight">
              SIMANTIK
            </span>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 uppercase tracking-wider">
              Layanan TI
            </span>
          </div>
          <span className="text-xs font-medium text-slate-500 leading-tight">
            Diskominfo Kab. Bandung
          </span>
        </div>
      </div>
    </header>
  );
}
