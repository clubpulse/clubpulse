import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { AnalyseClient } from '@/components/analyse/AnalyseClient';
import { AnalyseLanding } from '@/components/analyse/AnalyseLanding';
import { DashboardShell } from '@/components/layout/DashboardShell';

export const metadata: Metadata = { title: 'Analyse | SHIFTUP', description: 'AI-powered cricket motion analysis' };

// Lives outside (dashboard) because that layout redirects signed-out visitors, who get a public landing page here.
export default async function AnalysePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return <AnalyseLanding />;

  // Technique analysis runs on the phone. A Free account is not sent to the paid-plan screen.
  return (
    <DashboardShell user={user}>
      <AnalyseClient />
    </DashboardShell>
  );
}
