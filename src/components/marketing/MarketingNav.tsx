'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { FOR_CLUBS_HREF as FOR_CLUBS, FOR_PLAYERS_HREF as FOR_PLAYERS, PILLAR_LINKS } from '@/lib/marketing/routes';

/**
 * The one public header, used on every marketing page.
 *
 * Home | For Clubs | For Players (dropdown of the four pillars) | Pricing | About, then
 * Sign in and Get started. "Get started" goes to /get-started, which offers the two real
 * front doors: register a club (an enquiry) or join as a player.
 *
 * On phones the same links live in a hamburger menu and For Players is an accordion.
 */
export default function MarketingNav() {
  const pathname = usePathname() ?? '/';
  const [open, setOpen] = useState(false);
  const [playersOpen, setPlayersOpen] = useState(false);
  // Close the menu when the page changes (render-time reset, no effect needed).
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
    setPlayersOpen(false);
  }

  const is = (href: string) => (href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`));
  const playersActive = is(FOR_PLAYERS) || pathname.startsWith('/players') || pathname.startsWith('/for-players') || pathname.startsWith('/features/players');
  const clubsActive = is(FOR_CLUBS) || pathname.startsWith('/for-clubs') || pathname.startsWith('/features/clubs');

  return (
    <header className="mk-nav">
      <style>{`
        .mk-nav { position: sticky; top: 0; z-index: 100; background: rgba(6,10,22,0.94); backdrop-filter: blur(18px);
          border-bottom: 1px solid rgba(255,255,255,0.08); font-family: 'Inter', system-ui, sans-serif; }
        .mk-inner { max-width: 1200px; margin: 0 auto; padding: 0 28px; height: 64px; display: flex; align-items: center; gap: 24px; }
        .mk-logo { display: flex; align-items: center; gap: 10px; text-decoration: none; flex-shrink: 0; }
        .mk-logo-mark { width: 34px; height: 34px; border-radius: 9px; display: grid; place-items: center;
          background: linear-gradient(145deg,#0F1F5C 0%,#1D4ED8 50%,#3B82F6 100%);
          box-shadow: 0 0 0 1px rgba(96,165,250,0.3), 0 0 18px rgba(37,99,235,0.5); }
        .mk-logo-name { font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800; font-size: 17px; color: #F1F5F9; }
        .mk-logo-name span { color: #60A5FA; }
        .mk-links { display: flex; gap: 2px; flex: 1; justify-content: center; align-items: center; }
        .mk-link { padding: 7px 13px; font-size: 14px; color: rgba(226,232,240,0.78); text-decoration: none; border-radius: 8px;
          background: none; border: 0; cursor: pointer; font-family: inherit; display: inline-flex; align-items: center; }
        .mk-link:hover, .mk-link.active { color: #fff; background: rgba(255,255,255,0.06); }
        .mk-link.active { font-weight: 600; }
        .mk-dd { position: relative; display: inline-flex; }
        .mk-panel { display: none; position: absolute; top: 100%; left: 50%; transform: translateX(-50%); padding-top: 10px; z-index: 90; min-width: 320px; }
        .mk-dd:hover .mk-panel, .mk-dd:focus-within .mk-panel { display: block; }
        .mk-card { background: #0B1220; border: 1px solid rgba(255,255,255,0.1); border-radius: 14px; padding: 8px; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
        .mk-card a { display: block; padding: 11px 14px; border-radius: 10px; color: #E8EDF5; text-decoration: none; font-size: 14px; font-weight: 600; }
        .mk-card a:hover { background: rgba(96,165,250,0.12); }
        .mk-card a small { display: block; margin-top: 2px; font-size: 12px; font-weight: 400; color: rgba(232,237,245,0.55); }
        .mk-card a.mk-all { margin-top: 4px; border-top: 1px solid rgba(255,255,255,0.07); border-radius: 0 0 10px 10px; color: #60A5FA; font-size: 13px; }
        .mk-caret { margin-left: 5px; font-size: 9px; opacity: 0.7; }
        .mk-ctas { display: flex; gap: 8px; flex-shrink: 0; }
        .mk-ghost { padding: 8px 16px; font-size: 13px; font-weight: 500; color: rgba(226,232,240,0.85); text-decoration: none; border-radius: 8px; border: 1px solid rgba(255,255,255,0.14); }
        .mk-ghost:hover { color: #fff; border-color: rgba(255,255,255,0.3); }
        .mk-primary { padding: 8px 18px; font-size: 13px; font-weight: 600; color: #fff; background: #2563EB; text-decoration: none; border-radius: 8px; box-shadow: 0 0 20px rgba(37,99,235,0.35); }
        .mk-primary:hover { opacity: 0.9; }
        .mk-burger { display: none; margin-left: auto; width: 42px; height: 42px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.14); background: none; cursor: pointer; flex-direction: column; justify-content: center; align-items: center; gap: 5px; }
        .mk-burger span { display: block; width: 18px; height: 2px; background: #E2E8F0; border-radius: 2px; transition: transform .15s, opacity .15s; }
        .mk-burger.open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
        .mk-burger.open span:nth-child(2) { opacity: 0; }
        .mk-burger.open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }
        .mk-mobile { display: none; border-top: 1px solid rgba(255,255,255,0.08); background: #070C1B; padding: 10px 20px 20px; }
        .mk-mobile a, .mk-mobile button.mk-m-row { display: flex; width: 100%; justify-content: space-between; align-items: center; padding: 14px 4px; font-size: 16px; color: #E2E8F0; text-decoration: none; border: 0; border-bottom: 1px solid rgba(255,255,255,0.06); background: none; font-family: inherit; cursor: pointer; text-align: left; }
        .mk-mobile .mk-sub a { padding-left: 18px; font-size: 15px; color: rgba(226,232,240,0.8); }
        .mk-mobile .mk-m-ctas { display: grid; gap: 10px; margin-top: 16px; }
        .mk-mobile .mk-m-ctas a { justify-content: center; border: 1px solid rgba(255,255,255,0.18); border-radius: 10px; padding: 13px; font-weight: 600; }
        .mk-mobile .mk-m-ctas a.mk-primary { background: #2563EB; border-color: #2563EB; }
        @media (max-width: 900px) {
          .mk-links, .mk-ctas { display: none; }
          .mk-burger { display: flex; }
          .mk-mobile.open { display: block; }
          .mk-inner { padding: 0 16px; }
        }
      `}</style>
      <div className="mk-inner">
        <Link href="/" className="mk-logo" aria-label="SHIFTUP home">
          <span className="mk-logo-mark">
            <svg width="21" height="21" viewBox="0 0 36 36" fill="none" aria-hidden="true">
              <defs>
                <linearGradient id="mkNavPulse" x1="0" y1="0" x2="36" y2="0" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#7F1D1D" />
                  <stop offset="40%" stopColor="#DC2626" />
                  <stop offset="100%" stopColor="#1D4ED8" />
                </linearGradient>
              </defs>
              <rect x="10.5" y="5" width="2.8" height="18" rx="1.4" fill="white" />
              <rect x="16.6" y="5" width="2.8" height="18" rx="1.4" fill="white" />
              <rect x="22.7" y="5" width="2.8" height="18" rx="1.4" fill="white" />
              <rect x="10.5" y="4" width="15" height="2.5" rx="1.25" fill="white" />
              <path d="M3 29.5 L7 29.5 L9.5 25 L12.5 33 L16 18 L19.5 29.5 L22 29.5 L25 26 L29 26 L33 26" stroke="url(#mkNavPulse)" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="mk-logo-name">Club<span>Pulse</span></span>
        </Link>

        <nav className="mk-links" aria-label="Main">
          <Link href="/" className={`mk-link${is('/') ? ' active' : ''}`}>Home</Link>
          <Link href={FOR_CLUBS} className={`mk-link${clubsActive ? ' active' : ''}`}>For Clubs</Link>
          <div className="mk-dd">
            <Link href={FOR_PLAYERS} className={`mk-link${playersActive ? ' active' : ''}`} aria-haspopup="true">
              For Players<span className="mk-caret" aria-hidden="true">▾</span>
            </Link>
            <div className="mk-panel">
              <div className="mk-card">
                {PILLAR_LINKS.map((p) => (
                  <Link key={p.key} href={p.href}>{p.label}<small>{p.note}</small></Link>
                ))}
                <Link href={FOR_PLAYERS} className="mk-all">See all four pillars →</Link>
              </div>
            </div>
          </div>
          <Link href="/pricing" className={`mk-link${is('/pricing') ? ' active' : ''}`}>Pricing</Link>
          <Link href="/about" className={`mk-link${is('/about') ? ' active' : ''}`}>About</Link>
        </nav>

        <div className="mk-ctas">
          <Link href="/auth/sign-in" className="mk-ghost">Sign in</Link>
          <Link href="/get-started" className="mk-primary">Get started</Link>
        </div>

        <button type="button" className={`mk-burger${open ? ' open' : ''}`} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          <span /><span /><span />
        </button>
      </div>

      <div className={`mk-mobile${open ? ' open' : ''}`}>
        <Link href="/">Home</Link>
        <Link href={FOR_CLUBS}>For Clubs</Link>
        <button type="button" className="mk-m-row" aria-expanded={playersOpen} onClick={() => setPlayersOpen((o) => !o)}>
          For Players<span aria-hidden="true">{playersOpen ? '▴' : '▾'}</span>
        </button>
        {playersOpen && (
          <div className="mk-sub">
            <Link href={FOR_PLAYERS}>All four pillars</Link>
            {PILLAR_LINKS.map((p) => (<Link key={p.key} href={p.href}>{p.label}</Link>))}
          </div>
        )}
        <Link href="/pricing">Pricing</Link>
        <Link href="/about">About</Link>
        <div className="mk-m-ctas">
          <Link href="/auth/sign-in">Sign in</Link>
          <Link href="/get-started" className="mk-primary">Get started</Link>
        </div>
      </div>
    </header>
  );
}
