import type { ReactNode } from 'react';
import { requireUser } from '@/lib/auth/server';
import { getAdminContext } from '@/lib/auth/admin';
import { createClient } from '@/lib/supabase/server';
import { fetchProfile, fetchWallet } from '@/lib/profile/service';
import { totalBalance } from '@/lib/types/creds';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { BottomNav } from '@/components/layout/BottomNav';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const supabase = await createClient();

  const [profile, wallet, adminCtx] = await Promise.all([
    fetchProfile(supabase, user.id),
    fetchWallet(supabase, user.id),
    getAdminContext(user.id),
  ]);

  const name = profile.success
    ? profile.data.display_name || profile.data.full_name
    : user.email?.split('@')[0] ?? 'Player';
  const balance = totalBalance(wallet.success ? wallet.data : null);

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-white">
      <Navbar name={name} balance={balance} />
      <div className="mx-auto flex max-w-6xl gap-8 px-4 py-6 pb-24 md:pb-8">
        <Sidebar showAdmin={adminCtx.adminClubIds.length > 0} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
