import { requireUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { fetchProfile, fetchWallet } from '@/lib/profile/service';
import { totalBalance } from '@/lib/types/scores';
import { SeasonWrapClient, type SeasonStats } from '@/components/season-wrap/SeasonWrapClient';

export default async function SeasonWrapPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const year = new Date().getFullYear();

  const [profile, wallet] = await Promise.all([
    fetchProfile(supabase, user.id),
    fetchWallet(supabase, user.id),
  ]);

  const displayName = profile.success
    ? (profile.data.display_name || profile.data.full_name)
    : 'Cricketer';

  // Attempt to pull from match_performances; gracefully handle if the table doesn't exist
  let runs = 0;
  let wickets = 0;
  let matches = 0;

  try {
    const seasonStart = `${year}-04-01`;
    const seasonEnd   = `${year}-10-31`;

    const { data: performances, error } = await supabase
      .from('match_performances')
      .select('runs_scored, wickets_taken')
      .eq('user_id', user.id)
      .gte('match_date', seasonStart)
      .lte('match_date', seasonEnd);

    if (!error && performances && performances.length > 0) {
      matches = performances.length;
      runs    = performances.reduce(
        (sum: number, p: { runs_scored: number | null; wickets_taken: number | null }) =>
          sum + (p.runs_scored ?? 0),
        0
      );
      wickets = performances.reduce(
        (sum: number, p: { runs_scored: number | null; wickets_taken: number | null }) =>
          sum + (p.wickets_taken ?? 0),
        0
      );
    }
  } catch {
    // Table doesn't exist yet — use zeros; the UI handles this gracefully
  }

  const clubPulseScore = wallet.success && wallet.data
    ? Math.round(totalBalance(wallet.data))
    : Math.round(runs * 2 + wickets * 10 + matches * 5);

  const stats: SeasonStats = { displayName, runs, wickets, matches, clubPulseScore, year };

  return <SeasonWrapClient stats={stats} />;
}
