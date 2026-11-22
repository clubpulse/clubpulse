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
  /* ── Players: four pillars, plus Scores as a thread ── */
  { id: 'coach',       audience: 'players', icon: '🎥', label: 'Player Analysis',     tagline: 'Film a shot or a delivery and see what to work on.',         features: ['Video analysis','Coach AI','Stats and player report','Development tracker','Cricket CV'] },
  { id: 'community',   audience: 'players', icon: '🤝', label: 'Community',           tagline: 'Your club today, cricket\'s network opening soon.',    features: ['Noticeboard','Dressing room','Club documents','Feed, connections and nets near you (opening soon)'] },
  { id: 'wellness',    audience: 'players', icon: '🧘', label: 'Wellness',            tagline: 'Look after your body and your head.',                         features: ['Readiness check-in and trend','Mental-skills guides','Recovery log','Weekly check-in, match mood and injury log'] },
  { id: 'academy',     audience: 'players', icon: '🎓', label: 'Academy',             tagline: 'Short lessons, certificates, daily games and a qualifications log.',        features: ['Two-minute lessons','Practice plan','ShiftUp certificates','Daily games','Qualifications log'] },
  { id: 'rewards',     audience: 'players', icon: '⭐', label: 'Scores',              tagline: 'Earned across every pillar, never sold.',                     features: ['Scores for taking part','Badges and achievements','Leaderboard'] },
  /* ── Clubs ── */
  { id: 'team',        audience: 'clubs',   icon: '👥', label: 'Team Management',     tagline: 'Selection, availability and logistics without the chaos.',  features: ['Availability planner','Pick the XI','Ball-by-ball scoring','School sessions','Qualifications log'] },
  { id: 'finance',     audience: 'clubs',   icon: '💰', label: 'Finance & Fees',      tagline: 'Club finances that actually make sense.',                   features: ['Finance ledger','Match fee tracking','Fee offset calculator','Finance dashboard','Online fee payments (coming soon)'] },
  { id: 'ai',          audience: 'clubs',   icon: '🧠', label: 'Club Intelligence',   tagline: 'Ask your club anything and scout the opposition.',           features: ['Natural language club query','Opposition briefing','Scout mode','Form guide','Gut feeling predictions'] },
  { id: 'hub',         audience: 'clubs',   icon: '📣', label: 'Club Hub',            tagline: 'Run the noticeboard, the rules and the rewards from one place.', features: ['Noticeboard','Club bible','Scores rules','Scratch cards','Coaches and safeguarding'] },
];

