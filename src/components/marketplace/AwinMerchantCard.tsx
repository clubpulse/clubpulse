import { buildAwinLink, type AwinMerchant } from '@/lib/awin';

export function AwinMerchantCard({ merchant, userId }: { merchant: AwinMerchant; userId: string }) {
  const href = buildAwinLink(merchant.id, merchant.deepLink, userId);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer sponsored"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.07)',
        background: '#0f0f0f',
        padding: '16px',
        textDecoration: 'none',
        transition: 'border-color 0.15s',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#fff' }}>{merchant.name}</h3>
        <span style={{
          flexShrink: 0,
          fontSize: '11px', fontWeight: 700,
          background: 'rgba(201,165,76,0.12)',
          color: '#c9a54c',
          borderRadius: '8px',
          padding: '3px 8px',
        }}>
          {merchant.commission}% back
        </span>
      </div>
      <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>{merchant.description}</p>
      <span style={{ marginTop: '4px', fontSize: '12px', fontWeight: 600, color: '#c9a54c' }}>
        Shop and earn Scores →
      </span>
    </a>
  );
}
