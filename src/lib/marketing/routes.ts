// Where the public header and footer point. Prompts 2 and 3 replace these with /for-clubs,
// /for-players and /players/* once those pages exist; until then they use the live pages.
export const FOR_CLUBS_HREF = '/features/clubs';
export const FOR_PLAYERS_HREF = '/features/players';

export const PILLAR_LINKS = [
  { key: 'analysis', href: '/features/players#coach', label: 'Player Analysis', note: 'Video, Coach AI, stats and your Cricket CV' },
  { key: 'community', href: '/features/players#community', label: 'Community', note: 'Your club, and soon players and games nearby' },
  { key: 'wellness', href: '/features/players#wellness', label: 'Wellness', note: 'Readiness, preparation and mindset' },
  { key: 'academy', href: '/features/players#academy', label: 'Academy', note: 'Lessons, games and your qualifications' },
] as const;
