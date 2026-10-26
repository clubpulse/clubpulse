'use client';

import Link from 'next/link';

export default function AICoachPage() {
  return (
    <>
      <style>{`
        .ai-root * { box-sizing: border-box; margin: 0; padding: 0; }
        .ai-root {
          --bg: #080808; --bg2: #0d0d0d; --bg3: #111;
          --fg: #f0ece4; --fg2: rgba(240,236,228,0.55); --fg3: rgba(240,236,228,0.28);
          --red: #9b1c1c; --gold: #c9a54c; --green: #2ecc71; --orange: #f97316;
          --border: rgba(255,255,255,0.07);
          background: var(--bg); color: var(--fg);
          font-family: 'Inter', sans-serif; overflow-x: hidden;
        }
        @keyframes ai-blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes ai-scan { 0%{transform:translateY(-100%)} 100%{transform:translateY(100%)} }
        @keyframes ai-pulse { 0%,100%{opacity:0.6;transform:scale(1)} 50%{opacity:1;transform:scale(1.04)} }

        .ai-nav { position:sticky;top:0;z-index:100;border-bottom:1px solid var(--border);background:rgba(8,8,8,0.92);backdrop-filter:blur(16px); }
        .ai-nav-inner { max-width:1200px;margin:0 auto;padding:0 40px;height:60px;display:flex;align-items:center;justify-content:space-between;gap:24px; }
        .ai-logo { display:flex;align-items:center;gap:8px;text-decoration:none; }
        .ai-logo-mark { width:30px;height:30px;background:var(--red);border-radius:7px;display:grid;place-items:center;font-family:'Syne',sans-serif;font-weight:800;font-size:13px;color:#fff; }
        .ai-logo-name { font-family:'Syne',sans-serif;font-weight:700;font-size:15px;color:var(--fg); }
        .ai-nav-back { font-size:13px;color:var(--fg3);text-decoration:none;transition:color 0.15s; }
        .ai-nav-back:hover { color:var(--fg); }
        .ai-nav-cta { padding:9px 20px;font-size:13px;font-weight:700;background:var(--red);color:#fff;text-decoration:none;border-radius:9px;transition:opacity 0.12s; }
        .ai-nav-cta:hover { opacity:0.88; }

        .ai-hero { max-width:1200px;margin:0 auto;padding:80px 40px 64px;display:grid;grid-template-columns:1fr 420px;gap:64px;align-items:start; }
        .ai-eyebrow { font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--red);margin-bottom:16px; }
        .ai-h1 { font-family:'Syne',sans-serif;font-weight:800;font-size:clamp(36px,5vw,64px);letter-spacing:-0.03em;line-height:1.05;color:var(--fg);margin-bottom:20px; }
        .ai-h1 .green { color:var(--green); }
        .ai-sub { font-size:17px;color:var(--fg2);line-height:1.65;max-width:520px;margin-bottom:36px; }
        .ai-road-tag { display:inline-flex;align-items:center;gap:6px;background:rgba(249,115,22,0.12);border:1px solid rgba(249,115,22,0.25);color:var(--orange);font-size:11px;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;border-radius:20px;padding:5px 12px;margin-bottom:24px; }
        .ai-btns { display:flex;gap:12px;flex-wrap:wrap; }
        .ai-btn-red { padding:13px 26px;font-size:14px;font-weight:700;background:var(--red);color:#fff;text-decoration:none;border-radius:10px;transition:opacity 0.12s; }
        .ai-btn-red:hover { opacity:0.88; }
        .ai-btn-ghost { padding:13px 26px;font-size:14px;font-weight:600;border:1px solid var(--border);color:var(--fg2);text-decoration:none;border-radius:10px;transition:border-color 0.15s,color 0.15s; }
        .ai-btn-ghost:hover { border-color:rgba(255,255,255,0.2);color:var(--fg); }

        /* POSE MOCKUP */
        .ai-pose-card { background:#0a0a0a;border:1px solid var(--border);border-radius:20px;padding:20px;box-shadow:0 0 60px rgba(46,204,113,0.06); }
        .ai-cam-label { display:flex;align-items:center;gap:6px;font-size:9px;font-weight:700;color:var(--green);letter-spacing:0.08em;text-transform:uppercase;margin-bottom:10px; }
        .ai-cam-dot { width:5px;height:5px;border-radius:50%;background:var(--green);animation:ai-blink 2s infinite; }
        .ai-pose-frame {
          aspect-ratio:4/3;background:#050505;border-radius:12px;
          display:flex;align-items:center;justify-content:center;
          position:relative;overflow:hidden;margin-bottom:14px;
        }
        .ai-scan-line { position:absolute;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,rgba(46,204,113,0.5),transparent);animation:ai-scan 3s linear infinite;z-index:2; }
        .ai-scan-overlay { position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.1) 3px,rgba(0,0,0,0.1) 4px);z-index:1; }
        .ai-corner { position:absolute;width:16px;height:16px;border-color:rgba(46,204,113,0.7);border-style:solid;z-index:3; }
        .ai-corner.tl { top:10px;left:10px;border-width:2px 0 0 2px; }
        .ai-corner.tr { top:10px;right:10px;border-width:2px 2px 0 0; }
        .ai-corner.bl { bottom:10px;left:10px;border-width:0 0 2px 2px; }
        .ai-corner.br { bottom:10px;right:10px;border-width:0 2px 2px 0; }
        .ai-hud-label { position:absolute;bottom:8px;left:12px;font-size:8px;font-weight:700;letter-spacing:0.08em;color:rgba(46,204,113,0.8);text-transform:uppercase;z-index:3;animation:ai-blink 2s infinite; }
        .ai-fb-cards { display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px; }
        .ai-fb-card { background:#111;border:1px solid var(--border);border-radius:10px;padding:10px; }
        .ai-fb-icon { font-size:16px;margin-bottom:5px; }
        .ai-fb-label { font-size:9px;font-weight:600;color:var(--fg3);margin-bottom:3px; }
        .ai-fb-val { font-size:11px;font-weight:700; }
        .ai-fb-val.ok { color:var(--green); }
        .ai-fb-val.warn { color:var(--orange); }
        .ai-lm-row { background:#111;border:1px solid var(--border);border-radius:10px;padding:10px 14px;font-size:10px;color:var(--fg3); }
        .ai-lm-nums { display:flex;gap:6px;flex-wrap:wrap;margin-top:4px; }
        .ai-lm-dot { width:20px;height:20px;border-radius:50%;background:rgba(46,204,113,0.15);border:1px solid rgba(46,204,113,0.3);display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:var(--green); }

        /* HOW IT WORKS */
        .ai-section { max-width:1200px;margin:0 auto;padding:80px 40px; }
        .ai-section-eyebrow { font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--red);margin-bottom:14px; }
        .ai-section-h2 { font-family:'Syne',sans-serif;font-size:clamp(26px,3.5vw,40px);font-weight:800;letter-spacing:-0.025em;color:var(--fg);margin-bottom:12px; }
        .ai-section-sub { font-size:15px;color:var(--fg2);max-width:560px;line-height:1.65;margin-bottom:48px; }

        .ai-steps { display:grid;grid-template-columns:repeat(4,1fr);gap:2px;background:var(--border);border:1px solid var(--border);border-radius:18px;overflow:hidden; }
        .ai-step { background:var(--bg2);padding:32px 28px; }
        .ai-step-n { font-family:'Syne',sans-serif;font-size:11px;font-weight:800;letter-spacing:0.1em;color:rgba(155,28,28,0.4);margin-bottom:14px; }
        .ai-step-icon { font-size:26px;margin-bottom:12px; }
        .ai-step-h { font-family:'Syne',sans-serif;font-size:14px;font-weight:800;color:var(--fg);margin-bottom:6px; }
        .ai-step-body { font-size:12.5px;color:var(--fg2);line-height:1.65; }

        /* LANDMARKS */
        .ai-lm-section { background:var(--bg2);border-top:1px solid var(--border);border-bottom:1px solid var(--border); }
        .ai-lm-inner { max-width:1200px;margin:0 auto;padding:80px 40px;display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:center; }
        .ai-lm-grid { display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:24px; }
        .ai-lm-chip { background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:10px 12px;font-size:11px;color:var(--fg2); }
        .ai-lm-chip strong { color:var(--green);display:block;font-size:10px;font-weight:700;margin-bottom:2px; }

        /* PRIVACY */
        .ai-privacy { background:rgba(46,204,113,0.04);border:1px solid rgba(46,204,113,0.12);border-radius:16px;padding:28px;margin-top:40px;display:flex;gap:16px;align-items:flex-start; }
        .ai-privacy-icon { font-size:28px;flex-shrink:0; }
        .ai-privacy-h { font-family:'Syne',sans-serif;font-size:15px;font-weight:800;color:var(--green);margin-bottom:6px; }
        .ai-privacy-body { font-size:13px;color:var(--fg2);line-height:1.65; }

        /* FAQ */
        .ai-faq { max-width:1200px;margin:0 auto;padding:80px 40px; }
        .ai-faq-list { display:flex;flex-direction:column;gap:2px;border:1px solid var(--border);border-radius:16px;overflow:hidden;margin-top:48px; }
        .ai-faq-item { background:var(--bg2);padding:24px 28px;border-bottom:1px solid var(--border); }
        .ai-faq-item:last-child { border-bottom:none; }
        .ai-faq-q { font-family:'Syne',sans-serif;font-size:15px;font-weight:800;color:var(--fg);margin-bottom:10px; }
        .ai-faq-a { font-size:13.5px;color:var(--fg2);line-height:1.7; }

        .ai-cta { background:var(--red);border-top:1px solid rgba(255,255,255,0.08); }
        .ai-cta-inner { max-width:1200px;margin:0 auto;padding:72px 40px;display:flex;align-items:center;justify-content:space-between;gap:32px;flex-wrap:wrap; }
        .ai-cta-h { font-family:'Syne',sans-serif;font-size:clamp(22px,3vw,36px);font-weight:800;letter-spacing:-0.02em;color:#fff; }
        .ai-cta-sub { font-size:14px;color:rgba(255,255,255,0.65);margin-top:6px; }
        .ai-cta-btn { padding:14px 30px;font-size:14px;font-weight:700;background:#fff;color:var(--red);text-decoration:none;border-radius:10px;white-space:nowrap;transition:opacity 0.12s; }
        .ai-cta-btn:hover { opacity:0.9; }
        .ai-footer { border-top:1px solid var(--border); }
        .ai-footer-inner { max-width:1200px;margin:0 auto;padding:32px 40px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px; }
        .ai-footer-copy { font-size:12px;color:var(--fg3); }
        .ai-footer-links { display:flex;gap:20px; }
        .ai-footer-links a { font-size:13px;color:var(--fg3);text-decoration:none;transition:color 0.12s; }
        .ai-footer-links a:hover { color:var(--fg); }

        @media (max-width:900px) {
          .ai-hero { grid-template-columns:1fr;gap:40px; }
          .ai-steps { grid-template-columns:1fr 1fr; }
          .ai-lm-inner { grid-template-columns:1fr; }
          .ai-cta-inner { flex-direction:column;text-align:center; }
        }
        @media (max-width:600px) {
          .ai-hero, .ai-section, .ai-faq { padding-left:16px;padding-right:16px; }
          .ai-nav-inner { padding:0 16px; }
          .ai-steps { grid-template-columns:1fr; }
          .ai-lm-inner, .ai-cta-inner, .ai-footer-inner { padding-left:16px;padding-right:16px; }
          .ai-lm-grid { grid-template-columns:repeat(3,1fr); }
        }
      `}</style>

      <div className="ai-root">
        <nav className="ai-nav">
          <div className="ai-nav-inner">
            <Link href="/" className="ai-logo"><span className="ai-logo-mark">C</span><span className="ai-logo-name">ClubPulse</span></Link>
            <Link href="/#features" className="ai-nav-back">← All features</Link>
            <Link href="/contact" className="ai-nav-cta">Get started</Link>
          </div>
        </nav>

        <section className="ai-hero">
          <div>
            <p className="ai-eyebrow">🎯 AI Coach</p>
            <div className="ai-road-tag">🗺 Roadmap — coming 2027</div>
            <h1 className="ai-h1">A batting coach in your pocket. <span className="green">On-device.</span></h1>
            <p className="ai-sub">MediaPipe Pose maps 33 3D body landmarks at 30fps — directly on your phone camera. No server, no upload, no waiting. Real-time feedback on stance, elbow position, head level, and follow-through.</p>
            <div className="ai-btns">
              <Link href="/contact" className="ai-btn-red">Register interest →</Link>
              <Link href="/#features" className="ai-btn-ghost">See all features</Link>
            </div>
          </div>

          <div className="ai-pose-card">
            <div className="ai-cam-label"><span className="ai-cam-dot" />Pose tracking active · 30fps</div>
            <div className="ai-pose-frame">
              <div className="ai-scan-line" />
              <div className="ai-scan-overlay" />
              <span className="ai-corner tl" /><span className="ai-corner tr" />
              <span className="ai-corner bl" /><span className="ai-corner br" />
              <span className="ai-hud-label">MEDIAPIPE · 33PT · 30FPS</span>
              <svg viewBox="0 0 160 240" fill="none" style={{width:'140px',height:'200px',position:'relative',zIndex:1}}>
                <ellipse cx="82" cy="22" rx="14" ry="15" fill="rgba(240,236,228,0.85)"/>
                <path d="M68 19 Q68 5 82 5 Q96 5 96 19 Z" fill="#9b1c1c"/>
                <rect x="94" y="13" width="11" height="6" rx="2" fill="#9b1c1c"/>
                <rect x="78" y="37" width="8" height="8" rx="3" fill="rgba(240,236,228,0.7)"/>
                <path d="M62 46 Q72 42 82 43 Q93 42 102 46 L100 96 Q91 99 82 99 Q72 99 64 96 Z" fill="rgba(240,236,228,0.12)" stroke="rgba(240,236,228,0.3)" strokeWidth="1.5"/>
                <path d="M100 50 Q114 38 122 24 Q126 16 120 12" stroke="rgba(240,236,228,0.75)" strokeWidth="6" strokeLinecap="round" fill="none"/>
                <ellipse cx="120" cy="11" rx="6" ry="7" fill="rgba(240,236,228,0.85)"/>
                <path d="M64 52 Q46 62 36 74 Q30 82 33 88" stroke="rgba(240,236,228,0.75)" strokeWidth="6" strokeLinecap="round" fill="none"/>
                <ellipse cx="33" cy="88" rx="6" ry="7" fill="rgba(240,236,228,0.85)"/>
                <rect x="26" y="76" width="10" height="52" rx="4" transform="rotate(-32 26 76)" fill="#c9a54c"/>
                <rect x="26" y="76" width="2" height="52" rx="1" transform="rotate(-32 26 76)" fill="rgba(255,255,255,0.18)"/>
                <path d="M72 96 Q64 128 54 158 Q50 168 55 174" stroke="rgba(240,236,228,0.7)" strokeWidth="7" strokeLinecap="round" fill="none"/>
                <path d="M90 96 Q97 126 100 156 Q102 166 96 170" stroke="rgba(240,236,228,0.7)" strokeWidth="7" strokeLinecap="round" fill="none"/>
                <path d="M50 173 Q44 182 55 185 Q68 185 65 174" fill="rgba(240,236,228,0.6)"/>
                <path d="M91 169 Q85 178 96 180 Q108 179 106 169" fill="rgba(240,236,228,0.6)"/>
                <circle cx="120" cy="11" r="5" fill="#2ecc71"/>
                <circle cx="33" cy="88" r="5" fill="#2ecc71"/>
                <circle cx="100" cy="50" r="4.5" fill="#c9a54c"/>
                <circle cx="64" cy="52" r="4.5" fill="#c9a54c"/>
                <circle cx="82" cy="96" r="4.5" fill="#c9a54c"/>
                <circle cx="54" cy="158" r="4" fill="#c9a54c"/>
                <circle cx="100" cy="156" r="4" fill="#c9a54c"/>
                <circle cx="55" cy="174" r="3.5" fill="rgba(155,28,28,0.9)"/>
                <circle cx="96" cy="170" r="3.5" fill="rgba(155,28,28,0.9)"/>
                <line x1="120" y1="11" x2="100" y2="50" stroke="#2ecc71" strokeWidth="1" opacity="0.4"/>
                <line x1="33" y1="88" x2="64" y2="52" stroke="#2ecc71" strokeWidth="1" opacity="0.4"/>
              </svg>
            </div>
            <div className="ai-fb-cards">
              <div className="ai-fb-card"><div className="ai-fb-icon">🧠</div><div className="ai-fb-label">Head</div><div className="ai-fb-val ok">Level ✓</div></div>
              <div className="ai-fb-card"><div className="ai-fb-icon">💪</div><div className="ai-fb-label">Elbow</div><div className="ai-fb-val warn">Drop 8°</div></div>
              <div className="ai-fb-card"><div className="ai-fb-icon">👣</div><div className="ai-fb-label">Front foot</div><div className="ai-fb-val ok">Straight ✓</div></div>
            </div>
            <div className="ai-lm-row">
              <div style={{marginBottom:'6px'}}>33 landmarks tracked</div>
              <div className="ai-lm-nums">
                {Array.from({length:33},(_,i)=>(
                  <span key={i} className="ai-lm-dot">{i}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <div style={{borderTop:'1px solid rgba(255,255,255,0.07)'}}>
          <div className="ai-section">
            <p className="ai-section-eyebrow">How it works</p>
            <h2 className="ai-section-h2">Pose tracking. On your phone. In real time.</h2>
            <p className="ai-section-sub">MediaPipe is the same technology used in Google&apos;s fitness and AR apps — ClubPulse brings it to grassroots cricket coaching for the first time.</p>
            <div className="ai-steps">
              <div className="ai-step">
                <p className="ai-step-n">01</p>
                <div className="ai-step-icon">📱</div>
                <h3 className="ai-step-h">Open AI Coach</h3>
                <p className="ai-step-body">Open the AI Coach screen in the ClubPulse app. Point your phone camera at the batter — or prop it up against a bag at the nets.</p>
              </div>
              <div className="ai-step">
                <p className="ai-step-n">02</p>
                <div className="ai-step-icon">🤖</div>
                <h3 className="ai-step-h">MediaPipe tracks pose</h3>
                <p className="ai-step-body">MediaPipe Pose runs entirely on your device — no server, no upload. It maps 33 3D body landmarks at 30 frames per second in real time.</p>
              </div>
              <div className="ai-step">
                <p className="ai-step-n">03</p>
                <div className="ai-step-icon">📊</div>
                <h3 className="ai-step-h">Coaching feedback</h3>
                <p className="ai-step-body">The app compares your pose to ideal batting geometry — head position, elbow height, front foot alignment, follow-through arc — and flags what needs attention.</p>
              </div>
              <div className="ai-step">
                <p className="ai-step-n">04</p>
                <div className="ai-step-icon">📈</div>
                <h3 className="ai-step-h">Progress tracked</h3>
                <p className="ai-step-body">Every session is logged. You can see improvement over time — whether your head is staying stiller, your elbow dropping less, your follow-through extending further.</p>
              </div>
            </div>
          </div>
        </div>

        {/* LANDMARKS */}
        <div className="ai-lm-section">
          <div className="ai-lm-inner">
            <div>
              <p className="ai-section-eyebrow">The technology</p>
              <h2 className="ai-section-h2">33 landmarks. 30fps. Zero latency.</h2>
              <p className="ai-section-sub">MediaPipe Pose detects 33 key points across your entire body, from nose to heels, in three dimensions. At 30 frames per second, it can catch a technical fault mid-shot.</p>
              <div className="ai-privacy">
                <span className="ai-privacy-icon">🔒</span>
                <div>
                  <div className="ai-privacy-h">On-device only. No data leaves your phone.</div>
                  <p className="ai-privacy-body">Everything runs on your device using the phone&apos;s own neural processing unit. Pose data is never sent to any server. ClubPulse cannot see your sessions. Your training stays yours — completely private by design.</p>
                </div>
              </div>
            </div>
            <div>
              <div className="ai-lm-grid">
                {[
                  { n:'0–10', label:'Face & head' },
                  { n:'11–12', label:'Shoulders' },
                  { n:'13–14', label:'Elbows' },
                  { n:'15–16', label:'Wrists' },
                  { n:'17–22', label:'Hands' },
                  { n:'23–24', label:'Hips' },
                  { n:'25–26', label:'Knees' },
                  { n:'27–28', label:'Ankles' },
                  { n:'29–32', label:'Feet' },
                ].map((lm, i) => (
                  <div key={i} className="ai-lm-chip">
                    <strong>{lm.n}</strong>{lm.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="ai-faq">
          <p className="ai-section-eyebrow">FAQ</p>
          <h2 className="ai-section-h2">Common questions about AI Coach.</h2>
          <div className="ai-faq-list">
            {[
              ['When will AI Coach be available?', 'AI Coach is on the ClubPulse roadmap for 2027. You can register interest now and we\'ll notify you as soon as it\'s live. The core technology (MediaPipe Pose) already works — we\'re building the coaching logic and UI around it.'],
              ['What phone is needed?', 'Any modern iPhone (A12 Bionic or newer, iPhone XS+) or Android flagship from 2020 onward. MediaPipe Pose uses the device\'s neural processing unit and runs at 30fps on these chips without draining battery rapidly.'],
              ['Can it be used without an internet connection?', 'Yes — because everything runs on-device, AI Coach works completely offline. No signal, no Wi-Fi — it doesn\'t matter. This is intentional: cricket nets often have poor signal.'],
              ['Will it work for bowling or fielding?', 'The first release focuses on batting technique. Bowling action analysis (particularly front-arm position and delivery stride) is planned for a later update. Fielding mechanics may follow.'],
              ['Who provides the coaching logic — is it a real coach?', 'The pose thresholds and feedback rules are written in collaboration with qualified coaches. MediaPipe provides the raw pose data; the coaching interpretation is built by humans with ECB coaching qualifications.'],
              ['Is this only for batters at the nets?', 'The main use case is a tripod or phone propped up at the nets, but it works anywhere with a camera angle that shows the batter\'s full body. Some players use it in a garden or sports hall.'],
            ].map(([q, a], i) => (
              <div key={i} className="ai-faq-item">
                <div className="ai-faq-q">{q}</div>
                <div className="ai-faq-a">{a}</div>
              </div>
            ))}
          </div>
        </div>

        <section className="ai-cta">
          <div className="ai-cta-inner">
            <div>
              <h2 className="ai-cta-h">Be first to try AI coaching.</h2>
              <p className="ai-cta-sub">Register your club&apos;s interest and we&apos;ll reach out when AI Coach launches.</p>
            </div>
            <Link href="/contact" className="ai-cta-btn">Register interest →</Link>
          </div>
        </section>

        <footer className="ai-footer">
          <div className="ai-footer-inner">
            <Link href="/" className="ai-logo"><span className="ai-logo-mark">C</span><span className="ai-logo-name">ClubPulse</span></Link>
            <div className="ai-footer-links">
              <Link href="/features/availability">Availability</Link>
              <Link href="/features/scorecard">Scorecard</Link>
              <Link href="/features/ai-coach">AI Coach</Link>
              <Link href="/features/scores">Scores</Link>
              <Link href="/features/finance">Finance</Link>
            </div>
            <p className="ai-footer-copy">© 2026 ClubPulse</p>
          </div>
        </footer>
      </div>
    </>
  );
}
