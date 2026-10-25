import Link from "next/link";

export default function Home() {
  return (
    <div style={{minHeight:'100vh',background:'#080808',color:'#f0ece4',fontFamily:"'Inter',sans-serif",overflowX:'hidden'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Inter:wght@300;400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}

        /* Nav */
        .cp-nav{display:flex;align-items:center;justify-content:space-between;max-width:1200px;margin:0 auto;padding:24px 32px}
        .cp-logo{display:flex;align-items:center;gap:10px;text-decoration:none}
        .cp-logo-mark{width:36px;height:36px;background:#9b1c1c;border-radius:8px;display:grid;place-items:center;font-family:'Syne',sans-serif;font-weight:800;font-size:16px;color:#fff}
        .cp-logo-name{font-family:'Syne',sans-serif;font-weight:700;font-size:18px;color:#f0ece4}
        .cp-menu{display:flex;align-items:center;gap:28px}
        .cp-menu a{font-size:14px;font-weight:500;color:#fff;text-decoration:none;opacity:0.55;transition:opacity 0.15s}
        .cp-menu a:hover{opacity:1}
        @media(max-width:767px){.cp-menu{display:none}}
        .cp-nav-links{display:flex;align-items:center;gap:8px}
        .cp-signin{padding:9px 18px;border-radius:8px;font-size:14px;font-weight:500;color:rgba(240,236,228,0.5);text-decoration:none}
        .cp-cta-sm{padding:9px 20px;border-radius:8px;background:#9b1c1c;font-size:14px;font-weight:600;color:#fff;text-decoration:none}

        /* Hero */
        .cp-hero{max-width:900px;margin:0 auto;padding:80px 32px 72px;text-align:center}
        .cp-live-badge{display:inline-flex;align-items:center;gap:8px;background:rgba(46,204,113,0.08);border:1px solid rgba(46,204,113,0.2);border-radius:100px;padding:5px 16px 5px 12px;font-size:12px;font-weight:600;color:#2ecc71;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:32px}
        .cp-live-dot{width:7px;height:7px;border-radius:50%;background:#2ecc71;animation:livepulse 2s ease-in-out infinite}
        @keyframes livepulse{0%,100%{box-shadow:0 0 0 3px rgba(46,204,113,0.2)}50%{box-shadow:0 0 0 7px rgba(46,204,113,0.06)}}
        .cp-h1{font-family:'Syne',sans-serif;font-size:clamp(40px,6.5vw,72px);font-weight:800;color:#f0ece4;letter-spacing:-0.03em;line-height:0.98;margin-bottom:24px}
        .cp-h1 em{font-style:normal;color:#c9a54c}
        .cp-h1 strong{font-style:normal;color:#9b1c1c}
        .cp-hero-sub{font-size:18px;color:rgba(240,236,228,0.45);line-height:1.65;max-width:600px;margin:0 auto 40px}
        .cp-hero-btns{display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap}
        .cp-btn-primary{display:inline-flex;align-items:center;gap:6px;padding:15px 30px;background:#9b1c1c;color:#fff;border-radius:10px;font-size:15px;font-weight:600;text-decoration:none;transition:opacity 0.15s}
        .cp-btn-primary:hover{opacity:0.88}
        .cp-btn-ghost{display:inline-flex;align-items:center;padding:15px 30px;border:1px solid rgba(255,255,255,0.1);color:rgba(240,236,228,0.65);border-radius:10px;font-size:15px;font-weight:500;text-decoration:none;transition:border-color 0.15s}
        .cp-btn-ghost:hover{border-color:rgba(255,255,255,0.25)}

        /* Stat bar */
        .cp-stats{border-top:1px solid rgba(255,255,255,0.05);border-bottom:1px solid rgba(255,255,255,0.05);background:rgba(255,255,255,0.02)}
        .cp-stats-inner{max-width:1200px;margin:0 auto;padding:0 32px;display:grid;grid-template-columns:repeat(5,1fr)}
        .cp-stat{padding:24px 16px;text-align:center;border-right:1px solid rgba(255,255,255,0.05)}
        .cp-stat:last-child{border-right:none}
        .cp-stat-val{font-family:'Syne',sans-serif;font-size:28px;font-weight:800;color:#f0ece4;letter-spacing:-0.02em}
        .cp-stat-label{font-size:12px;color:rgba(240,236,228,0.35);margin-top:4px}

        /* Sections */
        .cp-wrap{max-width:1200px;margin:0 auto;padding:0 32px}
        .cp-section{padding:96px 0}
        .cp-section-tag{font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#c9a54c;margin-bottom:14px}
        .cp-section-h{font-family:'Syne',sans-serif;font-size:clamp(28px,3.8vw,44px);font-weight:800;color:#f0ece4;letter-spacing:-0.025em;line-height:1.08;margin-bottom:16px}
        .cp-section-sub{font-size:16px;color:rgba(240,236,228,0.45);line-height:1.65;max-width:560px}

        /* Feature cards grid */
        .cp-features{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:52px}
        .cp-feat{background:#0d0d0d;border:1px solid rgba(255,255,255,0.07);border-radius:18px;padding:28px 24px;transition:border-color 0.2s}
        .cp-feat:hover{border-color:rgba(255,255,255,0.14)}
        .cp-feat-icon{width:44px;height:44px;border-radius:11px;display:grid;place-items:center;font-size:20px;margin-bottom:18px}
        .cp-feat h3{font-family:'Syne',sans-serif;font-size:17px;font-weight:700;color:#f0ece4;margin-bottom:10px}
        .cp-feat p{font-size:14px;color:rgba(240,236,228,0.45);line-height:1.65}
        .cp-feat-tag{display:inline-block;margin-top:14px;font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;padding:3px 10px;border-radius:6px}
        .cp-feat-tag.live{background:rgba(46,204,113,0.1);color:#2ecc71;border:1px solid rgba(46,204,113,0.2)}
        .cp-feat-tag.roadmap{background:rgba(249,115,22,0.1);color:#f97316;border:1px solid rgba(249,115,22,0.2)}
        .cp-feat-tag.vision{background:rgba(201,165,76,0.1);color:#c9a54c;border:1px solid rgba(201,165,76,0.2)}

        /* Split section */
        .cp-split{display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:center}
        .cp-split.flip{direction:rtl}
        .cp-split.flip>*{direction:ltr}
        .cp-split-visual{background:#0d0d0d;border:1px solid rgba(255,255,255,0.07);border-radius:20px;padding:32px;position:relative;overflow:hidden}
        .cp-split-visual::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 60% 50% at 50% 0%,rgba(155,28,28,0.08),transparent);pointer-events:none}

        /* Score conversion */
        .cp-score-row{display:flex;align-items:center;gap:0;margin:10px 0}
        .cp-score-pill{padding:8px 16px;border-radius:8px;font-family:'Syne',sans-serif;font-weight:800;font-size:15px}
        .cp-score-arrow{font-size:18px;color:rgba(255,255,255,0.2);padding:0 12px}

        /* Comparison table */
        .cp-compare{margin-top:52px;background:#0d0d0d;border:1px solid rgba(255,255,255,0.07);border-radius:20px;overflow:hidden}
        .cp-compare-head{display:grid;grid-template-columns:2fr 1fr 1fr;gap:0;border-bottom:1px solid rgba(255,255,255,0.07)}
        .cp-compare-row{display:grid;grid-template-columns:2fr 1fr 1fr;gap:0;border-bottom:1px solid rgba(255,255,255,0.04)}
        .cp-compare-row:last-child{border-bottom:none}
        .cp-compare-cell{padding:14px 20px;font-size:13.5px;color:rgba(240,236,228,0.5)}
        .cp-compare-cell.head{font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:rgba(240,236,228,0.3);padding:16px 20px}
        .cp-compare-cell.name{color:#f0ece4;font-weight:500}
        .cp-compare-cell.yes{color:#2ecc71;font-weight:600;text-align:center}
        .cp-compare-cell.no{color:rgba(240,236,228,0.2);text-align:center}
        .cp-compare-cell.them{text-align:center}
        .cp-compare-hl{background:rgba(155,28,28,0.06)}

        /* AI section */
        .cp-ai-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-top:48px}
        .cp-ai-card{background:#0d0d0d;border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:24px}
        .cp-ai-card.coming{opacity:0.55}
        .cp-ai-label{font-size:11px;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;margin-bottom:12px}
        .cp-ai-card h4{font-family:'Syne',sans-serif;font-size:16px;font-weight:700;color:#f0ece4;margin-bottom:8px}
        .cp-ai-card p{font-size:13.5px;color:rgba(240,236,228,0.45);line-height:1.6}

        /* Testimonial */
        .cp-quote{background:#0d0d0d;border:1px solid rgba(255,255,255,0.07);border-radius:20px;padding:40px;margin-top:56px;position:relative}
        .cp-quote::before{content:'"';font-family:'Syne',sans-serif;font-size:80px;color:rgba(155,28,28,0.18);line-height:1;position:absolute;top:20px;left:32px}
        .cp-quote-text{font-size:20px;color:#f0ece4;line-height:1.55;font-weight:400;max-width:680px;padding-left:32px;position:relative}
        .cp-quote-attr{margin-top:20px;padding-left:32px;font-size:13.5px;color:rgba(240,236,228,0.4)}

        /* CTA band */
        .cp-cta-band{background:#9b1c1c;padding:72px 32px}
        .cp-cta-inner{max-width:900px;margin:0 auto;text-align:center}
        .cp-cta-inner h2{font-family:'Syne',sans-serif;font-size:clamp(26px,4vw,48px);font-weight:800;color:#fff;letter-spacing:-0.025em;line-height:1.1;margin-bottom:16px}
        .cp-cta-inner p{font-size:17px;color:rgba(255,255,255,0.65);margin-bottom:36px;line-height:1.55}
        .cp-cta-btns{display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap}
        .cp-btn-white{display:inline-flex;align-items:center;padding:15px 32px;background:#fff;color:#9b1c1c;border-radius:10px;font-size:15px;font-weight:700;text-decoration:none}
        .cp-btn-white-ghost{display:inline-flex;align-items:center;padding:15px 28px;border:1px solid rgba(255,255,255,0.35);color:#fff;border-radius:10px;font-size:15px;font-weight:500;text-decoration:none}

        /* Footer */
        .cp-footer{border-top:1px solid rgba(255,255,255,0.05)}
        .cp-footer-inner{max-width:1200px;margin:0 auto;padding:28px 32px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px}
        .cp-footer-copy{font-size:13px;color:rgba(240,236,228,0.22)}
        .cp-footer-links{display:flex;gap:20px}
        .cp-footer-links a{font-size:13px;color:rgba(240,236,228,0.3);text-decoration:none}
        .cp-footer-links a:hover{color:rgba(240,236,228,0.6)}

        /* Responsive */
        @media(max-width:900px){
          .cp-features{grid-template-columns:1fr 1fr}
          .cp-split{grid-template-columns:1fr;gap:40px}
          .cp-split.flip{direction:ltr}
          .cp-ai-grid{grid-template-columns:1fr}
          .cp-stats-inner{grid-template-columns:repeat(3,1fr)}
          .cp-stat:nth-child(3){border-right:none}
        }
        @media(max-width:600px){
          .cp-nav{padding:20px 20px}
          .cp-hero{padding:60px 20px 56px}
          .cp-wrap{padding:0 20px}
          .cp-features{grid-template-columns:1fr}
          .cp-stats-inner{grid-template-columns:repeat(2,1fr)}
          .cp-stat:nth-child(3){border-right:1px solid rgba(255,255,255,0.05)}
          .cp-stat:nth-child(2){border-right:none}
          .cp-compare-cell{padding:10px 12px;font-size:12.5px}
        }
      `}</style>

      {/* ── NAV ── */}
      <nav className="cp-nav">
        <Link href="/" className="cp-logo">
          <div className="cp-logo-mark">C</div>
          <span className="cp-logo-name">ClubPulse</span>
        </Link>
        <div className="cp-menu">
          <a href="#platform">Platform</a>
          <a href="#ai">AI Coaching</a>
          <a href="#scores">Scores</a>
          <a href="#why">Why ClubPulse</a>
        </div>
        <div className="cp-nav-links">
          <Link href="/auth/sign-in" className="cp-signin">Sign in</Link>
          <Link href="/auth/sign-up" className="cp-cta-sm">Get started free</Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="cp-hero">
        <div className="cp-live-badge">
          <span className="cp-live-dot" /> Live at Slough CC
        </div>
        <h1 className="cp-h1">
          The operating system<br />
          for <em>grassroots</em> cricket clubs.
        </h1>
        <p className="cp-hero-sub">
          Availability. Live scorecards. Squad selection. Fee collection. AI batting analysis.
          Member rewards. One platform — built for how clubs actually run.
        </p>
        <div className="cp-hero-btns">
          <Link href="/auth/sign-up" className="cp-btn-primary">Get started free →</Link>
          <Link href="/auth/sign-in" className="cp-btn-ghost">Sign in</Link>
        </div>
      </section>

      {/* ── STAT BAR ── */}
      <div className="cp-stats">
        <div className="cp-stats-inner">
          <div className="cp-stat"><div className="cp-stat-val">1</div><div className="cp-stat-label">Club live today</div></div>
          <div className="cp-stat"><div className="cp-stat-val">24</div><div className="cp-stat-label">Active members</div></div>
          <div className="cp-stat"><div className="cp-stat-val">&lt;1s</div><div className="cp-stat-label">Live scorecard updates</div></div>
          <div className="cp-stat"><div className="cp-stat-val">50</div><div className="cp-stat-label">Scores = £1</div></div>
          <div className="cp-stat"><div className="cp-stat-val">3D</div><div className="cp-stat-label">Pose analysis · on-device</div></div>
        </div>
      </div>

      {/* ── PLATFORM FEATURES ── */}
      <section id="platform" className="cp-section">
        <div className="cp-wrap">
          <div className="cp-section-tag">Full platform</div>
          <h2 className="cp-section-h">Everything a club needs<br />in one place</h2>
          <p className="cp-section-sub">
            Most clubs stitch together WhatsApp, spreadsheets, and banking apps. ClubPulse replaces all of it —
            built ground-up for cricket clubs, live with real players.
          </p>
          <div className="cp-features">
            <div className="cp-feat">
              <div className="cp-feat-icon" style={{background:'rgba(46,204,113,0.1)'}}>📅</div>
              <h3>Availability & fixtures</h3>
              <p>Players mark availability in seconds. Admins see a live count, pick their XI, and send push notifications the moment the squad is confirmed.</p>
              <span className="cp-feat-tag live">Live</span>
            </div>
            <div className="cp-feat">
              <div className="cp-feat-icon" style={{background:'rgba(52,152,219,0.1)'}}>📋</div>
              <h3>Live scorecard</h3>
              <p>Ball-by-ball scoring that updates every player's screen in under a second via Supabase Realtime. No spreadsheet. No WhatsApp updates.</p>
              <span className="cp-feat-tag live">Live</span>
            </div>
            <div className="cp-feat">
              <div className="cp-feat-icon" style={{background:'rgba(155,28,28,0.12)'}}>🛡</div>
              <h3>Squad selection</h3>
              <p>Select from available players, see who's confirmed vs pending, and publish the final XI — all from the admin panel.</p>
              <span className="cp-feat-tag live">Live</span>
            </div>
            <div className="cp-feat">
              <div className="cp-feat-icon" style={{background:'rgba(241,196,15,0.1)'}}>💷</div>
              <h3>Finance & fee collection</h3>
              <p>Track membership fees, see who's paid and who hasn't, and trigger Wise payouts to the club account in one click with a full audit trail.</p>
              <span className="cp-feat-tag live">Live</span>
            </div>
            <div className="cp-feat">
              <div className="cp-feat-icon" style={{background:'rgba(52,152,219,0.1)'}}>📊</div>
              <h3>Player stats & profiles</h3>
              <p>Season averages, wickets, economy, club rank — all computed live from match data. No manual input, ever.</p>
              <span className="cp-feat-tag live">Live</span>
            </div>
            <div className="cp-feat">
              <div className="cp-feat-icon" style={{background:'rgba(201,165,76,0.1)'}}>⭐</div>
              <h3>Scores & XI Rewards</h3>
              <p>Players earn Scores for every contribution — runs, wickets, attendance, volunteering. 50 Scores = £1, redeemable as real cash or gear discounts.</p>
              <span className="cp-feat-tag live">Live</span>
            </div>
            <div className="cp-feat">
              <div className="cp-feat-icon" style={{background:'rgba(249,115,22,0.1)'}}>🤖</div>
              <h3>Club health & smart alerts</h3>
              <p>AI-generated retention risk flags, fee overdue predictions, and an engagement health score — updated from your live club data.</p>
              <span className="cp-feat-tag roadmap">Roadmap</span>
            </div>
            <div className="cp-feat">
              <div className="cp-feat-icon" style={{background:'rgba(249,115,22,0.1)'}}>📈</div>
              <h3>Coaching history</h3>
              <p>Track metric trends across every AI session — elbow alignment, head position, stance balance — with sparklines and season export.</p>
              <span className="cp-feat-tag roadmap">Roadmap</span>
            </div>
            <div className="cp-feat">
              <div className="cp-feat-icon" style={{background:'rgba(201,165,76,0.08)'}}>🌍</div>
              <h3>Cross-club network</h3>
              <p>Verified match records, shared rankings, and XI Rewards redeemable across every club on the network.</p>
              <span className="cp-feat-tag vision">Vision</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── AI COACHING SPLIT ── */}
      <section id="ai" style={{background:'rgba(255,255,255,0.015)',borderTop:'1px solid rgba(255,255,255,0.05)',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
        <div className="cp-wrap cp-section">
          <div className="cp-split">
            <div>
              <div className="cp-section-tag">AI Batting Coach</div>
              <h2 className="cp-section-h">3D pose analysis.<br />On your phone.<br />No kit needed.</h2>
              <p className="cp-section-sub">
                MediaPipe Pose tracks 33 body landmarks at 30fps during your batting session — entirely on-device.
                No cloud upload. No extra hardware. Just your phone camera.
              </p>
              <ul style={{marginTop:'28px',display:'flex',flexDirection:'column',gap:'12px',listStyle:'none'}}>
                {[
                  ['3D skeleton overlay','X, Y, Z coordinates on every joint — not just a flat silhouette'],
                  ['Up to 12 frames per shot','Captures full swing arc from load to follow-through'],
                  ['Elbow, stance, head metrics','Scored 0–100% against ideal form on every rep'],
                  ['Bowling analysis coming next','Same phone. Same camera. Same on-device AI.'],
                ].map(([bold, rest]) => (
                  <li key={bold} style={{display:'flex',gap:'12px',alignItems:'flex-start',fontSize:'14.5px',color:'rgba(240,236,228,0.55)',lineHeight:1.55}}>
                    <span style={{color:'#9b1c1c',fontWeight:700,marginTop:'1px',flexShrink:0}}>✓</span>
                    <span><span style={{color:'#f0ece4',fontWeight:600}}>{bold}</span> — {rest}</span>
                  </li>
                ))}
              </ul>
              <div style={{marginTop:'32px',display:'flex',gap:'12px',flexWrap:'wrap'}}>
                <Link href="/analyse" style={{display:'inline-flex',alignItems:'center',gap:'6px',padding:'13px 26px',background:'#9b1c1c',color:'#fff',borderRadius:'10px',fontSize:'14px',fontWeight:600,textDecoration:'none'}}>
                  Try the AI coach →
                </Link>
                <Link href="/highlights" style={{display:'inline-flex',alignItems:'center',padding:'13px 22px',border:'1px solid rgba(255,255,255,0.1)',color:'rgba(240,236,228,0.65)',borderRadius:'10px',fontSize:'14px',fontWeight:500,textDecoration:'none'}}>
                  View highlights
                </Link>
              </div>
            </div>
            <div className="cp-split-visual">
              <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
                <div style={{background:'rgba(0,0,0,0.4)',borderRadius:'14px',padding:'20px',border:'1px solid rgba(255,255,255,0.06)'}}>
                  <p style={{fontSize:'11px',fontWeight:700,color:'rgba(255,255,255,0.3)',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:'14px'}}>Session 10 · 23 Oct 2026</p>
                  {[
                    {label:'Elbow alignment',val:74,col:'#2ecc71',change:'+13%'},
                    {label:'Head position',val:79,col:'#e74c3c',change:'−3%'},
                    {label:'Stance balance',val:88,col:'#f1c40f',change:'+16%'},
                  ].map(m => (
                    <div key={m.label} style={{marginBottom:'12px'}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:'5px'}}>
                        <span style={{fontSize:'13px',color:'rgba(255,255,255,0.6)'}}>{m.label}</span>
                        <span style={{fontSize:'13px',fontWeight:700,color:m.col}}>{m.val}% <span style={{fontSize:'11px',opacity:0.7}}>{m.change}</span></span>
                      </div>
                      <div style={{height:'5px',borderRadius:'99px',background:'rgba(255,255,255,0.06)'}}>
                        <div style={{height:'100%',borderRadius:'99px',background:m.col,width:`${m.val}%`,opacity:0.8}} />
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                  <div style={{background:'rgba(155,28,28,0.1)',borderRadius:'12px',padding:'16px',border:'1px solid rgba(155,28,28,0.2)',textAlign:'center'}}>
                    <p style={{fontFamily:"'Syne',sans-serif",fontSize:'32px',fontWeight:800,color:'#f0ece4'}}>48</p>
                    <p style={{fontSize:'12px',color:'rgba(255,255,255,0.35)',marginTop:'4px'}}>shots this session</p>
                  </div>
                  <div style={{background:'rgba(46,204,113,0.06)',borderRadius:'12px',padding:'16px',border:'1px solid rgba(46,204,113,0.15)',textAlign:'center'}}>
                    <p style={{fontFamily:"'Syne',sans-serif",fontSize:'32px',fontWeight:800,color:'#2ecc71'}}>+25</p>
                    <p style={{fontSize:'12px',color:'rgba(255,255,255,0.35)',marginTop:'4px'}}>Scores earned</p>
                  </div>
                </div>
                <div style={{background:'rgba(201,165,76,0.06)',borderRadius:'12px',padding:'14px 18px',border:'1px solid rgba(201,165,76,0.15)',display:'flex',alignItems:'center',gap:'10px'}}>
                  <span style={{fontSize:'18px'}}>🎯</span>
                  <p style={{fontSize:'13.5px',color:'rgba(240,236,228,0.6)',lineHeight:1.4}}>
                    <strong style={{color:'#c9a54c',fontWeight:600}}>Next target:</strong> Head position → 82%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── AI beyond batting ── */}
      <div className="cp-wrap">
        <div className="cp-section" style={{paddingBottom:'0'}}>
          <div className="cp-section-tag">AI roadmap</div>
          <h2 className="cp-section-h">Same phone. Same camera.<br />Same on-device AI.</h2>
          <p className="cp-section-sub">Batting is just the start. Every analysis runs entirely on-device — no uploads, no privacy risk.</p>
          <div className="cp-ai-grid">
            <div className="cp-ai-card">
              <p className="cp-ai-label" style={{color:'#2ecc71'}}>✓ Live now</p>
              <h4>Batting Analysis</h4>
              <p>3D pose on elbow, head & stance. 33 landmarks, 30fps, up to 12 frames per shot. Works with any bat, any format.</p>
            </div>
            <div className="cp-ai-card">
              <p className="cp-ai-label" style={{color:'#f97316'}}>Roadmap — next</p>
              <h4>Bowling Analysis</h4>
              <p>Run-up, load, release point, and follow-through — all tracked with the same MediaPipe model, no extra hardware.</p>
            </div>
            <div className="cp-ai-card coming">
              <p className="cp-ai-label" style={{color:'#c9a54c'}}>Vision</p>
              <h4>Injury Risk Flagging</h4>
              <p>Detect asymmetrical load patterns that correlate with common cricket injuries before they become a problem.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── SCORES SECTION ── */}
      <section id="scores" className="cp-section">
        <div className="cp-wrap">
          <div className="cp-split flip">
            <div>
              <div className="cp-section-tag">Scores & Rewards</div>
              <h2 className="cp-section-h">Every contribution<br />earns real money.</h2>
              <p className="cp-section-sub">
                The Scores engine credits players automatically for everything they do — no admin input required.
                50 Scores converts to exactly £1 through XI Rewards, every time.
              </p>
              <div style={{marginTop:'32px',display:'flex',flexDirection:'column',gap:'10px'}}>
                {[
                  ['+5','Mark availability for a match'],
                  ['+25','Complete an AI coaching session'],
                  ['+50','Play in a match'],
                  ['+100','Welcome bonus / refer a friend'],
                  ['+200','Pay annual membership fee'],
                ].map(([pts, desc]) => (
                  <div key={pts} style={{display:'flex',alignItems:'center',gap:'14px'}}>
                    <div style={{minWidth:'52px',padding:'6px 12px',background:'rgba(241,196,15,0.08)',border:'1px solid rgba(241,196,15,0.18)',borderRadius:'8px',textAlign:'center'}}>
                      <span style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:'14px',color:'#c9a54c'}}>{pts}</span>
                    </div>
                    <span style={{fontSize:'14px',color:'rgba(240,236,228,0.55)'}}>{desc}</span>
                  </div>
                ))}
              </div>
              <div style={{marginTop:'28px',background:'rgba(201,165,76,0.07)',border:'1px solid rgba(201,165,76,0.18)',borderRadius:'12px',padding:'16px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'12px',flexWrap:'wrap'}}>
                <span style={{fontSize:'14px',color:'rgba(240,236,228,0.45)'}}>Exchange rate — always fixed</span>
                <span style={{fontFamily:"'Syne',sans-serif",fontSize:'22px',fontWeight:800,color:'#c9a54c'}}>50 Scores = £1.00</span>
              </div>
            </div>
            <div className="cp-split-visual">
              <div style={{display:'flex',flexDirection:'column',gap:'14px'}}>
                <div style={{textAlign:'center',padding:'24px',background:'rgba(241,196,15,0.05)',borderRadius:'14px',border:'1px solid rgba(241,196,15,0.12)'}}>
                  <p style={{fontSize:'12px',color:'rgba(255,255,255,0.35)',textTransform:'uppercase',letterSpacing:'0.08em',fontWeight:600,marginBottom:'8px'}}>My Scores</p>
                  <p style={{fontFamily:"'Syne',sans-serif",fontSize:'64px',fontWeight:800,color:'#c9a54c',lineHeight:1}}>1,240</p>
                  <p style={{fontSize:'14px',color:'rgba(255,255,255,0.4)',marginTop:'8px'}}>≈ 620 XI Points · £12.40 value</p>
                </div>
                {[
                  {pts:'+50',label:'Match played vs Coventry CC',col:'#2ecc71',bg:'rgba(46,204,113,0.08)'},
                  {pts:'+25',label:'AI session completed',col:'#c9a54c',bg:'rgba(201,165,76,0.08)'},
                  {pts:'+5',label:'Available for Oxford match',col:'#3498db',bg:'rgba(52,152,219,0.08)'},
                ].map(e => (
                  <div key={e.pts} style={{display:'flex',alignItems:'center',gap:'12px',padding:'12px 16px',background:e.bg,borderRadius:'10px',border:`1px solid ${e.col}22`}}>
                    <div style={{minWidth:'48px',textAlign:'center'}}>
                      <span style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:'16px',color:e.col}}>{e.pts}</span>
                    </div>
                    <span style={{fontSize:'13.5px',color:'rgba(255,255,255,0.55)'}}>{e.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHY CLUBPULSE ── */}
      <section id="why" style={{background:'rgba(255,255,255,0.015)',borderTop:'1px solid rgba(255,255,255,0.05)',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
        <div className="cp-wrap cp-section">
          <div className="cp-section-tag">Why ClubPulse</div>
          <h2 className="cp-section-h">We built this<br />inside a cricket club.</h2>
          <p className="cp-section-sub">
            ClubPulse is live at Slough CC — co-built by the club&apos;s Performance & Operations Manager.
            Every feature was designed by someone who runs a cricket club, not a software agency.
          </p>
          <div className="cp-compare">
            <div className="cp-compare-head">
              <div className="cp-compare-cell head">Feature</div>
              <div className="cp-compare-cell head" style={{textAlign:'center',color:'#c9a54c'}}>ClubPulse</div>
              <div className="cp-compare-cell head" style={{textAlign:'center'}}>Typical alternatives</div>
            </div>
            {[
              ['Live ball-by-ball scorecard in the app','✓','❌ (separate scorer needed)'],
              ['Availability → squad → push notification','✓','Partial (manual steps)'],
              ['AI on-device batting analysis','✓','❌'],
              ['Scores loyalty system tied to real activity','✓','❌'],
              ['Fee collection + Wise payout','✓','Manual bank transfer'],
              ['Admin + player + scorekeeper in one platform','✓','3+ separate tools'],
              ['Built for grassroots (not professional) clubs','✓','Rebuilt for amateurs'],
              ['Free for players to join','✓','Paid per member'],
            ].map(([feat, us, them], i) => (
              <div key={feat} className={`cp-compare-row ${i % 2 === 0 ? 'cp-compare-hl' : ''}`}>
                <div className="cp-compare-cell name">{feat}</div>
                <div className="cp-compare-cell yes">{us}</div>
                <div className="cp-compare-cell them" style={{color:'rgba(240,236,228,0.35)',fontSize:'13px'}}>{them}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── QUOTE ── */}
      <div className="cp-wrap" style={{padding:'0 32px'}}>
        <div className="cp-quote">
          <p className="cp-quote-text">
            We used to run availability on a WhatsApp group and chase fees by hand every season.
            ClubPulse replaced all of that on day one — and now players actually look forward to checking their Scores.
          </p>
          <p className="cp-quote-attr">Ishwar Suresh — Performance & Operations Manager, Slough CC · Co-founder, ClubPulse</p>
        </div>
      </div>

      {/* ── FINAL CTA ── */}
      <div className="cp-cta-band" style={{marginTop:'96px'}}>
        <div className="cp-cta-inner">
          <h2>Your club deserves<br />better tools.</h2>
          <p>Free for players. Built for admins. Live at Slough CC today.</p>
          <div className="cp-cta-btns">
            <Link href="/auth/sign-up" className="cp-btn-white">Get started free →</Link>
            <a href="mailto:ishwar@clubpulse.co" className="cp-btn-white-ghost">Talk to the team</a>
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer className="cp-footer">
        <div className="cp-footer-inner">
          <span className="cp-footer-copy">© 2026 ClubPulse · Built for grassroots cricket</span>
          <div className="cp-footer-links">
            <Link href="/auth/sign-in">Sign in</Link>
            <Link href="/auth/sign-up">Sign up</Link>
            <Link href="/analyse">AI Coach</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
