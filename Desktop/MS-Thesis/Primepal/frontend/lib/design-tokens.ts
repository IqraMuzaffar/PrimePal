// frontend/lib/design-tokens.ts

export const designTokens = {
  colors: {
    // Brand
    primary: '#4361ee',
    primaryLight: '#7c9eff',
    primaryBg: '#e8eeff',

    // Grade colors
    grade: {
      1: '#4361ee',
      2: '#10b981',
      3: '#f59e0b',
      4: '#ef4444',
      5: '#8b5cf6',
      6: '#ec4899',
    },

    // Status colors
    success: '#059669',
    successBg: '#d1fae5',
    warning: '#d97706',
    warningBg: '#fef3c7',
    danger: '#dc2626',
    dangerBg: '#fee2e2',

    // Neutrals
    dark: '#0f1729',
    darkSecondary: '#1a2e6e',
    slate: {
      50: '#f8f9fc',
      100: '#f4f5fb',
      200: '#eaedf5',
      300: '#e0e6f5',
      400: '#d1d5db',
      500: '#9ca3af',
      600: '#6b7280',
      700: '#4b5563',
      800: '#374151',
      900: '#1f2937',
    },
  },

  typography: {
    heading: 'var(--font-geist-sans)',
    body: 'var(--font-geist-sans)',

    weights: {
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    },

    sizes: {
      xs: '11px',
      sm: '12px',
      base: '13px',
      md: '14px',
      lg: '15px',
      xl: '18px',
      '2xl': '21px',
      '3xl': '26px',
    },
  },

  spacing: {
    card: '18px 20px',
    section: '22px 26px',
  },

  effects: {
    cardShadow: '0 1px 4px rgba(0,0,0,0.04)',
    hoverShadow: '0 6px 20px rgba(67,97,238,0.13)',
    darkShadow: '0 4px 20px rgba(15,23,41,0.22)',

    transition: {
      fast: '0.14s',
      base: '0.18s',
      slow: '0.22s cubic-bezier(.4,0,.2,1)',
    },

    borderRadius: {
      sm: '8px',
      base: '10px',
      md: '12px',
      lg: '14px',
      xl: '16px',
    },
  },
} as const;

export type DesignTokens = typeof designTokens;
