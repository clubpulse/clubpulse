import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About — ClubPulse',
  description: 'How a Sunday cricket club in Slough became the blueprint for grassroots cricket management.',
};

export default function AboutPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#080808', color: '#f0ece4', fontFamily: "'Inter', sans-serif", overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0 }

        /* Nav */
        .cp-nav { display: flex; align-items: center; justify-content: space-between; max-width: 1200px; margin: 0 auto; padding: 24px 32px }
        .cp-logo { display: flex; align-items: center; gap: 10px; text-decoration: none }
        .cp-logo-mark { width: 36px; height: 36px; background: #9b1c1c; border-radius: 8px; display: grid; place-items: center; font-family: 'Syne', sans-serif; font-weight: 800; font-size: 16px; color: #fff }
        .cp-logo-name { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 18px; color: #f0ece4 }
        .cp-menu { display: flex; align-items: center; gap: 24px }
        .cp-menu a { font-size: 14px; font-weight: 500; color: #fff; text-decoration: none; opacity: 0.55; transition: opacity 0.15s }
        .cp-menu a:hover, .cp-menu a.active { opacity: 1 }
        @media(max-width: 767px) { .cp-menu { display: none } }
        .cp-nav-ctas { display: flex; align-items: center; gap: 8px }
        .cp-signin { padding: 9px 18px; border-radius: 8px; font-size: 14px; font-weight: 500; color: rgba(240,236,228,0.5); text-decoration: none }
        .cp-cta-sm { padding: 9px 20px; border-radius: 8px; background: #9b1c1c; font-size: 14px; font-weight: 600; color: #fff; text-decoration: none }

        /* Page */
        .about-hero { max-width: 780px; margin: 0 auto; padding: 80px 32px 64px; text-align: center }
        .section-tag { font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #c9a54c; margin-bottom: 16px }
        .hero-h { font-family: 'Syne', sans-serif; font-size: clamp(32px, 5vw, 58px); font-weight: 800; letter-spacing: -0.03em; line-height: 1.05; color: #f0ece4; margin-bottom: 20px }
        .hero-h em { font-style: normal; color: #9b1c1c }
        .hero-sub { font-size: 17px; color: rgba(240,236,228,0.45); line-height: 1.7; max-width: 580px; margin: 0 auto }

        /* Story */
        .story-wrap { max-width: 720px; margin: 0 auto; padding: 0 32px 80px }
        .story-block { margin-bottom: 52px }
        .story-h { font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 800; color: #f0ece4; letter-spacing: -0.02em; margin-bottom: 14px }
        .story-p { font-size: 16px; color: rgba(240,236,228,0.55); line-height: 1.8 }
        .story-p + .story-p { margin-top: 14px }

        /* Pull quote */
        .pull-quote { border-left: 3px solid #9b1c1c; padding: 20px 24px; margin: 40px 0; background: rgba(155,28,28,0.05); border-radius: 0 10px 10px 0 }
        .pull-quote p { font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 700; color: #f0ece4; line-height: 1.45; letter-spacing: -0.01em }
        .pull-quote cite { display: block; margin-top: 10px; font-size: 13px; color: rgba(240,236,228,0.35); font-style: normal }

        /* Values */
        .values-section { background: #0a0a0a; border-top: 1px solid rgba(255,255,255,0.05); border-bottom: 1px solid rgba(255,255,255,0.05); padding: 80px 32px }
        .values-inner { max-width: 1100px; margin: 0 auto }
        .values-h { font-family: 'Syne', sans-serif; font-size: clamp(24px, 3vw, 36px); font-weight: 800; color: #f0ece4; letter-spacing: -0.025em; margin-bottom: 48px; text-align: center }
        .values-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px }
        @media(max-width: 767px) { .values-grid { grid-template-columns: 1fr } }
        .value-card { background: #111; border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; padding: 28px 24px }
        .value-icon { font-size: 28px; margin-bottom: 14px }
        .value-title { font-family: 'Syne', sans-serif; font-size: 17px; font-weight: 700; color: #f0ece4; margin-bottom: 10px }
        .value-desc { font-size: 14px; color: rgba(240,236,228,0.4); line-height: 1.65 }

        /* Team / origin */
        .origin-section { max-width: 1100px; margin: 0 auto; padding: 80px 32px }
        .origin-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: center }
        @media(max-width: 767px) { .origin-grid { grid-template-columns: 1fr } }
        .origin-text h2 { font-family: 'Syne', sans-serif; font-size: clamp(24px, 3vw, 36px); font-weight: 800; color: #f0ece4; letter-spacing: -0.025em; margin-bottom: 16px }
        .origin-text p { font-size: 15px; color: rgba(240,236,228,0.45); line-height: 1.8; margin-bottom: 14px }
        .stat-cluster { display: flex; flex-direction: column; gap: 16px }
        .stat-row { background: #0f0f0f; border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; padding: 20px 22px; display: flex; align-items: center; gap: 16px }
        .stat-val { font-family: 'Syne', sans-serif; font-size: 36px; font-weight: 800; color: #c9a54c; letter-spacing: -0.02em; min-width: 80px }
        .stat-desc { font-size: 13px; color: rgba(240,236,228,0.4); line-height: 1.5 }

        /* CTA */
        .cta-section { background: #0d0d0d; border-top: 1px solid rgba(255,255,255,0.05); padding: 80px 32px; text-align: center }
        .cta-h { font-family: 'Syne', sans-serif; font-size: clamp(26px, 3.5vw, 42px); font-weight: 800; color: #f0ece4; letter-spacing: -0.025em; margin-bottom: 14px }
        .cta-sub { font-size: 16px; color: rgba(240,236,228,0.4); max-width: 480px; margin: 0 auto 32px }
        .cta-btns { display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap }
        .btn-primary { display: inline-flex; align-items: center; gap: 6px; padding: 14px 28px; background: #9b1c1c; color: #fff; border-radius: 10px; font-size: 15px; font-weight: 600; text-decoration: none; transition: opacity 0.15s }
        .btn-primary:hover { opacity: 0.88 }
        .btn-ghost { display: inline-flex; align-items: center; padding: 14px 28px; border: 1px solid rgba(255,255,255,0.1); color: rgba(240,236,228,0.65); border-radius: 10px; font-size: 15px; font-weight: 500; text-decoration: none; transition: border-color 0.15s }
        .btn-ghost:hover { border-color: rgba(255,255,255,0.25) }

        /* Footer */
        .footer { border-top: 1px solid rgba(255,255,255,0.05); padding: 28px 32px; display: flex; align-items: center; justify-content: space-between; max-width: 1200px; margin: 0 auto; flex-wrap: wrap; gap: 12px }
        .footer-copy { font-size: 13px; color: rgba(240,236,228,0.2) }
        .footer-links { display: flex; gap: 20px }
        .footer-links a { font-size: 13px; color: rgba(240,236,228,0.25); text-decoration: none; transition: color 0.15s }
        .footer-links a:hover { color: rgba(240,236,228,0.6) }
      `}</style>

      {/* ── Nav ── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(8,8,8,0.94)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <nav className="cp-nav">
          <Link href="/" className="cp-logo">
            <span className="cp-logo-mark">C</span>
            <span className="cp-logo-name">ClubPulse</span>
          </Link>
          <div className="cp-menu">
            <a href="/#availability">Availability</a>
            <a href="/#scorecard">Scorecard</a>
            <a href="/#ai-coach">AI Coach</a>
            <a href="/#scores">Scores</a>
            <a href="/#finance">Finance</a>
            <Link href="/about" className="active">About</Link>
            <Link href="/contact">Contact</Link>
          </div>
          <div className="cp-nav-ctas">
            <Link href="/login" className="cp-signin">Sign in</Link>
            <Link href="/contact" className="cp-cta-sm">Get started</Link>
          </div>
        </nav>
      </header>

      {/* ── Hero ── */}
      <section className="about-hero">
        <p className="section-tag">Our story</p>
        <h1 className="hero-h">Built on a real cricket club,<br />for every cricket club</h1>
        <p className="hero-sub">ClubPulse started as a solution to the chaos of running Slough Cricket Club. It grew into a platform that every grassroots club deserves.</p>
      </section>

      {/* ── Story ── */}
      <section className="story-wrap">
        <div className="story-block">
          <h2 className="story-h">The problem every club knows</h2>
          <p className="story-p">Managing a cricket club means juggling availability spreadsheets, WhatsApp threads, paper scoresheets, and bank statements — all while trying to actually play cricket. Chasing subs, figuring out who's available, tracking who's paid their annual fee: it falls on one or two volunteers who burn out.</p>
          <p className="story-p">At Slough CC, we lived this every weekend. The admin overhead was killing the enjoyment of the game.</p>
        </div>

        <div className="pull-quote">
          <p>"We didn't set out to build a software company. We just needed Saturday mornings back."</p>
          <cite>— Founder, ClubPulse · Slough CC member since 2019</cite>
        </div>

        <div className="story-block">
          <h2 className="story-h">Slough CC as the testbed</h2>
          <p className="story-p">Every feature in ClubPulse was born from a real frustration at Slough CC. Availability tracking came first — because the captain was texting 18 players every Wednesday night. The live scorecard followed because someone was still writing on paper and typing it up afterwards.</p>
          <p className="story-p">The AI coaching engine came when we realised players were recording sessions anyway, just without any feedback. Scores — our loyalty currency — came when we wanted to reward the players who show up week after week, not just the stars.</p>
        </div>

        <div className="story-block">
          <h2 className="story-h">From one club to many</h2>
          <p className="story-p">What started as an internal tool for Slough CC is now a platform built to serve any grassroots cricket club in the UK. We've kept the things that make community cricket special: the banter, the relationships, the sense of belonging — and wrapped them in tools that actually work.</p>
          <p className="story-p">We're not here to replace the human side of your club. We're here to remove the admin burden so you can focus on it.</p>
        </div>
      </section>

      {/* ── Values ── */}
      <section className="values-section">
        <div className="values-inner">
          <h2 className="values-h">What we believe</h2>
          <div className="values-grid">
            {[
              { icon: '🏏', title: 'Cricket first', desc: 'Every decision starts with one question: does this make playing and managing cricket better? Engagement metrics are secondary.' },
              { icon: '🌱', title: 'Grassroots, not glamour', desc: 'We build for the club with 40 members and one volunteer admin, not for the county academies that already have full-time staff.' },
              { icon: '🤝', title: 'Community owned', desc: 'Clubs shaped ClubPulse and they continue to shape it. The roadmap is driven by real requests from real clubs, not investor decks.' },
              { icon: '⚡', title: 'Actually useful', desc: 'No bloat. No feature graveyards. If a feature doesn\'t save time or add real value, it doesn\'t ship. Simple as that.' },
              { icon: '🔒', title: 'Privacy by default', desc: 'Your club data belongs to your club. We never sell it, never train on it without consent, and we make it easy to export.' },
              { icon: '💷', title: 'Fair pricing', desc: 'ClubPulse should cost less than the prize fund your club puts up for the end-of-season awards. We mean that literally.' },
            ].map(v => (
              <div key={v.title} className="value-card">
                <div className="value-icon">{v.icon}</div>
                <h3 className="value-title">{v.title}</h3>
                <p className="value-desc">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Origin stats ── */}
      <section className="origin-section">
        <div className="origin-grid">
          <div className="origin-text">
            <p className="section-tag" style={{ marginBottom: '12px' }}>Live at Slough CC</p>
            <h2>Running in production every weekend</h2>
            <p>ClubPulse isn't a demo. It runs live at Slough Cricket Club every Saturday and Sunday during the season — real players, real matches, real data.</p>
            <p>That means every bug gets found fast, and every feature gets stress-tested in the most unforgiving environment: a cricket club where people actually care about the result.</p>
          </div>
          <div className="stat-cluster">
            {[
              { val: '2026', desc: 'Season running live on ClubPulse' },
              { val: '<1s', desc: 'Scorecard sync via Supabase Realtime' },
              { val: '50 pts', desc: 'Earned per match played — rewarding commitment' },
              { val: '£0', desc: 'Admin overhead for tracking availability' },
            ].map(s => (
              <div key={s.val} className="stat-row">
                <span className="stat-val">{s.val}</span>
                <span className="stat-desc">{s.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="cta-section">
        <h2 className="cta-h">Ready to bring ClubPulse<br />to your club?</h2>
        <p className="cta-sub">We onboard one club at a time to make sure the setup is right. Get in touch and we'll show you what it looks like for your setup.</p>
        <div className="cta-btns">
          <Link href="/contact" className="btn-primary">Talk to us →</Link>
          <Link href="/" className="btn-ghost">See all features</Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer>
        <div className="footer">
          <span className="footer-copy">© 2026 ClubPulse · Built for grassroots cricket</span>
          <div className="footer-links">
            <Link href="/">Home</Link>
            <Link href="/about">About</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/login">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
