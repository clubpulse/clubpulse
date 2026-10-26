import Link from 'next/link';

export default function FinancePage() {
  return (
    <>
      <style>{`
        .fn-root * { box-sizing: border-box; margin: 0; padding: 0; }
        .fn-root {
          --bg: #080808; --bg2: #0d0d0d; --bg3: #111;
          --fg: #f0ece4; --fg2: rgba(240,236,228,0.55); --fg3: rgba(240,236,228,0.28);
          --red: #9b1c1c; --gold: #c9a54c; --green: #2ecc71; --orange: #f97316;
          --border: rgba(255,255,255,0.07);
          background: var(--bg); color: var(--fg);
          font-family: 'Inter', sans-serif; overflow-x: hidden;
        }
        @keyframes fn-tick { 0%,100%{opacity:0.5} 50%{opacity:1} }

        .fn-nav { position:sticky;top:0;z-index:100;border-bottom:1px solid var(--border);background:rgba(8,8,8,0.92);backdrop-filter:blur(16px); }
        .fn-nav-inner { max-width:1200px;margin:0 auto;padding:0 40px;height:60px;display:flex;align-items:center;justify-content:space-between;gap:24px; }
        .fn-logo { display:flex;align-items:center;gap:8px;text-decoration:none; }
        .fn-logo-mark { width:30px;height:30px;background:var(--red);border-radius:7px;display:grid;place-items:center;font-family:'Syne',sans-serif;font-weight:800;font-size:13px;color:#fff; }
        .fn-logo-name { font-family:'Syne',sans-serif;font-weight:700;font-size:15px;color:var(--fg); }
        .fn-nav-back { font-size:13px;color:var(--fg3);text-decoration:none;transition:color 0.15s; }
        .fn-nav-back:hover { color:var(--fg); }
        .fn-nav-cta { padding:9px 20px;font-size:13px;font-weight:700;background:var(--red);color:#fff;text-decoration:none;border-radius:9px;transition:opacity 0.12s; }
        .fn-nav-cta:hover { opacity:0.88; }

        .fn-hero { max-width:1200px;margin:0 auto;padding:80px 40px 64px;display:grid;grid-template-columns:1fr 400px;gap:64px;align-items:start; }
        .fn-eyebrow { font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--green);margin-bottom:16px; }
        .fn-h1 { font-family:'Syne',sans-serif;font-weight:800;font-size:clamp(36px,5vw,64px);letter-spacing:-0.03em;line-height:1.05;color:var(--fg);margin-bottom:20px; }
        .fn-h1 .green { color:var(--green); }
        .fn-sub { font-size:17px;color:var(--fg2);line-height:1.65;max-width:520px;margin-bottom:36px; }
        .fn-btns { display:flex;gap:12px;flex-wrap:wrap; }
        .fn-btn-red { padding:13px 26px;font-size:14px;font-weight:700;background:var(--red);color:#fff;text-decoration:none;border-radius:10px;transition:opacity 0.12s; }
        .fn-btn-red:hover { opacity:0.88; }
        .fn-btn-ghost { padding:13px 26px;font-size:14px;font-weight:600;border:1px solid var(--border);color:var(--fg2);text-decoration:none;border-radius:10px;transition:border-color 0.15s,color 0.15s; }
        .fn-btn-ghost:hover { border-color:rgba(255,255,255,0.2);color:var(--fg); }

        /* FINANCE MOCKUP */
        .fn-card { background:#0a0a0a;border:1px solid var(--border);border-radius:20px;padding:20px; }
        .fn-card-header { display:flex;align-items:center;justify-content:space-between;margin-bottom:16px; }
        .fn-card-title { font-family:'Syne',sans-serif;font-size:13px;font-weight:800;color:var(--fg); }
        .fn-period { font-size:10px;color:var(--fg3); }
        .fn-balance-row { display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px; }
        .fn-balance { background:#111;border:1px solid var(--border);border-radius:12px;padding:14px; }
        .fn-balance-label { font-size:9px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--fg3);margin-bottom:6px; }
        .fn-balance-amount { font-family:'Syne',sans-serif;font-size:20px;font-weight:800; }
        .fn-balance-amount.pos { color:var(--green); }
        .fn-balance-amount.neg { color:var(--red); }
        .fn-balance-sub { font-size:10px;color:var(--fg3);margin-top:2px; }
        .fn-txns { display:flex;flex-direction:column;gap:2px;margin-bottom:14px; }
        .fn-txn { display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 12px;background:#111;border-radius:8px;border:1px solid var(--border); }
        .fn-txn-left { display:flex;align-items:center;gap:10px; }
        .fn-txn-icon { width:28px;height:28px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0; }
        .fn-txn-info { display:flex;flex-direction:column;gap:1px; }
        .fn-txn-name { font-size:12px;font-weight:600;color:var(--fg); }
        .fn-txn-date { font-size:10px;color:var(--fg3); }
        .fn-txn-amt { font-size:12px;font-weight:700; }
        .fn-txn-amt.credit { color:var(--green); }
        .fn-txn-amt.debit { color:var(--fg2); }
        .fn-wise-badge { display:flex;align-items:center;gap:6px;background:rgba(46,204,113,0.08);border:1px solid rgba(46,204,113,0.15);border-radius:8px;padding:8px 12px;font-size:10px;color:var(--green);font-weight:600; }
        .fn-wise-dot { width:5px;height:5px;border-radius:50%;background:var(--green);animation:fn-tick 2s infinite; }

        /* SECTIONS */
        .fn-section { max-width:1200px;margin:0 auto;padding:80px 40px; }
        .fn-section-eyebrow { font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--green);margin-bottom:14px; }
        .fn-section-h2 { font-family:'Syne',sans-serif;font-size:clamp(26px,3.5vw,40px);font-weight:800;letter-spacing:-0.025em;color:var(--fg);margin-bottom:12px; }
        .fn-section-sub { font-size:15px;color:var(--fg2);max-width:560px;line-height:1.65;margin-bottom:48px; }

        .fn-steps { display:grid;grid-template-columns:repeat(4,1fr);gap:2px;background:var(--border);border:1px solid var(--border);border-radius:18px;overflow:hidden; }
        .fn-step { background:var(--bg2);padding:30px 24px; }
        .fn-step-n { font-family:'Syne',sans-serif;font-size:11px;font-weight:800;letter-spacing:0.1em;color:rgba(155,28,28,0.4);margin-bottom:14px; }
        .fn-step-icon { font-size:24px;margin-bottom:12px; }
        .fn-step-h { font-family:'Syne',sans-serif;font-size:14px;font-weight:800;color:var(--fg);margin-bottom:6px; }
        .fn-step-body { font-size:12px;color:var(--fg2);line-height:1.65; }

        /* FEATURES GRID */
        .fn-features { background:var(--bg2);border-top:1px solid var(--border);border-bottom:1px solid var(--border); }
        .fn-features-inner { max-width:1200px;margin:0 auto;padding:80px 40px; }
        .fn-feat-grid { display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:48px; }
        .fn-feat-card { background:var(--bg3);border:1px solid var(--border);border-radius:16px;padding:28px; }
        .fn-feat-icon { font-size:28px;margin-bottom:12px; }
        .fn-feat-h { font-family:'Syne',sans-serif;font-size:15px;font-weight:800;color:var(--fg);margin-bottom:8px; }
        .fn-feat-body { font-size:13px;color:var(--fg2);line-height:1.65; }

        /* WISE SECTION */
        .fn-wise { max-width:1200px;margin:0 auto;padding:80px 40px; }
        .fn-wise-inner { background:rgba(46,204,113,0.04);border:1px solid rgba(46,204,113,0.12);border-radius:20px;padding:48px;display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center; }
        .fn-wise-h { font-family:'Syne',sans-serif;font-size:clamp(20px,2.5vw,30px);font-weight:800;color:var(--fg);margin-bottom:12px; }
        .fn-wise-body { font-size:14px;color:var(--fg2);line-height:1.7;margin-bottom:20px; }
        .fn-wise-chips { display:flex;flex-wrap:wrap;gap:8px; }
        .fn-wise-chip { background:rgba(46,204,113,0.08);border:1px solid rgba(46,204,113,0.15);color:var(--green);font-size:11px;font-weight:700;padding:5px 12px;border-radius:20px; }
        .fn-wise-visual { background:#0a0a0a;border:1px solid rgba(46,204,113,0.15);border-radius:16px;padding:20px; }
        .fn-wise-row { display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);font-size:12px; }
        .fn-wise-row:last-child { border-bottom:none; }
        .fn-wise-key { color:var(--fg3); }
        .fn-wise-val { color:var(--fg);font-weight:600; }
        .fn-wise-val.green { color:var(--green); }

        /* FAQ */
        .fn-faq { max-width:1200px;margin:0 auto;padding:80px 40px; }
        .fn-faq-list { display:flex;flex-direction:column;gap:2px;border:1px solid var(--border);border-radius:16px;overflow:hidden;margin-top:48px; }
        .fn-faq-item { background:var(--bg2);padding:24px 28px;border-bottom:1px solid var(--border); }
        .fn-faq-item:last-child { border-bottom:none; }
        .fn-faq-q { font-family:'Syne',sans-serif;font-size:15px;font-weight:800;color:var(--fg);margin-bottom:10px; }
        .fn-faq-a { font-size:13.5px;color:var(--fg2);line-height:1.7; }

        .fn-cta { background:var(--red);border-top:1px solid rgba(255,255,255,0.08); }
        .fn-cta-inner { max-width:1200px;margin:0 auto;padding:72px 40px;display:flex;align-items:center;justify-content:space-between;gap:32px;flex-wrap:wrap; }
        .fn-cta-h { font-family:'Syne',sans-serif;font-size:clamp(22px,3vw,36px);font-weight:800;letter-spacing:-0.02em;color:#fff; }
        .fn-cta-sub { font-size:14px;color:rgba(255,255,255,0.65);margin-top:6px; }
        .fn-cta-btn { padding:14px 30px;font-size:14px;font-weight:700;background:#fff;color:var(--red);text-decoration:none;border-radius:10px;white-space:nowrap;transition:opacity 0.12s; }
        .fn-cta-btn:hover { opacity:0.9; }
        .fn-footer { border-top:1px solid var(--border); }
        .fn-footer-inner { max-width:1200px;margin:0 auto;padding:32px 40px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px; }
        .fn-footer-copy { font-size:12px;color:var(--fg3); }
        .fn-footer-links { display:flex;gap:20px; }
        .fn-footer-links a { font-size:13px;color:var(--fg3);text-decoration:none;transition:color 0.12s; }
        .fn-footer-links a:hover { color:var(--fg); }

        @media (max-width:900px) {
          .fn-hero { grid-template-columns:1fr;gap:40px; }
          .fn-steps { grid-template-columns:1fr 1fr; }
          .fn-feat-grid { grid-template-columns:1fr 1fr; }
          .fn-wise-inner { grid-template-columns:1fr; }
          .fn-cta-inner { flex-direction:column;text-align:center; }
        }
        @media (max-width:600px) {
          .fn-hero, .fn-section, .fn-features-inner, .fn-wise, .fn-faq { padding-left:16px;padding-right:16px; }
          .fn-nav-inner, .fn-cta-inner, .fn-footer-inner { padding-left:16px;padding-right:16px; }
          .fn-steps { grid-template-columns:1fr; }
          .fn-feat-grid { grid-template-columns:1fr; }
        }
      `}</style>

      <div className="fn-root">
        <nav className="fn-nav">
          <div className="fn-nav-inner">
            <Link href="/" className="fn-logo"><span className="fn-logo-mark">C</span><span className="fn-logo-name">ClubPulse</span></Link>
            <Link href="/#features" className="fn-nav-back">← All features</Link>
            <Link href="/contact" className="fn-nav-cta">Get started</Link>
          </div>
        </nav>

        <section className="fn-hero">
          <div>
            <p className="fn-eyebrow">💷 Club Finance</p>
            <h1 className="fn-h1">Match fees collected. <span className="green">Automatically.</span></h1>
            <p className="fn-sub">ClubPulse tracks who owes what per match, sends reminders, and collects fees via Wise. Treasurers stop chasing players on WhatsApp. Players pay in one tap from their phone.</p>
            <div className="fn-btns">
              <Link href="/contact" className="fn-btn-red">Get started →</Link>
              <Link href="/#features" className="fn-btn-ghost">See all features</Link>
            </div>
          </div>

          <div className="fn-card">
            <div className="fn-card-header">
              <div className="fn-card-title">Club Finance · July 2025</div>
              <div className="fn-period">Slough CC</div>
            </div>
            <div className="fn-balance-row">
              <div className="fn-balance">
                <div className="fn-balance-label">Collected this month</div>
                <div className="fn-balance-amount pos">£840</div>
                <div className="fn-balance-sub">14 players · 3 matches</div>
              </div>
              <div className="fn-balance">
                <div className="fn-balance-label">Outstanding</div>
                <div className="fn-balance-amount neg">£120</div>
                <div className="fn-balance-sub">2 players · reminder sent</div>
              </div>
            </div>
            <div className="fn-txns">
              {[
                { icon:'💷', bg:'rgba(46,204,113,0.1)', name:'J. Singh — Match fee', date:'Sat 19 Jul', amt:'+£20', type:'credit' },
                { icon:'💷', bg:'rgba(46,204,113,0.1)', name:'A. Rahman — Match fee', date:'Sat 19 Jul', amt:'+£20', type:'credit' },
                { icon:'🏟️', bg:'rgba(249,115,22,0.1)', name:'Ground hire — Upton Court', date:'Sun 20 Jul', amt:'−£180', type:'debit' },
                { icon:'💷', bg:'rgba(46,204,113,0.1)', name:'T. Okafor — Match fee', date:'Sat 12 Jul', amt:'+£20', type:'credit' },
                { icon:'🧢', bg:'rgba(249,115,22,0.1)', name:'Kit order — Gray-Nicolls', date:'Mon 7 Jul', amt:'−£320', type:'debit' },
              ].map((t, i) => (
                <div key={i} className="fn-txn">
                  <div className="fn-txn-left">
                    <div className="fn-txn-icon" style={{background:t.bg}}>{t.icon}</div>
                    <div className="fn-txn-info">
                      <div className="fn-txn-name">{t.name}</div>
                      <div className="fn-txn-date">{t.date}</div>
                    </div>
                  </div>
                  <div className={`fn-txn-amt ${t.type}`}>{t.amt}</div>
                </div>
              ))}
            </div>
            <div className="fn-wise-badge"><span className="fn-wise-dot" />Connected to Wise · instant transfers</div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <div style={{borderTop:'1px solid rgba(255,255,255,0.07)'}}>
          <div className="fn-section">
            <p className="fn-section-eyebrow">How it works</p>
            <h2 className="fn-section-h2">Set the fee. We handle the rest.</h2>
            <p className="fn-section-sub">ClubPulse automates the part of club finance that no one wants to do — collecting money and chasing people for it.</p>
            <div className="fn-steps">
              <div className="fn-step">
                <p className="fn-step-n">01</p>
                <div className="fn-step-icon">💷</div>
                <h3 className="fn-step-h">Set the match fee</h3>
                <p className="fn-step-body">Admin sets the fee per match (home, away, or cup). You can set different rates for different competitions.</p>
              </div>
              <div className="fn-step">
                <p className="fn-step-n">02</p>
                <div className="fn-step-icon">📋</div>
                <h3 className="fn-step-h">Availability locks it in</h3>
                <p className="fn-step-body">When a player confirms available and is selected, their fee is automatically added to their outstanding balance after the match.</p>
              </div>
              <div className="fn-step">
                <p className="fn-step-n">03</p>
                <div className="fn-step-icon">📱</div>
                <h3 className="fn-step-h">Player pays in one tap</h3>
                <p className="fn-step-body">Players see their outstanding balance in the app. One tap opens the Wise payment flow — no bank details to copy, no WhatsApp threads.</p>
              </div>
              <div className="fn-step">
                <p className="fn-step-n">04</p>
                <div className="fn-step-icon">📊</div>
                <h3 className="fn-step-h">Treasurer sees it all</h3>
                <p className="fn-step-body">The finance dashboard shows every payment in real time. Export to CSV for the AGM or send to your accountant directly.</p>
              </div>
            </div>
          </div>
        </div>

        {/* FEATURES */}
        <div className="fn-features">
          <div className="fn-features-inner">
            <p className="fn-section-eyebrow">What&apos;s included</p>
            <h2 className="fn-section-h2">Everything a club treasurer needs.</h2>
            <p className="fn-section-sub">ClubPulse Finance covers the full financial picture — not just match fees, but expenses, budgets, and reporting.</p>
            <div className="fn-feat-grid">
              {[
                { icon:'💳', h:'Match fee collection', body:'Automatic fee assignment per match. Players pay via Wise. Outstanding balances tracked in real time with automated reminders.' },
                { icon:'📤', h:'Expense tracking', body:'Log ground hire, kit, umpires, travel. Categorised automatically. Treasurer has a full view of outgoings alongside income.' },
                { icon:'📊', h:'Finance dashboard', body:'Income vs expenses at a glance. Filter by month, season, or match type. No spreadsheet needed — the dashboard does it.' },
                { icon:'🔔', h:'Payment reminders', body:'Automated reminders to players with outstanding balances. Frequency and tone configurable by admin. No more chasing on WhatsApp.' },
                { icon:'📥', h:'CSV export', body:'One-click CSV export of all transactions. Ready to share with your accountant, drop into Xero, or present at the AGM.' },
                { icon:'🏦', h:'Wise integration', body:'Club finances go through Wise, not a personal bank account. Transfers are instant. The club has its own financial identity.' },
              ].map((c, i) => (
                <div key={i} className="fn-feat-card">
                  <div className="fn-feat-icon">{c.icon}</div>
                  <div className="fn-feat-h">{c.h}</div>
                  <div className="fn-feat-body">{c.body}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* WISE */}
        <div className="fn-wise">
          <div className="fn-wise-inner">
            <div>
              <p className="fn-section-eyebrow">Powered by Wise</p>
              <h2 className="fn-wise-h">A real business account for your club.</h2>
              <p className="fn-wise-body">ClubPulse connects to Wise Business. Fees go straight to the club account — not a personal account, not a tin in the changing room. It&apos;s auditable, transparent, and fast.</p>
              <div className="fn-wise-chips">
                <span className="fn-wise-chip">Instant transfers</span>
                <span className="fn-wise-chip">No hidden fees</span>
                <span className="fn-wise-chip">Multi-currency</span>
                <span className="fn-wise-chip">Fully auditable</span>
                <span className="fn-wise-chip">FCA regulated</span>
              </div>
            </div>
            <div className="fn-wise-visual">
              {[
                ['Account type', 'Wise Business'],
                ['Currency', 'GBP (+ 40 more)'],
                ['Transfer speed', 'Instant (UK)'],
                ['Treasurer access', 'Full admin'],
                ['Player view', 'Own balance only'],
                ['Export', 'CSV / PDF'],
                ['Integration', 'ClubPulse native'],
              ].map(([k, v], i) => (
                <div key={i} className="fn-wise-row">
                  <span className="fn-wise-key">{k}</span>
                  <span className={`fn-wise-val${i===2?' green':''}`}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="fn-faq">
          <p className="fn-section-eyebrow">FAQ</p>
          <h2 className="fn-section-h2">Common questions about Club Finance.</h2>
          <div className="fn-faq-list">
            {[
              ['Do we need an existing Wise account?', 'You will need a Wise Business account for the club. If you don\'t have one, setup takes about 15 minutes on Wise\'s website. ClubPulse then connects to it via the Wise API. We\'ll walk you through it during onboarding.'],
              ['What if a player doesn\'t have Wise?', 'Players don\'t need a Wise account. They pay through the ClubPulse app using a standard debit/credit card — Wise processes it behind the scenes. The player just sees a normal payment screen.'],
              ['Can we track expenses, not just income?', 'Yes. The treasurer can log any expense — ground hire, kit, umpire fees, travel, equipment. Every expense is categorised, and the dashboard shows your net position at any time.'],
              ['Is the finance data visible to all members?', 'No. Only users with the Treasurer or Admin role can see the finance dashboard. Players can see their own outstanding balance and payment history only. No one can see what anyone else has paid.'],
              ['Can we set different fees for different fixtures?', 'Yes. You can set different match fees for home matches, away matches, and cup games. You can also apply a one-off override for a specific fixture — for example, a benefit match or a tour game.'],
              ['What happens if a player doesn\'t pay?', 'ClubPulse sends automated reminders at intervals you configure (e.g. 3 days, 7 days). If the balance stays outstanding, the treasurer is flagged and can contact the player directly. There\'s no automatic enforcement — that\'s a club decision.'],
            ].map(([q, a], i) => (
              <div key={i} className="fn-faq-item">
                <div className="fn-faq-q">{q}</div>
                <div className="fn-faq-a">{a}</div>
              </div>
            ))}
          </div>
        </div>

        <section className="fn-cta">
          <div className="fn-cta-inner">
            <div>
              <h2 className="fn-cta-h">Stop chasing fees. Start the season right.</h2>
              <p className="fn-cta-sub">Get ClubPulse Finance set up before your first match.</p>
            </div>
            <Link href="/contact" className="fn-cta-btn">Get started →</Link>
          </div>
        </section>

        <footer className="fn-footer">
          <div className="fn-footer-inner">
            <Link href="/" className="fn-logo"><span className="fn-logo-mark">C</span><span className="fn-logo-name">ClubPulse</span></Link>
            <div className="fn-footer-links">
              <Link href="/features/availability">Availability</Link>
              <Link href="/features/scorecard">Scorecard</Link>
              <Link href="/features/ai-coach">AI Coach</Link>
              <Link href="/features/scores">Scores</Link>
              <Link href="/features/finance">Finance</Link>
            </div>
            <p className="fn-footer-copy">© 2026 ClubPulse</p>
          </div>
        </footer>
      </div>
    </>
  );
}
