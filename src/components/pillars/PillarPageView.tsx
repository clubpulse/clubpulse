import { Glyph } from '@/components/icons/Glyph';
// One pillar's page: an animated header, every page in the pillar for this person, and what is
// still to come. Shares its look with the role pages.

import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { MagicCard } from '@/components/magic/MagicCard';
import type { NavLink } from '@/lib/nav/menu';
import { PILLARS, type Pillar } from '@/lib/nav/pillars';

const SYNE = "'Bricolage Grotesque', sans-serif";

type Props = { pillar: Pillar; sections: Array<{ title: string | null; links: NavLink[] }>; /** Shown straight after the header, before the page links */ lead?: ReactNode };

export function PillarPageView({ pillar, sections, lead }: Props) {
  const colours = { '--mg-from': pillar.from, '--mg-to': pillar.to } as CSSProperties;
  const first = sections[0]?.links[0] ?? null;
  // Where each section's cards start in the order they appear, so they fade in one after another
  const starts = sections.map((_, i) => sections.slice(0, i).reduce((n, sec) => n + sec.links.length, 0));
  const total = sections.reduce((n, sec) => n + sec.links.length, 0);

  return (
    <div style={{ ...colours, display: 'flex', flexDirection: 'column', gap: '18px', fontFamily: "'Inter', sans-serif" }}>
      <section className="mg-hero mg-in" style={{ padding: 'clamp(22px, 4vw, 40px)' }}>
        <div className="mg-dots" aria-hidden />
        <div className="mg-beam" aria-hidden />
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '18px' }}>
          <div style={{ minWidth: 0, flex: '1 1 320px', maxWidth: '720px' }}>
            <p style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '12px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)' }}>
              <span className="mg-live" aria-hidden /> Pillar {PILLARS.indexOf(pillar) + 1} of {PILLARS.length}
            </p>
            <h1 className="mg-shine" style={{ fontFamily: SYNE, fontWeight: 800, fontSize: 'clamp(32px, 6vw, 62px)', lineHeight: 1, overflowWrap: 'anywhere', letterSpacing: '-0.03em', margin: '10px 0 12px' }}>
              {pillar.title}
            </h1>
            <p style={{ margin: 0, fontSize: '16px', lineHeight: 1.5, color: 'rgba(255,255,255,0.72)' }}>{pillar.tagline}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '22px' }}>
              {first && <Link href={first.href} className="mg-btn">{first.label} <span aria-hidden>→</span></Link>}
              <Link href="/dashboard" className="mg-pill">Back to Home</Link>
            </div>
          </div>
          <div aria-hidden style={{ fontSize: 'clamp(54px, 9vw, 96px)', lineHeight: 1, filter: `drop-shadow(0 12px 34px ${pillar.from})`, transform: 'rotate(-6deg)' }}><Glyph e={pillar.icon} /></div>
        </div>
        <nav aria-label="The four pillars" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '26px' }}>
          {PILLARS.map((p) => (
            <Link key={p.key} href={p.href} className="mg-pill" aria-current={p.key === pillar.key ? 'page' : undefined}>
              <span aria-hidden><Glyph e={p.icon} /></span> {p.title}
            </Link>
          ))}
        </nav>
      </section>
      {lead}

      {sections.length === 0 && (
        <MagicCard tint={pillar.from} style={{ padding: '26px' }}>
          <p style={{ margin: 0, fontSize: '15px', lineHeight: 1.6, color: 'rgba(255,255,255,0.7)' }}>
            There is nothing here for your role yet. What is on the way is listed below.
          </p>
        </MagicCard>
      )}

      {sections.map((section, at) => (
        <section key={section.title ?? 'main'} aria-label={section.title ?? pillar.title}>
          {section.title && (
            <h2 style={{ fontFamily: SYNE, fontWeight: 800, fontSize: '18px', color: '#fff', margin: '6px 0 12px', letterSpacing: '-0.01em' }}>{section.title}</h2>
          )}
          <div className="mg-bento mg-two">
            {section.links.map((link, i) => {
              const index = starts[at] + i + 1;
              return (
                <MagicCard key={link.href} href={link.href} tint={index % 2 ? pillar.from : pillar.to} index={index} style={{ padding: '18px' }}>
                  <span aria-hidden style={{
                    display: 'inline-grid', placeItems: 'center', width: '44px', height: '44px', borderRadius: '14px', fontSize: '22px',
                    background: `color-mix(in srgb, ${pillar.from} 16%, transparent)`, border: `1px solid color-mix(in srgb, ${pillar.from} 34%, transparent)`,
                  }}><Glyph e={link.icon} /></span>
                  <span aria-hidden style={{ position: 'absolute', top: '18px', right: '18px', fontSize: '16px', color: 'rgba(255,255,255,0.35)' }}>↗</span>
                  <p style={{ margin: '14px 0 0', fontSize: '15px', fontWeight: 700, color: '#fff' }}>{link.label}</p>
                </MagicCard>
              );
            })}
          </div>
        </section>
      ))}

      {pillar.soon.length > 0 && (
        <section aria-label="On the way" className="mg-in" style={{ '--mg-i': total + 1, padding: '22px', borderRadius: '22px', border: '1px dashed rgba(255,255,255,0.16)' } as CSSProperties}>
          <h2 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)' }}>On the way</h2>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {pillar.soon.map((item) => (
              <li key={item} style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '999px', padding: '7px 13px' }}>{item}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
