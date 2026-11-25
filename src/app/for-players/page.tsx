import type { Metadata } from 'next';
import Link from 'next/link';
import MarketingNav from '@/components/marketing/MarketingNav';
import MarketingFooter from '@/components/marketing/MarketingFooter';

export const metadata: Metadata = {
  title: 'For players',
  description: 'Four pillars for every cricketer: Player Analysis, Community, Wellness and Academy.',
};

const CARDS = [
  { href: '/players/analysis', h: 'Player Analysis', colour: '#FBBF24', status: 'Live now', promise: 'Film a shot or a delivery and see exactly what to work on, with Coach AI, stats and a Cricket CV.' },
  { href: '/players/community', h: 'Community', colour: '#60A5FA', status: 'Club tools live · network opening soon', promise: 'Your club’s noticeboard and dressing room today. The wider network, built with safeguarding and moderation, opens once final safety checks are complete: find players, clubs and games next.' },
  { href: '/players/wellness', h: 'Wellness', colour: '#F472B6', status: 'Live now', promise: 'A private pre-match readiness check-in with a four-week trend, checklists and your own routine, mental-skills guides, a recovery log and weekly check-in. Private by default.' },
  { href: '/players/academy', h: 'Academy', colour: '#2DD4BF', status: 'Live now', promise: 'Two-minute lessons with progress and SHIFTUP certificates, a practice plan and daily games, on the website and in the app.' },
];

export default function ForPlayersPage() {
  return (
    <div className="fp2-root">
      <style>{`
        .fp2-root { background: #060A16; color: #E2E8F0; min-height: 100vh; font-family: 'Inter', system-ui, sans-serif; }
        .fp2-wrap { max-width: 1100px; margin: 0 auto; padding: 0 24px; }
        .fp2-hero { padding: 84px 0 40px; }
        .fp2-eyebrow { font-size: 12px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: #60A5FA; }
        .fp2-h1 { font-family: 'Bricolage Grotesque', sans-serif; font-size: clamp(38px, 6vw, 66px); font-weight: 800; line-height: 1.05; margin: 14px 0 0; letter-spacing: -0.02em; }
        .fp2-lead { margin-top: 18px; max-width: 660px; font-size: 18px; line-height: 1.65; color: rgba(226,232,240,0.72); }
        .fp2-btn { display: inline-block; margin-top: 28px; padding: 13px 24px; border-radius: 10px; background: #2563EB; color: #fff; font-weight: 700; text-decoration: none; box-shadow: 0 0 24px rgba(37,99,235,0.4); }
        .fp2-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; padding: 24px 0 8px; }
        .fp2-card { display: flex; flex-direction: column; gap: 8px; padding: 26px; border-radius: 18px; text-decoration: none; color: inherit; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); }
        .fp2-card:hover { background: rgba(255,255,255,0.055); }
        .fp2-card h2 { font-family: 'Bricolage Grotesque', sans-serif; font-size: 26px; font-weight: 800; margin: 0; }
        .fp2-status { font-size: 12px; font-weight: 700; }
        .fp2-card p { margin: 0; font-size: 15px; line-height: 1.6; color: rgba(226,232,240,0.72); }
        .fp2-more { margin-top: 6px; font-size: 14px; font-weight: 700; }
        .fp2-foot { margin: 28px 0 80px; font-size: 15px; line-height: 1.7; color: rgba(226,232,240,0.65); max-width: 700px; }
      `}</style>
      <MarketingNav />
      <main className="fp2-wrap">
        <section className="fp2-hero">
          <p className="fp2-eyebrow">For players</p>
          <h1 className="fp2-h1">Four pillars to grow with.</h1>
          <p className="fp2-lead">
            Each pillar has its own page. Some of it is live now, some is coming, and we label which. You can join whether or not your club is on SHIFTUP, and you can start on the free tier.
          </p>
          <Link href="/auth/sign-up" className="fp2-btn">Join as a player</Link>
        </section>
        <div className="fp2-grid">
          {CARDS.map((c) => (
            <Link key={c.href} href={c.href} className="fp2-card">
              <h2 style={{ color: c.colour }}>{c.h}</h2>
              <span className="fp2-status" style={{ color: c.colour }}>{c.status}</span>
              <p>{c.promise}</p>
              <span className="fp2-more" style={{ color: c.colour }}>See what is live →</span>
            </Link>
          ))}
        </div>
        <p className="fp2-foot">
          Scores run across all four pillars. You earn them by taking part, and they are never sold. When a club joins SHIFTUP, its whole squad gets the four pillars too.
          Running a club? <Link href="/for-clubs" style={{ color: '#60A5FA' }}>See what clubs get →</Link>
        </p>
      </main>
      <MarketingFooter />
    </div>
  );
}
