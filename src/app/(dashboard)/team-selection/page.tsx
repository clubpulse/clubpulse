import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth/server';
import { getSelectionGrid, getSelectorClubId } from '@/lib/actions/xi-selection';
import { XISelector } from '@/components/availability/XISelector';

// Club admins and coaches pick the playing XI here from the availability grid.
export default async function TeamSelectionPage() {
  const user = await requireUser();
  const clubId = await getSelectorClubId(user.id);
  if (!clubId) redirect('/availability');
  const rows = await getSelectionGrid(clubId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontFamily: "'Inter', sans-serif" }}>
      <div>
        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 26, color: '#fff', margin: '0 0 2px', letterSpacing: '-0.3px' }}>
          Select the XI
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
          Tap players to pick your side. Available players come first. Players see the XI once you confirm it. <Link href="/availability" style={{ color: '#60A5FA' }}>My availability</Link>
        </p>
      </div>
      {rows.length === 0 ? (
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '32px 20px', textAlign: 'center', fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>
          No upcoming fixtures yet. Add fixtures to start picking sides.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {rows.map((r) => <XISelector key={r.id} row={r} />)}
        </div>
      )}
    </div>
  );
}
