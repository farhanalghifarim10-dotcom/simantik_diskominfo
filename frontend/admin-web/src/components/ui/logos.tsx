import type { ImgHTMLAttributes } from 'react';

/**
 * Official Three-Logo Hierarchy Component
 *
 * Institutional Hierarchy:
 * 1. Pemerintah Daerah Kabupaten Bandung (Entitas Pemerintahan Tertinggi / Induk)
 * 2. Dinas Komunikasi dan Informatika (Instansi Pengampu & Penyelenggara Layanan)
 * 3. SIMANTIK (Sistem Manajemen Layanan Teknologi Informasi)
 */

export interface LogoProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  size?: number | string;
  variant?: 'emblem' | 'full';
  useWhiteBackground?: boolean;
}

/**
 * Lambang Resmi Pemerintah Daerah Kabupaten Bandung
 * Identitas Pemerintah Daerah (Induk)
 */
export function PemkabBandungLogo({
  size = 36,
  className = '',
  alt = 'Lambang Pemerintah Daerah Kabupaten Bandung',
  useWhiteBackground = false,
  style,
  ...props
}: LogoProps) {
  const dimension = typeof size === 'number' ? `${size}px` : size;
  const src = useWhiteBackground
    ? '/assets/logos/kabupaten-bandung.png'
    : '/assets/logos/kabupaten-bandung-transparent.png';

  return (
    <img
      src={src}
      alt={alt}
      title={props.title ?? 'Pemerintah Daerah Kabupaten Bandung'}
      width={typeof size === 'number' ? size : undefined}
      height={typeof size === 'number' ? size : undefined}
      style={{
        width: dimension,
        height: dimension,
        ...style,
      }}
      className={`object-contain select-none inline-block shrink-0 ${className}`}
      loading="eager"
      decoding="async"
      {...props}
    />
  );
}

/**
 * Lambang Resmi Diskominfo (Dinas Komunikasi dan Informatika)
 * Identitas Instansi Pengampu Layanan TI Kabupaten Bandung
 */
export function DiskominfoLogo({
  size = 36,
  className = '',
  alt = 'Logo Dinas Komunikasi dan Informatika Kabupaten Bandung',
  style,
  ...props
}: LogoProps) {
  const dimension = typeof size === 'number' ? `${size}px` : size;

  return (
    <img
      src="/assets/logos/diskominfo.png"
      alt={alt}
      title={props.title ?? 'Dinas Komunikasi dan Informatika Kabupaten Bandung'}
      width={typeof size === 'number' ? size : undefined}
      height={typeof size === 'number' ? size : undefined}
      style={{
        width: dimension,
        height: dimension,
        ...style,
      }}
      className={`object-contain select-none inline-block shrink-0 ${className}`}
      loading="eager"
      decoding="async"
      {...props}
    />
  );
}

/**
 * Logo Resmi SIMANTIK
 * Identitas Produk / Aplikasi Layanan TI Kabupaten Bandung
 * Mendukung varian 'emblem' (default untuk area ringkas seperti navbar) dan 'full' (format vertikal utuh dengan tipografi)
 */
export function SimantikLogo({
  size = 36,
  variant = 'emblem',
  className = '',
  alt,
  style,
  ...props
}: LogoProps) {
  const isFull = variant === 'full';
  const dimension = typeof size === 'number' ? `${size}px` : size;
  const src = isFull ? '/assets/logos/simantik-logo.png' : '/assets/logos/simantik-emblem.png';
  const defaultAlt = isFull
    ? 'Logo Resmi SIMANTIK — Sistem Manajemen Layanan Teknologi Informasi'
    : 'Emblem Resmi SIMANTIK';

  return (
    <img
      src={src}
      alt={alt ?? defaultAlt}
      title={props.title ?? 'SIMANTIK — Diskominfo Kab. Bandung'}
      width={typeof size === 'number' ? size : undefined}
      height={typeof size === 'number' ? size : undefined}
      style={{
        width: dimension,
        height: dimension,
        ...style,
      }}
      className={`object-contain select-none inline-block shrink-0 ${className}`}
      loading="eager"
      decoding="async"
      {...props}
    />
  );
}

/**
 * Shortcut untuk Emblem Khusus SIMANTIK (cropped emblem)
 */
export function SimantikEmblem(props: LogoProps) {
  return <SimantikLogo {...props} variant="emblem" />;
}

/**
 * Shortcut untuk Logo SIMANTIK Versi Lengkap (vertikal)
 */
export function SimantikFullLogo(props: LogoProps) {
  return <SimantikLogo {...props} variant="full" />;
}

export interface LogoHierarchyProps {
  layout?: 'horizontal' | 'vertical' | 'compact' | 'full';
  subtitle?: string;
  className?: string;
}

/**
 * Komponen Terpadu Hierarki 3 Logo
 * Menampilkan hubungan kelembagaan yang sah:
 * 1. Pemkab Bandung (Pemerintah Daerah Induk)
 * 2. Diskominfo (Instansi Pengampu Teknis)
 * 3. SIMANTIK (Identitas Produk Layanan TI)
 */
export function LogoHierarchy({
  layout = 'horizontal',
  subtitle = 'Pemerintah Daerah Kabupaten Bandung',
  className = '',
}: LogoHierarchyProps) {
  if (layout === 'compact') {
    return (
      <div className={`flex items-center gap-2.5 ${className}`}>
        <SimantikLogo size={34} variant="emblem" />
        <div className="flex flex-col">
          <span className="text-base font-bold tracking-tight text-slate-900 leading-tight">
            SIMANTIK
          </span>
          <span className="text-[11px] font-medium text-slate-500 leading-tight">
            Diskominfo Kab. Bandung
          </span>
        </div>
      </div>
    );
  }

  if (layout === 'vertical') {
    return (
      <div className={`flex flex-col items-center text-center gap-3.5 ${className}`}>
        {/* Baris 3 Lambang Resmi Berjejer */}
        <div className="flex items-center justify-center gap-3 p-2 rounded-xl bg-white/80 border border-slate-100 shadow-2xs">
          <PemkabBandungLogo size={38} title="Pemerintah Daerah Kabupaten Bandung" />
          <div className="h-6 w-px bg-slate-200" aria-hidden="true" />
          <DiskominfoLogo size={38} title="Dinas Komunikasi dan Informatika" />
          <div className="h-6 w-px bg-slate-200" aria-hidden="true" />
          <SimantikLogo size={38} variant="emblem" title="SIMANTIK" />
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

  if (layout === 'full') {
    return (
      <div className={`flex flex-col items-center text-center gap-3 ${className}`}>
        <div className="flex items-center justify-center gap-3">
          <PemkabBandungLogo size={36} title="Pemerintah Daerah Kabupaten Bandung" />
          <div className="h-5 w-px bg-slate-200" aria-hidden="true" />
          <DiskominfoLogo size={36} title="Dinas Komunikasi dan Informatika" />
        </div>
        <div className="my-1">
          <SimantikLogo size={140} variant="full" />
        </div>
        <p className="text-xs text-slate-500 font-medium">
          {subtitle}
        </p>
      </div>
    );
  }

  // Layout default: horizontal (Navbar Header)
  return (
    <div className={`flex items-center gap-3 sm:gap-3.5 ${className}`}>
      {/* Logo Daerah & Dinas */}
      <div className="flex items-center gap-2">
        <PemkabBandungLogo size={34} title="Pemerintah Daerah Kabupaten Bandung" />
        <div className="h-5 w-px bg-slate-200" aria-hidden="true" />
        <DiskominfoLogo size={34} title="Dinas Komunikasi dan Informatika" />
      </div>

      <div className="h-6 w-px bg-slate-200 hidden sm:block" aria-hidden="true" />

      {/* Identitas Produk SIMANTIK */}
      <div className="flex items-center gap-2.5">
        <SimantikLogo size={34} variant="emblem" />
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-base font-bold tracking-tight text-slate-950 leading-tight">
              SIMANTIK
            </span>
            <span className="rounded bg-[#CAF3E4] border border-[#98F7D9] px-1.5 py-0.5 text-[10px] font-semibold text-[#1B5040] uppercase tracking-wider hidden sm:inline-block">
              Layanan TI
            </span>
          </div>
          <span className="text-xs font-medium text-slate-500 leading-tight">
            Diskominfo Kab. Bandung
          </span>
        </div>
      </div>
    </div>
  );
}
