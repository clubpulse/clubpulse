// The four pillars, as the app's footer shows them: Technique, Community, Wellness and Academy.
// Each has its own colours and the same layout as every other page: four tiles, one large tile
// beneath them, then smaller tiles. Mirrors the
// website's pillars (src/lib/nav/pillars.ts). Who sees a tile follows the menu's rules.

import { MENU, canSee, type MenuLink, type Viewer } from './menu';
import { COMMUNITY_ENABLED } from '../constants/features';

export type PillarKey = 'technique' | 'community' | 'wellness' | 'academy';

export type Pillar = {
  key: PillarKey;
  /** The tab screen's file name in app/(tabs) */
  tab: string;
  title: string;
  emoji: string;
  /** Ionicons name for the footer */
  icon: 'analytics' | 'people' | 'heart' | 'school';
  from: string;
  to: string;
  tagline: string;
  /** The one large tile: the thing this pillar is for */
  big: string;
  /** Up to four tiles shown above it, most useful first */
  top: string[];
  /** Tiles the menu does not list */
  extra: MenuLink[];
  /** Shown under the tiles when more is being built */
  soon?: string;
};

const PLAYING: MenuLink['for'] = ['player', 'coach'];

export const PILLARS: Pillar[] = [
  {
    key: 'technique', tab: 'technique', title: 'Analysis', emoji: '🎯', icon: 'analytics', from: '#FBBF24', to: '#FDE68A',
    tagline: 'Technique: film your batting or bowling and see exactly what to work on.',
    big: 'analyse',
    top: ['form', 'coaching', 'coach-ai', 'find-coach', 'plan'],
    extra: [
      { key: 'find-coach', label: 'Coaches', detail: 'Find a coach approved by your club', icon: '🧑‍🏫', route: '/(tabs)/coaches', for: ['player', 'coach', 'parent', 'club_admin'] },
      { key: 'plan', label: 'Net Plan', detail: 'Your practice plan for this week', icon: '🗓️', route: '/academy-plan', for: PLAYING },
    ],
  },
  {
    key: 'community', tab: 'community', title: 'Community', emoji: '🤝', icon: 'people', from: '#60A5FA', to: '#93C5FD',
    tagline: 'Community: your club, your matches and the people you play with.',
    big: 'club',
    top: ['children', 'post-shift', 'coaches', 'shifts', 'league', 'profile'],
    extra: [
      { key: 'league', label: 'Points Table', detail: 'Your club league: see where you stand', icon: '🏆', route: '/rewards' },
      { key: 'profile', label: 'My profile', detail: 'Your roles and details', icon: '👤', route: '/(tabs)/profile' },
    ],
    soon: 'Cricket people across your region, beyond your own club, are on the way.',
  },
  {
    key: 'wellness', tab: 'wellness', title: 'Wellness', emoji: '🧡', icon: 'heart', from: '#F472B6', to: '#F9A8D4',
    tagline: 'Wellness: your mindset, getting ready and being mentally prepared to play.',
    big: 'training',
    top: ['mindfulness', 'meditation', 'mindset', 'matchday'],
    extra: [
      { key: 'training', label: 'Mind Nets', detail: 'Psychological training: six weeks, one skill a week', icon: '🎯', route: '/warmup/training' },
      { key: 'routine', label: 'My Routine', detail: 'Build what you do before every ball', icon: '🔁', route: '/warmup/routine' },
      { key: 'matchday', label: 'Match Day', detail: 'Game preparation: the night before to walking out', icon: '🏏', route: '/warmup/matchday' },
      { key: 'mindfulness', label: 'Watch the Ball', detail: 'Mindfulness: stay in the moment', icon: '👁️', route: '/warmup/mindfulness' },
      { key: 'meditation', label: 'Still Head', detail: 'Meditation: guided and timed', icon: '🧘', route: '/warmup/meditation' },
      { key: 'mindset', label: 'Between the Ears', detail: 'Mindset: nerves, confidence, pressure', icon: '🧠', route: '/warmup/mindset' },
      { key: 'awareness', label: 'Reading the Game', detail: 'Game awareness: what the situation needs', icon: '🧭', route: '/warmup/awareness' },
      { key: 'tips', label: 'Team Talk', detail: 'Quick tips for batters, bowlers and fielders', icon: '💬', route: '/warmup/tips' },
      { key: 'support', label: 'Talk to Someone', detail: 'Where to turn when things are hard', icon: '🤝', route: '/warmup/support' },
      { key: 'readiness', label: 'Readiness', detail: 'Check in before you play and see your four weeks', icon: '📈', route: '/warmup/readiness', for: PLAYING },
      { key: 'recovery', label: 'Recovery Log', detail: 'How your body feels after playing. Private', icon: '🩹', route: '/warmup/recovery', for: PLAYING },
      { key: 'sharing', label: 'Sharing', detail: 'Choose whether your coach sees your averages', icon: '🔒', route: '/warmup/sharing', for: PLAYING },
      { key: 'check-in', label: 'The Toss', detail: 'Your daily check-in: keep your streak going', icon: '🔥', route: '/rewards' },
    ],
  },
  {
    key: 'academy', tab: 'learn', title: 'Academy', emoji: '📚', icon: 'school', from: '#2DD4BF', to: '#5EEAD4',
    tagline: 'Learn the game: its Laws, its tactics and its skills.',
    big: 'academy',
    top: ['games', 'plan', 'umpire', 'manager'],
    extra: [
      { key: 'plan', label: 'Net Plan', detail: 'Your practice plan for this week', icon: '🗓️', route: '/academy-plan', for: PLAYING },
      { key: 'umpire', label: "Umpire's Call", detail: 'Five decisions a day', icon: '☝️', route: '/knowledge/umpire' },
      { key: 'whoami', label: 'Who Am I?', detail: 'Name the cricketer', icon: '🕵️', route: '/knowledge/whoami' },
      { key: 'scorecard', label: 'Scorecard Detective', detail: 'Find the missing number', icon: '🔢', route: '/knowledge/scorecard' },
      { key: 'manager', label: 'Season Manager', detail: 'Pick your eleven', icon: '📋', route: '/season-manager' },
      { key: 'auction', label: 'Auction Room', detail: 'Build a squad of 15', icon: '🔨', route: '/auction-room' },
    ],
  },
];

// With the Community switched on, its page leads with the social side. The headings are cricket
// terms, each with a plain line underneath saying what it is: Commentary Box (the feed),
// Partnerships (meeting people), My Squad (connections) and My Scorecard (the profile).
const SOCIAL: MenuLink[] = [
  { key: 'feed', label: 'Commentary Box', detail: 'The feed: what cricket people near you are sharing', icon: '🎙️', route: '/community/feed' },
  { key: 'nearby', label: 'Partnerships', detail: 'Meet cricket people around you', icon: '🤝', route: '/community/nearby' },
  { key: 'shortages', label: 'Short for Saturday', detail: 'Clubs that need players for a game', icon: '📣', route: '/community/shortages' },
  { key: 'clubs-nearby', label: 'Clubs near you', detail: 'Find a club to join or visit', icon: '🏟️', route: '/community/clubs-nearby' },
  { key: 'notifications', label: 'Notifications', detail: 'Requests and replies', icon: '🔔', route: '/community/notifications' },
  { key: 'sessions', label: 'Nets and Games', detail: 'Nets sessions and pick-up games near you', icon: '🏏', route: '/community/sessions' },
  { key: 'connections', label: 'My Squad', detail: 'Your connections and messages', icon: '🧢', route: '/community/connections' },
  { key: 'cv', label: 'My Scorecard', detail: 'Your profile and cricket CV', icon: '📋', route: '/community/profile' },
];

export const pillarByKey = (key: PillarKey): Pillar => {
  const pillar = PILLARS.find((p) => p.key === key)!;
  if (key !== 'community' || !COMMUNITY_ENABLED) return pillar;
  return { ...pillar, tagline: 'Community: meet cricket people, share your game and build your network.', big: 'feed', top: ['nearby', 'connections', 'cv', 'club'], extra: [...SOCIAL, ...pillar.extra.filter((l) => l.key !== 'profile')], soon: undefined };
};
/** A pillar's tiles for this person: up to four on top, the large one, then the rest. */
export function pillarTiles(key: PillarKey, viewer: Viewer): { top: MenuLink[]; big: MenuLink | null; rest: MenuLink[] } {
  const pillar = pillarByKey(key);
  const group = MENU.find((g) => g.key === key);
  const all = [...(group?.links ?? []), ...pillar.extra].filter((l) => canSee(l, viewer));
  const big = all.find((l) => l.key === pillar.big) ?? null;
  const top = pillar.top.map((k) => all.find((l) => l.key === k)).filter((l): l is MenuLink => !!l).slice(0, 4);
  const used = new Set([big?.key, ...top.map((l) => l.key)]);
  return { top, big, rest: all.filter((l) => !used.has(l.key)) };
}
