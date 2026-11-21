import type { Metadata } from 'next';
import Link from 'next/link';
import FeaturesMenu from '@/components/marketing/FeaturesMenu';
import { CATEGORIES } from '@/lib/marketing/feature-categories';

export const metadata: Metadata = {
  title: 'Features | ClubPulse',
  description: 'ClubPulse features for players and for clubs.',
};

const SIDES = [
  {
    key: 'players' as const,
    title: 'For players',
    blurb: 'Improve your game, earn rewards and look after your head, all from your phone.',
    href: '/features/players',
    cta: 'See player features →',
  },
  {
    key: 'clubs' as const,
    title: 'For clubs',
    blurb: 'Selection, availability, finance and insight, without the spreadsheets and WhatsApp chains.',
    href: '/features/clubs',
    cta: 'See club features →',
  },
];

export default function FeaturesOverviewPage() {
  return (
    <div className="fo-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap');
        .fo-root, .fo-root * { box-sizing: border-box; }
        .fo-root { min-height: 100vh; background: #05080f; color: #E8EDF5; font-family: 'Inter', sans-serif; }
        .fo-root a { color: inherit; }
        .fo-nav { position: sticky; top: 0; z-index: 50; background: rgba(5,8,15,0.92); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(255,255,255,0.07); height: 60px; padding: 0 40px; display: flex; align-items: center; justify-content: space-between; }
        .fo-logo { font-family: 'Bricolage Grotesque', sans-serif; font-size: 17px; font-weight: 800; text-decoration: none; }
        .fo-logo span:last-child { color: #60A5FA; }
        .fo-links { display: flex; gap: 4px; align-items: center; }
        .fo-links a { padding: 6px 13px; font-size: 13px; color: rgba(232,237,245,0.55); text-decoration: none; border-radius: 7px; }
        .fo-links a:hover { color: #E8EDF5; background: rgba(255,255,255,0.04); }
        .fo-cta { padding: 8px 18px; background: #2563EB; color: #fff !important; font-size: 13px; font-weight: 700; text-decoration: none; border-radius: 8px; }
        .fo-hero { max-width: 1100px; margin: 0 auto; padding: 72px 40px 40px; }
        .fo-eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #60A5FA; margin-bottom: 14px; }
        .fo-h1 { font-family: 'Bricolage Grotesque', sans-serif; font-size: clamp(34px, 5vw, 58px); font-weight: 800; letter-spacing: -0.03em; line-height: 1.02; margin-bottom: 16px; }
        .fo-h1 em { color: #60A5FA; font-style: normal; }
        .fo-sub { font-size: 17px; line-height: 1.65; color: rgba(232,237,245,0.6); max-width: 560px; }
        .fo-grid { max-width: 1100px; margin: 0 auto; padding: 24px 40px 96px; display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .fo-card { display: flex; flex-direction: column; background: #07102B; border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 32px; }
        .fo-card h2 { font-family: 'Bricolage Grotesque', sans-serif; font-size: 28px; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 8px; }
        .fo-card p { font-size: 15px; line-height: 1.6; color: rgba(232,237,245,0.6); margin-bottom: 22px; }
        .fo-cats { list-style: none; margin: 0 0 28px; padding: 0; display: flex; flex-direction: column; gap: 4px; flex: 1; }
        .fo-cats a { display: flex; gap: 12px; align-items: baseline; padding: 9px 12px; border-radius: 10px; text-decoration: none; }
        .fo-cats a:hover { background: rgba(96,165,250,0.1); }
        .fo-cat-name { font-size: 14px; font-weight: 600; color: #E8EDF5; white-space: nowrap; }
        .fo-cat-tag { font-size: 12.5px; color: rgba(232,237,245,0.5); line-height: 1.4; }
        .fo-btn { display: inline-block; align-self: flex-start; padding: 12px 24px; background: #2563EB; color: #fff !important; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 10px; }
        @media (max-width: 860px) {
          .fo-nav { padding: 0 20px; } .fo-links .fo-hide { display: none; }
          .fo-hero { padding: 44px 20px 24px; } .fo-grid { grid-template-columns: 1fr; padding: 16px 20px 64px; }
          .fo-card { padding: 24px; } .fo-cats a { flex-direction: column; gap: 2px; }
        }
      `}</style>

      <nav className="fo-nav">
        <Link href="/" className="fo-logo"><span>Club</span><span>Pulse</span></Link>
        <div className="fo-links">
          <FeaturesMenu />
          <Link href="/pricing" className="fo-hide">Pricing</Link>
          <Link href="/about" className="fo-hide">About</Link>
          <Link href="/contact" className="fo-hide">Contact</Link>
        </div>
        <Link href="/auth/sign-up" className="fo-cta">Get started free →</Link>
      </nav>

      <header className="fo-hero">
        <div className="fo-eyebrow">Features</div>
        <h1 className="fo-h1">One platform,<br /><em>two sides of the club.</em></h1>
        <p className="fo-sub">Players get a coach, rewards and a place to grow. Clubs get the admin taken care of. Choose the side you want to explore.</p>
      </header>

      <div className="fo-grid">
        {SIDES.map((side) => (
          <section key={side.key} className="fo-card">
            <h2>{side.title}</h2>
            <p>{side.blurb}</p>
            <ul className="fo-cats">
              {CATEGORIES.filter((c) => c.audience === side.key).map((c) => (
                <li key={c.id}>
                  <Link href={`${side.href}#${c.id}`}>
                    <span className="fo-cat-name">{c.label}</span>
                    <span className="fo-cat-tag">{c.tagline}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link href={side.href} className="fo-btn">{side.cta}</Link>
          </section>
        ))}
      </div>
    </div>
  );
}
