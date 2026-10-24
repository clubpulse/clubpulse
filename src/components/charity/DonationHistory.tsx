'use client';

import type { CharityDonation } from '@/lib/types/charity';

interface Props {
  donations: CharityDonation[];
  scoresPerPound: number;
}

export function DonationHistory({ donations, scoresPerPound }: Props) {
  if (donations.length === 0) {
    return <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', fontFamily: "'Inter', sans-serif", fontStyle: 'italic' }}>You haven&apos;t donated any Scores yet.</p>;
  }
  const totalScores = donations.reduce((s, d) => s + d.scores_donated, 0);
  const totalPence = donations.reduce((s, d) => s + d.pence_value, 0);
  const totalPounds = (totalPence / 100).toFixed(2);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ background: 'rgba(155,28,28,0.12)', border: '1px solid rgba(155,28,28,0.25)', borderRadius: '12px', padding: '14px 16px', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        <div><p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total donated</p><p style={{ margin: '2px 0 0', fontSize: '18px', fontWeight: 700, color: '#fff' }}>{totalScores.toLocaleString()} Scores</p></div>
        <div><p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>£ equivalent</p><p style={{ margin: '2px 0 0', fontSize: '18px', fontWeight: 700, color: '#9b1c1c' }}>£{totalPounds}</p></div>
        <div><p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Donations</p><p style={{ margin: '2px 0 0', fontSize: '18px', fontWeight: 700, color: '#fff' }}>{donations.length}</p></div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead><tr>{['Charity','Scores','£ equiv.','Date','Message'].map(h => <th key={h} style={{ textAlign: 'left', padding: '6px 10px', fontSize: '11px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.06)', whiteSpace: 'nowrap' }}>{h}</th>)}</tr></thead>
          <tbody>
            {donations.map(d => (
              <tr key={d.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '10px', color: '#fff', fontWeight: 500 }}>{d.charity?.name ?? '—'}</td>
                <td style={{ padding: '10px', color: 'rgba(255,255,255,0.7)' }}>{d.scores_donated.toLocaleString()}</td>
                <td style={{ padding: '10px', color: '#9b1c1c', fontWeight: 600 }}>£{(d.pence_value / 100).toFixed(2)}</td>
                <td style={{ padding: '10px', color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap' }}>{new Date(d.donated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                <td style={{ padding: '10px', color: 'rgba(255,255,255,0.45)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.message ?? <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
