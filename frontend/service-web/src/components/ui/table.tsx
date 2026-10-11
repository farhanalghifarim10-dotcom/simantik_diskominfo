import type {
  HTMLAttributes,
  TableHTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from 'react';

export function TableContainer({
  className = '',
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`w-full overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-xs ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function Table({
  className = '',
  children,
  ...props
}: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <table
      className={`w-full text-left text-sm text-slate-700 border-collapse ${className}`}
      {...props}
    >
      {children}
    </table>
  );
}

export function TableHeader({
  className = '',
  children,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={`bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-900 uppercase tracking-wider ${className}`}
      {...props}
    >
      {children}
    </thead>
  );
}

export function TableBody({
  className = '',
  children,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody
      className={`divide-y divide-slate-100 bg-white ${className}`}
      {...props}
    >
      {children}
    </tbody>
  );
}

export function TableRow({
  className = '',
  children,
  ...props
}: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={`transition-colors duration-100 hover:bg-slate-50/80 ${className}`}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableHead({
  className = '',
  children,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={`px-4 py-3.5 font-semibold text-slate-800 text-xs whitespace-nowrap ${className}`}
      {...props}
    >
      {children}
    </th>
  );
}

export function TableCell({
  className = '',
  children,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={`px-4 py-3.5 text-sm text-slate-700 align-middle ${className}`}
      {...props}
    >
      {children}
    </td>
  );
}

export function TableCaption({
  className = '',
  children,
  ...props
}: HTMLAttributes<HTMLTableCaptionElement>) {
  return (
    <caption
      className={`p-3 text-xs text-slate-500 italic ${className}`}
      {...props}
    >
      {children}
    </caption>
  );
}
