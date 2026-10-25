import { createClient } from '@/lib/supabase/server';
import { JoinForm } from '@/components/waiting-list/JoinForm';

interface PageProps {
  params: Promise<{ clubId: string }>;
}

export default async function WaitlistJoinPage({ params }: PageProps) {
  const { clubId } = await params;
  const supabase = await createClient();

  const { data: club } = await supabase
    .from('clubs')
    .select('id, name')
    .eq('id', clubId)
    .maybeSingle();

  const { count: waitingCount } = await supabase
    .from('waiting_list')
    .select('*', { count: 'exact', head: true })
    .eq('club_id', clubId)
    .eq('status', 'waiting');

  if (!club) {
    return (
      <main style={{
        minHeight: '100vh',
        background: '#080808',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Inter', sans-serif",
        padding: '24px',
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '48px', margin: '0 0 16px' }}>🏏</p>
          <h1 style={{ color: '#fff', fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '24px', margin: '0 0 8px' }}>
            Club not found
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', margin: 0 }}>
            This link may be incorrect or the club has moved.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: '#080808',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 16px',
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Background glow */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '600px',
        height: '300px',
        background: 'radial-gradient(ellipse at center, rgba(155,28,28,0.18) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        width: '100%',
        maxWidth: '480px',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(155,28,28,0.12)',
            border: '1px solid rgba(155,28,28,0.3)',
            borderRadius: '100px',
            padding: '6px 16px',
            fontSize: '12px',
            fontWeight: 600,
            color: '#fca5a5',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            marginBottom: '20px',
          }}>
            <span>🏏</span>
            <span>ClubPulse</span>
          </div>

          <h1 style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 800,
            fontSize: '32px',
            color: '#fff',
            margin: '0 0 8px',
            letterSpacing: '-0.5px',
            lineHeight: 1.15,
          }}>
            {club.name}
          </h1>
          <p style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 700,
            fontSize: '18px',
            color: 'rgba(255,255,255,0.5)',
            margin: '0 0 20px',
          }}>
            Join our Waiting List
          </p>

          {(waitingCount ?? 0) > 0 && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              padding: '10px 18px',
              fontSize: '14px',
              color: 'rgba(255,255,255,0.6)',
            }}>
              <span style={{ fontSize: '18px' }}>⏳</span>
              <span>
                <strong style={{ color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{waitingCount}</strong>
                {' '}player{waitingCount === 1 ? '' : 's'} currently waiting
              </span>
            </div>
          )}
        </div>

        {/* Scores incentive banner */}
        <div style={{
          display: 'flex',
          gap: '10px',
          marginBottom: '28px',
        }}>
          {[
            { icon: '⚡', label: 'Earn Scores while you wait' },
            { icon: '🎁', label: '500 Scores joining bonus' },
          ].map((item) => (
            <div key={item.label} style={{
              flex: 1,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '12px',
              padding: '12px',
              fontSize: '12px',
              color: 'rgba(255,255,255,0.55)',
              textAlign: 'center',
              lineHeight: 1.4,
            }}>
              <div style={{ fontSize: '20px', marginBottom: '4px' }}>{item.icon}</div>
              {item.label}
            </div>
          ))}
        </div>

        {/* Form card */}
        <div style={{
          background: '#0f0f0f',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '20px',
          padding: '28px',
        }}>
          <JoinForm clubId={club.id} clubName={club.name} />
        </div>

        <p style={{
          textAlign: 'center',
          fontSize: '12px',
          color: 'rgba(255,255,255,0.2)',
          marginTop: '24px',
        }}>
          Powered by ClubPulse — the cricket club platform
        </p>
      </div>
    </main>
  );
}
