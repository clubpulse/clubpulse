export type PostKind = 'announcement' | 'chat' | 'poll';

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface DressingRoomPost {
  id: string;
  club_id: string;
  user_id: string;
  kind: PostKind;
  body: string;
  poll_options: PollOption[] | null;
  poll_votes: Record<string, string>; // { user_id: option_id }
  pinned: boolean;
  created_at: string;
  // joined from profiles
  display_name?: string | null;
  avatar_url?: string | null;
}
