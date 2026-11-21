import Link from 'next/link';
import MarketingNav from '@/components/marketing/MarketingNav';
import MarketingFooter from '@/components/marketing/MarketingFooter';

export type PillarStatus = 'live' | 'app' | 'soon';
export type PillarGroup = { status: PillarStatus; items: { h: string; body: string }[] };

const LABEL: Record<PillarStatus, string> = { live: 'Live now', app: 'In the app', soon: 'Coming soon' };
const COLOUR: Record<PillarStatus, string> = { live: '#4ADE80', app: '#60A5FA', soon: '#EFC84A' };
const NOTE: Record<PillarStatus, string> = {
  live: 'Available on the website today.',
  app: 'In the ClubPulse mobile app, not on the website yet.',
  soon: 'Not open yet.',
};

/** One honest landing page per player pillar. Every item sits under a status heading. */
export default function PillarPage(props: {
  eyebrow: string;
  title: string;
  lead: string;
  colour: string;
  groups: PillarGroup[];
  note?: string;
  cta: { href: string; label: string };
  secondary?: { href: string; label: string };
}) {
  const order: PillarStatus[] = ['live', 'app', 'soon'];
  const groups = order.map((s) => props.groups.find((g) => g.status === s)).filter(Boolean) as PillarGroup[];
  return (
    <div className="pp-root">
      <style>{`
        .pp-root { background: #060A16; color: #E2E8F0; min-height: 100vh; font-family: 'Inter', system-ui, sans-serif; }
        .pp-wrap { max-width: 1100px; margin: 0 auto; padding: 0 24px; }
        .pp-hero { padding: 80px 0 40px; }
        .pp-eyebrow { font-size: 12px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; }
        .pp-h1 { font-family: 'Bricolage Grotesque', sans-serif; font-size: clamp(38px, 6vw, 64px); font-weight: 800; line-height: 1.05; margin: 14px 0 0; letter-spacing: -0.02em; }
        .pp-lead { margin-top: 18px; max-width: 660px; font-size: 18px; line-height: 1.65; color: rgba(226,232,240,0.72); }
        .pp-btns { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 28px; }
        .pp-btn { padding: 13px 22px; border-radius: 10px; font-size: 15px; font-weight: 700; text-decoration: none; }
        .pp-btn-g { border: 1px solid rgba(255,255,255,0.18); color: #E2E8F0; }
        .pp-sec { padding: 40px 0; border-top: 1px solid rgba(255,255,255,0.07); }
        .pp-tag { display: inline-block; font-size: 12px; font-weight: 700; border-radius: 99px; padding: 3px 11px; }
        .pp-note { margin: 8px 0 0; font-size: 14px; color: rgba(226,232,240,0.55); }
        .pp-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; margin-top: 22px; }
        .pp-card { padding: 22px; border-radius: 16px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.09); }
        .pp-card h3 { font-family: 'Bricolage Grotesque', sans-serif; font-size: 18px; font-weight: 800; margin: 0 0 6px; }
        .pp-card p { margin: 0; font-size: 14.5px; line-height: 1.6; color: rgba(226,232,240,0.7); }
        .pp-foot { margin: 10px 0 72px; font-size: 13.5px; color: rgba(226,232,240,0.55); line-height: 1.6; max-width: 700px; }
      `}</style>
      <MarketingNav />
      <main className="pp-wrap">
        <section className="pp-hero">
          <p className="pp-eyebrow" style={{ color: props.colour }}>{props.eyebrow}</p>
          <h1 className="pp-h1">{props.title}</h1>
          <p className="pp-lead">{props.lead}</p>
          <div className="pp-btns">
            <Link href={props.cta.href} className="pp-btn" style={{ background: props.colour, color: '#06101F' }}>{props.cta.label}</Link>
            {props.secondary && <Link href={props.secondary.href} className="pp-btn pp-btn-g">{props.secondary.label}</Link>}
          </div>
        </section>
        {groups.map((g) => (
          <section key={g.status} className="pp-sec">
            <span className="pp-tag" style={{ color: COLOUR[g.status], border: `1px solid ${COLOUR[g.status]}66` }}>{LABEL[g.status]}</span>
            <p className="pp-note">{NOTE[g.status]}</p>
            <div className="pp-grid">
              {g.items.map((i) => (
                <div key={i.h} className="pp-card"><h3>{i.h}</h3><p>{i.body}</p></div>
              ))}
            </div>
          </section>
        ))}
        <p className="pp-foot">
          {props.note ? `${props.note} ` : ''}
          Scores are earned across every pillar and never sold. <Link href="/for-players" style={{ color: '#60A5FA' }}>Back to all four pillars</Link>
        </p>
      </main>
      <MarketingFooter />
    </div>
  );
}
