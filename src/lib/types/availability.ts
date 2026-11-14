export type AvailabilityStatus = 'available' | 'unavailable' | 'maybe' | 'unknown';

export type Fixture = {
  id: string;
  club_id: string;
  opponent: string;
  match_date: string; // ISO date string
  match_time: string | null;
  venue: string | null;
  format: string;
  created_at: string;
};

export type FixtureAvailability = {
  id: string;
  fixture_id: string;
  user_id: string;
  status: AvailabilityStatus;
  note: string | null;
  updated_at: string;
};

/** Fixture with the current user's availability status attached */
export type FixtureWithMyStatus = Fixture & {
  my_status: AvailabilityStatus;
  my_note: string | null;
};

/** For the captain grid: fixture with a per-player breakdown */
export type FixtureGridRow = Fixture & {
  counts: {
    available: number;
    unavailable: number;
    maybe: number;
    unknown: number;
  };
  players: Array<{
    user_id: string;
    full_name: string;
    display_name: string;
    status: AvailabilityStatus;
  }>;
};
