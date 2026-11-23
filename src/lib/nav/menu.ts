// Pure. The signed-in menu: every page, the group it sits in, and who it is for.
// The groups follow the four pillars of the product (Analysis, Community, Wellness, Academy),
// with Match Day first (the club's Saturday) and Rewards running alongside: Scores are earned in every pillar.
// Hiding a link is for tidiness only. Each page still checks for itself who may open it.

export type Role = 'player' | 'coach' | 'parent' | 'volunteer';

/** Who is signed in, as far as the menu cares. */
export type Audience = {
  roles: Role[];
  /** A junior account: nothing that is for adults only. */
  junior: boolean;
  /** Runs a club: sees the club tools. The player side only if they also hold a player role. */
  admin: boolean;
  /** True when no role was on record and `player` was filled in so nobody has an empty menu. */
  defaulted?: boolean;
};

export type NavLink = {
  href: string;
  label: string;
  icon: string;
  /** Shown only to people holding one of these roles. Left out = everyone. */
  for?: Role[];
  /** Hidden from junior accounts. */
  adult?: boolean;
  /** A sub-heading inside a long group. Links with the same one sit together. */
  section?: string;
};

export type NavGroup = { key: string; label: string; icon: string; tint: string; adminOnly?: boolean; links: NavLink[] };

const PLAYING: Role[] = ['player', 'coach'];

export const NAV_GROUPS: NavGroup[] = [
  {
    key: 'matchday',
    label: 'Match Day',
    icon: '🏟️',
    tint: '#22C55E',
    links: [
      { href: '/availability', label: 'Availability', icon: '📅', for: PLAYING },
      { href: '/match-day', label: 'Match Day', icon: '🏟️' },
      { href: '/team-selection', label: 'Team Selection', icon: '🧢', for: PLAYING },
      { href: '/gut-feeling', label: 'Gut Feeling', icon: '⚡' },
      { href: '/season-wrap', label: 'Season Wrap', icon: '🏆', for: PLAYING },
    ],
  },
  {
    key: 'technique',
    label: 'Analysis',
    icon: '🎯',
    tint: '#FBBF24',
    links: [
      { href: '/analyse', label: 'Analyse', icon: '🎥', for: PLAYING },
      { href: '/highlights', label: 'Highlights', icon: '🎬', for: PLAYING },
      { href: '/development', label: 'Development', icon: '📈', for: ['player'] },
      { href: '/player-report', label: 'Player Report', icon: '📊', for: PLAYING },
      { href: '/log-performance', label: 'Log Game', icon: '📋', for: ['player'] },
      { href: '/coaching', label: 'Coaching', icon: '🎓', for: ['player', 'coach', 'parent'] },
      { href: '/companion', label: 'Coach AI', icon: '🧠' },
      { href: '/mentor-match', label: 'Mentor Match', icon: '🤝', for: PLAYING },
      { href: '/opposition-intel', label: 'Opposition Intel', icon: '🕵️', for: PLAYING },
      { href: '/cricket-cv', label: 'My Cricket CV', icon: '📄', for: PLAYING },
    ],
  },
  {
    key: 'community',
    label: 'Community',
    icon: '🤝',
    tint: '#60A5FA',
    links: [
      { href: '/noticeboard', label: 'Noticeboard', icon: '📌', section: 'My club' },
      { href: '/dressing-room', label: 'Dressing Room', icon: '👕', for: PLAYING, section: 'My club' },
      { href: '/club-bible', label: 'Club Bible', icon: '📖', section: 'My club' },
      { href: '/documents', label: 'Documents', icon: '🗂️', section: 'My club' },
      { href: '/finance', label: 'Finance', icon: '💷', for: ['player', 'parent'], adult: true, section: 'My club' },
      { href: '/volunteer', label: 'Volunteering', icon: '🙌', section: 'My club' },
      { href: '/club-alumni', label: 'Alumni', icon: '🎓', section: 'My club' },
      { href: '/transfer-window', label: 'Transfer Window', icon: '🔄', for: PLAYING, adult: true, section: 'People' },
      { href: '/leaderboard', label: 'Leaderboard', icon: '🏅', section: 'People' },
      { href: '/auction', label: 'The Auction', icon: '🔨', section: 'Together' },
      { href: '/curse-the-pitch', label: 'Curse the Pitch', icon: '🌀', section: 'Together' },
      { href: '/hall-of-infamy', label: 'Hall of Infamy', icon: '🤦', section: 'Together' },
    ],
  },
  {
    key: 'wellness',
    label: 'Wellness',
    icon: '🧡',
    tint: '#F472B6',
    links: [
      { href: '/wellness/skills', label: 'Mental Skills', icon: '🧘', for: PLAYING },
      { href: '/wellness/routine', label: 'My Routine', icon: '✅', for: ['player'] },
      { href: '/wellness/recovery', label: 'Recovery Log', icon: '🛌', for: ['player'] },
      { href: '/wellbeing', label: 'Wellbeing', icon: '🧡', for: ['player'] },
      { href: '/match-mood', label: 'Match Mood', icon: '😤', for: ['player'] },
      { href: '/injury-intel', label: 'Injury Intel', icon: '🩹', for: PLAYING },
      { href: '/wellness/settings', label: 'Sharing', icon: '🔒', for: ['player'] },
      { href: '/wellness/team', label: 'Team Readiness', icon: '📊', for: ['coach'] },
      { href: '/wellness/support', label: 'Support', icon: '☎️', for: PLAYING },
    ],
  },
  {
    key: 'academy',
    label: 'Academy',
    icon: '📚',
    tint: '#2DD4BF',
    links: [
      { href: '/academy/plan', label: 'Practice Plan', icon: '🗓️' },
      { href: '/games', label: 'Games', icon: '🎲' },
      { href: '/qualifications', label: 'Qualifications', icon: '🎖️', for: ['player', 'coach', 'volunteer'] },
    ],
  },
  {
    key: 'scores',
    label: 'Rewards',
    icon: '⭐',
    tint: '#EFC84A',
    links: [
      { href: '/play', label: 'Earn Scores', icon: '💰' },
      { href: '/marketplace', label: 'Marketplace', icon: '🛍️' },
      { href: '/kit-discounts', label: 'Kit Discounts', icon: '🧢' },
      { href: '/scratch-cards', label: 'Scratch Cards', icon: '🎟️', adult: true },
      { href: '/raffle', label: 'Raffle', icon: '🎫', adult: true },
      { href: '/fee-offset', label: 'Fee Offset', icon: '🏷️', for: ['player', 'parent'], adult: true },
      { href: '/travel', label: 'Travel', icon: '🗺️', adult: true },
      { href: '/sponsor-a-kid', label: 'Sponsor a Kid', icon: '💝', adult: true },
      { href: '/community-pot', label: 'Community Pot', icon: '🪙', adult: true },
      { href: '/charity', label: 'Charity', icon: '🤲', adult: true },
    ],
  },
  {
    // The club's own tools, for the club admin only. Kept apart from the player menu above.
    key: 'club',
    label: 'Club',
    icon: '🛡️',
    tint: '#F87171',
    adminOnly: true,
    links: [
      { href: '/admin/club', label: 'Club home', icon: '🛡️' },
      { href: '/admin/club/availability', label: 'Match Day', icon: '🏟️' },
      { href: '/admin/club/members', label: 'Members', icon: '👥' },
      { href: '/admin/club/finance', label: 'Finance', icon: '💷' },
      { href: '/admin/club/safeguarding', label: 'Safeguarding', icon: '🧷' },
      { href: '/admin/club/noticeboard', label: 'Noticeboard', icon: '📌', section: 'More' },
      { href: '/admin/club/coaches', label: 'Coaches', icon: '🎓', section: 'More' },
      { href: '/admin/club/scores-rules', label: 'Scores rules', icon: '⭐', section: 'More' },
      { href: '/admin/club/scratch-cards', label: 'Scratch cards', icon: '🎟️', section: 'More' },
      { href: '/admin-query', label: 'Club Intelligence', icon: '🤖', section: 'More' },
      { href: '/admin/club/scout-mode', label: 'Scout Mode', icon: '🔍', section: 'More' },
      { href: '/admin/club/form-guide', label: 'Form Guide', icon: '📉', section: 'More' },
      { href: '/admin/club/gut-feeling', label: 'Gut Feeling results', icon: '🗳️', section: 'More' },
    ],
  },
];

// Volunteering is parked for now: its pages still exist, but nothing links to them. Set
// NEXT_PUBLIC_VOLUNTEERS_ENABLED=true to bring the links back.
export const VOLUNTEERS_ENABLED = process.env.NEXT_PUBLIC_VOLUNTEERS_ENABLED === 'true';
const PARKED = VOLUNTEERS_ENABLED ? [] : ['/volunteer'];

export const SCHOOL_LINK: NavLink = { href: '/school', label: 'School', icon: '🏫', section: 'My club' };

const ROLES: Role[] = ['player', 'coach', 'parent', 'volunteer'];

/**
 * Works out the audience from what is stored. Someone with no role on record is treated as a
 * player, so nobody is left with an empty menu. A club coach or volunteer counts as one even if
 * they never ticked it at sign-up.
 */
export function buildAudience(input: { userRoles: string[]; memberRoles: string[]; junior: boolean; admin: boolean }): Audience {
  const found = new Set<Role>();
  for (const r of [...input.userRoles, ...input.memberRoles]) {
    if ((ROLES as string[]).includes(r)) found.add(r as Role);
  }
  if (input.junior) found.add('player');
  // Nobody gets an empty menu, except a club admin: they run the club, and are a player only if
  // they hold the Player role as well.
  const defaulted = found.size === 0 && !input.admin;
  if (defaulted) found.add('player');
  return { roles: ROLES.filter((r) => found.has(r)), junior: input.junior, admin: input.admin, ...(defaulted ? { defaulted: true } : {}) };
}

/**
 * The same person once they are known to be a club admin by another route (the clubs table).
 * If their roles were only the default player, that default is dropped: a club admin is a player
 * only when they hold the Player role.
 */
export function asAdmin(audience: Audience): Audience {
  if (audience.admin && !audience.defaulted) return audience;
  return { ...audience, admin: true, roles: audience.defaulted ? [] : audience.roles, defaulted: false };
}

/** ShiftUp staff see both sides, so they can look after everyone. */
export function asStaff(audience: Audience): Audience {
  return { ...audience, admin: true, defaulted: false, roles: ROLES };
}

/** Whether the player side (Match Day, Analysis, Community, Wellness, Academy, Rewards) is theirs. */
export function playsCricket(audience: Audience): boolean {
  return audience.roles.length > 0;
}

/**
 * The links across clubs: the feed, finding a teammate, nets and games, connections and your own
 * profile. They are not in NAV_GROUPS because they exist only while the Community is open
 * (COMMUNITY_ENABLED), so a person is never sent to a page that says it is closed.
 */
export const NETWORK_LINKS: NavLink[] = [
  { href: '/community/feed', label: 'Commentary Box', icon: '🎙️', for: PLAYING, section: 'Across clubs' },
  { href: '/community/match', label: 'Find a Teammate', icon: '🤝', for: PLAYING, section: 'Across clubs' },
  { href: '/community/shortages', label: 'Short for Saturday', icon: '📣', for: PLAYING, adult: true, section: 'Across clubs' },
  { href: '/community/match?want=coach&role=coach', label: 'Find a Coach', icon: '🎓', for: ['player'], adult: true, section: 'Across clubs' },
  { href: '/community/near', label: 'Nets and Games', icon: '🏏', for: PLAYING, section: 'Across clubs' },
  { href: '/community/connections', label: 'Connections', icon: '🧢', for: PLAYING, section: 'Across clubs' },
  { href: '/community/notifications', label: 'Notifications', icon: '🔔', for: ['player', 'coach', 'parent'], section: 'Across clubs' },
  { href: '/parent/community', label: 'My Child in Community', icon: '👪', for: ['parent'], section: 'Across clubs' },
  { href: '/community/profile', label: 'My Community Profile', icon: '📋', for: PLAYING, section: 'Across clubs' },
];

export function canSee(link: NavLink, audience: Audience): boolean {
  // The player side belongs to people who hold a player-side role, club admins included
  if (!playsCricket(audience)) return false;
  if (link.adult && audience.junior) return false;
  return !link.for || link.for.some((r) => audience.roles.includes(r));
}

/** The groups this person sees, each with only their links. Empty groups are dropped. */
export function menuFor(audience: Audience, options: { showSchool?: boolean; community?: boolean } = {}): NavGroup[] {
  return NAV_GROUPS
    .filter((g) => !g.adminOnly || audience.admin)
    .map((g) => {
      let links = g.links;
      if (g.key === 'community' && options.community) links = [...NETWORK_LINKS, ...links];
      if (g.key === 'community' && options.showSchool) {
        // School sits at the end of its own section, not at the end of the group
        const after = links.map((l) => l.section).lastIndexOf(SCHOOL_LINK.section) + 1;
        links = [...links.slice(0, after), SCHOOL_LINK, ...links.slice(after)];
      }
      // The club group is the admin's own; every other group is the player side
      return { ...g, links: links.filter((l) => !PARKED.includes(l.href) && (g.adminOnly ? audience.admin : canSee(l, audience))) };
    })
    .filter((g) => g.links.length > 0);
}

const ROLE_LABEL: Record<Role, string> = { player: 'Player', coach: 'Coach', parent: 'Parent', volunteer: 'Volunteer' };

/** A short line saying who the menu is set up for, e.g. "Player · Coach". */
export function audienceLabel(audience: Audience): string {
  const roles = audience.roles.map((r) => ROLE_LABEL[r]);
  if (audience.admin) return ['Club admin', ...roles].join(' · ');
  if (audience.junior) return 'Junior player';
  return roles.join(' · ');
}
