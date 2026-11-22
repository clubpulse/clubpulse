import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { AnalyseClient } from '@/components/analyse/AnalyseClient';
import { AnalyseLanding } from '@/components/analyse/AnalyseLanding';
import { cookies } from 'next/headers';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { PlanNeeded } from '@/components/plan/PlanNeeded';
import { getPaidAccess } from '@/lib/billing/access';
import { APP_VIEW_COOKIE } from '@/lib/auth/app-view';

export const metadata: Metadata = { title: 'Analyse | ShiftUp', description: 'AI-powered cricket motion analysis' };

// Lives outside (dashboard) because that layout redirects signed-out visitors, who get a public landing page here.
export default async function AnalysePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return <AnalyseLanding />;

  const access = await getPaidAccess(user.id, user.email);
  const inApp = (await cookies()).get(APP_VIEW_COOKIE)?.value === '1';

  return (
    <DashboardShell user={user}>
      {access.allowed ? <AnalyseClient /> : <PlanNeeded feature="Video analysis" inApp={inApp} />}
    </DashboardShell>
  );
}
