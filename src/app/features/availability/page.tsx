'use client';

import Link from 'next/link';

export default function AvailabilityPage() {
  return (
    <>
      <style>{`
        .av-root * { box-sizing: border-box; margin: 0; padding: 0; }
        .av-root {
          --bg: #080808; --bg2: #0d0d0d; --bg3: #111;
          --fg: #f0ece4; --fg2: rgba(240,236,228,0.55); --fg3: rgba(240,236,228,0.28);
          --red: #9b1c1c; --gold: #c9a54c; --green: #2ecc71; --orange: #f97316;
          --border: rgba(255,255,255,0.07);
          background: var(--bg); color: var(--fg);
          font-family: 'Inter', sans-serif; overflow-x: hidden;
        }
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Inter:wght@400;500;600;700&display=swap');

        /* NAV */
        .av-nav {
          position: sticky; top: 0; z-index: 100;
          border-bottom: 1px solid var(--border);
          background: rgba(8,8,8,0.92); backdrop-filter: blur(16px);
        }
        .av-nav-inner {
          max-width: 1200px; margin: 0 auto; padding: 0 40px; height: 60px;
          display: flex; align-items: center; justify-content: space-between; gap: 24px;
        }
        .av-logo { display: flex; align-items: center; gap: 8px; text-decoration: none; }
        .av-logo-mark {
          width: 30px; height: 30px; background: var(--red); border-radius: 7px;
          display: grid; place-items: center;
          font-family: 'Syne', sans-serif; font-weight: 800; font-size: 13px; color: #fff;
        }
        .av-logo-name { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 15px; color: var(--fg); }
        .av-nav-back {
          font-size: 13px; color: var(--fg3); text-decoration: none;
          display: flex; align-items: center; gap: 6px; transition: color 0.15s;
        }
        .av-nav-back:hover { color: var(--fg); }
        .av-nav-cta {
          padding: 9px 20px; font-size: 13px; font-weight: 700;
          background: var(--red); color: #fff; text-decoration: none;
          border-radius: 9px; transition: opacity 0.12s;
        }
        .av-nav-cta:hover { opacity: 0.88; }

        /* HERO */
        .av-hero {
          max-width: 1200px; margin: 0 auto; padding: 80px 40px 64px;
          display: grid; grid-template-columns: 1fr 460px; gap: 64px; align-items: center;
        }
        .av-eyebrow {
          font-size: 11px; font-weight: 700; letter-spacing: 0.1em;
          text-transform: uppercase; color: var(--red); margin-bottom: 16px;
        }
        .av-h1 {
          font-family: 'Syne', sans-serif; font-weight: 800;
          font-size: clamp(38px, 5.5vw, 68px); letter-spacing: -0.03em;
          line-height: 1.05; color: var(--fg); margin-bottom: 20px;
        }
        .av-h1 .red { color: var(--red); }
        .av-sub {
          font-size: 17px; color: var(--fg2); line-height: 1.65;
          max-width: 520px; margin-bottom: 36px;
        }
        .av-tag {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(46,204,113,0.12); border: 1px solid rgba(46,204,113,0.25);
          color: var(--green); font-size: 11px; font-weight: 700;
          letter-spacing: 0.07em; text-transform: uppercase;
          border-radius: 20px; padding: 5px 12px; margin-bottom: 24px;
        }
        .av-tag-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--green); }
        .av-hero-btns { display: flex; gap: 12px; flex-wrap: wrap; }
        .av-btn-red {
          padding: 13px 26px; font-size: 14px; font-weight: 700;
          background: var(--red); color: #fff; text-decoration: none;
          border-radius: 10px; transition: opacity 0.12s;
        }
        .av-btn-red:hover { opacity: 0.88; }
        .av-btn-ghost {
          padding: 13px 26px; font-size: 14px; font-weight: 600;
          border: 1px solid var(--border); color: var(--fg2); text-decoration: none;
          border-radius: 10px; transition: border-color 0.15s, color 0.15s;
        }
        .av-btn-ghost:hover { border-color: rgba(255,255,255,0.2); color: var(--fg); }

        /* MOCKUP */
        .av-mockup {
          background: #0a0a0a; border: 1px solid var(--border);
          border-radius: 20px; padding: 24px; box-shadow: 0 0 60px rgba(155,28,28,0.08);
        }
        .av-mock-header {
          display: flex; justify-content: space-between; align-items: flex-start;
          margin-bottom: 20px;
        }
        .av-mock-title { font-family: 'Syne', sans-serif; font-size: 17px; font-weight: 800; color: var(--fg); }
        .av-mock-meta { font-size: 11px; color: var(--fg3); margin-top: 3px; }
        .av-count-chip {
          background: rgba(46,204,113,0.15); border: 1px solid rgba(46,204,113,0.3);
          color: var(--green); font-size: 13px; font-weight: 700;
          border-radius: 20px; padding: 5px 14px; white-space: nowrap;
        }
        .av-match-card {
          background: linear-gradient(135deg,rgba(155,28,28,0.1),rgba(155,28,28,0.03));
          border: 1px solid rgba(155,28,28,0.2); border-radius: 14px;
          padding: 18px; margin-bottom: 16px;
        }
        .av-match-name { font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 800; color: var(--fg); margin-bottom: 4px; }
        .av-match-date { font-size: 12px; color: var(--fg3); margin-bottom: 14px; }
        .av-squad-count { display: flex; align-items: baseline; gap: 6px; }
        .av-squad-n { font-family: 'Syne', sans-serif; font-size: 36px; font-weight: 800; color: var(--green); line-height: 1; }
        .av-squad-label { font-size: 12px; color: var(--fg3); }
        .av-progress-bar { height: 4px; background: rgba(255,255,255,0.06); border-radius: 2px; margin-top: 12px; }
        .av-progress-fill { height: 100%; background: var(--green); border-radius: 2px; width: 91%; }
        .av-players { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
        .av-player-row {
          display: flex; justify-content: space-between; align-items: center;
          background: #111; border: 1px solid var(--border); border-radius: 10px;
          padding: 11px 14px;
        }
        .av-player-name { font-size: 13px; font-weight: 600; color: var(--fg); }
        .av-player-role { font-size: 10px; color: var(--fg3); margin-top: 2px; }
        .av-chip { font-size: 10px; font-weight: 700; border-radius: 20px; padding: 4px 10px; }
        .av-chip.yes { background: rgba(46,204,113,0.12); color: var(--green); border: 1px solid rgba(46,204,113,0.25); }
        .av-chip.no { background: rgba(255,80,80,0.1); color: #f87171; border: 1px solid rgba(248,113,113,0.2); }
        .av-chip.maybe { background: rgba(255,255,255,0.05); color: var(--fg3); border: 1px solid var(--border); }
        .av-confirm-btn {
          width: 100%; padding: 13px; font-size: 13px; font-weight: 700;
          background: var(--red); color: #fff; border: none; border-radius: 10px;
          cursor: pointer; text-align: center; letter-spacing: 0.01em;
        }

        /* HOW IT WORKS */
        .av-section { max-width: 1200px; margin: 0 auto; padding: 80px 40px; }
        .av-section-eyebrow {
          font-size: 11px; font-weight: 700; letter-spacing: 0.1em;
          text-transform: uppercase; color: var(--red); margin-bottom: 14px;
        }
        .av-section-h2 {
          font-family: 'Syne', sans-serif; font-size: clamp(26px, 3.5vw, 40px);
          font-weight: 800; letter-spacing: -0.025em; color: var(--fg);
          margin-bottom: 12px;
        }
        .av-section-sub { font-size: 15px; color: var(--fg2); max-width: 560px; line-height: 1.65; margin-bottom: 52px; }
        .av-steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px; background: var(--border); border: 1px solid var(--border); border-radius: 18px; overflow: hidden; }
        .av-step { background: var(--bg2); padding: 36px 32px; }
        .av-step-n {
          font-family: 'Syne', sans-serif; font-size: 11px; font-weight: 800;
          letter-spacing: 0.1em; color: rgba(155,28,28,0.4); margin-bottom: 16px;
        }
        .av-step-icon { font-size: 28px; margin-bottom: 14px; }
        .av-step-h { font-family: 'Syne', sans-serif; font-size: 16px; font-weight: 800; color: var(--fg); margin-bottom: 8px; }
        .av-step-body { font-size: 13.5px; color: var(--fg2); line-height: 1.65; }

        /* DETAIL CARDS */
        .av-details { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 60px; }
        .av-detail-card {
          background: var(--bg2); border: 1px solid var(--border);
          border-radius: 16px; padding: 28px;
        }
        .av-detail-card:hover { border-color: rgba(155,28,28,0.3); }
        .av-detail-icon { font-size: 24px; margin-bottom: 12px; }
        .av-detail-h { font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 800; color: var(--fg); margin-bottom: 8px; }
        .av-detail-body { font-size: 13px; color: var(--fg2); line-height: 1.65; }

        /* COMPARISON */
        .av-compare { background: var(--bg2); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
        .av-compare-inner { max-width: 1200px; margin: 0 auto; padding: 80px 40px; }
        .av-compare-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 48px; }
        .av-compare-col {
          border-radius: 16px; padding: 32px;
        }
        .av-compare-col.before {
          background: rgba(255,255,255,0.02); border: 1px solid var(--border);
        }
        .av-compare-col.after {
          background: rgba(155,28,28,0.06); border: 1px solid rgba(155,28,28,0.2);
        }
        .av-compare-label {
          font-size: 11px; font-weight: 700; letter-spacing: 0.08em;
          text-transform: uppercase; margin-bottom: 20px;
        }
        .av-compare-label.before { color: var(--fg3); }
        .av-compare-label.after { color: var(--red); }
        .av-compare-item { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 14px; font-size: 14px; color: var(--fg2); line-height: 1.5; }
        .av-compare-item .ico { flex-shrink: 0; font-size: 16px; }

        /* FAQ */
        .av-faq { max-width: 1200px; margin: 0 auto; padding: 80px 40px; }
        .av-faq-list { display: flex; flex-direction: column; gap: 2px; border: 1px solid var(--border); border-radius: 16px; overflow: hidden; margin-top: 48px; }
        .av-faq-item { background: var(--bg2); padding: 24px 28px; border-bottom: 1px solid var(--border); }
        .av-faq-item:last-child { border-bottom: none; }
        .av-faq-q { font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 800; color: var(--fg); margin-bottom: 10px; }
        .av-faq-a { font-size: 13.5px; color: var(--fg2); line-height: 1.7; }

        /* CTA */
        .av-cta { background: var(--red); border-top: 1px solid rgba(255,255,255,0.08); }
        .av-cta-inner {
          max-width: 1200px; margin: 0 auto; padding: 72px 40px;
          display: flex; align-items: center; justify-content: space-between; gap: 32px; flex-wrap: wrap;
        }
        .av-cta-h { font-family: 'Syne', sans-serif; font-size: clamp(22px, 3vw, 36px); font-weight: 800; letter-spacing: -0.02em; color: #fff; }
        .av-cta-sub { font-size: 14px; color: rgba(255,255,255,0.65); margin-top: 6px; }
        .av-cta-btn { padding: 14px 30px; font-size: 14px; font-weight: 700; background: #fff; color: var(--red); text-decoration: none; border-radius: 10px; white-space: nowrap; transition: opacity 0.12s; }
        .av-cta-btn:hover { opacity: 0.9; }

        /* FOOTER */
        .av-footer { border-top: 1px solid var(--border); }
        .av-footer-inner {
          max-width: 1200px; margin: 0 auto; padding: 32px 40px;
          display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;
        }
        .av-footer-copy { font-size: 12px; color: var(--fg3); }
        .av-footer-links { display: flex; gap: 20px; }
        .av-footer-links a { font-size: 13px; color: var(--fg3); text-decoration: none; transition: color 0.12s; }
        .av-footer-links a:hover { color: var(--fg); }

        /* RESPONSIVE */
        @media (max-width: 900px) {
          .av-hero { grid-template-columns: 1fr; gap: 40px; }
          .av-steps { grid-template-columns: 1fr; }
          .av-details { grid-template-columns: 1fr; }
          .av-compare-grid { grid-template-columns: 1fr; }
          .av-cta-inner { flex-direction: column; text-align: center; }
        }
        @media (max-width: 600px) {
          .av-hero, .av-section, .av-faq, .av-compare-inner { padding-left: 16px; padding-right: 16px; }
          .av-nav-inner { padding: 0 16px; }
          .av-cta-inner { padding-left: 16px; padding-right: 16px; }
          .av-footer-inner { padding-left: 16px; padding-right: 16px; }
        }
      `}</style>

      <div className="av-root">
        {/* NAV */}
        <nav className="av-nav">
          <div className="av-nav-inner">
            <Link href="/" className="av-logo">
              <span className="av-logo-mark">C</span>
              <span className="av-logo-name">ClubPulse</span>
            </Link>
            <Link href="/#features" className="av-nav-back">← All features</Link>
            <Link href="/contact" className="av-nav-cta">Get started</Link>
          </div>
        </nav>

        {/* HERO */}
        <section className="av-hero">
          <div>
            <p className="av-eyebrow">📅 Availability</p>
            <div className="av-tag"><span className="av-tag-dot" />Live at Slough CC</div>
            <h1 className="av-h1">No more <span className="red">Wednesday night</span> WhatsApp chains.</h1>
            <p className="av-sub">Players mark availability in one tap. Captains get a live squad count. The XI is confirmed and notified in seconds — not days of back-and-forth in a 30-person group chat.</p>
            <div className="av-hero-btns">
              <Link href="/contact" className="av-btn-red">Bring this to my club →</Link>
              <Link href="/#features" className="av-btn-ghost">See all features</Link>
            </div>
          </div>

          {/* LIVE MOCKUP */}
          <div className="av-mockup">
            <div className="av-mock-header">
              <div>
                <div className="av-mock-title">Availability</div>
                <div className="av-mock-meta">Sat 26 Oct · Slough CC vs Henley CC</div>
              </div>
              <span className="av-count-chip">10 / 11 ✓</span>
            </div>
            <div className="av-match-card">
              <div className="av-match-name">vs Henley CC — Away</div>
              <div className="av-match-date">Saturday 26 Oct · 10:30am · Henley-on-Thames CC</div>
              <div className="av-squad-count">
                <span className="av-squad-n">10</span>
                <span className="av-squad-label">confirmed · 1 awaiting</span>
              </div>
              <div className="av-progress-bar"><div className="av-progress-fill" /></div>
            </div>
            <div className="av-players">
              {[
                { name: 'I. Suresh', role: 'Batter · Captain', status: 'yes', label: 'Available' },
                { name: 'R. Patel', role: 'All-rounder', status: 'yes', label: 'Available' },
                { name: 'A. Khan', role: 'Pace bowler', status: 'yes', label: 'Available' },
                { name: 'S. Bhatt', role: 'Wicketkeeper', status: 'no', label: 'Unavailable' },
                { name: 'D. Sharma', role: 'Spin bowler', status: 'maybe', label: 'No response' },
              ].map((p) => (
                <div key={p.name} className="av-player-row">
                  <div>
                    <div className="av-player-name">{p.name}</div>
                    <div className="av-player-role">{p.role}</div>
                  </div>
                  <span className={`av-chip ${p.status}`}>{p.label}</span>
                </div>
              ))}
            </div>
            <button className="av-confirm-btn">Confirm XI & notify squad →</button>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <div style={{borderTop:'1px solid rgba(255,255,255,0.07)'}}>
          <div className="av-section">
            <p className="av-section-eyebrow">How it works</p>
            <h2 className="av-section-h2">Three steps. Saturday morning sorted.</h2>
            <p className="av-section-sub">The entire availability workflow — from squad poll to confirmed XI — takes under 2 minutes of admin time.</p>
            <div className="av-steps">
              <div className="av-step">
                <p className="av-step-n">01</p>
                <div className="av-step-icon">📤</div>
                <h3 className="av-step-h">Captain sends availability poll</h3>
                <p className="av-step-body">One tap from the admin dashboard sends a push notification to every registered player asking if they&apos;re available for the upcoming match. No group message. No copy-paste.</p>
              </div>
              <div className="av-step">
                <p className="av-step-n">02</p>
                <div className="av-step-icon">📱</div>
                <h3 className="av-step-h">Players respond in one tap</h3>
                <p className="av-step-body">Players open the notification and tap Available, Unavailable, or Unsure. They spend 2 seconds — not 20 reading a thread. Each response earns them +5 Scores automatically.</p>
              </div>
              <div className="av-step">
                <p className="av-step-n">03</p>
                <div className="av-step-icon">🏏</div>
                <h3 className="av-step-h">Captain confirms XI, squad notified</h3>
                <p className="av-step-body">Once enough players confirm, the captain selects the XI and publishes it. All 11 players get a push notification with the squad details, start time, and venue instantly.</p>
              </div>
            </div>

            <div className="av-details">
              <div className="av-detail-card">
                <div className="av-detail-icon">⚡</div>
                <h3 className="av-detail-h">Real-time squad count</h3>
                <p className="av-detail-body">The captain sees the live count update as responses come in — 7/11, 9/11, 10/11. No manual tallying. No scrolling through a thread to count green ticks. The dashboard shows everything at a glance.</p>
              </div>
              <div className="av-detail-card">
                <div className="av-detail-icon">🔔</div>
                <h3 className="av-detail-h">Automatic push notifications</h3>
                <p className="av-detail-body">Players are nudged automatically if they haven&apos;t responded within a set window. No more chasing individuals. The system sends reminder notifications so you don&apos;t have to.</p>
              </div>
              <div className="av-detail-card">
                <div className="av-detail-icon">⭐</div>
                <h3 className="av-detail-h">+5 Scores for every response</h3>
                <p className="av-detail-body">Every player who responds — available or not — earns 5 Scores automatically. This alone drives response rates up dramatically. Players are rewarded just for communicating with the club.</p>
              </div>
              <div className="av-detail-card">
                <div className="av-detail-icon">📊</div>
                <h3 className="av-detail-h">Availability history</h3>
                <p className="av-detail-body">Every response is logged permanently. At season end, you have a full record of who showed up, who was unavailable and when, and who never responded. Useful for selection conversations and retention.</p>
              </div>
            </div>
          </div>
        </div>

        {/* BEFORE / AFTER */}
        <div className="av-compare">
          <div className="av-compare-inner">
            <p className="av-section-eyebrow">The difference</p>
            <h2 className="av-section-h2">What Saturday mornings used to look like.</h2>
            <div className="av-compare-grid">
              <div className="av-compare-col before">
                <p className="av-compare-label before">Without ClubPulse</p>
                {[
                  ['😩', 'Captain posts in WhatsApp group at 9pm Wednesday'],
                  ['😩', '30-person group chat explodes with "Yes", "Maybe", voice notes'],
                  ['😩', 'Captain manually counts responses by scrolling up'],
                  ['😩', 'Three people haven\'t replied — captain messages them individually'],
                  ['😩', 'Two players drop out Friday night — reshuffling begins'],
                  ['😩', 'XI announced Saturday morning, half the squad missed it'],
                ].map(([ico, text], i) => (
                  <div key={i} className="av-compare-item">
                    <span className="ico">{ico}</span><span>{text}</span>
                  </div>
                ))}
              </div>
              <div className="av-compare-col after">
                <p className="av-compare-label after">With ClubPulse</p>
                {[
                  ['✅', 'Captain sends poll from dashboard — one tap'],
                  ['✅', 'Players respond via app — 2 seconds each, no thread noise'],
                  ['✅', 'Live squad count updates instantly as responses arrive'],
                  ['✅', 'Automatic reminders chase non-responders — zero manual follow-up'],
                  ['✅', 'Captain confirms XI when squad is ready — squad notified instantly'],
                  ['✅', 'Everyone has the match details, push notification guaranteed'],
                ].map(([ico, text], i) => (
                  <div key={i} className="av-compare-item">
                    <span className="ico">{ico}</span><span>{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="av-faq">
          <p className="av-section-eyebrow">FAQ</p>
          <h2 className="av-section-h2">Common questions about Availability.</h2>
          <div className="av-faq-list">
            {[
              ['Do players need to download an app?', 'Yes — players download the ClubPulse app (iOS and Android). It\'s free forever for players. The captain manages everything from the web dashboard or the same app.'],
              ['What if a player doesn\'t have a smartphone?', 'The captain can mark players available manually from the dashboard. The system doesn\'t block selection if someone can\'t use the app — it just removes the automated workflow for them.'],
              ['Can we have multiple matches open at once?', 'Yes. If you have a first XI and a second XI playing on the same weekend, both can have separate availability polls running simultaneously. Each match has its own squad count and player list.'],
              ['What happens when someone changes their response?', 'Players can update their response right up until the captain locks the squad. The captain sees the change in real time and the squad count updates automatically.'],
              ['Can we still use WhatsApp alongside this?', 'Of course. ClubPulse doesn\'t replace your club culture — it replaces one specific workflow (the availability poll) so that WhatsApp can go back to being for banter, not admin.'],
              ['How does the +5 Scores award work?', 'The moment a player submits their response (available, unavailable, or unsure), 5 Scores are added to their balance automatically. No action needed from the captain or admin.'],
            ].map(([q, a], i) => (
              <div key={i} className="av-faq-item">
                <div className="av-faq-q">{q}</div>
                <div className="av-faq-a">{a}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <section className="av-cta">
          <div className="av-cta-inner">
            <div>
              <h2 className="av-cta-h">Ready to fix Saturday mornings?</h2>
              <p className="av-cta-sub">Get in touch and we&apos;ll bring ClubPulse to your club — free for all your players.</p>
            </div>
            <Link href="/contact" className="av-cta-btn">Get started — it&apos;s free →</Link>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="av-footer">
          <div className="av-footer-inner">
            <Link href="/" className="av-logo">
              <span className="av-logo-mark">C</span>
              <span className="av-logo-name">ClubPulse</span>
            </Link>
            <div className="av-footer-links">
              <Link href="/features/availability">Availability</Link>
              <Link href="/features/scorecard">Scorecard</Link>
              <Link href="/features/ai-coach">AI Coach</Link>
              <Link href="/features/scores">Scores</Link>
              <Link href="/features/finance">Finance</Link>
            </div>
            <p className="av-footer-copy">© 2026 ClubPulse</p>
          </div>
        </footer>
      </div>
    </>
  );
}
