-- ClubWatch: photo-report system for ground issues
-- Members snap issues → submit with category + location → admins verify → Scores awarded

-- ── Report categories (reference table) ──
create table if not exists clubwatch_categories (
  key         text primary key,
  label       text not null,
  description text not null,
  icon        text not null default '📝',
  scores      int  not null default 10,
  sort_order  int  not null default 0
);

insert into clubwatch_categories (key, label, description, icon, scores, sort_order) values
  ('pitch',       'Pitch & Outfield',   'Damage, waterlogging, unsafe areas on the playing surface',  '🏏', 25, 1),
  ('equipment',   'Equipment',          'Broken nets, damaged sightscreens, faulty scoreboards',      '🔧', 20, 2),
  ('facilities',  'Facilities',         'Clubhouse, pavilion, changing rooms, toilets',                '🏗️', 20, 3),
  ('safety',      'Safety Hazard',      'Unsafe surfaces, exposed wiring, broken glass',              '⚠️', 40, 4),
  ('cleanliness', 'Cleanliness',        'Litter, overflowing bins, unkept areas',                     '🧹', 15, 5),
  ('vandalism',   'Vandalism',          'Graffiti, intentional damage, theft',                        '🚨', 50, 6),
  ('improvement', 'Improvement Idea',   'Suggest upgrades or new facilities',                         '💡', 10, 7),
  ('positive',    'Positive Spot',      'Highlight something great about the ground',                 '🌟', 10, 8)
on conflict (key) do nothing;

-- ── Reports table ──
create table if not exists clubwatch_reports (
  id           uuid primary key default gen_random_uuid(),
  club_id      uuid not null references clubs(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  category     text not null references clubwatch_categories(key),
  note         text not null default '',
  photo_url    text,                          -- Supabase Storage path
  latitude     double precision,
  longitude    double precision,
  status       text not null default 'pending' check (status in ('pending', 'verified', 'rejected')),
  reviewed_by  uuid references auth.users(id),
  reviewed_at  timestamptz,
  review_note  text,
  scores_awarded int not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists idx_clubwatch_reports_club   on clubwatch_reports(club_id, created_at desc);
create index if not exists idx_clubwatch_reports_user   on clubwatch_reports(user_id, created_at desc);
create index if not exists idx_clubwatch_reports_status on clubwatch_reports(club_id, status);

-- ── RLS ──
alter table clubwatch_reports enable row level security;
alter table clubwatch_categories enable row level security;

-- Anyone authenticated can read categories
create policy "categories_read" on clubwatch_categories for select to authenticated using (true);

-- Members can read their own reports
create policy "own_reports_read" on clubwatch_reports for select to authenticated
  using (user_id = auth.uid());

-- Club admins can read all reports for their club
create policy "admin_reports_read" on clubwatch_reports for select to authenticated
  using (
    exists (
      select 1 from club_members cm
      where cm.club_id = clubwatch_reports.club_id
        and cm.user_id = auth.uid()
        and cm.role in ('admin', 'owner', 'committee')
        and cm.is_active = true
    )
  );

-- Members can insert reports for their own club
create policy "member_insert" on clubwatch_reports for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from club_members cm
      where cm.club_id = clubwatch_reports.club_id
        and cm.user_id = auth.uid()
        and cm.is_active = true
    )
  );

-- Club admins can update (verify/reject) reports for their club
create policy "admin_update" on clubwatch_reports for update to authenticated
  using (
    exists (
      select 1 from club_members cm
      where cm.club_id = clubwatch_reports.club_id
        and cm.user_id = auth.uid()
        and cm.role in ('admin', 'owner', 'committee')
        and cm.is_active = true
    )
  );

-- ── Leaderboard view ──
create or replace view clubwatch_leaderboard as
select
  r.club_id,
  r.user_id,
  count(*)                                     as total_reports,
  count(*) filter (where r.status = 'verified') as verified_reports,
  coalesce(sum(r.scores_awarded), 0)            as total_scores,
  max(r.created_at)                             as last_report_at
from clubwatch_reports r
where r.created_at >= date_trunc('month', now())
group by r.club_id, r.user_id;
