import { scoresToPence, formatScores, formatGBP } from '@/lib/utils/format';

export function WalletSummary({ flexi, reward }: { flexi: number; reward: number }) {
  const total = flexi + reward;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Inter:wght@300;400;500;600&display=swap');
      `}</style>
      <div style={{
        background: 'linear-gradient(135deg, rgba(155,28,28,0.25) 0%, #0f0f0f 60%)',
        border: '1px solid rgba(155,28,28,0.2)',
        borderRadius: '16px',
        padding: '24px',
        fontFamily: "'Inter', sans-serif",
      }}>
        <p style={{
          fontSize: '11px', fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '1px',
          color: '#c9a54c', margin: 0,
        }}>Total Scores</p>

        <p style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 800, fontSize: '52px',
          color: '#fff', margin: '8px 0 4px',
          lineHeight: 1, letterSpacing: '-1px',
        }}>{formatScores(total)}</p>

        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: '0 0 20px' }}>
          ≈ {formatGBP(scoresToPence(total))} · 50 Scores = £1
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {[
            { label: 'Flexi', value: flexi },
            { label: 'Reward', value: reward },
          ].map(({ label, value }) => (
            <div key={label} style={{
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.07)',
              background: 'rgba(255,255,255,0.03)',
              padding: '12px',
            }}>
              <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>{label}</p>
              <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '20px', color: '#fff', margin: '4px 0 2px' }}>{formatScores(value)}</p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>{formatGBP(scoresToPence(value))}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
