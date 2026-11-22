'use client';

import { Glyph } from '@/components/icons/Glyph';
import MarketingNav from '@/components/marketing/MarketingNav';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { useState } from 'react';
import { CLUB_SIZES, NEEDS } from '@/lib/enquiries/logic';

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', club: '', role: '', members: '', message: '', website: '' });
  const [needs, setNeeds] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleNeed = (value: string) => setNeeds((list) => (list.includes(value) ? list.filter((n) => n !== value) : [...list, value]));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (needs.length === 0 && form.message.trim().length < 10) {
      setError('Tick what you need, or tell us a little in the message.');
      return;
    }
    setSending(true);
    try {
      const response = await fetch('/api/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, needs }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? 'Something went wrong.');
      }
      setSubmitted(true);
    } catch (err) {
      setError(`${err instanceof Error ? err.message : 'Something went wrong.'} You can also email hello@clubpulse.co.`);
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#04091A', color: '#f0ece4', fontFamily: "'Inter', sans-serif", overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700;800&family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0 }

        /* Nav */
        .cp-nav { display: flex; align-items: center; justify-content: space-between; max-width: 1200px; margin: 0 auto; padding: 24px 32px }
        .cp-logo { display: flex; align-items: center; gap: 10px; text-decoration: none }
        .cp-logo-mark {width:36px;height:36px;border-radius:8px;background:linear-gradient(145deg,#0F1F5C 0%,#1D4ED8 50%,#3B82F6 100%);box-shadow:0 0 0 1px rgba(96,165,250,0.25),0 0 16px rgba(29,78,216,0.4);display:grid;place-items:center;}
        .cp-logo-name {font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:18px;} .cp-logo-name .club {color:#f0ece4;} .cp-logo-name .pulse {color:#60A5FA;}
        .cp-menu { display: flex; align-items: center; gap: 24px }
        .cp-menu a { font-size: 14px; font-weight: 500; color: #fff; text-decoration: none; opacity: 0.55; transition: opacity 0.15s }
        .cp-menu a:hover, .cp-menu a.active { opacity: 1 }
        @media(max-width: 767px) { .cp-menu { display: none } .cp-signin { padding: 9px 10px } .cp-cta-sm { padding: 9px 14px } }
        .cp-nav-ctas { display: flex; align-items: center; gap: 8px }
        .cp-signin { white-space: nowrap; padding: 9px 18px; border-radius: 8px; font-size: 14px; font-weight: 500; color: rgba(240,236,228,0.5); text-decoration: none }
        .cp-cta-sm { white-space: nowrap; padding: 9px 20px; border-radius: 8px; background: #1D4ED8; font-size: 14px; font-weight: 600; color: #fff; text-decoration: none }

        /* Layout */
        .page-wrap { max-width: 1100px; margin: 0 auto; padding: 72px 32px 96px; display: grid; grid-template-columns: 1fr 1.2fr; gap: 64px; align-items: start }
        @media(max-width: 860px) { .page-wrap { grid-template-columns: 1fr; gap: 48px } }

        /* Left column */
        .section-tag { font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #EFC84A; margin-bottom: 16px }
        .page-h { font-family: 'Bricolage Grotesque', sans-serif; font-size: clamp(28px, 4vw, 48px); font-weight: 800; letter-spacing: -0.03em; line-height: 1.06; color: #f0ece4; margin-bottom: 18px }
        .page-sub { font-size: 16px; color: rgba(240,236,228,0.4); line-height: 1.75; margin-bottom: 40px }

        .contact-method { display: flex; align-items: flex-start; gap: 14px; margin-bottom: 24px }
        .method-icon { width: 40px; height: 40px; border-radius: 10px; background: rgba(37,99,235,0.12); border: 1px solid rgba(37,99,235,0.22); display: grid; place-items: center; font-size: 17px; flex-shrink: 0 }
        .method-label { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(240,236,228,0.25); margin-bottom: 4px }
        .method-val { font-size: 15px; font-weight: 500; color: #f0ece4 }
        .method-note { font-size: 13px; color: rgba(240,236,228,0.3); margin-top: 3px; line-height: 1.4 }

        .divider { border: none; border-top: 1px solid rgba(255,255,255,0.05); margin: 32px 0 }

        .onboarding-steps { display: flex; flex-direction: column; gap: 14px }
        .step { display: flex; align-items: flex-start; gap: 14px }
        .step-num { width: 26px; height: 26px; border-radius: 50%; background: rgba(239,200,74,0.12); border: 1px solid rgba(239,200,74,0.25); display: grid; place-items: center; font-size: 11px; font-weight: 700; color: #EFC84A; flex-shrink: 0; margin-top: 1px }
        .step-text { font-size: 14px; color: rgba(240,236,228,0.5); line-height: 1.55 }
        .step-text strong { color: rgba(240,236,228,0.8); font-weight: 500 }

        /* Form */
        .form-card { background: #07102B; border: 1px solid rgba(255,255,255,0.07); border-radius: 20px; padding: 36px }
        .form-title { font-family: 'Bricolage Grotesque', sans-serif; font-size: 20px; font-weight: 700; color: #f0ece4; margin-bottom: 6px }
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
        .field input:focus, .field select:focus, .field textarea:focus { border-color: rgba(37,99,235,0.55) }
        .field input::placeholder, .field textarea::placeholder { color: rgba(240,236,228,0.2) }
        .field select option { background: #111; color: #f0ece4 }
        .field textarea { resize: vertical; min-height: 110px; line-height: 1.55 }

        .submit-btn {
          width: 100%;
          padding: 14px;
          background: #1D4ED8;
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
        .needs { border: none; margin: 0 0 14px; padding: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 8px }
        @media(max-width: 560px) { .needs { grid-template-columns: 1fr } }
        .needs legend { font-size: 12px; font-weight: 600; color: rgba(240,236,228,0.4); letter-spacing: 0.04em; margin-bottom: 10px; padding: 0 }
        .need { display: flex; align-items: center; gap: 9px; padding: 10px 12px; border-radius: 9px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.09); font-size: 13px; color: rgba(240,236,228,0.8); cursor: pointer }
        .need input { width: 16px; height: 16px; accent-color: #2563EB; flex-shrink: 0 }
        .success-icon { font-size: 48px; margin-bottom: 20px }
        .success-h { font-family: 'Bricolage Grotesque', sans-serif; font-size: 22px; font-weight: 800; color: #f0ece4; margin-bottom: 10px }
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
        <MarketingNav />
      </header>

      {/* ── Main content ── */}
      <div className="page-wrap">

        {/* Left — info */}
        <div>
          <p className="section-tag">Get in touch</p>
          <h1 className="page-h">Bring ClubPulse<br />to your club</h1>
          <p className="page-sub">Club plans start at £29.99 a month and are set up under an agreement rather than bought online. Tell us what your club needs, we confirm the plan and a fixed term with you, and we set the platform up to match.</p>

          <div className="contact-method">
            <div className="method-icon">✉️</div>
            <div>
              <p className="method-label">Email</p>
              <p className="method-val">hello@clubpulse.co</p>
              <p className="method-note">We respond within 2 working days</p>
            </div>
          </div>

          <div className="contact-method">
            <div className="method-icon"><Glyph e="🏏" /></div>
            <div>
              <p className="method-label">Status</p>
              <p className="method-val">In development</p>
              <p className="method-note">Now starting to contact clubs</p>
            </div>
          </div>

          <hr className="divider" />

          <p style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(240,236,228,0.25)', marginBottom: '16px' }}>
            How onboarding works
          </p>
          <div className="onboarding-steps">
            {[
              { n: '1', text: '<strong>You tell us what you need.</strong> Your club, its size, and what you want ClubPulse to do.' },
              { n: '2', text: '<strong>We talk it through.</strong> A short call to confirm your requirements and show you the platform.' },
              { n: '3', text: '<strong>We agree a plan.</strong> What is included, the price and the period, set out in a simple agreement.' },
              { n: '4', text: '<strong>We set it up for your club.</strong> Built around what you asked for, with help while you get going.' },
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
              <div className="success-icon"><Glyph e="🎉" /></div>
              <h2 className="success-h">We&apos;ve got your message</h2>
              <p className="success-p">Thanks for getting in touch. We&apos;ll reply within 2 working days to arrange a call and confirm what your club needs.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <h2 className="form-title">Tell us what your club needs</h2>
              <p className="form-subtitle">Takes about 2 minutes. No obligation, and nothing to pay on this site.</p>

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
                  placeholder="Your Cricket Club"
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
                <label htmlFor="members">Size of the club</label>
                <select id="members" value={form.members} onChange={e => setForm(f => ({ ...f, members: e.target.value }))}>
                  <option value="">Choose…</option>
                  {CLUB_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
                </select>
              </div>

              <fieldset className="needs">
                <legend>What do you want ClubPulse to do? Tick all that apply.</legend>
                {NEEDS.map((need) => (
                  <label key={need.value} className="need">
                    <input type="checkbox" checked={needs.includes(need.value)} onChange={() => toggleNeed(need.value)} />
                    <span>{need.label}</span>
                  </label>
                ))}
              </fieldset>

              {/* Left empty by people; scripts fill it in and are ignored */}
              <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" value={form.website}
                onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
                style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} />

              <div className="field">
                <label htmlFor="message">Anything else we should know?</label>
                <textarea
                  id="message"
                  placeholder="How you run things today, what takes the most time, anything you would like built for your club…"
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                />
              </div>

              {error && <p role="alert" style={{ color: '#f87171', fontSize: 13, marginBottom: 12, lineHeight: 1.5 }}>{error}</p>}
              <button type="submit" className="submit-btn" disabled={sending} style={sending ? { opacity: 0.6 } : undefined}>
                {sending ? 'Sending…' : 'Send →'}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* ── Footer ── */}
        <MarketingFooter />
    </div>
  );
}
