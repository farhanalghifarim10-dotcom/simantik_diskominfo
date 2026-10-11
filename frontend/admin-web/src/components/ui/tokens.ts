/**
 * SIMANTIK Design System Tokens
 * Standard Visual Foundation for Diskominfo Pemkab Bandung
 *
 * Principles:
 * - High contrast (WCAG AAA/AA compliant >= 4.5:1 text, >= 3:1 UI controls)
 * - Formal Indonesian Government Digital Services (Putih, Navy, Biru ASN)
 * - 4px grid spacing system
 * - Consistent border radii (4px, 6px, 8px, 12px) - no giant rounded bubbles
 * - Meaningful motion (150ms-250ms subtle transitions, respects reduced-motion)
 */

export const colors = {
  navy: {
    50: '#f0f4f9',
    100: '#dbe4f0',
    200: '#b9cbe3',
    300: '#8ea8d1',
    400: '#6283bd',
    500: '#4263a7',
    600: '#314d8c',
    700: '#263c71',
    800: '#1b2b52',
    900: '#0f1d36', // Primary Brand Navy
    950: '#0a1322', // Deep Institutional Navy
  },
  blue: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7', // Primary Supporting ASN Blue
    700: '#0369a1', // Dark ASN Blue for high-contrast text
    800: '#075985',
    900: '#0c4a6e',
  },
  neutral: {
    50: '#f8fafc',  // Background Slate
    100: '#f1f5f9', // Surface Muted
    200: '#e2e8f0', // Border Standard
    300: '#cbd5e1', // Border Strong
    400: '#94a3b8', // Muted Icons / Placeholder
    500: '#64748b', // Muted Text
    600: '#475569', // Secondary Text
    700: '#334155', // Subheading Text
    800: '#1e293b', // Heading Text
    900: '#0f172a', // Primary Text
    950: '#020617', // High-contrast Foreground
  },
  semantic: {
    success: {
      light: '#ecfdf5',
      border: '#a7f3d0',
      text: '#065f46',
      solid: '#059669',
      solidHover: '#047857',
    },
    warning: {
      light: '#fffbeb',
      border: '#fde68a',
      text: '#92400e',
      solid: '#d97706',
      solidHover: '#b45309',
    },
    danger: {
      light: '#fef2f2',
      border: '#fecaca',
      text: '#991b1b',
      solid: '#dc2626',
      solidHover: '#b91c1c',
    },
    info: {
      light: '#f0f9ff',
      border: '#bae6fd',
      text: '#075985',
      solid: '#0284c7',
      solidHover: '#0369a1',
    },
  },
} as const;

export const typography = {
  fontFamily: {
    sans: 'Inter, "Plus Jakarta Sans", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  },
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],      // 12px
    sm: ['0.875rem', { lineHeight: '1.25rem' }],  // 14px
    base: ['1rem', { lineHeight: '1.5rem' }],      // 16px (standard reading)
    lg: ['1.125rem', { lineHeight: '1.75rem' }],  // 18px
    xl: ['1.25rem', { lineHeight: '1.75rem' }],   // 20px
    '2xl': ['1.5rem', { lineHeight: '2rem' }],    // 24px
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }],// 30px
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }], // 36px
  },
} as const;

export const spacing = {
  1: '0.25rem',  // 4px
  2: '0.5rem',   // 8px
  3: '0.75rem',  // 12px
  4: '1rem',     // 16px
  5: '1.25rem',  // 20px
  6: '1.5rem',   // 24px
  8: '2rem',     // 32px
  10: '2.5rem',  // 40px
  12: '3rem',    // 48px
  16: '4rem',    // 64px
} as const;

export const radii = {
  none: '0px',
  sm: '4px',
  md: '6px',
  lg: '8px',
  xl: '12px',
  full: '9999px',
} as const;

export const transitions = {
  fast: '150ms cubic-bezier(0.16, 1, 0.3, 1)',
  normal: '200ms cubic-bezier(0.16, 1, 0.3, 1)',
  slow: '300ms cubic-bezier(0.16, 1, 0.3, 1)',
} as const;
