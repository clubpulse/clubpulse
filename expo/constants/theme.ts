// ClubPulse brand: dark navy, gold, white
export const colors = {
  navy:        '#0A1128',
  navyLight:   '#121B3A',
  navyBorder:  '#1F2A52',
  gold:        '#C9A84C',
  goldMuted:   'rgba(201, 168, 76, 0.15)',
  red:         '#8B0000',
  white:       '#FFFFFF',
  text:        '#E8EAF2',
  textMuted:   '#8A93B5',
  success:     '#34D399',
  danger:      '#F87171',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 };

export const fonts = {
  regular: { fontSize: 15, color: colors.text },
  small:   { fontSize: 13, color: colors.textMuted },
  heading: { fontSize: 22, fontWeight: '700' as const, color: colors.white },
  title:   { fontSize: 16, fontWeight: '600' as const, color: colors.white },
  big:     { fontSize: 44, fontWeight: '800' as const, color: colors.white },
};
