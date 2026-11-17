// ClubPulse brand tokens — aligned with globals.css and Navbar.tsx
export const colors = {
  // Backgrounds
  background:   '#04091A',     // --background (root bg)
  surface1:     '#07102B',     // --surface-1 (cards)
  surface2:     '#0C1A38',     // --surface-2 (elevated)
  surface3:     'rgba(255,255,255,0.04)', // --surface-3

  // Legacy aliases (keep existing code working)
  navy:         '#04091A',
  navyLight:    '#07102B',
  navyBorder:   '#1F2A52',

  // Brand primary (blue)
  brandPrimary:      '#2563EB',  // --brand-primary
  brandPrimaryLight: '#3B82F6',  // --brand-primary-light (hover)
  brandPrimaryDim:   'rgba(37,99,235,0.14)', // --brand-primary-dim
  brandPrimaryDark:  '#0F1F5C',  // --brand-primary-dark
  brandSky:          '#60A5FA',  // --brand-sky (accent, "Pulse" colour)

  // Brand gold (Scores)
  gold:             '#EFC84A',  // --brand-gold
  goldMuted:        '#C8A63E',  // --brand-gold-muted
  goldDim:          'rgba(239,200,74,0.12)',  // --brand-gold-dim
  goldBorder:       'rgba(239,200,74,0.25)',

  // Status
  success:    '#22C55E',   // --brand-green
  successDim: 'rgba(34,197,94,0.10)', // --brand-green-dim
  danger:     '#F87171',
  orange:     '#F97316',   // --brand-orange
  orangeDim:  'rgba(249,115,22,0.12)',

  // Cricket-red (user message bubble, legacy)
  red:         '#8B0000',

  // Text
  white:       '#FFFFFF',
  text:        '#E8EDF5',      // --foreground
  textMuted:   'rgba(232,237,245,0.55)', // --fg-muted
  textSubtle:  'rgba(232,237,245,0.3)',  // --fg-subtle

  // Borders
  border:      'rgba(255,255,255,0.08)', // --border
  border2:     'rgba(255,255,255,0.04)', // --border2
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const radius = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 };

export const fonts = {
  regular: { fontSize: 15, color: colors.text },
  small:   { fontSize: 13, color: colors.textMuted as string },
  heading: { fontSize: 22, fontWeight: '700' as const, color: colors.white },
  title:   { fontSize: 16, fontWeight: '600' as const, color: colors.white },
  big:     { fontSize: 44, fontWeight: '800' as const, color: colors.white },
};
