import Link from 'next/link';
import { FOR_CLUBS_HREF, FOR_PLAYERS_HREF, PILLAR_LINKS } from '@/lib/marketing/routes';

const GROUPS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: 'Product',
    links: [
      { href: FOR_CLUBS_HREF, label: 'For Clubs' },
      { href: FOR_PLAYERS_HREF, label: 'For Players' },
      ...PILLAR_LINKS.map((p) => ({ href: p.href, label: p.label })),
      { href: '/pricing', label: 'Pricing' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/about', label: 'About' },
      { href: '/our-story', label: 'Our story' },
      { href: '/contact', label: 'Contact' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/privacy', label: 'Privacy' },
      { href: '/terms', label: 'Terms' },
      { href: '/refunds', label: 'Refunds' },
    ],
  },
  { title: 'Account', links: [{ href: '/auth/sign-in', label: 'Sign in' }] },
];

/** The one public footer, used on every marketing page. */
export default function MarketingFooter() {
  return (
    <footer className="mk-foot">
      <style>{`
        .mk-foot { border-top: 1px solid rgba(255,255,255,0.08); background: #050914; color: rgba(226,232,240,0.7); font-family: 'Inter', system-ui, sans-serif; }
        .mk-foot-inner { max-width: 1200px; margin: 0 auto; padding: 44px 28px 30px; }
        .mk-foot-cols { display: grid; grid-template-columns: 1.3fr repeat(4, 1fr); gap: 28px; }
        .mk-foot-brand { font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800; font-size: 17px; color: #F1F5F9; text-decoration: none; }
        .mk-foot-brand span { color: #60A5FA; }
        .mk-foot-tag { margin-top: 10px; font-size: 13px; line-height: 1.6; max-width: 240px; }
        .mk-foot h4 { font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(226,232,240,0.5); margin: 0 0 12px; font-weight: 600; }
        .mk-foot ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 9px; }
        .mk-foot li a { font-size: 14px; color: rgba(226,232,240,0.78); text-decoration: none; }
        .mk-foot li a:hover { color: #fff; }
        .mk-foot-copy { margin-top: 34px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.06); font-size: 12px; color: rgba(226,232,240,0.5); }
        @media (max-width: 800px) { .mk-foot-cols { grid-template-columns: 1fr 1fr; } .mk-foot-col-brand { grid-column: 1 / -1; } }
      `}</style>
      <div className="mk-foot-inner">
        <div className="mk-foot-cols">
          <div className="mk-foot-col-brand">
            <Link href="/" className="mk-foot-brand">Shift<span>Up</span></Link>
            <p className="mk-foot-tag">Runs a cricket club&apos;s Saturday, and gives every player four pillars to grow with.</p>
          </div>
          {GROUPS.map((g) => (
            <div key={g.title}>
              <h4>{g.title}</h4>
              <ul>
                {g.links.map((l) => (
                  <li key={l.href}><Link href={l.href}>{l.label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mk-foot-copy">© 2026 ClubPulse.</p>
      </div>
    </footer>
  );
}
