import type { HTMLAttributes } from 'react';

export interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span';
}

export function Heading({
  level = 1,
  as,
  className = '',
  children,
  ...props
}: HeadingProps) {
  const Component = as ?? (`h${level}` as const);

  const levelStyles: Record<number, string> = {
    1: 'text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-950',
    2: 'text-2xl sm:text-3xl font-bold tracking-tight text-slate-900',
    3: 'text-xl sm:text-2xl font-bold tracking-tight text-slate-900',
    4: 'text-lg sm:text-xl font-semibold text-slate-900',
    5: 'text-base font-semibold text-slate-900',
    6: 'text-sm font-semibold uppercase tracking-wider text-slate-700',
  };

  return (
    <Component className={`${levelStyles[level]} ${className}`} {...props}>
      {children}
    </Component>
  );
}

export interface TextProps extends HTMLAttributes<HTMLElement> {
  variant?: 'lead' | 'body' | 'small' | 'muted' | 'caption';
  as?: 'p' | 'span' | 'div' | 'label';
}

export function Text({
  variant = 'body',
  as = 'p',
  className = '',
  children,
  ...props
}: TextProps) {
  const variantStyles = {
    lead: 'text-lg text-slate-700 leading-relaxed font-normal',
    body: 'text-sm sm:text-base text-slate-700 leading-normal',
    small: 'text-sm text-slate-600',
    muted: 'text-xs text-slate-500',
    caption: 'text-[11px] text-slate-400 uppercase tracking-wider font-medium',
  };

  const combinedClass = `${variantStyles[variant]} ${className}`;

  if (as === 'span') {
    return <span className={combinedClass} {...props}>{children}</span>;
  }
  if (as === 'div') {
    return <div className={combinedClass} {...props}>{children}</div>;
  }
  if (as === 'label') {
    return <label className={combinedClass} {...props}>{children}</label>;
  }

  return (
    <p className={combinedClass} {...props}>
      {children}
    </p>
  );
}

export function Code({
  className = '',
  children,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <code
      className={`rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-semibold text-slate-800 border border-slate-200 ${className}`}
      {...props}
    >
      {children}
    </code>
  );
}

export function Kbd({
  className = '',
  children,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={`inline-flex items-center rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] font-medium text-slate-600 shadow-xs ${className}`}
      {...props}
    >
      {children}
    </kbd>
  );
}
