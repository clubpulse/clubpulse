import { requireUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { clubNameCards, cardName } from '@/lib/profile/lookup';
import { LogPerformanceForm } from '@/components/rivalry/LogPerformanceForm';
import { Card } from '@/components/ui/Card';

export default async function LogPerformancePage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: membership } = await supabase
    .from('club_members')
    .select('club_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (!membership?.club_id) {
    return (
      <Card title="Log Performance">
        <p className="text-sm text-neutral-400">You need to be an active club member to log a performance.</p>
      </Card>
    );
  }

  const { data: members } = await supabase
    .from('club_members')
    .select('user_id')
    .eq('club_id', membership.club_id)
    .eq('is_active', true)
    .neq('user_id', user.id);

  const cards = await clubNameCards(membership.club_id as string, (members ?? []).map((m) => m.user_id));
  // A member with no profile row is left out, as the old inner join did
  const clubMembers = (members ?? [])
    .filter((m) => cards.has(m.user_id as string))
    .map((m) => ({ id: m.user_id as string, name: cardName(cards.get(m.user_id as string)) }));

  return (
    <div style={{ maxWidth: '540px', margin: '0 auto', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>🏏 Log Performance</h1>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>Record your batting, bowling and fielding contributions</p>
      </div>
      <LogPerformanceForm clubId={membership.club_id} members={clubMembers} />
    </div>
  );
}
