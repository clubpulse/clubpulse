import { requireUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { getMyFixtures } from '@/lib/actions/availability';
import { AvailabilityCard } from '@/components/availability/AvailabilityCard';

export default async function AvailabilityPage() {
  const user = await requireUser();
  const supabase = await createClient();

  // Find the user's active club membership
  const { data: membership } = await supabase
    .from('club_members')
    .select('club_id, clubs(name)')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .limit(1)
    .single();

  if (!membership) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          padding: '48px 16px',
          fontFamily: "'Inter', sans-serif",
          textAlign: 'center',
        }}
      >
        <span style={{ fontSize: '40px' }}>🏏</span>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '20px', color: '#fff', margin: 0 }}>
          No club yet
        </h2>
        <p style={{ margin: 0, fontSize: '14px', color: 'rgba(255,255,255,0.45)', maxWidth: '300px' }}>
          Ask your club admin to add you to ClubPulse — then you&apos;ll see your upcoming fixtures here.
        </p>
      </div>
    );
  }

  const clubName = (membership.clubs as { name: string } | null)?.name ?? 'Your Club';
  const fixtures = await getMyFixtures(membership.club_id);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h1
          style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 800,
            fontSize: '26px',
            color: '#fff',
            margin: '0 0 2px',
            letterSpacing: '-0.3px',
          }}
        >
          Availability
        </h1>
        <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>
          {clubName} · Next 4 weeks
        </p>
      </div>

      {fixtures.length === 0 ? (
        <div
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '14px',
            padding: '32px 20px',
            textAlign: 'center',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          <p style={{ margin: 0, fontSize: '14px', color: 'rgba(255,255,255,0.35)' }}>
            No upcoming fixtures scheduled yet.
          </p>
          <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>
            Your club admin can add fixtures from the admin panel.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {fixtures.map((fixture) => (
            <AvailabilityCard key={fixture.id} fixture={fixture} />
          ))}
        </div>
      )}
    </div>
  );
}
