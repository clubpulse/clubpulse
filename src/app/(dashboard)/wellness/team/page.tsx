import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTeamReadiness } from '@/lib/actions/wellness';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Team readiness | Wellness' };

export default async function TeamReadinessPage() {
  const user = await requireUser();
  const { data: clubs } = await createAdminClient().from('club_members').select('club_id, clubs ( name )').eq('user_id', user.id).eq('is_active', true).in('role', ['coach', 'club_admin']);
  const results = await Promise.all((clubs ?? []).map(async (c) => ({ name: ((Array.isArray(c.clubs) ? c.clubs[0] : c.clubs) as { name: string } | null)?.name ?? 'Club', res: await getTeamReadiness(c.club_id as string, 7) })));
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: 16 }}>
      <h1>Team readiness</h1>
      <p>Averages over the last 7 days, only for adult players who chose to share with coaches and have checked in at least twice. Notes are never shown. This is not a clinical tool; if you are worried about someone, speak to them and follow your club’s welfare process.</p>
      {results.length === 0 && <p>This page is for coaches and club admins.</p>}
      {results.map((c) => (
        <section key={c.name}>
          <h2>{c.name}</h2>
          {!c.res.success ? <p role="alert">{c.res.error}</p> : c.res.data.length === 0 ? <p>Nobody has chosen to share yet.</p> : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{['Player', 'Check-ins', 'Sleep', 'Mood', 'Soreness', 'Stress'].map((h) => <th key={h} style={{ textAlign: 'left', padding: 6 }}>{h}</th>)}</tr></thead>
              <tbody>{c.res.data.map((r) => <tr key={r.name} style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}><td style={{ padding: 6 }}>{r.name}</td><td>{r.checkIns}</td><td>{r.sleep}</td><td>{r.mood}</td><td>{r.soreness}</td><td>{r.stress}</td></tr>)}</tbody>
            </table>
          )}
        </section>
      ))}
      <p style={{ fontSize: 13, opacity: 0.8 }}>5 is best on every scale.</p>
    </div>
  );
}
