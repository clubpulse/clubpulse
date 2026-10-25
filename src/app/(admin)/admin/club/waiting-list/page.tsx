import { requireClubAdminPage } from '@/lib/auth/admin-page';
import { getClubWaitlist } from '@/lib/actions/waiting-list';
import { WaitlistAdminTable } from '@/components/waiting-list/WaitlistAdminTable';

export default async function WaitingListAdminPage() {
  const { clubId } = await requireClubAdminPage();
  const result = await getClubWaitlist(clubId);

  if (!result.success) {
    return (
      <p style={{ fontSize: '13px', color: '#f87171', fontFamily: "'Inter', sans-serif" }}>
        {result.error}
      </p>
    );
  }

  const entries = result.data;
  const waiting = entries.filter((e) => e.status === 'waiting');
  const resolved = entries.filter((e) => e.status !== 'waiting');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', fontFamily: "'Inter', sans-serif" }}>
      <div>
        <h1 style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 800,
          fontSize: '22px',
          color: '#fff',
          margin: '0 0 4px',
          letterSpacing: '-0.3px',
        }}>
          Waiting list
        </h1>
        <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
          {waiting.length === 0
            ? 'No one waiting right now'
            : `${waiting.length} player${waiting.length === 1 ? '' : 's'} in the queue`}
        </p>
      </div>

      {/* Share link */}
      <div style={{
        background: 'rgba(155,28,28,0.06)',
        border: '1px solid rgba(155,28,28,0.2)',
        borderRadius: '14px',
        padding: '16px',
        fontSize: '13px',
        color: 'rgba(255,255,255,0.5)',
      }}>
        <p style={{ margin: '0 0 6px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>
          Share your waiting list link
        </p>
        <code style={{
          background: 'rgba(0,0,0,0.4)',
          borderRadius: '8px',
          padding: '6px 10px',
          fontSize: '12px',
          color: '#fca5a5',
          display: 'block',
          wordBreak: 'break-all',
        }}>
          {process.env.NEXT_PUBLIC_APP_URL ?? 'https://clubpulse.app'}/waitlist/{clubId}
        </code>
      </div>

      {/* Waiting queue */}
      {waiting.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h2 style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 700,
            fontSize: '15px',
            color: '#fff',
            margin: 0,
          }}>
            In queue
          </h2>
          <WaitlistAdminTable entries={waiting} />
        </section>
      )}

      {/* Resolved entries */}
      {resolved.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h2 style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 700,
            fontSize: '15px',
            color: 'rgba(255,255,255,0.4)',
            margin: 0,
          }}>
            Resolved
          </h2>
          <WaitlistAdminTable entries={resolved} />
        </section>
      )}

      {entries.length === 0 && (
        <div style={{
          background: '#0f0f0f',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: '16px',
          padding: '48px',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '32px', margin: '0 0 12px' }}>🏏</p>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>
            Share the link above and players can join the waiting list — no account required.
          </p>
        </div>
      )}
    </div>
  );
}
