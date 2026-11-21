import { Glyph } from '@/components/icons/Glyph';
// One role's page: an animated header, four figures, what is next, a short list and that role's
// tools. The same layout serves player, coach, parent and volunteer; only the colours and the
// content change.

import Link from 'next/link';
import type { CSSProperties } from 'react';
import { MagicCard } from '@/components/magic/MagicCard';
import { NumberTicker } from '@/components/magic/NumberTicker';
import { RememberRole } from '@/components/roles/RememberRole';
import { AddPlayerSide } from '@/components/roles/AddPlayerSide';
import type { RolePage, RoleTool } from '@/lib/nav/role-pages';
import type { RoleData } from '@/lib/roles/data';

const SYNE = "'Bricolage Grotesque', sans-serif";

// Fixed positions, so the page renders the same on the server and in the browser
const METEORS = [
  { t: '-6%', l: '34%', d: '0.2s', s: '6.5s' }, { t: '-10%', l: '58%', d: '2.4s', s: '8s' }, { t: '4%', l: '78%', d: '4.1s', s: '7s' },
  { t: '-4%', l: '92%', d: '1.3s', s: '9s' }, { t: '18%', l: '104%', d: '5.6s', s: '7.5s' }, { t: '-12%', l: '46%', d: '6.8s', s: '10s' },
];

type Props = {
  page: RolePage;
  /** Every page this person has, for moving between them */
  pages: RolePage[];
  name: string;
  data: RoleData;
  tools: RoleTool[];
  /** On Home: the pills change the dashboard in place, and there is no way back to show */
  home?: boolean;
};

export function RolePageView({ page, pages, name, data, tools, home = false }: Props) {
  const colours = { '--mg-from': page.from, '--mg-to': page.to } as CSSProperties;
  const next = data.next;

  return (
    <div style={{ ...colours, display: 'flex', flexDirection: 'column', gap: '16px', fontFamily: "'Inter', sans-serif" }}>
      <RememberRole role={page.role} />
      {/* Header */}
      <section className="mg-hero mg-in" style={{ padding: 'clamp(22px, 4vw, 40px)' }}>
        <div className="mg-dots" aria-hidden />
        <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: -1 }}>
          {METEORS.map((m, i) => <span key={i} className="mg-meteor" style={{ '--t': m.t, '--l': m.l, '--d': m.d, '--s': m.s } as CSSProperties} />)}
        </div>
        <div className="mg-beam" aria-hidden />

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '18px' }}>
          <div style={{ minWidth: 0, flex: '1 1 320px', maxWidth: '720px' }}>
            <p style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '12px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)' }}>
              <span className="mg-live" aria-hidden /> {name}, {page.lead}
            </p>
            <h1 className="mg-shine" style={{ fontFamily: SYNE, fontWeight: 800, fontSize: 'clamp(34px, 6.5vw, 68px)', lineHeight: 1, overflowWrap: 'anywhere', letterSpacing: '-0.03em', margin: '10px 0 12px' }}>
              {page.title}
            </h1>
            <p style={{ margin: 0, fontSize: '16px', lineHeight: 1.5, color: 'rgba(255,255,255,0.72)' }}>{page.tagline}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '22px' }}>
              <Link href={data.action.href} className="mg-btn">{data.action.label} <span aria-hidden>→</span></Link>
              {!home && <Link href="/dashboard" className="mg-pill">Back to Home</Link>}
            </div>
          </div>
          <div aria-hidden style={{
            fontSize: 'clamp(54px, 9vw, 96px)', lineHeight: 1, filter: `drop-shadow(0 12px 34px ${page.from})`, transform: 'rotate(-6deg)',
          }}><Glyph e={page.icon} /></div>
        </div>

        {pages.length > 1 && (
          <nav aria-label="Your pages" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '26px' }}>
            {pages.map((p) => (
              <Link key={p.role} href={home ? `/dashboard?as=${p.role}` : p.href} className="mg-pill" aria-current={p.role === page.role ? 'page' : undefined}>
                <span aria-hidden><Glyph e={p.icon} /></span> {p.title}
              </Link>
            ))}
          </nav>
        )}
      </section>

      {/* Figures */}
      <section className="mg-bento mg-two" aria-label="At a glance">
        {data.stats.map((stat, i) => (
          <MagicCard key={stat.label} tint={i % 2 === 0 ? page.from : page.to} index={i + 1} style={{ padding: '22px' }}>
            <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>{stat.label}</p>
            <p style={{ fontFamily: SYNE, fontWeight: 800, fontSize: 'clamp(30px, 7vw, 46px)', lineHeight: 1, letterSpacing: '-0.03em', margin: '12px 0 10px', color: '#fff' }}>
              {stat.value !== undefined ? <NumberTicker value={stat.value} /> : stat.text}
              {stat.suffix && <span style={{ fontSize: '18px', fontWeight: 700, color: 'rgba(255,255,255,0.45)', marginLeft: '4px' }}>{stat.suffix}</span>}
            </p>
            <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.45, color: 'rgba(255,255,255,0.5)' }}>{stat.hint}</p>
          </MagicCard>
        ))}
      </section>

      {/* Next, and the list */}
      <section className="mg-bento">
        <MagicCard href={next?.href ?? data.nothingNext.href} tint={page.from} index={5} className="mg-wide" style={{ padding: '26px' }}>
          <div className="mg-beam" aria-hidden />
          <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: page.from }}>
            {next ? next.eyebrow : 'Coming up'}
          </p>
          <h2 style={{ fontFamily: SYNE, fontWeight: 800, fontSize: 'clamp(24px, 3.4vw, 34px)', lineHeight: 1.1, letterSpacing: '-0.02em', margin: '10px 0 8px', color: '#fff' }}>
            {next ? next.title : data.nothingNext.title}
          </h2>
          <p style={{ margin: 0, fontSize: '15px', color: 'rgba(255,255,255,0.65)' }}>{next ? next.detail : data.nothingNext.detail}</p>
          <p style={{ margin: '20px 0 0', fontSize: '14px', fontWeight: 700, color: '#fff' }}>{next ? next.cta : data.nothingNext.cta} <span aria-hidden>→</span></p>
        </MagicCard>

        <MagicCard tint={page.to} index={6} className="mg-wide" style={{ padding: '26px' }}>
          <h2 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: 700, color: '#fff' }}>{data.listTitle}</h2>
          {data.rows.length === 0 ? (
            <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.55, color: 'rgba(255,255,255,0.55)' }}>{data.empty}</p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {data.rows.map((row, i) => {
                const inner = (
                  <>
                    <span style={{ minWidth: 0, flex: 1 }}>
                      <span style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.title}</span>
                      <span style={{ display: 'block', fontSize: '12.5px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>{row.detail}</span>
                    </span>
                    {row.badge && (
                      <span style={{ flexShrink: 0, fontSize: '12px', fontWeight: 700, color: page.to, background: `color-mix(in srgb, ${page.to} 14%, transparent)`, border: `1px solid color-mix(in srgb, ${page.to} 35%, transparent)`, borderRadius: '999px', padding: '4px 10px' }}>{row.badge}</span>
                    )}
                  </>
                );
                const rowStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 13px', borderRadius: '14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', textDecoration: 'none' };
                return <li key={i}>{row.href ? <Link href={row.href} style={rowStyle}>{inner}</Link> : <div style={rowStyle}>{inner}</div>}</li>;
              })}
            </ul>
          )}
        </MagicCard>
      </section>

      {/* A club admin who is not yet a player can add that side */}
      {page.role === 'admin' && !pages.some((p) => p.role === 'player') && <AddPlayerSide />}

      {/* Tools */}
      <section aria-label={`${page.title} tools`}>
        <h2 style={{ fontFamily: SYNE, fontWeight: 800, fontSize: '20px', color: '#fff', margin: '10px 0 12px', letterSpacing: '-0.01em' }}>Your {page.title.toLowerCase()} tools</h2>
        <div className="mg-bento mg-two">
          {tools.map((tool, i) => (
            <MagicCard key={tool.href} href={tool.href} tint={tool.tint} index={7 + i} className={i < 2 ? 'mg-wide' : ''} style={{ padding: i < 2 ? '24px' : '18px' }}>
              <span aria-hidden style={{
                display: 'inline-grid', placeItems: 'center', width: i < 2 ? '52px' : '42px', height: i < 2 ? '52px' : '42px', borderRadius: '14px', fontSize: i < 2 ? '26px' : '21px',
                background: `color-mix(in srgb, ${tool.tint} 16%, transparent)`, border: `1px solid color-mix(in srgb, ${tool.tint} 34%, transparent)`,
              }}><Glyph e={tool.icon} /></span>
              <span aria-hidden style={{ position: 'absolute', top: i < 2 ? '24px' : '18px', right: i < 2 ? '24px' : '18px', fontSize: '16px', color: 'rgba(255,255,255,0.35)' }}>↗</span>
              <p style={{ margin: '14px 0 0', fontSize: i < 2 ? '18px' : '15px', fontWeight: 700, color: '#fff' }}>{tool.label}</p>
            </MagicCard>
          ))}
        </div>
      </section>
    </div>
  );
}

/** Shown when someone opens a role's page without holding that role. */
export function RoleNotHeld({ page }: { page: RolePage }) {
  const colours = { '--mg-from': page.from, '--mg-to': page.to } as CSSProperties;
  return (
    <section className="mg-hero mg-in" style={{ ...colours, padding: 'clamp(26px, 5vw, 48px)', textAlign: 'center' }}>
      <div className="mg-dots" aria-hidden />
      <div aria-hidden style={{ fontSize: '64px', lineHeight: 1 }}><Glyph e={page.icon} /></div>
      <h1 className="mg-shine" style={{ fontFamily: SYNE, fontWeight: 800, fontSize: 'clamp(34px, 6vw, 56px)', letterSpacing: '-0.03em', margin: '14px 0 10px' }}>{page.title}</h1>
      <p style={{ margin: '0 auto', maxWidth: '460px', fontSize: '15px', lineHeight: 1.6, color: 'rgba(255,255,255,0.7)' }}>
        {page.role === 'admin'
          ? 'This page is for the people who run a club on ClubPulse. If that should be you, ask your club to make you an admin.'
          : `This page is for members with the ${page.title.toLowerCase()} role. You can ask to add it from your profile, and your club will confirm it.`}
      </p>
      <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '10px', marginTop: '22px' }}>
        <Link href="/profile" className="mg-btn">Go to my profile <span aria-hidden>→</span></Link>
        <Link href="/dashboard" className="mg-pill">Back to Home</Link>
      </div>
    </section>
  );
}
