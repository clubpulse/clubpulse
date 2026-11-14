import { requireUser } from '@/lib/auth/server';
import { getMyInjuries } from '@/lib/actions/injury';
import { getAdminContext } from '@/lib/auth/admin';
import { InjuryPanel } from '@/components/injury/InjuryPanel';
import { Card } from '@/components/ui/Card';
import { createClient } from '@/lib/supabase/server';

export default async function InjuryIntelPage() {
  const user = await requireUser();

  // Resolve the player's first club membership
  const supabase = await createClient();
  const { data: membership } = await supabase
    .from('club_members')
    .select('club_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .limit(1)
    .single();

  const clubId = membership?.club_id ?? '';

  const result = await getMyInjuries(user.id);

  if (!result.success || !clubId) {
    return (
      <Card title="Injury Intel">
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
          {!clubId
            ? 'You need to be a club member to use Injury Intel.'
            : `Couldn't load your injury log: ${result.success ? '' : result.error}`}
        </p>
      </Card>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: "'Inter', sans-serif" }}>
      <div>
        <h1 style={{
          fontFamily: "'Syne', sans-serif", fontWeight: 800,
          fontSize: '24px', color: '#fff', margin: '0 0 4px', letterSpacing: '-0.3px',
        }}>
          🩹 Your Injury Log
        </h1>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
          Track and manage your injuries privately
        </p>
      </div>

      <InjuryPanel
        clubId={clubId}
        active={result.data.active}
        past={result.data.past}
      />
    </div>
  );
}
