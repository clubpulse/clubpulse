import fs from 'fs';
import path from 'path';

const sql = fs.readFileSync(
  path.join(__dirname, '../../supabase/migrations/20261124000001_security_definer_rls.sql'),
  'utf8',
);

const views = [
  'club_scores_leaderboard',
  'mood_performance_correlation',
  'finance_club_summary',
  'ground_pitch_history',
  'active_consents',
  'public_profile_cards',
];

describe('security definer migration', () => {
  it('makes each named view run as the caller', () => {
    for (const view of views) {
      expect(sql).toContain(`ALTER VIEW public.${view} SET (security_invoker = true);`);
    }
  });

  it('removes anonymous execute from admin_stats and award_badge and keeps signed-in execute', () => {
    expect(sql).toContain('REVOKE ALL ON FUNCTION public.admin_stats() FROM PUBLIC, anon;');
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.admin_stats() TO authenticated, service_role;');
    expect(sql).toContain('REVOKE ALL ON FUNCTION public.award_badge(p_user_id uuid, p_badge_slug text, p_club_id uuid, p_reason text) FROM PUBLIC, anon;');
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.award_badge(p_user_id uuid, p_badge_slug text, p_club_id uuid, p_reason text) TO authenticated, service_role;');
  });
});
