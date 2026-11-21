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
  headline: string; about: string; lookingFor: LookingFor[]; openToClub: boolean;
  connections: number; mine: boolean; link: 'self' | 'none' | 'requested' | 'incoming' | 'connected'; connectionId: string | null;
};
export type NearbyPerson = { id: string; name: string; club: string | null; roles: string[]; distance: string | null; headline: string; lookingFor: LookingFor[]; openToClub: boolean };
export type ConnectionRow = { id: string; person: { id: string; name: string; club: string | null }; state: 'connected' | 'incoming' | 'requested'; last: string | null };
export type Message = { id: string; body: string; createdAt: string; mine: boolean };

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
