// What the Community screens share: the shapes the server sends, the region sizes and the
// "looking for" choices. The rules themselves live on the server (src/lib/community).

export const BLUE = '#60A5FA';

export type Scope = 'club' | 'miles' | 'league' | 'county' | 'all';
export const SCOPES: Array<{ key: Scope; label: string }> = [
  { key: 'club', label: 'My club' },
  { key: 'miles', label: 'Within 10 miles' },
  { key: 'league', label: 'My league' },
  { key: 'county', label: 'My county' },
  { key: 'all', label: 'Everyone' },
];

export type LookingFor = 'net_partner' | 'club' | 'coach' | 'teammates';
export const LOOKING_FOR: Array<{ key: LookingFor; label: string }> = [
  { key: 'net_partner', label: 'Net partner' },
  { key: 'club', label: 'A club' },
  { key: 'coach', label: 'A coach' },
  { key: 'teammates', label: 'Teammates' },
];
export type Standard = 'social' | 'club' | 'league' | 'county';
export const STANDARDS: Array<{ key: Standard; label: string }> = [
  { key: 'social', label: 'Social' }, { key: 'club', label: 'Club' }, { key: 'league', label: 'League' }, { key: 'county', label: 'County' },
];
export type Availability = 'weekday_evenings' | 'weekends';
export const AVAILABILITY: Array<{ key: Availability; label: string }> = [{ key: 'weekday_evenings', label: 'Weekday evenings' }, { key: 'weekends', label: 'Weekends' }];
export type RoleFilter = 'player' | 'coach';
export const ROLES: Array<{ key: RoleFilter; label: string }> = [{ key: 'player', label: 'Players' }, { key: 'coach', label: 'Coaches' }];
export const WITHIN: Array<{ key: '5' | '10' | '25'; label: string }> = [{ key: '5', label: '5 miles' }, { key: '10', label: '10 miles' }, { key: '25', label: '25 miles' }];
export const standardLabel = (k: string) => STANDARDS.find((s) => s.key === k)?.label ?? k;
export const availabilityLabel = (k: string) => AVAILABILITY.find((s) => s.key === k)?.label ?? k;

export const lookingLabel = (k: LookingFor) => LOOKING_FOR.find((l) => l.key === k)?.label ?? k;

/** The answer to anything written: it is live, or it was stopped and here is why. */
export type Posted = { status: 'live' | 'held'; tell: string | null };

export type FeedPost = {
  id: string; body: string; createdAt: string; mine: boolean; held: boolean;
  author: { id: string; name: string; club: string | null; junior: boolean };
  likes: number; liked: boolean; comments: number;
};
export type Feed = { scope: Scope; posts: FeedPost[]; canFilter: { miles: boolean; league: boolean; county: boolean } };
export type Comment = { id: string; body: string; createdAt: string; mine: boolean; author: { id: string; name: string } };

export type Profile = {
  id: string; name: string; junior: boolean; club: string | null; roles: string[];
  headline: string; about: string; lookingFor: LookingFor[]; openToClub: boolean; standard: Standard | null; availability: Availability[];
  connections: number; mine: boolean; link: 'self' | 'none' | 'requested' | 'incoming' | 'connected'; connectionId: string | null;
};
export type NearbyPerson = { id: string; name: string; club: string | null; roles: string[]; distance: string | null; headline: string; lookingFor: LookingFor[]; openToClub: boolean; standard: Standard | null; availability: Availability[] };
export type ClubCard = { id: string; name: string; county: string | null; league: string | null; distance: string | null; headline: string; netsNotes: string; following: boolean };
export type Notice = { id: string; kind: 'connect_request' | 'connect_accepted' | 'parent_connection' | 'parent_approval_needed' | 'message'; title: string; body: string | null; read: boolean; createdAt: string };
export type ConnectionRow = { id: string; person: { id: string; name: string; club: string | null }; state: 'connected' | 'incoming' | 'requested'; last: string | null };
export type Message = { id: string; body: string; createdAt: string; mine: boolean };

/** A connection between two young people waiting on this parent, for one of their children. Names are first names only. */
export type ApprovalRequest = { connectionId: string; childId: string; childName: string; otherName: string; otherClub: string | null; decided: 'approved' | null };
export type ApprovalState = 'opened' | 'waiting' | 'declined';
/** What to tell the parent after they answer. */
export function approvalMessage(state: ApprovalState): string {
  if (state === 'opened') return 'Approved. They can now message each other.';
  if (state === 'waiting') return 'Thank you. Waiting for the other young person’s parent to answer.';
  return 'Declined. The request is closed.';
}

export const initials = (name: string) => name.split(/\s+/).map((p) => p[0] ?? '').join('').slice(0, 2).toUpperCase() || '?';

export function ago(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'yesterday' : `${days} days ago`;
}
