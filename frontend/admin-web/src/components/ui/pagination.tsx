import { ChevronLeftIcon, ChevronRightIcon } from './icons';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
  className = '',
}: PaginationProps) {
  if (totalPages <= 1 && !totalItems) return null;

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }

      if (currentPage < totalPages - 2) pages.push('...');
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }

    return pages;
  };

  const pages = getPageNumbers();

  const startItem = totalItems && pageSize ? (currentPage - 1) * pageSize + 1 : undefined;
  const endItem =
    totalItems && pageSize ? Math.min(currentPage * pageSize, totalItems) : undefined;

  return (
    <nav
      role="navigation"
      aria-label="Navigasi Halaman"
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-2 py-3 ${className}`}
    >
      {totalItems !== undefined && (
        <p className="text-xs text-slate-500 font-medium">
          Menampilkan{' '}
          <span className="font-semibold text-slate-800">{startItem}</span> -{' '}
          <span className="font-semibold text-slate-800">{endItem}</span> dari{' '}
          <span className="font-semibold text-slate-800">{totalItems}</span> data
        </p>
      )}

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Halaman sebelumnya"
          className="h-8 w-8 rounded border border-slate-300 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeftIcon size={16} />
        </button>

        {pages.map((p, index) => {
          if (typeof p === 'string') {
            return (
              <span
                key={`ellipsis-${index}`}
                className="h-8 w-8 flex items-center justify-center text-xs text-slate-400 select-none"
              >
                …
              </span>
            );
          }

          const isCurrent = p === currentPage;

          return (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              aria-current={isCurrent ? 'page' : undefined}
              className={`h-8 w-8 rounded text-xs font-semibold transition-colors duration-150 flex items-center justify-center select-none cursor-pointer ${
                isCurrent
                  ? 'bg-[#1b5040] text-white font-bold'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-[#caf3e4]/30 hover:border-[#2e8a6e]'
              }`}
            >
              {p}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Halaman berikutnya"
          className="h-8 w-8 rounded border border-slate-300 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRightIcon size={16} />
        </button>
      </div>
    </nav>
  );
}
