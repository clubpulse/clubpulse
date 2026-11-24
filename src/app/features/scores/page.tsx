import { Glyph } from '@/components/icons/Glyph';
import Link from 'next/link';
import MarketingNav from '@/components/marketing/MarketingNav';
import MarketingFooter from '@/components/marketing/MarketingFooter';

export default function ScoresPage() {
  return (
    <>
      <style>{`
        .sr-root * { box-sizing: border-box; margin: 0; padding: 0; }
        .sr-root {
          --bg: #04091A; --bg2: #07102B; --bg3: #111;
          --fg: #f0ece4; --fg2: rgba(240,236,228,0.55); --fg3: rgba(240,236,228,0.28);
          --red: #1D4ED8; --gold: #EFC84A; --green: #2ecc71; --orange: #f97316;
          --border: rgba(255,255,255,0.07);
          background: var(--bg); color: var(--fg);
          font-family: 'Inter', sans-serif; overflow-x: hidden;
        }
        @keyframes sr-glow { 0%,100%{box-shadow:0 0 14px rgba(239,200,74,0.2)} 50%{box-shadow:0 0 28px rgba(239,200,74,0.45)} }
        @keyframes sr-rise { 0%{transform:scaleY(0.2);opacity:0.3} 100%{transform:scaleY(1);opacity:1} }

        .sr-nav { position:sticky;top:0;z-index:100;border-bottom:1px solid var(--border);background:rgba(8,8,8,0.92);backdrop-filter:blur(16px); }
        .sr-nav-inner { max-width:1200px;margin:0 auto;padding:0 40px;height:60px;display:flex;align-items:center;justify-content:space-between;gap:24px; }
        .sr-logo { display:flex;align-items:center;gap:8px;text-decoration:none; }
        .sr-logo-mark {width:30px;height:30px;border-radius:7px;background:linear-gradient(145deg,#0F1F5C 0%,#1D4ED8 50%,#3B82F6 100%);box-shadow:0 0 0 1px rgba(96,165,250,0.25),0 0 16px rgba(29,78,216,0.4);display:grid;place-items:center;}
        .sr-logo-name {font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:15px;} .sr-logo-name .club {color:#f0ece4;} .sr-logo-name .pulse {color:#60A5FA;}
        .sr-nav-back { font-size:13px;color:var(--fg3);text-decoration:none;transition:color 0.15s; }
        .sr-nav-back:hover { color:var(--fg); }
        .sr-nav-cta { padding:9px 20px;font-size:13px;font-weight:700;background:var(--red);color:#fff;text-decoration:none;border-radius:9px;transition:opacity 0.12s; }
        .sr-nav-cta:hover { opacity:0.88; }

        .sr-hero { max-width:1200px;margin:0 auto;padding:80px 40px 64px;display:grid;grid-template-columns:1fr 400px;gap:64px;align-items:start; }
        .sr-eyebrow { font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--gold);margin-bottom:16px; }
        .sr-h1 { font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:clamp(36px,5vw,64px);letter-spacing:-0.03em;line-height:1.05;color:var(--fg);margin-bottom:20px; }
        .sr-h1 .gold { color:var(--gold); }
        .sr-sub { font-size:17px;color:var(--fg2);line-height:1.65;max-width:520px;margin-bottom:36px; }
        .sr-btns { display:flex;gap:12px;flex-wrap:wrap; }
        .sr-btn-red { padding:13px 26px;font-size:14px;font-weight:700;background:var(--red);color:#fff;text-decoration:none;border-radius:10px;transition:opacity 0.12s; }
        .sr-btn-red:hover { opacity:0.88; }
        .sr-btn-ghost { padding:13px 26px;font-size:14px;font-weight:600;border:1px solid var(--border);color:var(--fg2);text-decoration:none;border-radius:10px;transition:border-color 0.15s,color 0.15s; }
        .sr-btn-ghost:hover { border-color:rgba(255,255,255,0.2);color:var(--fg); }

        /* LEADERBOARD MOCKUP */
        .sr-board { background:#04091A;border:1px solid var(--border);border-radius:20px;padding:20px; }
        .sr-board-header { display:flex;align-items:center;justify-content:space-between;margin-bottom:14px; }
        .sr-board-title { font-family:'Bricolage Grotesque',sans-serif;font-size:13px;font-weight:800;color:var(--fg); }
        .sr-board-season { font-size:10px;color:var(--fg3); }
        .sr-rows { display:flex;flex-direction:column;gap:3px;margin-bottom:16px; }
        .sr-row { display:grid;grid-template-columns:26px 1fr 48px 48px;align-items:center;gap:8px;padding:10px 12px;border-radius:9px;background:#111;border:1px solid transparent;transition:border-color 0.12s; }
        .sr-row.top { border-color:rgba(239,200,74,0.2);background:rgba(239,200,74,0.05);animation:sr-glow 3s ease-in-out infinite; }
        .sr-rank { font-size:11px;font-weight:700; }
        .sr-rank.gold-rank { color:var(--gold); }
        .sr-rank.silver { color:#aaa; }
        .sr-rank.bronze { color:#cd7f32; }
        .sr-player-info { display:flex;flex-direction:column;gap:1px; }
        .sr-player-name { font-size:13px;font-weight:600;color:var(--fg); }
        .sr-player-role { font-size:10px;color:var(--fg3); }
        .sr-pts-badge { background:rgba(239,200,74,0.12);border:1px solid rgba(239,200,74,0.2);border-radius:6px;padding:4px 8px;font-size:11px;font-weight:700;color:var(--gold);text-align:center; }
        .sr-pts-label { font-size:9px;color:var(--fg3);text-align:center; }
        .sr-pts-header { font-size:9px;font-weight:700;letter-spacing:0.06em;color:var(--fg3);text-transform:uppercase;text-align:center; }
        .sr-milestone-row { background:#111;border:1px solid var(--border);border-radius:10px;padding:10px 14px; }
        .sr-milestone-label { font-size:9px;font-weight:700;letter-spacing:0.08em;color:var(--gold);text-transform:uppercase;margin-bottom:6px; }
        .sr-milestone-bar { height:4px;background:rgba(255,255,255,0.08);border-radius:2px;overflow:hidden; }
        .sr-milestone-fill { height:100%;border-radius:2px; }

        /* POINTS GRID */
        .sr-section { max-width:1200px;margin:0 auto;padding:80px 40px; }
        .sr-section-eyebrow { font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--gold);margin-bottom:14px; }
        .sr-section-h2 { font-family:'Bricolage Grotesque',sans-serif;font-size:clamp(26px,3.5vw,40px);font-weight:800;letter-spacing:-0.025em;color:var(--fg);margin-bottom:12px; }
        .sr-section-sub { font-size:15px;color:var(--fg2);max-width:560px;line-height:1.65;margin-bottom:48px; }

        .sr-pts-grid { display:grid;grid-template-columns:repeat(3,1fr);gap:2px;background:var(--border);border:1px solid var(--border);border-radius:16px;overflow:hidden; }
        .sr-pts-cell { background:var(--bg2);padding:24px 20px; }
        .sr-pts-cell-icon { font-size:22px;margin-bottom:10px; }
        .sr-pts-cell-h { font-family:'Bricolage Grotesque',sans-serif;font-size:13px;font-weight:800;color:var(--fg);margin-bottom:4px; }
        .sr-pts-cell-body { font-size:12px;color:var(--fg2);line-height:1.6; }
        .sr-pts-cell-val { font-family:'Bricolage Grotesque',sans-serif;font-size:20px;font-weight:800;color:var(--gold);margin-top:8px; }

        /* REWARDS */
        .sr-rewards { background:var(--bg2);border-top:1px solid var(--border);border-bottom:1px solid var(--border); }
        .sr-rewards-inner { max-width:1200px;margin:0 auto;padding:80px 40px; }
        .sr-reward-cards { display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:48px; }
        .sr-reward-card { background:var(--bg3);border:1px solid var(--border);border-radius:16px;padding:28px; }
        .sr-reward-card.featured { border-color:rgba(239,200,74,0.25);background:rgba(239,200,74,0.04); }
        .sr-reward-icon { font-size:32px;margin-bottom:12px; }
        .sr-reward-pts { font-family:'Bricolage Grotesque',sans-serif;font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:var(--gold);margin-bottom:8px; }
        .sr-reward-h { font-family:'Bricolage Grotesque',sans-serif;font-size:16px;font-weight:800;color:var(--fg);margin-bottom:8px; }
        .sr-reward-body { font-size:12.5px;color:var(--fg2);line-height:1.65; }

        /* FAQ */
        .sr-faq { max-width:1200px;margin:0 auto;padding:80px 40px; }
        .sr-faq-list { display:flex;flex-direction:column;gap:2px;border:1px solid var(--border);border-radius:16px;overflow:hidden;margin-top:48px; }
        .sr-faq-item { background:var(--bg2);padding:24px 28px;border-bottom:1px solid var(--border); }
        .sr-faq-item:last-child { border-bottom:none; }
        .sr-faq-q { font-family:'Bricolage Grotesque',sans-serif;font-size:15px;font-weight:800;color:var(--fg);margin-bottom:10px; }
        .sr-faq-a { font-size:13.5px;color:var(--fg2);line-height:1.7; }

        .sr-cta { background:var(--red);border-top:1px solid rgba(255,255,255,0.08); }
        .sr-cta-inner { max-width:1200px;margin:0 auto;padding:72px 40px;display:flex;align-items:center;justify-content:space-between;gap:32px;flex-wrap:wrap; }
        .sr-cta-h { font-family:'Bricolage Grotesque',sans-serif;font-size:clamp(22px,3vw,36px);font-weight:800;letter-spacing:-0.02em;color:#fff; }
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
        <MarketingNav />

        <section className="sr-hero">
          <div>
            <p className="sr-eyebrow">🏆 Scores & Rewards</p>
            <h1 className="sr-h1">Scores you can <span className="gold">actually spend.</span></h1>
            <p className="sr-sub">Players earn Scores for taking part. Scores are never sold and are not a fifth pillar. 500 Scores equal £1. A tier multiplies what you earn: Bronze 1×, Silver 2×, Gold 3× and Platinum 4×.</p>
            <div className="sr-btns">
              <Link href="/contact" className="sr-btn-red">Get started →</Link>
              <Link href="/features" className="sr-btn-ghost">See all features</Link>
            </div>
          </div>

          <div className="sr-board">
            <div className="sr-board-header">
              <div className="sr-board-title">Scores you can earn</div>
              <div className="sr-board-season">500 Scores = £1</div>
            </div>
            <div className="sr-rows">
              <div className="sr-row" style={{gridTemplateColumns:'26px 1fr 48px 48px',padding:'6px 10px',background:'transparent',border:'none'}}>
                <div />
                <div />
                <div className="sr-pts-header">EACH</div>
                <div />
              </div>
              {[
                { name:'Daily check-in', role:'Base value for the day', pts:'+5' },
                { name:'Academy lesson', role:'The first time you pass', pts:'+10' },
                { name:'Training attendance', role:'Marked present by the club', pts:'+10' },
                { name:'Match fee on time', role:'Paid on or before the due date', pts:'+10' },
                { name:'Community post', role:'The first live post of the day', pts:'+3' },
              ].map((p, i) => (
                <div key={i} className={`sr-row${i === 0 ? ' top' : ''}`}>
                  <div className="sr-rank">·</div>
                  <div className="sr-player-info">
                    <div className="sr-player-name">{p.name}</div>
                    <div className="sr-player-role">{p.role}</div>
                  </div>
                  <div className="sr-pts-badge">{p.pts}</div>
                  <div />
                </div>
              ))}
            </div>
            <div className="sr-milestone-row">
              <div className="sr-milestone-label">Bronze 1× · Silver 2× · Gold 3× · Platinum 4×</div>
              <div style={{display:'flex',alignItems:'center',gap:10,marginTop:4}}>
                <div className="sr-milestone-bar" style={{flex:1}}>
                  <div className="sr-milestone-fill" style={{width:'50%',background:'linear-gradient(90deg,#EFC84A,#e8c86a)'}} />
                </div>
                <span style={{fontSize:'10px',color:'var(--gold)',fontWeight:700}}>250/500 · £0.50</span>
              </div>
            </div>
          </div>
        </section>

        {/* HOW POINTS WORK */}
        <div style={{borderTop:'1px solid rgba(255,255,255,0.07)'}}>
          <div className="sr-section">
            <p className="sr-section-eyebrow">How Scores work</p>
            <h2 className="sr-section-h2">Earn them. They have a value.</h2>
            <p className="sr-section-sub">Scores are a reward for taking part, not a runs-and-wickets leaderboard. Scores are never sold and are not a fifth pillar. 500 Scores equal £1. Your tier multiplies what you earn: Bronze 1×, Silver 2×, Gold 3× and Platinum 4×.</p>
            <div className="sr-pts-grid">
              {[
                { icon:'📅', h:'Daily check-in', body:'The base is 5 Scores. The first two days pay that, days 3 and 4 pay double, days 5 and 6 pay triple, and day 7 is a scratch card.', val:'Base 5' },
                { icon:'🎓', h:'Academy', body:'Passing a lesson pays 10 Scores the first time. Finishing a whole track pays a 30 Score bonus.', val:'+10 / +30' },
                { icon:'🏏', h:'Training and match fees', body:'A player marked present at training earns 10 Scores. A match fee paid on or before its due date earns 10 Scores.', val:'+10' },
                { icon:'🤝', h:'Community and wellness', body:'The first live Community post of the day earns 3 Scores. A readiness check-in earns 3. Joining a nets or pick-up session earns 5.', val:'+3 / +5' },
                { icon:'🎮', h:'Games and tasks', body:'Daily games, the quiz and the weekly and monthly tasks each have their own amount. Nothing is staked.', val:'Per task' },
                { icon:'✖️', h:'Tiers', body:'Bronze multiplies by 1, Silver by 2, Gold by 3 and Platinum by 4. Free is Bronze. Pro is Silver, Elite is Gold and Legend is Platinum.', val:'1× to 4×' },
              ].map((c, i) => (
                <div key={i} className="sr-pts-cell">
                  <div className="sr-pts-cell-icon"><Glyph e={c.icon} /></div>
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
            <h2 className="sr-section-h2">A balance with a cash value.</h2>
            <p className="sr-section-sub">Scores are worth money at a fixed rate, and a higher tier makes the same action worth more. The amounts below are the defaults.</p>
            <div className="sr-reward-cards">
              <div className="sr-reward-card featured">
                <div className="sr-reward-icon">💷</div>
                <div className="sr-reward-pts">The rate</div>
                <div className="sr-reward-h">500 Scores = £1</div>
                <div className="sr-reward-body">1,250 Scores are £2.50. The rate is the same everywhere in ClubPulse.</div>
              </div>
              <div className="sr-reward-card">
                <div className="sr-reward-icon"><Glyph e="✖️" /></div>
                <div className="sr-reward-pts">The tiers</div>
                <div className="sr-reward-h">1×, 2×, 3×, 4×</div>
                <div className="sr-reward-body">Bronze is 1×, Silver is 2×, Gold is 3× and Platinum is 4×. Free includes Bronze. Pro includes Silver, Elite includes Gold and Legend includes Platinum.</div>
              </div>
              <div className="sr-reward-card">
                <div className="sr-reward-icon"><Glyph e="⚙️" /></div>
                <div className="sr-reward-pts">Per club</div>
                <div className="sr-reward-h">Amounts can be set</div>
                <div className="sr-reward-body">Each earning rule has a default. A club can change an amount or turn a rule off. The weekly cap starts at 300 Scores.</div>
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
              ['What is a Score worth?', '500 Scores equal £1. That rate is the same across the app.'],
              ['What do the tiers do?', 'They multiply what you earn. Bronze is 1×, Silver is 2×, Gold is 3× and Platinum is 4×. Free is Bronze, Pro is Silver, Elite is Gold and Legend is Platinum.'],
              ['How do players earn them?', 'By taking part: a daily check-in, training, a match fee paid on time, an Academy lesson, a Community post, a wellness check-in, and the daily games and tasks. Each rule has its own default amount.'],
              ['Are Scores a performance leaderboard?', 'No. They are not calculated from runs, wickets or catches on the scorecard.'],
              ['Can a club change the amounts?', 'Yes. A club can override an amount or switch a rule off. The defaults are the starting point, and the weekly cap starts at 300 Scores.'],
              ['Do the games cost Scores?', 'No. The games pay Scores. Nothing is staked and nothing is lost.'],
              ['Are Scores sold, or a fifth pillar?', 'No. You earn them by taking part. They are never sold, and they are not a fifth pillar.'],            ].map(([q, a], i) => (
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
              <h2 className="sr-cta-h">Scores players can earn.</h2>
              <p className="sr-cta-sub">500 Scores equal £1, with tiers from Bronze 1× to Platinum 4×.</p>
            </div>
            <Link href="/contact" className="sr-cta-btn">Get started →</Link>
          </div>
        </section>

        <MarketingFooter />
      </div>
    </>
  );
}
