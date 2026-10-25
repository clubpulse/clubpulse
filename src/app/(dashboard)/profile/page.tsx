import { requireUser } from '@/lib/auth/server';
import { getUserRoles } from '@/lib/auth/admin';
import { createClient } from '@/lib/supabase/server';
import { fetchProfile, fetchWallet } from '@/lib/profile/service';
import { getWalletHistory } from '@/lib/activity/service';
import { getMyFormRating } from '@/lib/actions/form';
import { getMyNemesis } from '@/lib/actions/rivalry';
import { ProfileCard } from '@/components/profile/ProfileCard';
import { ScoresHistoryTable } from '@/components/profile/ScoresHistoryTable';
import { FormTicker } from '@/components/form/FormTicker';
import { Card } from '@/components/ui/Card';
import { DebutCard } from '@/components/debut-card/DebutCard';
import { NemesisWidget } from '@/components/rivalry/NemesisWidget';

export default async function ProfilePage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [profile, wallet, history, roles] = await Promise.all([
    fetchProfile(supabase, user.id),
    fetchWallet(supabase, user.id),
    getWalletHistory(supabase, user.id, 50),
    getUserRoles(user.id),
  ]);

  // Fetch the user's primary active club membership for form rating
  const { data: membership } = await supabase
    .from('club_members')
    .select('club_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('joined_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  const formRating = membership?.club_id
    ? await getMyFormRating(user.id, membership.club_id)
    : null;

  const nemesisResult = await getMyNemesis(user.id);

  if (!profile.success) {
    return (
      <Card title="Profile unavailable">
        <p className="text-sm text-neutral-400">
          We couldn&apos;t load your profile ({profile.error}). Try signing out and back in.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <ProfileCard profile={profile.data} wallet={wallet.success ? wallet.data : null} roles={roles} />
      <FormTicker form={formRating?.success ? formRating.data ?? null : null} />
      <NemesisWidget nemesis={nemesisResult.success ? nemesisResult.data : null} />
      <DebutCard userId={user.id} displayName={profile.data.display_name || profile.data.full_name} />
      <ScoresHistoryTable items={history} />
    </div>
  );
}
