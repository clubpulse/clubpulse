// Seeds a FICTIONAL demo club so the four pillars can be shown with life in them.
//
//   DEMO_SEED=yes npx tsx scripts/seed-demo-club.ts --confirm
//
// Required environment (from .env.local, or exported):
//   NEXT_PUBLIC_SUPABASE_URL       the project's URL
//   SUPABASE_SERVICE_ROLE_KEY      the service role key (never printed)
//   DEMO_SEED=yes                  explicit opt-in
// Optional:
//   DEMO_PASSWORD                  password for every demo account. Defaults to the value below; change it.
//
// Safety:
//   - Needs DEMO_SEED=yes AND --confirm.
//   - Refuses if the database holds any profile whose email is not @example.com, unless you also pass
//     --this-is-a-demo-project. Use a dedicated demo Supabase project, never one with real members.
//   - Only ever creates or updates the fictional accounts and the two clubs named below. It deletes nothing.
//   - Safe to run again: it reuses what exists.
//
// Everything is fictional: @example.com addresses, made-up names, a ground in Bath. No real people,
// photos or addresses. The Community flags are NOT changed by this script; see COMMUNITY.md.
//
// Apply every migration up to 20261122000007 first.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { DEMO_CLUB_NAMES, demoScore, guardSeed, isDemoEmail, nextWeekday } from '../src/lib/demo/guard';
import { LESSONS } from '../src/lib/academy/content';

const DEFAULT_PASSWORD = 'DemoPass-ShiftUp-2026!';

type Person = { key: string; email: string; name: string; display: string; role: 'club_admin' | 'coach' | 'parent' | 'player'; junior?: boolean; club: 'main' | 'rovers' };

const PEOPLE: Person[] = [
  { key: 'admin', email: 'demo-admin@example.com', name: 'Demo Admin', display: 'Alex', role: 'club_admin', club: 'main' },
  { key: 'coach', email: 'demo-coach@example.com', name: 'Demo Coach', display: 'Casey', role: 'coach', club: 'main' },
  { key: 'parent', email: 'demo-parent@example.com', name: 'Demo Parent', display: 'Pat', role: 'parent', club: 'main' },
  { key: 'captain', email: 'demo-captain@example.com', name: 'Demo Captain', display: 'Sam', role: 'player', club: 'main' },
  { key: 'opener', email: 'demo-opener@example.com', name: 'Demo Opener', display: 'Jordan', role: 'player', club: 'main' },
  { key: 'spinner', email: 'demo-spinner@example.com', name: 'Demo Spinner', display: 'Riley', role: 'player', club: 'main' },
  { key: 'keeper', email: 'demo-keeper@example.com', name: 'Demo Keeper', display: 'Morgan', role: 'player', club: 'main' },
  { key: 'allrounder', email: 'demo-allrounder@example.com', name: 'Demo Allrounder', display: 'Taylor', role: 'player', club: 'main' },
  { key: 'junior1', email: 'demo-junior-one@example.com', name: 'Junior Demo One', display: 'Junior Demo One', role: 'player', junior: true, club: 'main' },
  { key: 'junior2', email: 'demo-junior-two@example.com', name: 'Junior Demo Two', display: 'Junior Demo Two', role: 'player', junior: true, club: 'main' },
  { key: 'rival', email: 'demo-rival@example.com', name: 'Demo Rival', display: 'Quinn', role: 'player', club: 'rovers' },
];

function fail(message: string): never { throw new Error(message); }
function must<T>(label: string, res: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (res.error || res.data === null || res.data === undefined) fail(`${label}: ${res.error?.message ?? 'no data'}`);
  return res.data as NonNullable<T>;
}
async function tolerate(label: string, p: PromiseLike<{ error: { message: string } | null }>) {
  const { error } = await p;
  if (error) console.warn(`  ! ${label}: ${error.message}`);
}

async function findUserId(db: SupabaseClient, email: string): Promise<string | null> {
  for (let page = 1; page <= 20; page++) {
    const { data } = await db.auth.admin.listUsers({ page, perPage: 200 });
    const hit = data?.users.find((u) => u.email?.toLowerCase() === email);
    if (hit) return hit.id;
    if (!data || data.users.length < 200) return null;
  }
  return null;
}

async function ensureUser(db: SupabaseClient, p: Person, password: string): Promise<string> {
  let id = await findUserId(db, p.email);
  if (!id) {
    const { data, error } = await db.auth.admin.createUser({ email: p.email, password, email_confirm: true, user_metadata: { full_name: p.name } });
    if (error || !data.user) fail(`createUser ${p.email}: ${error?.message}`);
    id = data.user.id;
  }
  await tolerate(`profile ${p.email}`, db.from('profiles').upsert({ id, full_name: p.name, display_name: p.display, email: p.email }));
  return id;
}

async function ensureClub(db: SupabaseClient, name: string, slug: string, lat: number, lng: number): Promise<string> {
  const { data: existing } = await db.from('clubs').select('id').eq('name', name).maybeSingle();
  if (existing) return existing.id as string;
  return must(`club ${name}`, await db.from('clubs').insert({ name, slug, sport: 'cricket', county: 'Somerset', league: 'Demo Valley League', ground_lat: lat, ground_lng: lng }).select('id').single()).id as string;
}

async function main() {
  try { process.loadEnvFile('.env.local'); } catch { /* env may already be set */ }
  const db0 = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } }) : null;

  let real = 0;
  if (db0) {
    const { data } = await db0.from('profiles').select('email').limit(1000);
    real = (data ?? []).filter((r) => !isDemoEmail(r.email as string | null)).length;
  }
  const guard = guardSeed({ env: process.env, argv: process.argv.slice(2), realLookingProfiles: real });
  if (!guard.ok) fail(guard.reason);
  const db = db0!;
  const password = process.env.DEMO_PASSWORD || DEFAULT_PASSWORD;

  console.log('Seeding fictional demo data…');
  const main = await ensureClub(db, DEMO_CLUB_NAMES[0], 'clubpulse-demo-cc', 51.3811, -2.3590);
  const rovers = await ensureClub(db, DEMO_CLUB_NAMES[1], 'clubpulse-demo-rovers-cc', 51.4016, -2.3105);
  const club = { main, rovers };

  const id: Record<string, string> = {};
  for (const p of PEOPLE) {
    id[p.key] = await ensureUser(db, p, password);
    await tolerate(`membership ${p.email}`, db.from('club_members').upsert({ club_id: club[p.club], user_id: id[p.key], role: p.role, is_active: true, is_junior: p.junior === true }, { onConflict: 'club_id,user_id' }));
  }

  // The junior's parent link, so /parent/community has something to show
  const { data: childRow } = await db.from('child_profiles').select('id').eq('club_id', main).eq('first_name', 'Junior').eq('last_name', 'Demo One').maybeSingle();
  const childId = (childRow?.id as string | undefined) ?? must('child', await db.from('child_profiles').insert({ club_id: main, first_name: 'Junior', last_name: 'Demo One', date_of_birth: '2014-06-01', photo_consent: false, data_consent: true }).select('id').single()).id as string;
  await tolerate('link child to account', db.from('child_profiles').update({ linked_user_id: id.junior1 }).eq('id', childId));
  await tolerate('parent link', db.from('parent_child_links').upsert({ parent_id: id.parent, child_id: childId, relationship: 'parent', verified_at: new Date().toISOString() }, { onConflict: 'parent_id,child_id' }));

  // A Saturday fixture, availability and an XI
  const saturday = nextWeekday(new Date(), 6);
  const { data: fx } = await db.from('fixtures').select('id').eq('club_id', main).eq('match_date', saturday).maybeSingle();
  const fixtureId = fx?.id as string | undefined ?? must('fixture', await db.from('fixtures').insert({ club_id: main, opponent: 'ShiftUp Demo Rovers CC', match_date: saturday, match_time: '13:00', venue: 'Demo Ground, Bath', format: 'league' }).select('id').single()).id as string;
  const adults = ['captain', 'opener', 'spinner', 'keeper', 'allrounder'];
  for (const [i, k] of adults.entries()) await tolerate(`availability ${k}`, db.from('fixture_availability').upsert({ fixture_id: fixtureId, user_id: id[k], status: i === 4 ? 'maybe' : 'available' }, { onConflict: 'fixture_id,user_id' }));
  await tolerate('XI', db.from('fixture_team_selections').upsert({ fixture_id: fixtureId, club_id: main, selected_players: adults.slice(0, 4).map((k) => id[k]), confirmed_by: id.captain }, { onConflict: 'fixture_id' }));

  // Community: profiles, posts (three live, one held for the inbox), a mutual connection, sessions
  await tolerate('community profiles', db.from('community_profiles').upsert([
    { user_id: id.captain, headline: 'Captain, top-order bat', about: 'Fictional demo player.', looking_for: ['net_partner'], open_to_club: false },
    { user_id: id.rival, headline: 'Quick bowler, Demo Rovers', about: 'Fictional demo player.', looking_for: ['teammates', 'net_partner'], open_to_club: true },
    { user_id: id.junior1, headline: 'Learning to bowl off spin', about: 'Fictional demo junior.', looking_for: ['net_partner'], open_to_club: false },
  ]));
  const { count: postCount } = await db.from('community_posts').select('id', { count: 'exact', head: true }).eq('club_id', main);
  if (!postCount) {
    await tolerate('posts', db.from('community_posts').insert([
      { author_id: id.captain, club_id: main, body: 'Great session in the nets tonight. Saturday’s XI is up on ShiftUp.', status: 'live' },
      { author_id: id.spinner, club_id: main, body: 'Anyone up for early nets on Thursday before work?', status: 'live' },
      { author_id: id.keeper, club_id: main, body: 'Thank you to everyone who helped with the working party at the ground.', status: 'live' },
      { author_id: id.opener, club_id: main, body: 'This post is held to show the moderation inbox (demo).', status: 'held', held_reason: 'Held by the safety check (demo)' },
    ]));
  }
  await tolerate('connection', db.from('community_connections').upsert({ requester_id: id.captain, addressee_id: id.rival, status: 'accepted', responded_at: new Date().toISOString() }, { onConflict: 'requester_id,addressee_id' }));
  const when = (days: number, hour: number) => { const d = new Date(); d.setUTCDate(d.getUTCDate() + days); d.setUTCHours(hour, 30, 0, 0); return d.toISOString(); };
  const { count: sessionCount } = await db.from('community_sessions').select('id', { count: 'exact', head: true }).eq('club_id', main);
  if (!sessionCount) {
    const rows = await db.from('community_sessions').insert([
      { host_id: id.captain, club_id: main, kind: 'nets', age_band: 'adult', title: 'Thursday evening nets', note: 'All abilities. Bring your own bat.', place: 'Demo Ground, Bath', starts_at: when(4, 18), capacity: 8 },
      { host_id: id.coach, club_id: main, kind: 'nets', age_band: 'junior', title: 'Junior nets with the coach', note: 'Juniors at Demo CC only.', place: 'Demo Ground, Bath', starts_at: when(5, 17), capacity: 10 },
    ]).select('id, age_band');
    const junior = (rows.data ?? []).find((r) => r.age_band === 'junior');
    if (junior) await tolerate('junior signup', db.from('community_session_signups').upsert({ session_id: junior.id, user_id: id.junior1 }));
  }
  const { count: rivalSession } = await db.from('community_sessions').select('id', { count: 'exact', head: true }).eq('club_id', rovers);
  if (!rivalSession) await tolerate('rovers session', db.from('community_sessions').insert({ host_id: id.rival, club_id: rovers, kind: 'pickup', age_band: 'adult', title: 'Sunday pick-up game', note: 'Friendly, mixed abilities.', place: 'Royal Victoria Park, Bath', starts_at: when(6, 10), capacity: 14 }));

  // Wellness: two weeks of readiness for two players, and one sharing averages with the coach
  const day = (back: number) => { const d = new Date(); d.setUTCDate(d.getUTCDate() - back); return d.toISOString().slice(0, 10); };
  const readiness = ['captain', 'opener'].flatMap((k, si) => Array.from({ length: 14 }, (_, back) => ({
    user_id: id[k], club_id: main, check_date: day(back + 1),
    sleep: demoScore(si + 1, back, 3 + (back < 5 ? 1 : 0)), mood: demoScore(si + 2, back, 4), soreness: demoScore(si + 3, back, 3), stress: demoScore(si + 4, back, 3),
    notes: null,
  })));
  await tolerate('readiness', db.from('wellness_readiness').upsert(readiness, { onConflict: 'user_id,check_date' }));
  await tolerate('share consent', db.from('wellness_share_consent').upsert({ user_id: id.captain, club_id: main, share_readiness: true, agreed_at: new Date().toISOString() }, { onConflict: 'user_id,club_id' }));

  // Academy: the captain has finished the skills track (a certificate); others have a few lessons
  const skills = LESSONS.filter((l) => l.track === 'skills');
  const passed = [
    ...skills.map((l) => ({ k: 'captain', l })),
    ...LESSONS.filter((l) => l.track === 'game').slice(0, 3).map((l) => ({ k: 'opener', l })),
    ...skills.slice(0, 2).map((l) => ({ k: 'junior1', l })),
  ];
  await tolerate('academy progress', db.from('academy_progress').upsert(passed.map(({ k, l }, i) => ({
    user_id: id[k], lesson_id: l.id, best_score: 3, passed: true, first_passed_at: new Date(Date.now() - (passed.length - i) * 86_400_000).toISOString(),
  })), { onConflict: 'user_id,lesson_id' }));
  await tolerate('academy badge', db.rpc('award_badge', { p_user_id: id.captain, p_badge_slug: 'academy-skills', p_club_id: main, p_reason: 'Finished the Cricket skills track (demo)' }));

  // Scores through the real engine, so balances match the rules
  for (const { k, l } of passed) await db.rpc('award_scores', { p_user_id: id[k], p_club_id: main, p_source: 'academy_lesson', p_reference: l.id, p_multiplier: 1 });
  await db.rpc('award_scores', { p_user_id: id.captain, p_club_id: main, p_source: 'academy_track', p_reference: 'skills', p_multiplier: 1 });
  for (const k of ['captain', 'opener']) for (let back = 1; back <= 3; back++) await db.rpc('award_scores', { p_user_id: id[k], p_club_id: main, p_source: 'wellness_readiness', p_reference: `day:${day(back)}`, p_multiplier: 1 });
  await db.rpc('award_scores', { p_user_id: id.captain, p_club_id: main, p_source: 'community_post', p_reference: `day:${day(1)}`, p_multiplier: 1 });

  printDemoScript(saturday);
}

function printDemoScript(saturday: string) {
  const lines = [
    '', 'Demo data is ready. Every account uses the demo password (DEMO_PASSWORD, or the default in the script header). Change it.', '',
    'Accounts (all @example.com, all fictional):',
    '  Club admin  demo-admin@example.com        Coach  demo-coach@example.com',
    '  Captain     demo-captain@example.com      Opener demo-opener@example.com',
    '  Parent      demo-parent@example.com       Junior demo-junior-one@example.com',
    '  Other club  demo-rival@example.com (Demo Rovers CC)', '',
    'Demo script, in order:',
    '  1. Signed out: the homepage, then For Clubs, then For Players. Point out the four pillars and what is live versus opening soon.',
    `  2. Sign in as the captain (demo-captain). Home shows one live fact per pillar. Open Match Day: availability for Saturday ${saturday} and the XI.`,
    '  3. Analysis: open the Analysis pillar and the progress view (needs a real clip; describe it if no demo clip is uploaded).',
    '  4. Community (only if COMMUNITY_ENABLED is on in this environment, see COMMUNITY.md): the feed with three live posts; the moderation inbox as a ShiftUp staff admin shows one held post;',
    '     Near me shows Thursday nets; as demo-junior-one, an adult cannot be messaged or followed and adult sessions are not shown. The parent account sees the child at /parent/community.',
    '  5. Wellness (captain): today’s check-in, the four-week trend, the match-day routine, Mental skills, and the private recovery log. As demo-coach open /wellness/team: only averages for players who chose to share.',
    '  6. Academy (captain): the catalogue shows Cricket skills finished. Open /academy/certificate/skills. Make a practice plan.',
    '  7. Rewards: Scores balances come from the real rules (lessons, readiness, a post).', '',
    'Not seeded: ball-by-ball scoring and analysis clips (add through the app). Community stays off unless you turn it on in Vercel.', '',
  ];
  console.log(lines.join('\n'));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
