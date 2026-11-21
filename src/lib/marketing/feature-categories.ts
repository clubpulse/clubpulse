/** Feature categories shown on /features, split by where they are mostly used. */

/* ─── Types ─────────────────────────────────────────── */
export type CategoryId = 'match' | 'ai' | 'coach' | 'hub' | 'performance' | 'team' | 'finance' | 'engagement' | 'community' | 'rewards' | 'wellness' | 'academy';

export type Category = {
  id: CategoryId;
  icon: string;
  label: string;
  tagline: string;
  features: string[];
  audience: 'players' | 'clubs';
};

/* ─── Category metadata ──────────────────────────────── */
export const CATEGORIES: Category[] = [
  /* ── Players ── */
  { id: 'match',       audience: 'players', icon: '🏏', label: 'Match Day',           tagline: 'Everything that happens on matchday, in one place.',        features: ['Live scorecard','Season wrap','Gut feeling predictions','Match mood tracker'] },
  { id: 'coach',       audience: 'players', icon: '🤖', label: 'AI Coach',            tagline: 'A batting and bowling coach in your pocket.',                features: ['AI player report','AI coaching analysis','Video pose tracking','Ball tracking'] },
  { id: 'performance', audience: 'players', icon: '📈', label: 'Performance',         tagline: 'Track your arc from debut to your peak.',                    features: ['Development tracker','Coaching history','Rivalry stats','Cricket CV'] },
  { id: 'engagement',  audience: 'players', icon: '🏅', label: 'Engagement',          tagline: 'Turn participation into pride.',                             features: ['Pulse score','Leaderboard','Hall of Infamy','Raffle','Badges & achievements'] },
  { id: 'rewards',     audience: 'players', icon: '🛍️', label: 'Rewards',             tagline: 'Points that pay for kit, discounts and more.',              features: ['Reward marketplace','Kit discounts','Injury intel','Documents vault','Travel planner'] },
  { id: 'wellness',    audience: 'players', icon: '🧘', label: 'Warm-Up',             tagline: 'Mental preparation for the game: mindset, mindfulness and match-day routines.', features: ['Mind Nets: six weeks of mental skills','Guided breathing and meditation','Match-day checklists','Pre-ball routine builder','Thought for the day'] },
  { id: 'academy',     audience: 'players', icon: '🎓', label: 'Academy',             tagline: 'Short lessons, daily questions and games.',                  features: ['Two-minute lessons','Personal practice plan','Daily cricket question','Auction Room','Honours Board badges'] },
  { id: 'community',   audience: 'players', icon: '🤝', label: 'Community',           tagline: 'The heartbeat of your club between matchdays.',              features: ['Dressing room feed','Wellbeing check-in','Alumni network'] },
  /* ── Clubs ── */
  { id: 'team',        audience: 'clubs',   icon: '👥', label: 'Team Management',     tagline: 'Selection, availability and logistics without the chaos.',  features: ['Availability planner','Transfer window','Mentor matching','School sessions','Qualifications log'] },
  { id: 'finance',     audience: 'clubs',   icon: '💰', label: 'Finance & Fees',      tagline: 'Club finances that actually make sense.',                   features: ['Finance ledger','Fee offset calculator','Community pot','Charity fund','Sponsor a kid'] },
  { id: 'ai',          audience: 'clubs',   icon: '🧠', label: 'Club Intelligence',   tagline: 'Ask your club anything and scout the opposition.',           features: ['Natural language club query','Opposition briefing','Scout mode','Form guide','Gut feeling predictions'] },
  { id: 'hub',         audience: 'clubs',   icon: '📣', label: 'Club Hub',            tagline: 'Run the noticeboard, the rules and the rewards from one place.', features: ['Noticeboard','Club bible','Scores rules','Scratch cards','Coaches and safeguarding'] },
];

