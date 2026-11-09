
export const colors = {
  pine: {
    50: '#f0faf6',  // Subtle Mint Wash
    100: '#caf3e4', // Frozen Water
    200: '#98f7d9', // Aquamarine 2
    300: '#66ffcc', // Aquamarine
    400: '#2bd9a5', // Tropical Mint
    500: '#38a584',
    600: '#2e8a6e', // Jungle Teal
    700: '#246854',
    800: '#1b5040', // Pine Teal (Primary Brand)
    900: '#143d31', // Dark Pine Hover
    950: '#000408', // Black
  },
  navy: {
    50: '#f0faf6',
    100: '#caf3e4',
    200: '#98f7d9',
    300: '#66ffcc',
    400: '#2bd9a5',
    500: '#38a584',
    600: '#2e8a6e',
    700: '#246854',
    800: '#1b5040',
    900: '#143d31',
    950: '#000408',
  },
  blue: {
    50: '#f0faf6',
    100: '#caf3e4',
    200: '#98f7d9',
    300: '#66ffcc',
    400: '#2bd9a5',
    500: '#2e8a6e',
    600: '#1b5040',
    700: '#143d31',
    800: '#0d2820',
    900: '#000408',
  },
  brand: {
    pine: '#1b5040',
    jungle: '#2e8a6e',
    mint: '#2bd9a5',
    aqua: '#66ffcc',
    aqua2: '#98f7d9',
    frozen: '#caf3e4',
    smoke: '#f5f5f5',
    black: '#000408',
    white: '#ffffff',
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
    950: '#000408', // High-contrast Foreground (Black)
  },
  semantic: {
    primary: {
      light: '#caf3e4',
      border: '#98f7d9',
      text: '#1b5040',
      solid: '#1b5040',
      solidHover: '#143d31',
    },
    secondary: {
      light: '#caf3e4',
      border: '#98f7d9',
      text: '#1b5040',
      solid: '#2e8a6e',
      solidHover: '#246854',
    },
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
      light: '#caf3e4',
      border: '#98f7d9',
      text: '#1b5040',
      solid: '#1b5040',
      solidHover: '#143d31',
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
