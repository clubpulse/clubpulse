import type { Metadata } from 'next';
import Link from 'next/link';
import MarketingNav from '@/components/marketing/MarketingNav';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { FOR_PLAYERS_HREF } from '@/lib/marketing/routes';

export const metadata: Metadata = {
  title: 'For clubs | ShiftUp',
  description: 'Run Saturday end to end: availability, picking the XI, ball-by-ball scoring, finance tracking and safeguarding for cricket clubs.',
};

const SATURDAY = [
  { n: '01', icon: '📅', h: 'Availability', body: 'Players say yes, no or maybe from their phone. Captains and committee see the whole squad on one grid, with no chasing.' },
  { n: '02', icon: '🧢', h: 'Pick the XI', body: 'Choose the team from the people who are available, and players see the selection in the app.' },
  { n: '03', icon: '🏏', h: 'Score every ball', body: 'A scorer records each delivery from a phone. Club members watch live, and a public link shows the scorecard to anyone, refreshing every few seconds.' },
  { n: '04', icon: '📈', h: 'Stats that carry on', body: 'Results and scorecards build each player’s record, which feeds Player Analysis and their Cricket CV.' },
];

const CLUB = [
  { tag: 'Live now', h: 'Membership', body: 'Invite the squad, keep the member list in one place, and give committee, coaches and parents the right level of access. Players start on the free tier.' },
  { tag: 'Live now', h: 'Finance', body: 'Track match fees, income and expenses in one ledger, with a dashboard for the treasurer. Paying fees in the app is coming soon; for now the club collects as it does today.' },
  { tag: 'Live now', h: 'Safeguarding and coaches', body: 'Keep coaches’ qualifications and checks in one place and in date, with junior-aware rules built in.' },
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
        .fc-soon { margin-top: 18px; font-size: 14px; color: rgba(226,232,240,0.6); }
        .fc-soon b { color: #EFC84A; font-weight: 700; }
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
          <h1 className="fc-h1">Run Saturday <em>end to end.</em></h1>
          <p className="fc-lead">
            Invite the squad, mark availability, pick the XI and score every ball. Fees and safeguarding sit in the same place,
            so the committee stops living in WhatsApp.
          </p>
          <div className="fc-btns">
            <Link href="/contact" className="fc-btn fc-btn-p">Tell us about your club</Link>
            <Link href="/pricing" className="fc-btn fc-btn-g">See pricing</Link>
          </div>
        </section>

        <section className="fc-sec">
          <p className="fc-eyebrow">Match Day</p>
          <h2 className="fc-h2">The Saturday flow.</h2>
          <p className="fc-sub">Four steps for Saturday. ClubPulse is in development and is now starting to contact clubs.</p>
          <div className="fc-grid fc-grid-4">
            {SATURDAY.map((s) => (
              <div key={s.n} className="fc-card">
                <div className="fc-n">STEP {s.n}</div>
                <div className="fc-ic" aria-hidden="true">{s.icon}</div>
                <h3>{s.h}</h3>
                <p>{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="fc-sec">
          <p className="fc-eyebrow">Run the club</p>
          <h2 className="fc-h2">Membership, money and safeguarding.</h2>
          <p className="fc-sub">The committee work that usually lives in spreadsheets and group chats.</p>
          <div className="fc-grid fc-grid-3">
            {CLUB.map((c) => (
              <div key={c.h} className="fc-card">
                <span className="fc-tag">{c.tag}</span>
                <h3>{c.h}</h3>
                <p>{c.body}</p>
              </div>
            ))}
          </div>
          <p className="fc-soon"><b>Coming soon:</b> paying match fees online, straight to the club&apos;s own account.</p>
        </section>

        <section className="fc-sec">
          <p className="fc-eyebrow">Beyond Saturday</p>
          <h2 className="fc-h2">Every player you add gets more.</h2>
          <p className="fc-loop">
            Players who join through your club also get the four player pillars: analysis, community, wellness and the academy.
            <Link href={FOR_PLAYERS_HREF} style={{ color: '#60A5FA' }}> See what players get →</Link>
          </p>
        </section>

        <div className="fc-cta">
          <h2>Tell us about your club.</h2>
          <p>We set ShiftUp up with you. Club plans start from £29.99 a month and cover the whole club.</p>
          <Link href="/contact">Get in touch →</Link>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
