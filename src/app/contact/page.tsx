'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', club: '', role: '', message: '' });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // In production this would POST to an API route or a service like Resend
    setSubmitted(true);
  }

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

        /* Layout */
        .page-wrap { max-width: 1100px; margin: 0 auto; padding: 72px 32px 96px; display: grid; grid-template-columns: 1fr 1.2fr; gap: 64px; align-items: start }
        @media(max-width: 860px) { .page-wrap { grid-template-columns: 1fr; gap: 48px } }

        /* Left column */
        .section-tag { font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #c9a54c; margin-bottom: 16px }
        .page-h { font-family: 'Syne', sans-serif; font-size: clamp(28px, 4vw, 48px); font-weight: 800; letter-spacing: -0.03em; line-height: 1.06; color: #f0ece4; margin-bottom: 18px }
        .page-sub { font-size: 16px; color: rgba(240,236,228,0.4); line-height: 1.75; margin-bottom: 40px }

        .contact-method { display: flex; align-items: flex-start; gap: 14px; margin-bottom: 24px }
        .method-icon { width: 40px; height: 40px; border-radius: 10px; background: rgba(155,28,28,0.1); border: 1px solid rgba(155,28,28,0.2); display: grid; place-items: center; font-size: 17px; flex-shrink: 0 }
        .method-label { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(240,236,228,0.25); margin-bottom: 4px }
        .method-val { font-size: 15px; font-weight: 500; color: #f0ece4 }
        .method-note { font-size: 13px; color: rgba(240,236,228,0.3); margin-top: 3px; line-height: 1.4 }

        .divider { border: none; border-top: 1px solid rgba(255,255,255,0.05); margin: 32px 0 }

        .onboarding-steps { display: flex; flex-direction: column; gap: 14px }
        .step { display: flex; align-items: flex-start; gap: 14px }
        .step-num { width: 26px; height: 26px; border-radius: 50%; background: rgba(201,165,76,0.12); border: 1px solid rgba(201,165,76,0.25); display: grid; place-items: center; font-size: 11px; font-weight: 700; color: #c9a54c; flex-shrink: 0; margin-top: 1px }
        .step-text { font-size: 14px; color: rgba(240,236,228,0.5); line-height: 1.55 }
        .step-text strong { color: rgba(240,236,228,0.8); font-weight: 500 }

        /* Form */
        .form-card { background: #0d0d0d; border: 1px solid rgba(255,255,255,0.07); border-radius: 20px; padding: 36px }
        .form-title { font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 700; color: #f0ece4; margin-bottom: 6px }
        .form-subtitle { font-size: 13px; color: rgba(240,236,228,0.3); margin-bottom: 28px; line-height: 1.5 }

        .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px }
        @media(max-width: 560px) { .field-row { grid-template-columns: 1fr } }
        .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px }
        .field label { font-size: 12px; font-weight: 600; color: rgba(240,236,228,0.4); letter-spacing: 0.04em }
        .field input, .field select, .field textarea {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 9px;
          padding: 11px 14px;
          font-size: 14px;
          color: #f0ece4;
          font-family: 'Inter', sans-serif;
          outline: none;
          transition: border-color 0.15s;
          width: 100%;
        }
        .field input:focus, .field select:focus, .field textarea:focus { border-color: rgba(155,28,28,0.5) }
        .field input::placeholder, .field textarea::placeholder { color: rgba(240,236,228,0.2) }
        .field select option { background: #111; color: #f0ece4 }
        .field textarea { resize: vertical; min-height: 110px; line-height: 1.55 }

        .submit-btn {
          width: 100%;
          padding: 14px;
          background: #9b1c1c;
          color: #fff;
          border: none;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 600;
          font-family: 'Inter', sans-serif;
          cursor: pointer;
          transition: opacity 0.15s;
          margin-top: 6px;
        }
        .submit-btn:hover { opacity: 0.88 }

        /* Success */
        .success-state { text-align: center; padding: 48px 24px }
        .success-icon { font-size: 48px; margin-bottom: 20px }
        .success-h { font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 800; color: #f0ece4; margin-bottom: 10px }
        .success-p { font-size: 15px; color: rgba(240,236,228,0.4); line-height: 1.65 }

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
            <Link href="/about">About</Link>
            <Link href="/contact" className="active">Contact</Link>
          </div>
          <div className="cp-nav-ctas">
            <Link href="/login" className="cp-signin">Sign in</Link>
            <Link href="/contact" className="cp-cta-sm">Get started</Link>
          </div>
        </nav>
      </header>

      {/* ── Main content ── */}
      <div className="page-wrap">

        {/* Left — info */}
        <div>
          <p className="section-tag">Get in touch</p>
          <h1 className="page-h">Bring ClubPulse<br />to your club</h1>
          <p className="page-sub">We onboard clubs one at a time to make sure the setup fits your structure. Fill in the form and we'll be in touch within a couple of days.</p>

          <div className="contact-method">
            <div className="method-icon">✉️</div>
            <div>
              <p className="method-label">Email</p>
              <p className="method-val">hello@clubpulse.co</p>
              <p className="method-note">We respond within 2 working days</p>
            </div>
          </div>

          <div className="contact-method">
            <div className="method-icon">🏏</div>
            <div>
              <p className="method-label">Currently live at</p>
              <p className="method-val">Slough Cricket Club</p>
              <p className="method-note">clubpulse.co — see it in production</p>
            </div>
          </div>

          <hr className="divider" />

          <p style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(240,236,228,0.25)', marginBottom: '16px' }}>
            How onboarding works
          </p>
          <div className="onboarding-steps">
            {[
              { n: '1', text: '<strong>You fill in the form</strong> — tell us about your club, your current setup, and what\'s causing the most pain.' },
              { n: '2', text: '<strong>We have a call</strong> — 20 minutes to walk through ClubPulse and answer your questions.' },
              { n: '3', text: '<strong>We set up your club</strong> — create your space, import your member list, configure your season.' },
              { n: '4', text: '<strong>You go live</strong> — we stay on hand for the first few weeks to make sure everything runs smoothly.' },
            ].map(s => (
              <div key={s.n} className="step">
                <span className="step-num">{s.n}</span>
                <p className="step-text" dangerouslySetInnerHTML={{ __html: s.text }} />
              </div>
            ))}
          </div>
        </div>

        {/* Right — form */}
        <div className="form-card">
          {submitted ? (
            <div className="success-state">
              <div className="success-icon">🎉</div>
              <h2 className="success-h">We&apos;ve got your message</h2>
              <p className="success-p">Thanks for reaching out. We&apos;ll be in touch within a couple of days to set up a call and walk you through ClubPulse.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <h2 className="form-title">Tell us about your club</h2>
              <p className="form-subtitle">Takes about 2 minutes. No obligation.</p>

              <div className="field-row">
                <div className="field">
                  <label htmlFor="name">Your name</label>
                  <input
                    id="name"
                    type="text"
                    placeholder="Joe Root"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="email">Email address</label>
                  <input
                    id="email"
                    type="email"
                    placeholder="joe@yourclub.co.uk"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="field">
                <label htmlFor="club">Club name</label>
                <input
                  id="club"
                  type="text"
                  placeholder="Slough Cricket Club"
                  value={form.club}
                  onChange={e => setForm(f => ({ ...f, club: e.target.value }))}
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="role">Your role at the club</label>
                <select
                  id="role"
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  required
                >
                  <option value="">Select a role…</option>
                  <option value="chairman">Chairman / President</option>
                  <option value="secretary">Secretary</option>
                  <option value="treasurer">Treasurer</option>
                  <option value="captain">Captain / Vice-captain</option>
                  <option value="coach">Coach</option>
                  <option value="player">Player</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="field">
                <label htmlFor="message">What&apos;s the biggest admin headache right now?</label>
                <textarea
                  id="message"
                  placeholder="Chasing availability every week, tracking who's paid subs, no live scorecard…"
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                />
              </div>

              <button type="submit" className="submit-btn">Send message →</button>
            </form>
          )}
        </div>
      </div>

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
