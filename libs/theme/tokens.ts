export type ThemeTokens = {
  surfaceBase: string;
  surfaceRaised: string;
  surfaceOverlay: string;
  primary: string;
  primarySubtle: string;
  primaryFg: string;
  textPrimary: string;
  textSecondary: string;
  textDisabled: string;
  border: string;
  error: string;
  errorSubtle: string;
};

export const lightTokens: ThemeTokens = {
  surfaceBase:    '#f8f9fa',
  surfaceRaised:  '#ffffff',
  surfaceOverlay: '#f3f4f6',
  primary:        '#f4511e',
  primarySubtle:  '#fff5f2',
  primaryFg:      '#ffffff',
  textPrimary:    '#111827',
  textSecondary:  '#6b7280',
  textDisabled:   '#9ca3af',
  border:         '#e5e7eb',
  error:          '#ef4444',
  errorSubtle:    '#fef2f2',
};

export const darkTokens: ThemeTokens = {
  surfaceBase:    '#0f172a',
  surfaceRaised:  '#1e293b',
  surfaceOverlay: '#334155',
  primary:        '#f4511e',
  primarySubtle:  '#431407',
  primaryFg:      '#ffffff',
  textPrimary:    '#f8fafc',
  textSecondary:  '#94a3b8',
  textDisabled:   '#64748b',
  border:         '#334155',
  error:          '#f87171',
  errorSubtle:    '#450a0a',
};
