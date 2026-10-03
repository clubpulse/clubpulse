import { requireUser } from '@/lib/auth/server';
import { getUserRoles } from '@/lib/auth/admin';
import { createClient } from '@/lib/supabase/server';
import { fetchProfile, fetchWallet } from '@/lib/profile/service';
import { getWalletHistory } from '@/lib/activity/service';
import { ProfileCard } from '@/components/profile/ProfileCard';
import { ScoresHistoryTable } from '@/components/profile/ScoresHistoryTable';
import { Card } from '@/components/ui/Card';

export default async function ProfilePage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [profile, wallet, history, roles] = await Promise.all([
    fetchProfile(supabase, user.id),
    fetchWallet(supabase, user.id),
    getWalletHistory(supabase, user.id, 50),
    getUserRoles(user.id),
  ]);

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
      <ScoresHistoryTable items={history} />
    </div>
  );
}
