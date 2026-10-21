import { requireUser } from '@/lib/auth/server';
import { ScorecardUpload } from '@/components/scorecard/ScorecardUpload';

export const metadata = { title: 'Scorecard · ClubPulse' };

export default async function ScorecardPage() {
  await requireUser();

  return (
    <div style={{ maxWidth: '520px', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{
          fontFamily: "'Syne', sans-serif", fontWeight: 800,
          fontSize: '24px', color: '#fff', margin: '0 0 6px', letterSpacing: '-0.3px',
        }}>
          Upload scorecard
        </h1>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
          Snap a photo of your cricket scorecard and we&apos;ll read your stats and award Scores automatically.
        </p>
      </div>

      <div style={{
        background: '#0f0f0f',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '20px',
      }}>
        <ScorecardUpload />
      </div>

      <div style={{
        background: 'rgba(155,28,28,0.08)',
        border: '1px solid rgba(155,28,28,0.2)',
        borderRadius: '12px',
        padding: '14px 16px',
      }}>
        <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '13px', color: '#fff', margin: '0 0 6px' }}>
          How Scores are calculated
        </p>
        <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
          {[
            '0.5 Scores per run scored',
            '2 Scores per four, 5 Scores per six',
            '25 Scores half-century bonus, 75 Scores century bonus',
            '20 Scores per wicket taken',
            '5 Scores per maiden over',
            '40 Scores five-wicket haul bonus',
            'Minimum 10 Scores for submitting',
          ].map((item) => (
            <li key={item} style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
