import type { Metadata } from 'next';
import Link from 'next/link';
import MarketingNav from '@/components/marketing/MarketingNav';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { FOR_PLAYERS_HREF } from '@/lib/marketing/routes';

export const metadata: Metadata = {
  title: 'For clubs',
  description: 'SHIFTUP for clubs: a dashboard to look after Player Analysis, Community, Wellness, Academy and Scores for your players.',
};

const SATURDAY = [
  { n: '01', icon: '📣', h: 'Community', body: 'Run the club noticeboard and the dressing room, and keep the club bible and documents in one place.' },
  { n: '02', icon: '⭐', h: 'Scores', body: 'Your players earn Scores for taking part. The club can change a default amount or switch a rule off, and the weekly cap starts at 300 Scores.' },
  { n: '03', icon: '🧘', h: 'Wellness', body: 'Players check in privately. Coaches see only anonymous club averages, and adult players can choose to share their readiness averages, never their notes.' },
  { n: '04', icon: '🎓', h: 'Academy', body: 'Players work through two-minute lessons and log their ECB courses. Courses written by your own coaches are coming soon.' },
];

const CLUB = [
  { tag: 'Coming soon', h: 'Juniors', body: 'When the wider network opens, under-18s and adults are kept apart in messaging, posts are checked before they go live, and parents can see their child’s activity.' },
];

export default function ForClubsPage() {
  return (
    <div className="fc-root">
      <style>{`
        .fc-root { background: #060A16; color: #E2E8F0; min-height: 100vh; font-family: 'Inter', system-ui, sans-serif; }
        .fc-wrap { max-width: 1100px; margin: 0 auto; padding: 0 24px; }
        .fc-hero { padding: 84px 0 56px; }
        .fc-eyebrow { font-size: 12px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: #60A5FA; }
        .fc-h1 { font-family: 'Bricolage Grotesque', sans-serif; font-size: clamp(38px, 6vw, 68px); font-weight: 800; line-height: 1.04; margin: 14px 0 0; letter-spacing: -0.02em; }
        .fc-h1 em { font-style: normal; color: #60A5FA; }
        .fc-lead { margin-top: 20px; max-width: 640px; font-size: 18px; line-height: 1.65; color: rgba(226,232,240,0.72); }
        .fc-btns { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 30px; }
        .fc-btn { padding: 13px 22px; border-radius: 10px; font-size: 15px; font-weight: 700; text-decoration: none; }
        .fc-btn-p { background: #2563EB; color: #fff; box-shadow: 0 0 24px rgba(37,99,235,0.4); }
        .fc-btn-g { border: 1px solid rgba(255,255,255,0.18); color: #E2E8F0; }
        .fc-sec { padding: 56px 0; border-top: 1px solid rgba(255,255,255,0.07); }
        .fc-h2 { font-family: 'Bricolage Grotesque', sans-serif; font-size: clamp(28px, 4vw, 40px); font-weight: 800; line-height: 1.1; margin: 10px 0 8px; }
        .fc-sub { max-width: 600px; color: rgba(226,232,240,0.65); line-height: 1.65; font-size: 16px; }
        .fc-grid { display: grid; gap: 16px; margin-top: 32px; }
        .fc-grid-4 { grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); }
        .fc-grid-3 { grid-template-columns: repeat(auto-fit, minmax(290px, 1fr)); }
        .fc-card { padding: 24px; border-radius: 16px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.09); }
        .fc-n { font-size: 11px; letter-spacing: .12em; color: #60A5FA; font-weight: 700; }
        .fc-ic { font-size: 26px; margin: 10px 0 6px; }
        .fc-card h3 { font-family: 'Bricolage Grotesque', sans-serif; font-size: 20px; font-weight: 800; margin: 0 0 8px; }
        .fc-card p { font-size: 14.5px; line-height: 1.6; color: rgba(226,232,240,0.7); margin: 0; }
        .fc-tag { display: inline-block; margin-bottom: 10px; font-size: 11px; font-weight: 700; color: #4ADE80; border: 1px solid rgba(74,222,128,0.4); border-radius: 99px; padding: 2px 9px; }
        .fc-cta { margin: 24px 0 72px; padding: 40px; border-radius: 22px; background: linear-gradient(135deg, #1D4ED8, #2563EB); text-align: center; }
        .fc-cta h2 { font-family: 'Bricolage Grotesque', sans-serif; font-size: clamp(26px, 4vw, 36px); font-weight: 800; margin: 0 0 10px; color: #fff; }
        .fc-cta p { color: rgba(255,255,255,0.85); margin: 0 auto 22px; max-width: 520px; line-height: 1.6; }
        .fc-cta a { display: inline-block; background: #fff; color: #1D4ED8; padding: 13px 24px; border-radius: 10px; font-weight: 700; text-decoration: none; }
        .fc-loop { font-size: 14px; color: rgba(226,232,240,0.6); max-width: 640px; line-height: 1.65; margin-top: 22px; }
      `}</style>
      <MarketingNav />
      <main className="fc-wrap">
        <section className="fc-hero">
          <p className="fc-eyebrow">For clubs</p>
          <h1 className="fc-h1">The four pillars, <em>for the whole club.</em></h1>
          <p className="fc-lead">
            Every player at your club gets Player Analysis, Community, Wellness and Academy. The club dashboard is where you
            run the noticeboard, set the Scores rules and keep an eye on how the squad is getting on.
          </p>
          <div className="fc-btns">
            <Link href="/contact" className="fc-btn fc-btn-p">Tell us about your club</Link>
            <Link href="/pricing" className="fc-btn fc-btn-g">See pricing</Link>
          </div>
        </section>

        <section className="fc-sec">
          <p className="fc-eyebrow">The club dashboard</p>
          <h2 className="fc-h2">What the club looks after.</h2>
          <p className="fc-sub">SHIFTUP is in development and we have started contacting clubs. This is what the club side covers.</p>
          <div className="fc-grid fc-grid-4">
            {SATURDAY.map((s) => (
              <div key={s.n} className="fc-card">
                <div className="fc-n">{s.n}</div>
                <div className="fc-ic" aria-hidden="true">{s.icon}</div>
                <h3>{s.h}</h3>
                <p>{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="fc-sec">
          <p className="fc-eyebrow">Juniors</p>
          <h2 className="fc-h2">Juniors in the community.</h2>
          <p className="fc-sub">Under-18s and adults are kept apart in messaging, and posts are checked before they go live.</p>
          <div className="fc-grid fc-grid-3">
            {CLUB.map((c) => (
              <div key={c.h} className="fc-card">
                <span className="fc-tag">{c.tag}</span>
                <h3>{c.h}</h3>
                <p>{c.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="fc-sec">
          <p className="fc-eyebrow">For your players</p>
          <h2 className="fc-h2">What your players get.</h2>
          <p className="fc-loop">
            Players who join through your club also get the four player pillars: analysis, community, wellness and the academy.
            <Link href={FOR_PLAYERS_HREF} style={{ color: '#60A5FA' }}> See what players get →</Link>
          </p>
        </section>

        <div className="fc-cta">
          <h2>Tell us about your club.</h2>
          <p>We set SHIFTUP up with you. Club plans from £29.99 a month.</p>
          <Link href="/contact">Get in touch →</Link>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
