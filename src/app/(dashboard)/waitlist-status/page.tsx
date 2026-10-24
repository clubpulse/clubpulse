import { requireUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';

export default async function WaitlistStatusPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: entries } = await supabase
    .from('waiting_list')
    .select(`
      *,
      clubs!club_id (name)
    `)
    .eq('user_id', user.id)
    .order('applied_at', { ascending: false });

  const statusLabel: Record<string, string> = {
    waiting: 'Waiting',
    approved: 'Approved',
    declined: 'Declined',
    withdrawn: 'Withdrawn',
  };

  const statusColor: Record<string, string> = {
    waiting: '#fbbf24',
    approved: '#4ade80',
    declined: '#f87171',
    withdrawn: 'rgba(255,255,255,0.3)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: "'Inter', sans-serif" }}>
      <div>
        <h1 style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 800,
          fontSize: '24px',
          color: '#fff',
          margin: '0 0 4px',
          letterSpacing: '-0.3px',
        }}>
          Waiting list
        </h1>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
          Your club applications and queue positions
        </p>
      </div>

      {(!entries || entries.length === 0) ? (
        <div style={{
          background: '#0f0f0f',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '16px',
          padding: '40px',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '32px', margin: '0 0 12px' }}>🏏</p>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
            You haven&apos;t joined any club waiting lists yet.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {entries.map((entry) => {
            const club = entry.clubs as { name: string } | null;
            const isWaiting = entry.status === 'waiting';
            return (
              <div key={entry.id} style={{
                background: '#0f0f0f',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '16px',
                padding: '20px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '16px', color: '#fff', margin: '0 0 2px' }}>
                      {club?.name ?? 'Unknown club'}
                    </p>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>
                      Applied {new Date(entry.applied_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: statusColor[entry.status] ?? '#fff',
                    background: `${statusColor[entry.status] ?? '#fff'}18`,
                    border: `1px solid ${statusColor[entry.status] ?? '#fff'}33`,
                    borderRadius: '8px',
                    padding: '4px 10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    {statusLabel[entry.status] ?? entry.status}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {isWaiting && (
                    <div style={{
                      background: 'rgba(255,255,255,0.04)',
                      borderRadius: '10px',
                      padding: '12px',
                      textAlign: 'center',
                    }}>
                      <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px' }}>Queue position</p>
                      <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '24px', color: '#fbbf24', margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                        #{entry.position_in_queue}
                      </p>
                    </div>
                  )}
                  <div style={{
                    background: 'rgba(255,255,255,0.04)',
                    borderRadius: '10px',
                    padding: '12px',
                    textAlign: 'center',
                  }}>
                    <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px' }}>Scores earned</p>
                    <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '24px', color: '#fff', margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                      {entry.waiting_creds_awarded}
                    </p>
                  </div>
                  {entry.status === 'approved' && (
                    <div style={{
                      background: 'rgba(74,222,128,0.06)',
                      border: '1px solid rgba(74,222,128,0.15)',
                      borderRadius: '10px',
                      padding: '12px',
                      textAlign: 'center',
                    }}>
                      <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px' }}>Joining bonus</p>
                      <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '24px', color: '#4ade80', margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                        +{entry.joining_bonus_awarded}
                      </p>
                    </div>
                  )}
                  {isWaiting && (
                    <div style={{
                      background: 'rgba(155,28,28,0.08)',
                      border: '1px solid rgba(155,28,28,0.2)',
                      borderRadius: '10px',
                      padding: '12px',
                      textAlign: 'center',
                    }}>
                      <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px' }}>Joining bonus</p>
                      <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '24px', color: '#fca5a5', margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                        +500
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
