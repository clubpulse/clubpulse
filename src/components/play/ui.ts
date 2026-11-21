import type { CSSProperties } from 'react';

// Shared inline styles for the Play, Games and Scores admin screens (matches the dashboard look).
export const card: CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '16px',
  padding: '18px',
  minWidth: 0,
};

export const cardTitle: CSSProperties = {
  margin: '0 0 4px',
  fontSize: '11px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'rgba(255,255,255,0.4)',
};

export const muted: CSSProperties = { margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.5)' };

export const h1: CSSProperties = {
  fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '24px', color: '#fff', margin: 0, letterSpacing: '-0.3px',
};

export const twoCol: CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px',
};

export const row: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0',
  borderBottom: '1px solid rgba(255,255,255,0.06)', minWidth: 0,
};

export function pill(tone: 'gold' | 'blue' | 'green' | 'grey', disabled = false): CSSProperties {
  const tones = {
    gold: ['rgba(239,200,74,0.14)', 'rgba(239,200,74,0.45)', '#EFC84A'],
    blue: ['rgba(96,165,250,0.12)', 'rgba(96,165,250,0.45)', '#60A5FA'],
    green: ['rgba(34,197,94,0.12)', 'rgba(34,197,94,0.35)', '#22C55E'],
    grey: ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.12)', 'rgba(255,255,255,0.45)'],
  }[tone];
  return {
    flexShrink: 0, fontFamily: 'inherit', fontSize: '12px', fontWeight: 700, padding: '7px 12px',
    borderRadius: '9px', background: tones[0], border: `1px solid ${tones[1]}`, color: tones[2],
    cursor: disabled ? 'default' : 'pointer', whiteSpace: 'nowrap', textDecoration: 'none',
  };
}

export const primaryBtn: CSSProperties = {
  fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '14px', fontWeight: 700, color: '#fff',
  background: '#2563EB', border: 'none', borderRadius: '11px', padding: '11px 20px', cursor: 'pointer',
};

export const input: CSSProperties = {
  fontFamily: 'inherit', fontSize: '13px', padding: '8px 10px', borderRadius: '9px',
  border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#fff', minWidth: 0,
};
