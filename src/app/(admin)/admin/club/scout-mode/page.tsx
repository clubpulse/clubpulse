import { requireClubAdminPage } from '@/lib/auth/admin-page';
import { getScoutSessions, getScoutSessionData, getShareUrl, deactivateSession } from '@/lib/actions/scout';
import { CreateScoutForm } from '@/components/scout/CreateScoutForm';
import { ScoutDataTable } from '@/components/scout/ScoutDataTable';

interface Props {
  searchParams: Promise<{ session?: string }>;
}

export default async function ScoutModePage({ searchParams }: Props) {
  const { clubId } = await requireClubAdminPage();
  const params = await searchParams;
  const activeSessionId = params.session;

  const sessionsRes = await getScoutSessions(clubId);
  const sessions = sessionsRes.success ? sessionsRes.data : [];

  const sessionData = activeSessionId
    ? await getScoutSessionData(activeSessionId)
    : null;

  const cardStyle: React.CSSProperties = {
    background: '#0f0f0f',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '14px',
    padding: '20px',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div>
        <h1 style={{
          fontFamily: "'Syne', sans-serif", fontWeight: 800,
          fontSize: '24px', color: '#fff', margin: '0 0 4px', letterSpacing: '-0.3px',
        }}>
          🔍 Scout Mode
        </h1>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
          Generate anonymous performance reports — players become Alpha, Beta, Gamma…
        </p>
      </div>

      {/* Create session form */}
      <div style={cardStyle}>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '15px', color: '#fff', margin: '0 0 16px' }}>
          Create new session
        </h2>
        <CreateScoutForm clubId={clubId} />
      </div>

      {/* Active sessions list */}
      {sessions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '15px', color: '#fff', margin: 0 }}>
            Sessions
          </h2>
          {sessions.map((s) => {
            const shareUrl = getShareUrl(s.share_token);
            const isViewing = activeSessionId === s.id;

            return (
              <div
                key={s.id}
                style={{
                  ...cardStyle,
                  border: isViewing
                    ? '1px solid rgba(155,28,28,0.5)'
                    : '1px solid rgba(255,255,255,0.07)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, fontSize: '14px', color: '#fff' }}>{s.session_name}</span>
                      <span style={{
                        fontSize: '10px', fontWeight: 600, letterSpacing: '0.5px',
                        padding: '2px 8px', borderRadius: '20px',
                        background: s.is_active ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.06)',
                        color: s.is_active ? '#4ade80' : 'rgba(255,255,255,0.3)',
                        border: `1px solid ${s.is_active ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.08)'}`,
                      }}>
                        {s.is_active ? 'Active' : 'Closed'}
                      </span>
                    </div>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
                      {s.date_from} → {s.date_to}
                    </p>
                    <p style={{ margin: '6px 0 0', fontSize: '11px', color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                      Share: {shareUrl}
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <a
                      href={`/admin/club/scout-mode?session=${s.id}`}
                      style={{
                        display: 'inline-flex', alignItems: 'center',
                        background: isViewing ? 'rgba(155,28,28,0.3)' : 'rgba(255,255,255,0.06)',
                        border: `1px solid ${isViewing ? 'rgba(155,28,28,0.4)' : 'rgba(255,255,255,0.1)'}`,
                        borderRadius: '8px', padding: '6px 12px',
                        fontSize: '12px', fontWeight: 500,
                        color: isViewing ? '#fca5a5' : 'rgba(255,255,255,0.6)',
                        textDecoration: 'none', transition: 'all 0.15s',
                      }}
                    >
                      {isViewing ? 'Viewing' : '📊 View'}
                    </a>

                    {s.is_active && (
                      <form action={deactivateSession.bind(null, s.id)}>
                        <button
                          type="submit"
                          style={{
                            display: 'inline-flex', alignItems: 'center',
                            background: 'rgba(239,68,68,0.08)',
                            border: '1px solid rgba(239,68,68,0.2)',
                            borderRadius: '8px', padding: '6px 12px',
                            fontSize: '12px', fontWeight: 500,
                            color: '#f87171', cursor: 'pointer',
                            fontFamily: "'Inter', sans-serif", transition: 'all 0.15s',
                          }}
                        >
                          Deactivate
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Stats view for selected session */}
      {activeSessionId && sessionData && (
        <div style={cardStyle}>
          {sessionData.success ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '15px', color: '#fff', margin: 0 }}>
                Anonymous performance — {sessionData.session.session_name}
              </h2>
              <ScoutDataTable
                stats={sessionData.data}
                session={sessionData.session}
                allowReveal={true}
              />
            </div>
          ) : (
            <p style={{ fontSize: '13px', color: '#f87171' }}>
              Could not load session data: {sessionData.error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
