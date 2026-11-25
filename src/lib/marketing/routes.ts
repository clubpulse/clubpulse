// Where the public header and footer point. /for-clubs is live; /for-players and /players/* replace the player
// targets once those pages exist .
export const FOR_CLUBS_HREF = '/for-clubs';
export const FOR_PLAYERS_HREF = '/for-players';

export const PILLAR_LINKS = [
  { key: 'analysis', href: '/players/analysis', label: 'Player Analysis', note: 'Video, Coach AI, stats and your Cricket CV' },
  { key: 'community', href: '/players/community', label: 'Community', note: 'Your club’s noticeboard, and soon players nearby' },
  { key: 'wellness', href: '/players/wellness', label: 'Wellness', note: 'Readiness, preparation and mindset' },
  { key: 'academy', href: '/players/academy', label: 'Academy', note: 'Lessons, games and your qualifications' },
] as const;
