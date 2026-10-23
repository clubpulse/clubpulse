import Link from "next/link";

export default function Home() {
  return (
    <div style={{minHeight:'100vh',background:'#080808',color:'#f0ece4',fontFamily:"'Inter',sans-serif",overflowX:'hidden'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Inter:wght@300;400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        .cp-nav{display:flex;align-items:center;justify-content:space-between;max-width:1100px;margin:0 auto;padding:24px}
        .cp-logo{display:flex;align-items:center;gap:10px;text-decoration:none}
        .cp-logo-mark{width:36px;height:36px;background:#9b1c1c;border-radius:8px;display:grid;place-items:center;font-family:'Syne',sans-serif;font-weight:800;font-size:16px;color:#fff}
        .cp-logo-name{font-family:'Syne',sans-serif;font-weight:700;font-size:18px;color:#f0ece4}
        .cp-nav-links{display:flex;align-items:center;gap:8px}
        .cp-menu{display:flex;align-items:center;gap:28px}
        .cp-menu a{font-size:14px;font-weight:500;color:#fff;text-decoration:none;opacity:0.7;transition:opacity 0.15s}
        .cp-menu a:hover{opacity:1}
        @media(max-width:767px){.cp-menu{display:none}}
        @media(max-width:420px){.cp-nav{padding:20px 16px;gap:12px}.cp-nav-links{gap:4px}.cp-signin{padding:8px 10px}.cp-cta-sm{padding:8px 14px}.cp-logo-name{font-size:16px}}
        @media(max-width:359px){.cp-logo-name{display:none}}
        .cp-signin{padding:8px 16px;border-radius:8px;font-size:14px;font-weight:500;color:rgba(240,236,228,0.6);text-decoration:none;white-space:nowrap}
        .cp-cta-sm{padding:8px 18px;border-radius:8px;background:#9b1c1c;font-size:14px;font-weight:600;color:#fff;text-decoration:none;white-space:nowrap}
        .cp-hero{max-width:800px;margin:0 auto;padding:72px 24px 64px;text-align:center}
        .cp-pulse-dot{display:inline-flex;align-items:center;gap:8px;background:rgba(155,28,28,0.12);border:1px solid rgba(155,28,28,0.3);border-radius:100px;padding:5px 14px 5px 10px;font-size:12.5px;font-weight:600;color:#c9a54c;letter-spacing:0.04em;text-transform:uppercase;margin-bottom:28px}
        .cp-pulse-dot::before{content:'';width:7px;height:7px;border-radius:50%;background:#9b1c1c;animation:pulse 2s ease-in-out infinite}
        @keyframes pulse{0%,100%{box-shadow:0 0 0 3px rgba(155,28,28,0.25)}50%{box-shadow:0 0 0 6px rgba(155,28,28,0.1)}}
        .cp-h1{font-family:'Syne',sans-serif;font-size:clamp(38px,7vw,68px);font-weight:800;color:#f0ece4;letter-spacing:-0.03em;line-height:1.0;margin-bottom:20px}
        .cp-h1 span{color:#c9a54c}
        .cp-hero-sub{font-size:17px;color:rgba(240,236,228,0.5);line-height:1.7;max-width:520px;margin:0 auto 36px}
        .cp-hero-btns{display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap}
        .cp-btn-primary{display:inline-flex;align-items:center;padding:14px 28px;background:#9b1c1c;color:#fff;border-radius:10px;font-size:15px;font-weight:600;text-decoration:none}
        .cp-btn-ghost{display:inline-flex;align-items:center;padding:14px 28px;border:1px solid rgba(255,255,255,0.12);color:rgba(240,236,228,0.7);border-radius:10px;font-size:15px;font-weight:500;text-decoration:none}
        .cp-stats{border-top:1px solid rgba(255,255,255,0.06);border-bottom:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.02)}
        .cp-stats-inner{max-width:1100px;margin:0 auto;padding:0 24px;display:grid;grid-template-columns:repeat(4,1fr)}
        .cp-stat{padding:28px 20px;text-align:center;border-right:1px solid rgba(255,255,255,0.06)}
        .cp-stat:last-child{border-right:none}
        .cp-stat-val{font-family:'Syne',sans-serif;font-size:32px;font-weight:800;color:#f0ece4;letter-spacing:-0.02em}
        .cp-stat-label{font-size:12.5px;color:rgba(240,236,228,0.4);margin-top:4px}
        .cp-section{max-width:1100px;margin:0 auto;padding:80px 24px}
        .cp-section-tag{font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#c9a54c;margin-bottom:12px}
        .cp-section-title{font-family:'Syne',sans-serif;font-size:clamp(28px,4vw,42px);font-weight:800;color:#f0ece4;letter-spacing:-0.025em;line-height:1.1;margin-bottom:48px}
        .cp-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
        .cp-step{background:#0f0f0f;border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:28px 24px}
        .cp-step-num{width:32px;height:32px;border-radius:8px;background:rgba(155,28,28,0.15);border:1px solid rgba(155,28,28,0.25);display:grid;place-items:center;font-family:'Syne',sans-serif;font-size:13px;font-weight:800;color:#c9a54c;margin-bottom:16px}
        .cp-step h3{font-family:'Syne',sans-serif;font-size:17px;font-weight:700;color:#f0ece4;margin-bottom:8px}
        .cp-step p{font-size:14px;color:rgba(240,236,228,0.5);line-height:1.65}
        .cp-earn-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px}
        .cp-earn-card{background:#0f0f0f;border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:28px 24px}
        .cp-earn-card h3{font-family:'Syne',sans-serif;font-size:16px;font-weight:700;color:#f0ece4;margin-bottom:14px}
        .cp-earn-item{display:flex;align-items:center;gap:10px;font-size:13.5px;color:rgba(240,236,228,0.55);padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05)}
        .cp-earn-item:last-child{border-bottom:none}
        .cp-earn-dot{width:6px;height:6px;border-radius:50%;background:#9b1c1c;flex-shrink:0}
        .cp-exchange{background:rgba(201,165,76,0.07);border:1px solid rgba(201,165,76,0.2);border-radius:12px;padding:18px 24px;display:flex;align-items:center;justify-content:space-between}
        .cp-exchange-label{font-size:13px;color:rgba(240,236,228,0.45)}
        .cp-exchange-val{font-family:'Syne',sans-serif;font-size:18px;font-weight:800;color:#c9a54c}
        .cp-who-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
        .cp-who-card{background:#0f0f0f;border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:28px 24px}
        .cp-who-icon{width:44px;height:44px;border-radius:10px;display:grid;place-items:center;margin-bottom:16px;font-size:20px}
        .cp-who-card h3{font-family:'Syne',sans-serif;font-size:16px;font-weight:700;color:#f0ece4;margin-bottom:8px}
        .cp-who-card p{font-size:13.5px;color:rgba(240,236,228,0.5);line-height:1.65}
        .cp-cta-band{background:#9b1c1c}
        .cp-cta-inner{max-width:1100px;margin:0 auto;padding:60px 24px;display:flex;align-items:center;justify-content:space-between;gap:24px;flex-wrap:wrap}
        .cp-cta-band h2{font-family:'Syne',sans-serif;font-size:clamp(22px,3.5vw,36px);font-weight:800;color:#fff;letter-spacing:-0.02em;max-width:480px;line-height:1.15}
        .cp-btn-white{display:inline-flex;align-items:center;padding:14px 28px;background:#fff;color:#9b1c1c;border-radius:10px;font-size:15px;font-weight:700;text-decoration:none;white-space:nowrap}
        .cp-footer{border-top:1px solid rgba(255,255,255,0.06)}
        .cp-footer-inner{max-width:1100px;margin:0 auto;padding:28px 24px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px}
        .cp-footer-copy{font-size:13px;color:rgba(240,236,228,0.28)}
        .cp-footer-links{display:flex;gap:20px}
        .cp-footer-links a{font-size:13px;color:rgba(240,236,228,0.35);text-decoration:none}
        @media(max-width:700px){.cp-stats-inner{grid-template-columns:repeat(2,1fr)}.cp-steps{grid-template-columns:1fr}.cp-earn-grid{grid-template-columns:1fr}.cp-who-grid{grid-template-columns:1fr}.cp-cta-inner{flex-direction:column;align-items:flex-start}}
      `}</style>
      <nav className="cp-nav">
        <Link href="/" className="cp-logo">
          <div className="cp-logo-mark">C</div>
          <span className="cp-logo-name">ClubPulse</span>
        </Link>
        <div className="cp-menu">
          <Link href="/analyse">Analyse</Link>
          <Link href="/marketplace">Marketplace</Link>
          <Link href="/companion">Companion</Link>
        </div>
        <div className="cp-nav-links">
          <Link href="/auth/sign-in" className="cp-signin">Sign in</Link>
          <Link href="/auth/sign-up" className="cp-cta-sm">Get started</Link>
        </div>
      </nav>
      <section className="cp-hero">
        <div className="cp-pulse-dot">Now live</div>
        <h1 className="cp-h1">Play more.<br/>Earn <span>Scores</span>.<br/>Get rewarded.</h1>
        <p className="cp-hero-sub">ClubPulse turns every run scored, wicket taken, training session and volunteer shift into real rewards. Built for grassroots sports clubs.</p>
        <div className="cp-hero-btns">
          <Link href="/auth/sign-up" className="cp-btn-primary">Start earning free →</Link>
          <Link href="/auth/sign-in" className="cp-btn-ghost">Sign in</Link>
        </div>
      </section>
      <div className="cp-stats">
        <div className="cp-stats-inner">
          <div className="cp-stat"><div className="cp-stat-val">50</div><div className="cp-stat-label">Scores = £1</div></div>
          <div className="cp-stat"><div className="cp-stat-val">0</div><div className="cp-stat-label">Cost to join</div></div>
          <div className="cp-stat"><div className="cp-stat-val">3</div><div className="cp-stat-label">Sports tracked</div></div>
          <div className="cp-stat"><div className="cp-stat-val">∞</div><div className="cp-stat-label">Ways to earn</div></div>
        </div>
      </div>
      <section className="cp-section">
        <div className="cp-section-tag">How it works</div>
        <div className="cp-section-title">Three steps to your first reward</div>
        <div className="cp-steps">
          <div className="cp-step"><div className="cp-step-num">1</div><h3>Earn Scores</h3><p>Score runs, take wickets, show up to training, or volunteer your time — every contribution earns Scores automatically.</p></div>
          <div className="cp-step"><div className="cp-step-num">2</div><h3>Stack your wallet</h3><p>Flexi Scores and Reward Scores build up in your wallet as you play and contribute. Watch your balance grow each week.</p></div>
          <div className="cp-step"><div className="cp-step-num">3</div><h3>Redeem rewards</h3><p>Cash out, unlock gear discounts, or put Scores toward club merchandise. 50 Scores is always worth exactly £1.</p></div>
        </div>
      </section>
      <section className="cp-section" style={{paddingTop:0}}>
        <div className="cp-section-tag">What earns Scores</div>
        <div className="cp-section-title">On the pitch and off it</div>
        <div className="cp-earn-grid">
          <div className="cp-earn-card">
            <h3>On-pitch performance</h3>
            <div className="cp-earn-item"><span className="cp-earn-dot"/>Runs scored</div>
            <div className="cp-earn-item"><span className="cp-earn-dot"/>Wickets taken</div>
            <div className="cp-earn-item"><span className="cp-earn-dot"/>Catches &amp; stumpings</div>
            <div className="cp-earn-item"><span className="cp-earn-dot"/>Man of the Match</div>
            <div className="cp-earn-item"><span className="cp-earn-dot"/>Milestones (50s, 100s, 5-fors)</div>
          </div>
          <div className="cp-earn-card">
            <h3>Off-pitch contributions</h3>
            <div className="cp-earn-item"><span className="cp-earn-dot"/>Training attendance</div>
            <div className="cp-earn-item"><span className="cp-earn-dot"/>Volunteering &amp; groundswork</div>
            <div className="cp-earn-item"><span className="cp-earn-dot"/>Coaching &amp; umpiring</div>
            <div className="cp-earn-item"><span className="cp-earn-dot"/>Club admin &amp; fundraising</div>
            <div className="cp-earn-item"><span className="cp-earn-dot"/>Social referrals</div>
          </div>
        </div>
        <div className="cp-exchange">
          <span className="cp-exchange-label">Exchange rate — always fixed</span>
          <span className="cp-exchange-val">50 Scores = £1.00</span>
        </div>
      </section>
      <section className="cp-section" style={{paddingTop:0}}>
        <div className="cp-section-tag">Who it&apos;s for</div>
        <div className="cp-section-title">Built for every role at the club</div>
        <div className="cp-who-grid">
          <div className="cp-who-card"><div className="cp-who-icon" style={{background:'rgba(155,28,28,0.12)'}}>🏏</div><h3>Players</h3><p>Every match and training session adds to your wallet. The more you contribute, the more you earn.</p></div>
          <div className="cp-who-card"><div className="cp-who-icon" style={{background:'rgba(201,165,76,0.1)'}}>🤝</div><h3>Volunteers &amp; coaches</h3><p>Your off-pitch work finally gets recognised. Earn Scores for every hour you give to the club.</p></div>
          <div className="cp-who-card"><div className="cp-who-icon" style={{background:'rgba(255,255,255,0.05)'}}>⚙️</div><h3>Club admins</h3><p>Set your own earning rules, track engagement, and run reward campaigns — all from one dashboard.</p></div>
        </div>
      </section>
      <div className="cp-cta-band">
        <div className="cp-cta-inner">
          <h2>Your club. Your Scores. Your rewards.</h2>
          <Link href="/auth/sign-up" className="cp-btn-white">Join ClubPulse free</Link>
        </div>
      </div>
      <footer className="cp-footer">
        <div className="cp-footer-inner">
          <span className="cp-footer-copy">© 2026 ClubPulse · Grassroots sports loyalty</span>
          <div className="cp-footer-links">
            <Link href="/auth/sign-in">Sign in</Link>
            <Link href="/auth/sign-up">Sign up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
