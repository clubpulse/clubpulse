'use client';

import { Glyph } from '@/components/icons/Glyph';
import Link from 'next/link';
import MarketingNav from '@/components/marketing/MarketingNav';
import MarketingFooter from '@/components/marketing/MarketingFooter';

export default function ScorecardPage() {
  return (
    <>
      <style>{`
        .sc-root * { box-sizing: border-box; margin: 0; padding: 0; }
        .sc-root {
          --bg: #04091A; --bg2: #07102B; --bg3: #111;
          --fg: #f0ece4; --fg2: rgba(240,236,228,0.55); --fg3: rgba(240,236,228,0.28);
          --red: #1D4ED8; --gold: #EFC84A; --green: #2ecc71; --orange: #f97316;
          --border: rgba(255,255,255,0.07);
          background: var(--bg); color: var(--fg);
          font-family: 'Inter', sans-serif; overflow-x: hidden;
        }
        @keyframes sc-blink { 0%,100%{opacity:1} 50%{opacity:0.3} }

        /* NAV */
        .sc-nav { position:sticky;top:0;z-index:100;border-bottom:1px solid var(--border);background:rgba(8,8,8,0.92);backdrop-filter:blur(16px); }
        .sc-nav-inner { max-width:1200px;margin:0 auto;padding:0 40px;height:60px;display:flex;align-items:center;justify-content:space-between;gap:24px; }
        .sc-logo { display:flex;align-items:center;gap:8px;text-decoration:none; }
        .sc-logo-mark {width:30px;height:30px;border-radius:7px;background:linear-gradient(145deg,#0F1F5C 0%,#1D4ED8 50%,#3B82F6 100%);box-shadow:0 0 0 1px rgba(96,165,250,0.25),0 0 16px rgba(29,78,216,0.4);display:grid;place-items:center;}
        .sc-logo-name {font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:15px;} .sc-logo-name .club {color:#f0ece4;} .sc-logo-name .pulse {color:#60A5FA;}
        .sc-nav-back { font-size:13px;color:var(--fg3);text-decoration:none;display:flex;align-items:center;gap:6px;transition:color 0.15s; }
        .sc-nav-back:hover { color:var(--fg); }
        .sc-nav-cta { padding:9px 20px;font-size:13px;font-weight:700;background:var(--red);color:#fff;text-decoration:none;border-radius:9px;transition:opacity 0.12s; }
        .sc-nav-cta:hover { opacity:0.88; }

        /* HERO */
        .sc-hero { max-width:1200px;margin:0 auto;padding:80px 40px 64px;display:grid;grid-template-columns:1fr 480px;gap:64px;align-items:center; }
        .sc-eyebrow { font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--red);margin-bottom:16px; }
        .sc-h1 { font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:clamp(38px,5.5vw,68px);letter-spacing:-0.03em;line-height:1.05;color:var(--fg);margin-bottom:20px; }
        .sc-h1 .gold { color:var(--gold); }
        .sc-sub { font-size:17px;color:var(--fg2);line-height:1.65;max-width:520px;margin-bottom:36px; }
        .sc-live-tag { display:inline-flex;align-items:center;gap:6px;background:rgba(46,204,113,0.12);border:1px solid rgba(46,204,113,0.25);color:var(--green);font-size:11px;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;border-radius:20px;padding:5px 12px;margin-bottom:24px; }
        .sc-live-dot { width:5px;height:5px;border-radius:50%;background:var(--green);animation:sc-blink 2s infinite; }
        .sc-btns { display:flex;gap:12px;flex-wrap:wrap; }
        .sc-btn-red { padding:13px 26px;font-size:14px;font-weight:700;background:var(--red);color:#fff;text-decoration:none;border-radius:10px;transition:opacity 0.12s; }
        .sc-btn-red:hover { opacity:0.88; }
        .sc-btn-ghost { padding:13px 26px;font-size:14px;font-weight:600;border:1px solid var(--border);color:var(--fg2);text-decoration:none;border-radius:10px;transition:border-color 0.15s,color 0.15s; }
        .sc-btn-ghost:hover { border-color:rgba(255,255,255,0.2);color:var(--fg); }

        /* SCORECARD MOCKUP */
        .sc-card { background:#04091A;border:1px solid var(--border);border-radius:20px;padding:24px;box-shadow:0 0 60px rgba(239,200,74,0.06); }
        .sc-live-bar { display:flex;align-items:center;justify-content:space-between;margin-bottom:16px; }
        .sc-live-chip { display:flex;align-items:center;gap:6px;background:rgba(46,204,113,0.12);border:1px solid rgba(46,204,113,0.25);color:var(--green);font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;border-radius:20px;padding:5px 12px; }
        .sc-live-chip-dot { width:5px;height:5px;border-radius:50%;background:var(--green);animation:sc-blink 2s infinite; }
        .sc-updated { font-size:11px;color:var(--fg3); }
        .sc-innings { background:var(--bg3);border:1px solid var(--border);border-radius:12px;margin-bottom:10px;overflow:hidden; }
        .sc-inn-head { display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:rgba(255,255,255,0.02);border-bottom:1px solid var(--border); }
        .sc-inn-name { font-family:'Bricolage Grotesque',sans-serif;font-size:13px;font-weight:800;color:var(--fg); }
        .sc-inn-total { font-family:'Bricolage Grotesque',sans-serif;font-size:20px;font-weight:800;color:var(--gold); }
        .sc-bat-row { display:flex;justify-content:space-between;align-items:center;padding:9px 16px;border-bottom:1px solid rgba(255,255,255,0.03); }
        .sc-bat-row:last-child { border-bottom:none; }
        .sc-bat-name { font-size:12px;color:var(--fg2); }
        .sc-bat-name.bat { color:var(--fg);font-weight:600; }
        .sc-bat-runs { font-size:13px;font-weight:700;color:var(--fg); }
        .sc-bat-balls { font-size:11px;color:var(--fg3); }
        .sc-bbb { margin-top:14px; }
        .sc-bbb-label { font-size:10px;font-weight:600;color:var(--fg3);letter-spacing:0.06em;text-transform:uppercase;margin-bottom:8px; }
        .sc-balls { display:flex;gap:6px; }
        .sc-ball { width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;border:1px solid rgba(255,255,255,0.06); }
        .sc-ball.dot { background:rgba(255,255,255,0.04);color:var(--fg3); }
        .sc-ball.run { background:rgba(255,255,255,0.08);color:var(--fg); }
        .sc-ball.four { background:rgba(46,204,113,0.15);color:var(--green); }
        .sc-ball.six { background:rgba(239,200,74,0.15);color:var(--gold); }
        .sc-ball.wkt { background:rgba(37,99,235,0.22);color:#f87171; }
        .sc-share-btn { width:100%;margin-top:16px;padding:11px;font-size:12px;font-weight:700;background:rgba(255,255,255,0.05);color:var(--fg2);border:1px solid var(--border);border-radius:10px;cursor:pointer;letter-spacing:0.04em; }

        /* SECTIONS */
        .sc-section { max-width:1200px;margin:0 auto;padding:80px 40px; }
        .sc-section-eyebrow { font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--red);margin-bottom:14px; }
        .sc-section-h2 { font-family:'Bricolage Grotesque',sans-serif;font-size:clamp(26px,3.5vw,40px);font-weight:800;letter-spacing:-0.025em;color:var(--fg);margin-bottom:12px; }
        .sc-section-sub { font-size:15px;color:var(--fg2);max-width:560px;line-height:1.65;margin-bottom:48px; }

        /* FEATURES GRID */
        .sc-grid { display:grid;grid-template-columns:repeat(3,1fr);gap:20px; }
        .sc-grid-card { background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:28px; }
        .sc-grid-card:hover { border-color:rgba(239,200,74,0.25); }
        .sc-grid-icon { font-size:26px;margin-bottom:14px; }
        .sc-grid-h { font-family:'Bricolage Grotesque',sans-serif;font-size:15px;font-weight:800;color:var(--fg);margin-bottom:8px; }
        .sc-grid-body { font-size:13px;color:var(--fg2);line-height:1.65; }

        /* TECH */
        .sc-tech { background:var(--bg2);border-top:1px solid var(--border);border-bottom:1px solid var(--border); }
        .sc-tech-inner { max-width:1200px;margin:0 auto;padding:80px 40px;display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:center; }
        .sc-tech-stat-grid { display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:32px; }
        .sc-tech-stat { background:var(--bg3);border:1px solid var(--border);border-radius:14px;padding:20px; }
        .sc-tech-stat-n { font-family:'Bricolage Grotesque',sans-serif;font-size:32px;font-weight:800;color:var(--gold);line-height:1;margin-bottom:6px; }
        .sc-tech-stat-label { font-size:12px;color:var(--fg3); }
        .sc-tech-body { font-size:14px;color:var(--fg2);line-height:1.7; }
        .sc-tech-body p { margin-bottom:16px; }
        .sc-tech-body p:last-child { margin-bottom:0; }

        /* FAQ */
        .sc-faq { max-width:1200px;margin:0 auto;padding:80px 40px; }
        .sc-faq-list { display:flex;flex-direction:column;gap:2px;border:1px solid var(--border);border-radius:16px;overflow:hidden;margin-top:48px; }
        .sc-faq-item { background:var(--bg2);padding:24px 28px;border-bottom:1px solid var(--border); }
        .sc-faq-item:last-child { border-bottom:none; }
        .sc-faq-q { font-family:'Bricolage Grotesque',sans-serif;font-size:15px;font-weight:800;color:var(--fg);margin-bottom:10px; }
        .sc-faq-a { font-size:13.5px;color:var(--fg2);line-height:1.7; }

        /* CTA */
        .sc-cta { background:var(--red);border-top:1px solid rgba(255,255,255,0.08); }
        .sc-cta-inner { max-width:1200px;margin:0 auto;padding:72px 40px;display:flex;align-items:center;justify-content:space-between;gap:32px;flex-wrap:wrap; }
        .sc-cta-h { font-family:'Bricolage Grotesque',sans-serif;font-size:clamp(22px,3vw,36px);font-weight:800;letter-spacing:-0.02em;color:#fff; }
        .sc-cta-sub { font-size:14px;color:rgba(255,255,255,0.65);margin-top:6px; }
        .sc-cta-btn { padding:14px 30px;font-size:14px;font-weight:700;background:#fff;color:var(--red);text-decoration:none;border-radius:10px;white-space:nowrap;transition:opacity 0.12s; }
        .sc-cta-btn:hover { opacity:0.9; }

        /* FOOTER */
        .sc-footer { border-top:1px solid var(--border); }
        .sc-footer-inner { max-width:1200px;margin:0 auto;padding:32px 40px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px; }
        .sc-footer-copy { font-size:12px;color:var(--fg3); }
        .sc-footer-links { display:flex;gap:20px; }
        .sc-footer-links a { font-size:13px;color:var(--fg3);text-decoration:none;transition:color 0.12s; }
        .sc-footer-links a:hover { color:var(--fg); }

        @media (max-width:900px) {
          .sc-hero { grid-template-columns:1fr;gap:40px; }
          .sc-grid { grid-template-columns:1fr 1fr; }
          .sc-tech-inner { grid-template-columns:1fr; }
          .sc-cta-inner { flex-direction:column;text-align:center; }
        }
        @media (max-width:600px) {
          .sc-hero, .sc-section, .sc-faq { padding-left:16px;padding-right:16px; }
          .sc-nav-inner { padding:0 16px; }
          .sc-grid { grid-template-columns:1fr; }
          .sc-tech-inner, .sc-cta-inner, .sc-footer-inner { padding-left:16px;padding-right:16px; }
        }
      `}</style>

      <div className="sc-root">
        <MarketingNav />

        <section className="sc-hero">
          <div>
            <p className="sc-eyebrow">📋 Live Scorecard</p>
            <div className="sc-live-tag"><span className="sc-live-dot" />In development</div>
            <h1 className="sc-h1">Real-time. Every ball. For <span className="gold">everyone.</span></h1>
            <p className="sc-sub">Scorer enters each delivery — club members see the scorecard update live, and anyone with the public link sees it refresh every few seconds. No paper. No spreadsheet.</p>
            <div className="sc-btns">
              <Link href="/contact" className="sc-btn-red">Bring this to my club →</Link>
              <Link href="/features" className="sc-btn-ghost">See all features</Link>
            </div>
          </div>

          <div className="sc-card">
            <div className="sc-live-bar">
              <div className="sc-live-chip"><span className="sc-live-chip-dot" />LIVE</div>
              <span className="sc-updated">Updated moments ago</span>
            </div>
            <div className="sc-innings">
              <div className="sc-inn-head">
                <span className="sc-inn-name">Your Club (batting)</span>
                <span className="sc-inn-total">142–3 (28.4)</span>
              </div>
              <div className="sc-bat-row"><span className="sc-bat-name bat">A. Patel*</span><span className="sc-bat-runs">67*</span><span className="sc-bat-balls">(52)</span></div>
              <div className="sc-bat-row"><span className="sc-bat-name bat">R. Patel*</span><span className="sc-bat-runs">24*</span><span className="sc-bat-balls">(19)</span></div>
              <div className="sc-bat-row"><span className="sc-bat-name">A. Khan — b Simms</span><span className="sc-bat-runs">34</span><span className="sc-bat-balls">(41)</span></div>
              <div className="sc-bat-row"><span className="sc-bat-name">S. Bhatt — c&amp;b Raj</span><span className="sc-bat-runs">12</span><span className="sc-bat-balls">(18)</span></div>
            </div>
            <div className="sc-innings">
              <div className="sc-inn-head">
                <span className="sc-inn-name">Fairwick CC</span>
                <span className="sc-inn-total" style={{color:'rgba(240,236,228,0.5)'}}>178 all out</span>
              </div>
            </div>
            <div className="sc-bbb">
              <p className="sc-bbb-label">Over 28 — A. Patel facing</p>
              <div className="sc-balls">
                <div className="sc-ball dot">·</div>
                <div className="sc-ball run">1</div>
                <div className="sc-ball four">4</div>
                <div className="sc-ball dot">·</div>
                <div className="sc-ball six">6</div>
                <div className="sc-ball wkt">W</div>
              </div>
            </div>
            <button className="sc-share-btn">📤 Share live link with supporters →</button>
          </div>
        </section>

        {/* FEATURES */}
        <div style={{borderTop:'1px solid rgba(255,255,255,0.07)'}}>
          <div className="sc-section">
            <p className="sc-section-eyebrow">What&apos;s included</p>
            <h2 className="sc-section-h2">Everything a modern scorecard should do.</h2>
            <p className="sc-section-sub">ShiftUp&apos;s live scorecard goes far beyond pencil and paper — and far beyond a static spreadsheet shared in a group chat.</p>
            <div className="sc-grid">
              {[
                { icon: '⚡', h: 'Live for members', body: 'The moment a scorer records a ball, signed-in club members watching see it update. Anyone with the public link sees it refresh every few seconds.' },
                { icon: '📝', h: 'Ball-by-ball record', body: 'Every delivery is recorded. Full over-by-over breakdown stored permanently. Extras, wides, no-balls, byes — all captured exactly as they happened.' },
                { icon: '📊', h: 'Career stats, automatically', body: 'Every match feeds into a player\'s all-time record. Batting average, bowling economy, strike rate — built up automatically over the season, no data entry needed.' },
                { icon: '🔗', h: 'One shareable URL', body: 'Send a single link to anyone outside the club — a parent, a friend, an opposition supporter. They see the live scorecard without needing to download anything or sign up.' },
                { icon: '📱', h: 'Works on any device', body: 'The scorer uses the app. Viewers open any browser on phone, tablet or desktop. No installs required for anyone who isn\'t scoring.' },
                { icon: '🏏', h: 'Full innings history', body: 'Every completed innings is saved. Look back at any match from the season, drill into any over, see how the game unfolded ball by ball.' },
              ].map((c, i) => (
                <div key={i} className="sc-grid-card">
                  <div className="sc-grid-icon"><Glyph e={c.icon} /></div>
                  <h3 className="sc-grid-h">{c.h}</h3>
                  <p className="sc-grid-body">{c.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* TECH */}
        <div className="sc-tech">
          <div className="sc-tech-inner">
            <div>
              <p className="sc-section-eyebrow">The technology</p>
              <h2 className="sc-section-h2">Built for real match conditions.</h2>
              <div className="sc-tech-body">
                <p>Most scoring apps were built for county cricket or for ECB return reporting. ShiftUp was built at a grassroots club, by someone who scores on a phone in the rain with one bar of signal.</p>
                <p>Club members get live updates as each ball is recorded, and the scoring pad is designed for one-handed phone use. Scoring needs a data connection, so it works best with at least a little signal.</p>
                <p>The shareable link is a web page that refreshes every few seconds, with no login required for viewers. Copy the URL, drop it in the club&apos;s Facebook group, and anyone can follow along.</p>
              </div>
            </div>
            <div className="sc-tech-stat-grid">
              <div className="sc-tech-stat"><div className="sc-tech-stat-n">~10s</div><div className="sc-tech-stat-label">Public link refresh</div></div>
              <div className="sc-tech-stat"><div className="sc-tech-stat-n">∞</div><div className="sc-tech-stat-label">Viewers per match</div></div>
              <div className="sc-tech-stat"><div className="sc-tech-stat-n">1</div><div className="sc-tech-stat-label">Tap per ball</div></div>
              <div className="sc-tech-stat"><div className="sc-tech-stat-n">0</div><div className="sc-tech-stat-label">Apps needed to view</div></div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="sc-faq">
          <p className="sc-section-eyebrow">FAQ</p>
          <h2 className="sc-section-h2">Common questions about Live Scorecard.</h2>
          <div className="sc-faq-list">
            {[
              ['Who scores? Does it need special training?', 'Any player, volunteer, or parent with a phone can score. The interface is designed to be intuitive — wide, no-ball, dot, run, boundary. No training required, though we provide a short guide.'],
              ['What happens if the scorer loses signal mid-match?', 'Scoring needs a connection to save each ball. Offline scoring is not available yet. If signal drops, wait for it to return and carry on; balls already recorded are saved.'],
              ['Can opposition teams or the league use this too?', 'The shareable link works for anyone — opposition clubs, league administrators, or journalists. They see a read-only live view. You control your own data.'],
              ['Does this integrate with Play-Cricket or other ECB systems?', 'Not yet — ECB integration is on our roadmap. Currently, match data lives in ShiftUp. We\'re exploring Play-Cricket integration.'],
              ['How far back does career history go?', 'From the moment your club joins ShiftUp. We can\'t import historical data from other systems, but from day one, every match is captured and every player\'s stats begin building.'],
              ['Can multiple scorers work on one match?', 'One primary scorer per match is supported currently. Multi-scorer and tablet scoring modes (common for two-scorer setups) are on the roadmap.'],
            ].map(([q, a], i) => (
              <div key={i} className="sc-faq-item">
                <div className="sc-faq-q">{q}</div>
                <div className="sc-faq-a">{a}</div>
              </div>
            ))}
          </div>
        </div>

        <section className="sc-cta">
          <div className="sc-cta-inner">
            <div>
              <h2 className="sc-cta-h">Let your supporters follow every ball.</h2>
              <p className="sc-cta-sub">Players can start on the free tier. Get in touch to bring live scoring to your club.</p>
            </div>
            <Link href="/contact" className="sc-cta-btn">Get started →</Link>
          </div>
        </section>

        <MarketingFooter />
      </div>
    </>
  );
}
