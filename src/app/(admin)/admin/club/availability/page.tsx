import { requireClubAdminPage } from '@/lib/auth/admin-page';
import { getSelectionGrid } from '@/lib/actions/xi-selection';
import { XISelector } from '@/components/availability/XISelector';

export default async function AvailabilityGridPage() {
  const { clubId } = await requireClubAdminPage();
  const rows = await getSelectionGrid(clubId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: "'Inter', sans-serif" }}>
      <div>
        <h1
          style={{
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontWeight: 800,
            fontSize: '22px',
            color: '#fff',
            margin: '0 0 2px',
            letterSpacing: '-0.3px',
          }}
        >
          Availability and XI
        </h1>
        <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
          Upcoming fixtures · player responses and the playing XI
        </p>
      </div>

      {rows.length === 0 ? (
        <div
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '14px',
            padding: '32px 20px',
            textAlign: 'center',
          }}
        >
          <p style={{ margin: 0, fontSize: '14px', color: 'rgba(255,255,255,0.35)' }}>
            No upcoming fixtures. Add fixtures to start collecting availability.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {rows.map((r) => <XISelector key={r.id} row={r} />)}
        </div>
      )}
    </div>
  );
}
