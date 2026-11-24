// The four role pages in the app: Player, Coach, Parent and Admin. Mirrors the website
// (src/lib/nav/role-pages.ts): the same names, colours and wording, with the app's own screens
// as each page's tools. The figures come from GET /api/role-page.

import type { UserRole } from './roles';
import { VOLUNTEERS_ENABLED } from '../constants/features';

export type PageRole = 'player' | 'coach' | 'parent' | 'admin';

/** Where a button goes: a screen in the app, or a SHIFTUP web page shown inside it. */
export type Target = { screen: string } | { web: string; title: string; camera?: boolean };

export type RoleTool = { label: string; detail: string; icon: string; tint: string; to: Target };

export type RolePageConfig = {
  role: PageRole;
  title: string;
  /** The words between the person's name and the title: "Sam, as a Player" */
  lead: string;
  tagline: string;
  icon: string;
  from: string;
  to: string;
  action: { label: string; to: Target };
  tools: RoleTool[];
};

const analyse: Target = { web: '/analyse', title: 'Analyse', camera: true };

export const ROLE_PAGES: Record<PageRole, RolePageConfig> = {
  player: {
    role: 'player', title: 'Player', lead: 'as a', icon: '🏏', from: '#22C55E', to: '#86EFAC',
    tagline: 'Your game, your form and your next match.',
    action: { label: 'Open Action Replay', to: analyse },
    tools: [
      { label: 'Action Replay', detail: 'Film a shot or a delivery', icon: '🎥', tint: '#F97316', to: analyse },
      { label: 'Coaching', detail: 'Highlights, progress and coaches', icon: '📈', tint: '#F97316', to: { screen: '/coaching' } },
      { label: 'Academy', detail: 'Lessons and a practice plan', icon: '📚', tint: '#A78BFA', to: { screen: '/academy' } },
      { label: 'Match Play', detail: 'Daily quizzes and Season Manager', icon: '🕹️', tint: '#A78BFA', to: { screen: '/games' } },
      { label: 'Run Chase', detail: 'Daily, weekly and monthly goals', icon: '🎁', tint: '#EFC84A', to: { screen: '/rewards' } },
      { label: 'Twelfth Man', detail: 'Ask anything about your game', icon: '🧠', tint: '#F97316', to: { screen: '/companion' } },
    ],
  },
  coach: {
    role: 'coach', title: 'Coach', lead: 'as a', icon: '🎓', from: '#F97316', to: '#FDBA74',
    tagline: 'Your sessions, your players and your qualifications.',
    action: { label: 'Manage my coaching', to: { web: '/coaching?tab=coach', title: 'Coaching' } },
    tools: [
      { label: 'Fixture Card', detail: 'Your sessions and bookings', icon: '🗓️', tint: '#F97316', to: { web: '/coaching?tab=coach', title: 'Coaching' } },
      { label: 'Form Guide', detail: "Your players' technique progress", icon: '📊', tint: '#F97316', to: { screen: '/player-progress' } },
      { label: 'Action Replay', detail: 'Film a player and mark the clip', icon: '🎥', tint: '#F97316', to: analyse },
      { label: 'Coaches', detail: 'Coaches approved by your club', icon: '🧑‍🏫', tint: '#60A5FA', to: { screen: '/(tabs)/coaches' } },
      { label: 'Academy', detail: 'Lessons to share with players', icon: '📚', tint: '#A78BFA', to: { screen: '/academy' } },
      { label: 'Twelfth Man', detail: 'Ideas for drills and sessions', icon: '🧠', tint: '#F97316', to: { screen: '/companion' } },
    ],
  },
  parent: {
    role: 'parent', title: 'Parent', lead: 'as a', icon: '👪', from: '#A78BFA', to: '#C4B5FD',
    tagline: 'Your children, their consents and what the club needs from you.',
    action: { label: 'Open My Juniors', to: { screen: '/safeguarding' } },
    tools: [
      { label: 'My Juniors', detail: 'Consents, details and safeguarding', icon: '👪', tint: '#A78BFA', to: { screen: '/safeguarding' } },
      { label: 'Add a Junior', detail: 'Link your child to their club', icon: '➕', tint: '#A78BFA', to: { screen: '/register-child' } },
      { label: 'Coaches', detail: 'Coaches approved by your club', icon: '🧑‍🏫', tint: '#60A5FA', to: { screen: '/(tabs)/coaches' } },
      { label: 'Clubhouse', detail: 'Your club and its members', icon: '🏟️', tint: '#60A5FA', to: { screen: '/(tabs)/club' } },
      { label: 'Twelfth Man', detail: 'Questions about the game', icon: '🧠', tint: '#F97316', to: { screen: '/companion' } },
    ],
  },
  admin: {
    role: 'admin', title: 'Admin', lead: 'as an', icon: '🛡️', from: '#F87171', to: '#FCA5A5',
    tagline: 'Your club at a glance, and what is waiting for you.',
    action: { label: 'Open the Clubhouse', to: { screen: '/(tabs)/club' } },
    tools: [
      { label: 'Clubhouse', detail: 'Members, invites and requests', icon: '🏟️', tint: '#60A5FA', to: { screen: '/(tabs)/club' } },
      ...(VOLUNTEERS_ENABLED ? [
        { label: 'Post a shift', detail: 'Ask members for help', icon: '📣', tint: '#34D399', to: { screen: '/post-shift' } },
        { label: 'Volunteer shifts', detail: 'What is covered and what is not', icon: '🤝', tint: '#34D399', to: { screen: '/(tabs)/shifts' } },
      ] : []),
      { label: 'Coaches', detail: 'Approve and review coaches', icon: '🧑‍🏫', tint: '#F97316', to: { screen: '/(tabs)/coaches' } },
      { label: 'Club admin', detail: 'Every admin tool, on the website', icon: '🧰', tint: '#F87171', to: { web: '/admin/club', title: 'Club admin' } },
    ],
  },
};

const ORDER: PageRole[] = ['player', 'coach', 'parent', 'admin'];

/** The role pages someone has, from the roles they hold. Volunteer has no page of its own. */
export function rolePagesFor(roles: UserRole[]): PageRole[] {
  const held = roles.length > 0 ? roles : (['player'] as UserRole[]);
  return ORDER.filter((r) => (r === 'admin' ? held.includes('club_admin') : held.includes(r)));
}

export const isPageRole = (v: unknown): v is PageRole => typeof v === 'string' && (ORDER as string[]).includes(v);
