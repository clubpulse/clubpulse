import Link from 'next/link';

export default function ScoresPage() {
  return (
    <>
      <style>{`
        .sr-root * { box-sizing: border-box; margin: 0; padding: 0; }
        .sr-root {
          --bg: #080808; --bg2: #0d0d0d; --bg3: #111;
          --fg: #f0ece4; --fg2: rgba(240,236,228,0.55); --fg3: rgba(240,236,228,0.28);
          --red: #9b1c1c; --gold: #c9a54c; --green: #2ecc71; --orange: #f97316;
          --border: rgba(255,255,255,0.07);
          background: var(--bg); color: var(--fg);
          font-family: 'Inter', sans-serif; overflow-x: hidden;
        }
        @keyframes sr-glow { 0%,100%{box-shadow:0 0 14px rgba(201,165,76,0.2)} 50%{box-shadow:0 0 28px rgba(201,165,76,0.45)} }
        @keyframes sr-rise { 0%{transform:scaleY(0.2);opacity:0.3} 100%{transform:scaleY(1);opacity:1} }

        .sr-nav { position:sticky;top:0;z-index:100;border-bottom:1px solid var(--border);background:rgba(8,8,8,0.92);backdrop-filter:blur(16px); }
        .sr-nav-inner { max-width:1200px;margin:0 auto;padding:0 40px;height:60px;display:flex;align-items:center;justify-content:space-between;gap:24px; }
        .sr-logo { display:flex;align-items:center;gap:8px;text-decoration:none; }
        .sr-logo-mark { width:30px;height:30px;background:var(--red);border-radius:7px;display:grid;place-items:center;font-family:'Syne',sans-serif;font-weight:800;font-size:13px;color:#fff; }
        .sr-logo-name { font-family:'Syne',sans-serif;font-weight:700;font-size:15px;color:var(--fg); }
        .sr-nav-back { font-size:13px;color:var(--fg3);text-decoration:none;transition:color 0.15s; }
        .sr-nav-back:hover { color:var(--fg); }
        .sr-nav-cta { padding:9px 20px;font-size:13px;font-weight:700;background:var(--red);color:#fff;text-decoration:none;border-radius:9px;transition:opacity 0.12s; }
        .sr-nav-cta:hover { opacity:0.88; }

        .sr-hero { max-width:1200px;margin:0 auto;padding:80px 40px 64px;display:grid;grid-template-columns:1fr 400px;gap:64px;align-items:start; }
        .sr-eyebrow { font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--gold);margin-bottom:16px; }
        .sr-h1 { font-family:'Syne',sans-serif;font-weight:800;font-size:clamp(36px,5vw,64px);letter-spacing:-0.03em;line-height:1.05;color:var(--fg);margin-bottom:20px; }
        .sr-h1 .gold { color:var(--gold); }
        .sr-sub { font-size:17px;color:var(--fg2);line-height:1.65;max-width:520px;margin-bottom:36px; }
        .sr-btns { display:flex;gap:12px;flex-wrap:wrap; }
        .sr-btn-red { padding:13px 26px;font-size:14px;font-weight:700;background:var(--red);color:#fff;text-decoration:none;border-radius:10px;transition:opacity 0.12s; }
        .sr-btn-red:hover { opacity:0.88; }
        .sr-btn-ghost { padding:13px 26px;font-size:14px;font-weight:600;border:1px solid var(--border);color:var(--fg2);text-decoration:none;border-radius:10px;transition:border-color 0.15s,color 0.15s; }
        .sr-btn-ghost:hover { border-color:rgba(255,255,255,0.2);color:var(--fg); }

        /* LEADERBOARD MOCKUP */
        .sr-board { background:#0a0a0a;border:1px solid var(--border);border-radius:20px;padding:20px; }
        .sr-board-header { display:flex;align-items:center;justify-content:space-between;margin-bottom:14px; }
        .sr-board-title { font-family:'Syne',sans-serif;font-size:13px;font-weight:800;color:var(--fg); }
        .sr-board-season { font-size:10px;color:var(--fg3); }
        .sr-rows { display:flex;flex-direction:column;gap:3px;margin-bottom:16px; }
        .sr-row { display:grid;grid-template-columns:26px 1fr 48px 48px;align-items:center;gap:8px;padding:10px 12px;border-radius:9px;background:#111;border:1px solid transparent;transition:border-color 0.12s; }
        .sr-row.top { border-color:rgba(201,165,76,0.2);background:rgba(201,165,76,0.05);animation:sr-glow 3s ease-in-out infinite; }
        .sr-rank { font-size:11px;font-weight:700; }
        .sr-rank.gold-rank { color:var(--gold); }
        .sr-rank.silver { color:#aaa; }
        .sr-rank.bronze { color:#cd7f32; }
        .sr-player-info { display:flex;flex-direction:column;gap:1px; }
        .sr-player-name { font-size:13px;font-weight:600;color:var(--fg); }
        .sr-player-role { font-size:10px;color:var(--fg3); }
        .sr-pts-badge { background:rgba(201,165,76,0.12);border:1px solid rgba(201,165,76,0.2);border-radius:6px;padding:4px 8px;font-size:11px;font-weight:700;color:var(--gold);text-align:center; }
        .sr-pts-label { font-size:9px;color:var(--fg3);text-align:center; }
        .sr-pts-header { font-size:9px;font-weight:700;letter-spacing:0.06em;color:var(--fg3);text-transform:uppercase;text-align:center; }
        .sr-milestone-row { background:#111;border:1px solid var(--border);border-radius:10px;padding:10px 14px; }
        .sr-milestone-label { font-size:9px;font-weight:700;letter-spacing:0.08em;color:var(--gold);text-transform:uppercase;margin-bottom:6px; }
        .sr-milestone-bar { height:4px;background:rgba(255,255,255,0.08);border-radius:2px;overflow:hidden; }
        .sr-milestone-fill { height:100%;border-radius:2px; }

        /* POINTS GRID */
        .sr-section { max-width:1200px;margin:0 auto;padding:80px 40px; }
        .sr-section-eyebrow { font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--gold);margin-bottom:14px; }
        .sr-section-h2 { font-family:'Syne',sans-serif;font-size:clamp(26px,3.5vw,40px);font-weight:800;letter-spacing:-0.025em;color:var(--fg);margin-bottom:12px; }
        .sr-section-sub { font-size:15px;color:var(--fg2);max-width:560px;line-height:1.65;margin-bottom:48px; }

        .sr-pts-grid { display:grid;grid-template-columns:repeat(3,1fr);gap:2px;background:var(--border);border:1px solid var(--border);border-radius:16px;overflow:hidden; }
        .sr-pts-cell { background:var(--bg2);padding:24px 20px; }
        .sr-pts-cell-icon { font-size:22px;margin-bottom:10px; }
        .sr-pts-cell-h { font-family:'Syne',sans-serif;font-size:13px;font-weight:800;color:var(--fg);margin-bottom:4px; }
        .sr-pts-cell-body { font-size:12px;color:var(--fg2);line-height:1.6; }
        .sr-pts-cell-val { font-family:'Syne',sans-serif;font-size:20px;font-weight:800;color:var(--gold);margin-top:8px; }

        /* REWARDS */
        .sr-rewards { background:var(--bg2);border-top:1px solid var(--border);border-bottom:1px solid var(--border); }
        .sr-rewards-inner { max-width:1200px;margin:0 auto;padding:80px 40px; }
        .sr-reward-cards { display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:48px; }
        .sr-reward-card { background:var(--bg3);border:1px solid var(--border);border-radius:16px;padding:28px; }
        .sr-reward-card.featured { border-color:rgba(201,165,76,0.25);background:rgba(201,165,76,0.04); }
        .sr-reward-icon { font-size:32px;margin-bottom:12px; }
        .sr-reward-pts { font-family:'Syne',sans-serif;font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:var(--gold);margin-bottom:8px; }
        .sr-reward-h { font-family:'Syne',sans-serif;font-size:16px;font-weight:800;color:var(--fg);margin-bottom:8px; }
        .sr-reward-body { font-size:12.5px;color:var(--fg2);line-height:1.65; }

        /* FAQ */
        .sr-faq { max-width:1200px;margin:0 auto;padding:80px 40px; }
        .sr-faq-list { display:flex;flex-direction:column;gap:2px;border:1px solid var(--border);border-radius:16px;overflow:hidden;margin-top:48px; }
        .sr-faq-item { background:var(--bg2);padding:24px 28px;border-bottom:1px solid var(--border); }
        .sr-faq-item:last-child { border-bottom:none; }
        .sr-faq-q { font-family:'Syne',sans-serif;font-size:15px;font-weight:800;color:var(--fg);margin-bottom:10px; }
        .sr-faq-a { font-size:13.5px;color:var(--fg2);line-height:1.7; }

        .sr-cta { background:var(--red);border-top:1px solid rgba(255,255,255,0.08); }
        .sr-cta-inner { max-width:1200px;margin:0 auto;padding:72px 40px;display:flex;align-items:center;justify-content:space-between;gap:32px;flex-wrap:wrap; }
        .sr-cta-h { font-family:'Syne',sans-serif;font-size:clamp(22px,3vw,36px);font-weight:800;letter-spacing:-0.02em;color:#fff; }
        .sr-cta-sub { font-size:14px;color:rgba(255,255,255,0.65);margin-top:6px; }
        .sr-cta-btn { padding:14px 30px;font-size:14px;font-weight:700;background:#fff;color:var(--red);text-decoration:none;border-radius:10px;white-space:nowrap;transition:opacity 0.12s; }
        .sr-cta-btn:hover { opacity:0.9; }
        .sr-footer { border-top:1px solid var(--border); }
        .sr-footer-inner { max-width:1200px;margin:0 auto;padding:32px 40px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px; }
        .sr-footer-copy { font-size:12px;color:var(--fg3); }
        .sr-footer-links { display:flex;gap:20px; }
        .sr-footer-links a { font-size:13px;color:var(--fg3);text-decoration:none;transition:color 0.12s; }
        .sr-footer-links a:hover { color:var(--fg); }

        @media (max-width:900px) {
          .sr-hero { grid-template-columns:1fr;gap:40px; }
          .sr-pts-grid { grid-template-columns:1fr 1fr; }
          .sr-reward-cards { grid-template-columns:1fr; }
          .sr-cta-inner { flex-direction:column;text-align:center; }
        }
        @media (max-width:600px) {
          .sr-hero, .sr-section, .sr-rewards-inner, .sr-faq { padding-left:16px;padding-right:16px; }
          .sr-nav-inner, .sr-cta-inner, .sr-footer-inner { padding-left:16px;padding-right:16px; }
          .sr-pts-grid { grid-template-columns:1fr; }
        }
      `}</style>

      <div className="sr-root">
        <nav className="sr-nav">
          <div className="sr-nav-inner">
            <Link href="/" className="sr-logo"><span className="sr-logo-mark">C</span><span className="sr-logo-name">ClubPulse</span></Link>
            <Link href="/#features" className="sr-nav-back">← All features</Link>
            <Link href="/contact" className="sr-nav-cta">Get started</Link>
          </div>
        </nav>

        <section className="sr-hero">
          <div>
            <p className="sr-eyebrow">🏆 Scores & Rewards</p>
            <h1 className="sr-h1">Points that make <span className="gold">every run count.</span></h1>
            <p className="sr-sub">ClubPulse automatically converts live scorecard data into a seasonal points leaderboard. Every run, wicket, and catch earns points. Players see where they stand — and clubs use it to recognise their contributors.</p>
            <div className="sr-btns">
              <Link href="/contact" className="sr-btn-red">Get started →</Link>
              <Link href="/#features" className="sr-btn-ghost">See all features</Link>
            </div>
          </div>

          <div className="sr-board">
            <div className="sr-board-header">
              <div className="sr-board-title">Season Leaderboard</div>
              <div className="sr-board-season">2025 Season · All XI</div>
            </div>
            <div className="sr-rows">
              <div className="sr-row" style={{gridTemplateColumns:'26px 1fr 48px 48px',padding:'6px 10px',background:'transparent',border:'none'}}>
                <div />
                <div />
                <div className="sr-pts-header">PTS</div>
                <div className="sr-pts-header">RANK</div>
              </div>
              {[
                { rank:1, name:'A. Rahman', role:'Batter · Right-arm off-spin', pts:248, rankLabel:'🥇' },
                { rank:2, name:'J. Singh', role:'All-rounder', pts:201, rankLabel:'🥈' },
                { rank:3, name:'T. Okafor', role:'Wicket-keeper', pts:187, rankLabel:'🥉' },
                { rank:4, name:'S. Patel', role:'Batter', pts:164, rankLabel:'4th' },
                { rank:5, name:'D. Clarke', role:'Bowler · Left-arm pace', pts:142, rankLabel:'5th' },
              ].map((p, i) => (
                <div key={i} className={`sr-row${i === 0 ? ' top' : ''}`}>
                  <div className={`sr-rank${i===0?' gold-rank':i===1?' silver':i===2?' bronze':''}`}>{p.rank}</div>
                  <div className="sr-player-info">
                    <div className="sr-player-name">{p.name}</div>
                    <div className="sr-player-role">{p.role}</div>
                  </div>
                  <div className="sr-pts-badge">{p.pts}</div>
                  <div className="sr-pts-label">{p.rankLabel}</div>
                </div>
              ))}
            </div>
            <div className="sr-milestone-row">
              <div className="sr-milestone-label">A. Rahman · Next milestone: 250 pts</div>
              <div style={{display:'flex',alignItems:'center',gap:10,marginTop:4}}>
                <div className="sr-milestone-bar" style={{flex:1}}>
                  <div className="sr-milestone-fill" style={{width:'99%',background:'linear-gradient(90deg,#c9a54c,#e8c86a)'}} />
                </div>
                <span style={{fontSize:'10px',color:'var(--gold)',fontWeight:700}}>248/250</span>
              </div>
            </div>
          </div>
        </section>

        {/* HOW POINTS WORK */}
        <div style={{borderTop:'1px solid rgba(255,255,255,0.07)'}}>
          <div className="sr-section">
            <p className="sr-section-eyebrow">How points work</p>
            <h2 className="sr-section-h2">Automatic. Fair. Transparent.</h2>
            <p className="sr-section-sub">Points are calculated automatically from live scorecard data. There is nothing to configure — every completed match updates the leaderboard.</p>
            <div className="sr-pts-grid">
              {[
                { icon:'🏏', h:'Batting runs', body:'Each run scored earns 1 point. A fifty earns a 10-point bonus. A century earns 25 extra points on top.', val:'+1 per run' },
                { icon:'🎯', h:'Wickets taken', body:'Each wicket earns 20 points. A 3-wicket haul earns an extra 15. Five wickets earns an extra 40.', val:'+20 per wicket' },
                { icon:'🧤', h:'Catches & stumpings', body:'Each catch in the field earns 10 points. A stumping earns 15. Run-outs credited to the thrower earn 8.', val:'+10 per catch' },
                { icon:'🏃', h:'Availability bonus', body:'Players who turn up reliably earn 5 points per confirmed match. It rewards the players who make the club work, not just the star performers.', val:'+5 per match' },
                { icon:'⭐', h:'Player of the match', body:'The club admin can award Player of the Match after every game. That earns 30 points and shows up in the player\'s profile history.', val:'+30 POTM' },
                { icon:'📅', h:'End-of-season honours', body:'Top 3 players at season end earn bonus points in their profile history. The leaderboard resets each season so new players can compete.', val:'Season reset' },
              ].map((c, i) => (
                <div key={i} className="sr-pts-cell">
                  <div className="sr-pts-cell-icon">{c.icon}</div>
                  <div className="sr-pts-cell-h">{c.h}</div>
                  <div className="sr-pts-cell-body">{c.body}</div>
                  <div className="sr-pts-cell-val">{c.val}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* REWARDS */}
        <div className="sr-rewards">
          <div className="sr-rewards-inner">
            <p className="sr-section-eyebrow">Rewards</p>
            <h2 className="sr-section-h2">Recognition that actually means something.</h2>
            <p className="sr-section-sub">Scores and Rewards is about more than a number. It gives clubs a structured way to recognise their best contributors — beyond just the top run-scorer.</p>
            <div className="sr-reward-cards">
              <div className="sr-reward-card featured">
                <div className="sr-reward-icon">👑</div>
                <div className="sr-reward-pts">250 pts milestone</div>
                <div className="sr-reward-h">Club Legend badge</div>
                <div className="sr-reward-body">Players who reach 250 points in a season earn a permanent Club Legend badge on their profile. It shows in their record across future seasons.</div>
              </div>
              <div className="sr-reward-card">
                <div className="sr-reward-icon">🏆</div>
                <div className="sr-reward-pts">Season end</div>
                <div className="sr-reward-h">Top 3 recognition</div>
                <div className="sr-reward-body">End-of-season leaderboard top 3 are permanently recorded in the club history. Exported to PDF for end-of-season presentation nights.</div>
              </div>
              <div className="sr-reward-card">
                <div className="sr-reward-icon">⭐</div>
                <div className="sr-reward-pts">Per match</div>
                <div className="sr-reward-h">Player of the Match</div>
                <div className="sr-reward-body">Admin can award POTM after any match. It earns 30 points, shows in the player&apos;s profile, and is visible to the whole club.</div>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="sr-faq">
          <p className="sr-section-eyebrow">FAQ</p>
          <h2 className="sr-section-h2">Common questions about Scores & Rewards.</h2>
          <div className="sr-faq-list">
            {[
              ['Do I have to enter points manually?', 'No — points are calculated automatically from the live scorecard. Once a match is scored in ClubPulse, the leaderboard updates itself. There is nothing for admins to fill in.'],
              ['Can we customise the points system?', 'Not yet, but it\'s on the roadmap. Currently all clubs use the same standard point values. In future, club admins will be able to adjust weights — for example, giving extra weight to bowling if your club is bowling-heavy.'],
              ['What happens at the end of the season?', 'The leaderboard resets for the new season. Historical data is retained — players can see their past season totals in their profile. Top 3 from each season are recorded in the club\'s permanent history.'],
              ['Can players see their own points breakdown?', 'Yes — each player has a profile page showing exactly where their points came from: runs scored, wickets taken, catches, POTM awards, and availability points, game by game.'],
              ['What if we don\'t use the live scorecard?', 'Scores & Rewards requires live scorecard data to work. If you enter match results manually after the fact rather than scoring live, points can still be awarded — but POTM must be manually assigned and some in-match stats may not be available.'],
              ['Is there a mobile view of the leaderboard?', 'Yes. The leaderboard is fully responsive and looks good on phones. Players can bookmark it directly.'],
            ].map(([q, a], i) => (
              <div key={i} className="sr-faq-item">
                <div className="sr-faq-q">{q}</div>
                <div className="sr-faq-a">{a}</div>
              </div>
            ))}
          </div>
        </div>

        <section className="sr-cta">
          <div className="sr-cta-inner">
            <div>
              <h2 className="sr-cta-h">Give your players something to compete for.</h2>
              <p className="sr-cta-sub">Get ClubPulse set up for your club in under an hour.</p>
            </div>
            <Link href="/contact" className="sr-cta-btn">Get started →</Link>
          </div>
        </section>

        <footer className="sr-footer">
          <div className="sr-footer-inner">
            <Link href="/" className="sr-logo"><span className="sr-logo-mark">C</span><span className="sr-logo-name">ClubPulse</span></Link>
            <div className="sr-footer-links">
              <Link href="/features/availability">Availability</Link>
              <Link href="/features/scorecard">Scorecard</Link>
              <Link href="/features/ai-coach">AI Coach</Link>
              <Link href="/features/scores">Scores</Link>
              <Link href="/features/finance">Finance</Link>
            </div>
            <p className="sr-footer-copy">© 2026 ClubPulse</p>
          </div>
        </footer>
      </div>
    </>
  );
}
