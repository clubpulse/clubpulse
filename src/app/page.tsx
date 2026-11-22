'use client';

import { Glyph } from '@/components/icons/Glyph';
import Link from 'next/link';
import MarketingNav from '@/components/marketing/MarketingNav';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import FrontDoors from '@/components/marketing/FrontDoors';
import { Pillars } from '@/components/marketing/Pillars';
import { AnimatedGradientText, BorderBeam, DotPattern, Meteors, ShimmerButton } from '@/components/magic';
import { useState, useEffect, useRef } from 'react';

// Players pay online once checkout is switched on in Vercel; until then the buttons lead to the contact form.


type PhoneTab = 'dash' | 'card' | 'coach' | 'pts';

function useCountUp(target: number, duration = 1800) {
  const [count, setCount] = useState(target);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min((now - start) / duration, 1);
          const ease = 1 - Math.pow(1 - p, 3);
          setCount(Math.round(ease * target));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [target, duration]);
  return { count, ref };
}

export default function HomePage() {
  const [phoneTab, setPhoneTab] = useState<PhoneTab>('dash');
  const phoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => {
      if (phoneRef.current) {
        phoneRef.current.style.transform = `translateY(${window.scrollY * 0.06}px)`;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const { ref: stat50Ref, count: stat50Count } = useCountUp(500);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap');

        .cp-root * { box-sizing: border-box; margin: 0; padding: 0; }
        .cp-root {
          --bg: #080810; --bg2: #07102B; --bg3: #0f0f1c; --bg4: #080810;
          --fg: #E8EDF5; --fg2: rgba(232,237,245,0.55); --fg3: rgba(232,237,245,0.28);
          --blue: #1D4ED8; --blue-b: #3B82F6; --blue-dark: #0F1F5C;
          --blue-dim: rgba(29,78,216,0.16); --blue-glow: rgba(37,99,235,0.12);
          --sky: #60A5FA;
          /* Legacy alias — anything using var(--red) now resolves to blue */
          --red: #1D4ED8; --red-b: #3B82F6; --red-dim: rgba(29,78,216,0.16); --red-glow: rgba(37,99,235,0.12);
          --gold: #EFC84A; --gold-dim: rgba(239,200,74,0.12);
          --green: #22C55E; --green-dim: rgba(34,197,94,0.10);
          --orange: #f97316;
          --border: rgba(255,255,255,0.07); --border2: rgba(255,255,255,0.04);
          background: var(--bg); color: var(--fg);
          font-family: 'Inter', sans-serif; overflow-x: hidden;
        }

        /* ── GRAIN ── */
        @keyframes cp-grain {
          0%,100%{transform:translate(0,0)} 10%{transform:translate(-2%,-3%)}
          20%{transform:translate(3%,2%)} 30%{transform:translate(-1%,4%)}
          40%{transform:translate(2%,-1%)} 50%{transform:translate(-3%,3%)}
          60%{transform:translate(4%,-2%)} 70%{transform:translate(-2%,1%)}
          80%{transform:translate(3%,-4%)} 90%{transform:translate(-1%,2%)}
        }
        .cp-grain {
          position:fixed;inset:-50%;width:200%;height:200%;
          pointer-events:none;z-index:0;opacity:0.025;
          background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          background-size:256px 256px;animation:cp-grain 0.4s steps(1) infinite;
        }

        /* ── ANIMATIONS ── */
        @keyframes cp-blink {
          0%,100%{box-shadow:0 0 0 3px rgba(46,204,113,0.18)}
          50%{box-shadow:0 0 0 8px rgba(46,204,113,0.04)}
        }
        @keyframes cp-blink-dot { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes cp-sonar {
          0%{transform:scale(1);opacity:0.7} 100%{transform:scale(3.2);opacity:0}
        }
        @keyframes cp-sonar2 {
          0%{transform:scale(1);opacity:0.5} 100%{transform:scale(2.5);opacity:0}
        }
        @keyframes cp-marquee { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes cp-fade-up {
          from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)}
        }
        @keyframes cp-orb-pulse {
          0%,100%{transform:translateY(-50%) scale(1);opacity:0.5}
          50%{transform:translateY(-50%) scale(1.1);opacity:0.7}
        }

        .cp-live-dot-wrap {
          position:relative;display:inline-flex;align-items:center;justify-content:center;
          width:8px;height:8px;
        }
        .cp-sonar-ring {
          position:absolute;inset:0;border-radius:50%;background:rgba(29,78,216,0.6);
          animation:cp-sonar 2s ease-out infinite;
        }
        .cp-sonar-ring2 {
          position:absolute;inset:0;border-radius:50%;background:rgba(29,78,216,0.4);
          animation:cp-sonar2 2s ease-out 0.6s infinite;
        }
        .cp-live-dot { width:6px;height:6px;border-radius:50%;background:var(--green);animation:cp-blink 2s ease-in-out infinite; }

        /* ── NAV ── */
        .cp-nav {
          position:sticky;top:0;z-index:100;
          background:rgba(8,8,8,0.92);backdrop-filter:blur(20px);
          border-bottom:1px solid var(--border);
        }
        .cp-nav-inner {
          max-width:1200px;margin:0 auto;padding:0 40px;
          height:64px;display:flex;align-items:center;gap:32px;
        }
        .cp-logo { display:flex;align-items:center;gap:10px;text-decoration:none;flex-shrink:0; }
        .cp-logo-mark {
          width:36px;height:36px;
          background:linear-gradient(145deg,#0F1F5C 0%,#1D4ED8 50%,#3B82F6 100%);
          border-radius:9px;display:grid;place-items:center;
          box-shadow:0 0 0 1px rgba(96,165,250,0.3),0 0 20px rgba(37,99,235,0.55);
        }
        .cp-logo-name { font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:17px; }
        .cp-logo-name .club { color:var(--fg); }
        .cp-logo-name .pulse { color:var(--sky); }
        .cp-nav-links { display:flex;gap:4px;flex:1;justify-content:center; }
        .cp-nav-links a {
          padding:6px 13px;font-size:13px;color:var(--fg2);text-decoration:none;
          border-radius:7px;transition:color 0.12s,background 0.12s;
        }
        .cp-nav-links a:hover { color:var(--fg);background:rgba(255,255,255,0.04); }
        .cp-nav-ctas { display:flex;gap:8px;flex-shrink:0; }
        .cp-btn-ghost {
          padding:8px 16px;font-size:13px;font-weight:500;color:var(--fg2);
          text-decoration:none;border-radius:8px;border:1px solid var(--border);transition:all 0.12s;
        }
        .cp-btn-ghost:hover { color:var(--fg);border-color:rgba(255,255,255,0.2); }
        .cp-btn-red {
          padding:8px 18px;font-size:13px;font-weight:600;background:var(--red);color:#fff;
          text-decoration:none;border-radius:8px;transition:opacity 0.12s;
          box-shadow:0 0 20px rgba(37,99,235,0.35);
        }
        .cp-btn-red:hover { opacity:0.88; }
        .cp-hamburger {
          display:none;flex-direction:column;justify-content:center;gap:5px;
          width:40px;height:40px;background:none;border:none;cursor:pointer;
          padding:8px;border-radius:8px;flex-shrink:0;transition:background 0.12s;
        }
        .cp-hamburger:hover { background:rgba(255,255,255,0.06); }
        .cp-hamburger span {
          display:block;width:22px;height:2px;background:var(--fg2);border-radius:2px;
          transition:transform 0.2s,opacity 0.2s;
        }
        .cp-hamburger.open span:nth-child(1) { transform:translateY(7px) rotate(45deg); }
        .cp-hamburger.open span:nth-child(2) { opacity:0; }
        .cp-hamburger.open span:nth-child(3) { transform:translateY(-7px) rotate(-45deg); }
        .cp-mobile-nav {
          display:none;position:fixed;inset:64px 0 0 0;
          background:rgba(8,8,8,0.97);backdrop-filter:blur(20px);
          z-index:99;flex-direction:column;padding:24px;
          border-top:1px solid var(--border);gap:4px;
        }
        .cp-mobile-nav.open { display:flex; }
        .cp-mobile-nav a {
          display:block;padding:14px 16px;font-size:15px;color:var(--fg2);
          text-decoration:none;border-radius:10px;transition:color 0.12s,background 0.12s;
        }
        .cp-mobile-nav a:hover { color:var(--fg);background:rgba(255,255,255,0.05); }
        .cp-mobile-nav-divider { height:1px;background:var(--border);margin:12px 0; }
        .cp-mobile-nav-ctas { display:flex;flex-direction:column;gap:10px;margin-top:8px; }
        .cp-mobile-nav-ctas a { text-align:center; }

        /* ── HERO ── */
        .cp-hero {
          max-width:1200px;margin:0 auto;padding:72px 40px 0;
          position:relative;overflow:hidden;
        }
        .cp-hero-orb {
          position:absolute;right:-60px;top:40%;transform:translateY(-50%);
          width:500px;height:500px;border-radius:50%;
          background:radial-gradient(circle,rgba(29,78,216,0.28) 0%,rgba(29,78,216,0.06) 50%,transparent 70%);
          pointer-events:none;z-index:0;filter:blur(4px);
          animation:cp-orb-pulse 5s ease-in-out infinite;
        }
        .cp-hero-grid {
          display:grid;grid-template-columns:1fr 400px;gap:56px;align-items:start;position:relative;z-index:1;
        }
        .cp-live-badge {
          display:inline-flex;align-items:center;gap:8px;padding:5px 14px;
          background:rgba(46,204,113,0.08);border:1px solid rgba(46,204,113,0.2);
          border-radius:100px;font-size:11px;font-weight:700;letter-spacing:0.09em;
          text-transform:uppercase;color:var(--green);margin-bottom:24px;
        }
        .cp-hero-h1 {
          font-family:'Bricolage Grotesque',sans-serif;
          font-size:clamp(48px,6.5vw,82px);font-weight:800;
          line-height:0.94;letter-spacing:-0.04em;color:var(--fg);margin-bottom:24px;
        }
        .cp-hero-h1 .red { color:var(--red); }
        .cp-hero-sub {
          font-size:17px;color:var(--fg2);line-height:1.7;
          max-width:520px;margin-bottom:32px;
        }

        /* ── AUDIENCE SECTION ── */
        .cp-audience {
          padding:96px 0 80px;border-top:1px solid var(--border);
        }
        .cp-audience-inner {
          max-width:1200px;margin:0 auto;padding:0 40px;
        }
        .cp-audience-grid {
          display:grid;grid-template-columns:repeat(2,1fr);gap:20px;margin-top:56px;
        }
        @media(max-width:720px){
          .cp-audience-grid{grid-template-columns:1fr;}
        }
        .cp-aud-card {
          background:var(--bg2);border:1px solid var(--border);border-radius:16px;
          padding:32px;position:relative;overflow:hidden;transition:border-color 0.2s;
        }
        .cp-aud-card:hover { border-color:rgba(255,255,255,0.14); }
        .cp-aud-card::before {
          content:'';position:absolute;inset:0;border-radius:16px;
          background:radial-gradient(ellipse at top left,var(--aud-glow,rgba(37,99,235,0.08)) 0%,transparent 60%);
          pointer-events:none;
        }
        .cp-aud-card.player  { --aud-glow:rgba(96,165,250,0.10); }
        .cp-aud-card.club    { --aud-glow:rgba(239,200,74,0.09); }
        .cp-aud-card.fed     { --aud-glow:rgba(34,197,94,0.08); }
        .cp-aud-card.county  { --aud-glow:rgba(167,139,250,0.09); }

        .cp-aud-icon {
          width:44px;height:44px;border-radius:12px;display:grid;place-items:center;
          font-size:22px;margin-bottom:20px;border:1px solid var(--border);
          background:rgba(255,255,255,0.03);
        }
        .cp-aud-label {
          font-size:11px;font-weight:700;letter-spacing:0.11em;text-transform:uppercase;
          margin-bottom:8px;
        }
        .cp-aud-label.player  { color:var(--sky); }
        .cp-aud-label.club    { color:var(--gold); }
        .cp-aud-label.fed     { color:var(--green); }
        .cp-aud-label.county  { color:#a78bfa; }

        .cp-aud-h {
          font-family:'Bricolage Grotesque',sans-serif;font-size:21px;font-weight:800;
          color:var(--fg);margin-bottom:12px;line-height:1.15;
        }
        .cp-aud-body {
          font-size:14px;color:var(--fg2);line-height:1.75;margin-bottom:20px;
        }
        .cp-aud-checks { display:flex;flex-direction:column;gap:8px; }
        .cp-aud-check {
          display:flex;align-items:flex-start;gap:9px;font-size:13px;color:var(--fg2);
        }
        .cp-aud-check-icon {
          flex-shrink:0;width:16px;height:16px;border-radius:50%;
          display:grid;place-items:center;font-size:9px;font-weight:700;margin-top:1px;
        }
        .cp-aud-check-icon.player  { background:rgba(96,165,250,0.15);color:var(--sky); }
        .cp-aud-check-icon.club    { background:rgba(239,200,74,0.15);color:var(--gold); }
        .cp-aud-check-icon.fed     { background:rgba(34,197,94,0.15);color:var(--green); }
        .cp-aud-check-icon.county  { background:rgba(167,139,250,0.15);color:#a78bfa; }

        .cp-aud-cta {
          display:inline-flex;align-items:center;gap:6px;
          margin-top:24px;font-size:13px;font-weight:600;text-decoration:none;
          transition:opacity 0.12s;
        }
        .cp-aud-cta:hover { opacity:0.75; }
        .cp-aud-cta.player  { color:var(--sky); }
        .cp-aud-cta.club    { color:var(--gold); }
        .cp-aud-cta.fed     { color:var(--green); }
        .cp-aud-cta.county  { color:#a78bfa; }

        /* 5 product pillars */
        .cp-pillars {
          display:flex;gap:8px;flex-wrap:wrap;margin-bottom:36px;
        }
        .cp-pillar {
          display:inline-flex;align-items:center;gap:7px;
          padding:7px 14px;border-radius:100px;
          border:1px solid var(--border);
          font-size:13px;font-weight:600;color:var(--fg2);
          background:rgba(255,255,255,0.02);
          transition:all 0.15s;text-decoration:none;
        }
        .cp-pillar:hover { color:var(--fg);border-color:rgba(255,255,255,0.18);background:rgba(255,255,255,0.04); }
        .cp-pillar-dot {
          width:6px;height:6px;border-radius:50%;flex-shrink:0;
        }
        .cp-pillar-dot.live { background:var(--green); }
        .cp-pillar-dot.road { background:var(--orange); }

        .cp-hero-btns { display:flex;gap:10px;flex-wrap:wrap;margin-bottom:48px; }
        .cp-btn-hero {
          padding:14px 30px;font-size:15px;font-weight:700;
          background:var(--red);color:#fff;text-decoration:none;border-radius:11px;
          box-shadow:0 0 40px rgba(37,99,235,0.40);transition:all 0.15s;
        }
        .cp-btn-hero:hover { box-shadow:0 0 60px rgba(37,99,235,0.55);transform:translateY(-1px); }
        .cp-btn-hero-ghost {
          padding:14px 24px;font-size:15px;font-weight:500;
          border:1px solid var(--border);color:var(--fg2);
          text-decoration:none;border-radius:11px;transition:all 0.12s;
        }
        .cp-btn-hero-ghost:hover { color:var(--fg);border-color:rgba(255,255,255,0.2); }

        .cp-hero-stats { display:flex;gap:0;border-top:1px solid var(--border);padding-top:0; }
        .cp-hero-stat {
          padding:20px 32px 20px 0;margin-right:32px;border-right:1px solid var(--border);
        }
        .cp-hero-stat:last-child { border-right:none;padding-right:0;margin-right:0; }
        .cp-stat-n {
          font-family:'Bricolage Grotesque',sans-serif;font-size:26px;font-weight:800;
          color:var(--gold);letter-spacing:-0.02em;line-height:1;
        }
        .cp-stat-l { font-size:11px;color:var(--fg3);margin-top:3px; }

        /* ── PHONE MOCKUP ── */
        .cp-phone {
          background:#04091A;border:1.5px solid rgba(255,255,255,0.1);
          border-radius:36px;padding:14px;
          box-shadow:0 40px 80px rgba(0,0,0,0.7),0 0 0 1px rgba(255,255,255,0.03),0 0 60px rgba(37,99,235,0.10);
          position:relative;width:100%;
        }
        .cp-phone::before {
          content:'';position:absolute;top:11px;left:50%;transform:translateX(-50%);
          width:56px;height:5px;background:rgba(255,255,255,0.07);border-radius:10px;
        }
        .cp-phone-screen { background:#0c0c0c;border-radius:24px;overflow:hidden;margin-top:6px; }
        .cp-tab-bar { display:flex;gap:0;border-bottom:1px solid rgba(255,255,255,0.06); }
        .cp-ph-tab {
          flex:1;padding:10px 4px;font-size:9px;font-weight:600;
          color:rgba(255,255,255,0.25);text-align:center;cursor:pointer;
          transition:all 0.15s;letter-spacing:0.04em;text-transform:uppercase;
          border:none;background:transparent;font-family:'Inter',sans-serif;
          border-bottom:2px solid transparent;
        }
        .cp-ph-tab.active { color:var(--red);border-bottom-color:var(--red); }
        .cp-phone-content { padding:16px;min-height:360px; }

        /* Phone screens */
        .cp-sc-greeting { font-family:'Bricolage Grotesque',sans-serif;font-size:17px;font-weight:800;color:#fff;margin-bottom:2px; }
        .cp-sc-sub { font-size:10px;color:rgba(255,255,255,0.3);margin-bottom:12px; }
        .cp-score-card {
          background:linear-gradient(135deg,rgba(239,200,74,0.12),rgba(239,200,74,0.04));
          border:1px solid rgba(239,200,74,0.2);border-radius:14px;
          padding:14px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:flex-end;
        }
        .cp-score-n { font-family:'Bricolage Grotesque',sans-serif;font-size:36px;font-weight:800;color:var(--gold);line-height:1;letter-spacing:-0.02em; }
        .cp-score-unit { font-size:10px;color:rgba(239,200,74,0.5); }
        .cp-score-label { font-size:10px;color:rgba(255,255,255,0.3);margin-top:2px; }
        .cp-score-val { font-size:12px;font-weight:600;color:var(--gold); }
        .cp-tiles { display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px; }
        .cp-tile { background:#111;border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:10px;text-align:center; }
        .cp-tile-icon { font-size:18px;margin-bottom:4px; }
        .cp-tile-label { font-size:8.5px;color:rgba(255,255,255,0.35);font-weight:500; }
        .cp-avail-bar {
          background:rgba(46,204,113,0.08);border:1px solid rgba(46,204,113,0.15);
          border-radius:10px;padding:10px 12px;display:flex;align-items:center;justify-content:space-between;
        }
        .cp-avail-label { font-size:9px;font-weight:600;color:var(--green); }
        .cp-avail-toggle { width:28px;height:16px;background:var(--green);border-radius:8px;position:relative; }
        .cp-avail-toggle::after { content:'';position:absolute;right:3px;top:3px;width:10px;height:10px;background:#fff;border-radius:50%; }
        .cp-live-chip {
          display:inline-flex;align-items:center;gap:4px;padding:2px 7px;
          background:rgba(46,204,113,0.1);border:1px solid rgba(46,204,113,0.2);
          border-radius:5px;font-size:8px;font-weight:700;color:var(--green);margin-bottom:8px;
        }
        .cp-live-chip-dot { width:4px;height:4px;border-radius:50%;background:var(--green);animation:cp-blink-dot 1.5s infinite; }
        .cp-sc-match-title { font-family:'Bricolage Grotesque',sans-serif;font-size:13px;font-weight:800;color:#fff;margin-bottom:2px; }
        .cp-sc-match-meta { font-size:9px;color:rgba(255,255,255,0.3);margin-bottom:12px; }
        .cp-sc-innings { background:#111;border:1px solid rgba(255,255,255,0.06);border-radius:10px;overflow:hidden;margin-bottom:8px; }
        .cp-sc-head {
          display:flex;justify-content:space-between;padding:8px 10px;
          background:rgba(37,99,235,0.14);border-bottom:1px solid rgba(255,255,255,0.04);
        }
        .cp-sc-head-name { font-weight:700;color:#fff;font-size:10px; }
        .cp-sc-head-score { font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:13px;color:var(--gold); }
        .cp-sc-bat-row {
          display:flex;justify-content:space-between;align-items:center;
          padding:6px 10px;border-bottom:1px solid rgba(255,255,255,0.03);font-size:10px;
        }
        .cp-sc-bat-row:last-child { border-bottom:none; }
        .cp-sc-bat-name { color:rgba(255,255,255,0.6); }
        .cp-sc-bat-name.bold { color:#fff;font-weight:600; }
        .cp-sc-bat-runs { font-weight:700;color:#fff; }
        .cp-pts-hero {
          background:linear-gradient(135deg,rgba(239,200,74,0.14),rgba(29,78,216,0.06));
          border:1px solid rgba(239,200,74,0.18);border-radius:14px;padding:16px;text-align:center;margin-bottom:10px;
        }
        .cp-pts-big { font-family:'Bricolage Grotesque',sans-serif;font-size:48px;font-weight:800;color:var(--gold);line-height:1;letter-spacing:-0.03em; }
        .cp-pts-eq { font-size:11px;color:rgba(240,236,228,0.4);margin-top:4px; }
        .cp-earn-list { background:#111;border:1px solid rgba(255,255,255,0.06);border-radius:10px;overflow:hidden; }
        .cp-earn-row {
          display:flex;justify-content:space-between;align-items:center;
          padding:8px 10px;border-bottom:1px solid rgba(255,255,255,0.03);font-size:9.5px;
        }
        .cp-earn-row:last-child { border-bottom:none; }
        .cp-earn-label { color:rgba(255,255,255,0.5); }
        .cp-earn-pts { font-weight:700;color:var(--gold); }
        .cp-coach-cam { background:#04091A;border:1px solid rgba(255,255,255,0.07);border-radius:14px;padding:14px;margin-bottom:12px; }
        .cp-coach-cam-label {
          display:flex;align-items:center;gap:5px;font-size:9px;font-weight:700;
          color:var(--green);letter-spacing:0.07em;text-transform:uppercase;margin-bottom:8px;
        }
        .cp-coach-cam-dot { width:5px;height:5px;border-radius:50%;background:var(--green);animation:cp-blink-dot 2s infinite; }
        .cp-coach-pose { aspect-ratio:4/3;background:#050505;border-radius:10px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden; }
        .cp-coach-feedback { background:#111;border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:10px;margin-top:10px; }
        .cp-coach-fb-title { font-weight:700;color:#fff;font-size:10px;margin-bottom:6px; }
        .cp-coach-fb-row {
          display:flex;align-items:center;gap:6px;padding:4px 0;
          border-bottom:1px solid rgba(255,255,255,0.04);font-size:9px;
        }
        .cp-coach-fb-row:last-child { border-bottom:none; }
        .cp-fb-dot { width:6px;height:6px;border-radius:50%;flex-shrink:0; }
        .cp-fb-dot.ok { background:var(--green); }
        .cp-fb-dot.warn { background:var(--orange); }
        .cp-fb-dot.bad { background:var(--red); }
        .cp-fb-text { color:rgba(255,255,255,0.5); }
        .cp-fb-text span { color:#fff; }

        /* ── SOCIAL PROOF ── */
        .cp-social-proof { border-top:1px solid var(--border);background:var(--bg2);padding:20px 40px; }
        .cp-social-proof-inner { max-width:1200px;margin:0 auto;display:flex;align-items:center;gap:28px;flex-wrap:wrap; }
        .cp-social-proof-label { font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--fg3);white-space:nowrap; }
        .cp-social-proof-clubs { display:flex;align-items:center;gap:20px;flex-wrap:wrap; }
        .cp-social-proof-club { display:flex;align-items:center;gap:7px;font-size:13px;font-weight:600;color:var(--fg2); }
        .cp-social-proof-club-dot { width:6px;height:6px;border-radius:50%;background:var(--green);flex-shrink:0; }

        /* ── MARQUEE ── */
        .cp-marquee-wrap { overflow:hidden;border-top:1px solid var(--border);border-bottom:1px solid var(--border);background:var(--bg2);padding:10px 0; }
        .cp-marquee-track { display:flex;gap:0;white-space:nowrap;animation:cp-marquee 32s linear infinite; }
        .cp-marquee-item {
          display:inline-flex;align-items:center;gap:8px;font-size:11px;font-weight:600;
          letter-spacing:0.06em;text-transform:uppercase;color:var(--fg3);padding:0 28px;
        }
        .cp-marquee-item .dot { color:var(--red);font-size:14px; }
        .cp-marquee-item strong { color:var(--fg2); }

        /* ── HOW IT WORKS ── */
        .cp-how { max-width:1200px;margin:0 auto;padding:96px 40px; }
        .cp-eyebrow {
          font-size:11px;font-weight:700;letter-spacing:0.1em;
          text-transform:uppercase;color:var(--red);margin-bottom:12px;
        }
        .cp-feat-wide-grid { display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:center; }
        .cp-section-h2 {
          line-height:1.12;
          font-family:'Bricolage Grotesque',sans-serif;
          font-size:clamp(30px,4vw,46px);font-weight:800;
          letter-spacing:-0.03em;color:var(--fg);margin-bottom:8px;
        }
        .cp-section-sub { font-size:16px;color:var(--fg2);line-height:1.7;max-width:540px;margin-bottom:56px; }

        .cp-steps { display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--border);border:1px solid var(--border);border-radius:20px;overflow:hidden; }
        .cp-step { background:var(--bg2);padding:40px 36px;position:relative; }
        .cp-step-num {
          font-family:'Bricolage Grotesque',sans-serif;font-size:11px;font-weight:800;
          letter-spacing:0.1em;color:rgba(29,78,216,0.7);margin-bottom:20px;
        }
        .cp-step-icon { font-size:32px;margin-bottom:16px; }
        .cp-step-h { font-family:'Bricolage Grotesque',sans-serif;font-size:20px;font-weight:800;color:var(--fg);margin-bottom:10px; }
        .cp-step-body { font-size:14px;color:var(--fg2);line-height:1.7; }
        .cp-step-arrow {
          position:absolute;top:50%;right:-1px;transform:translateY(-50%);
          width:28px;height:28px;background:var(--bg);border:1px solid var(--border);
          border-radius:50%;display:grid;place-items:center;
          font-size:12px;color:var(--red);z-index:2;
        }

        /* ── FEATURES GRID ── */
        .cp-features { background:var(--bg2);border-top:1px solid var(--border);border-bottom:1px solid var(--border); }
        .cp-features-inner { max-width:1200px;margin:0 auto;padding:96px 40px; }
        .cp-feat-grid { display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--border);border:1px solid var(--border);border-radius:20px;overflow:hidden;margin-top:48px; }
        .cp-feat-card {
          background:var(--bg2);padding:36px;text-decoration:none;
          transition:background 0.15s;position:relative;overflow:hidden;display:flex;flex-direction:column;
        }
        .cp-feat-card > .cp-feat-card-bullets { margin-bottom:18px; }
        .cp-feat-card > .cp-feat-card-link { margin-top:auto;align-self:flex-start; }
        .cp-feat-card-tag { align-self:flex-start; }
        .cp-feat-card:hover { background:#07102B; }
        .cp-feat-card-icon { font-size:28px;margin-bottom:16px; }
        .cp-feat-card-tag {
          display:inline-flex;align-items:center;gap:5px;
          padding:3px 9px;border-radius:5px;font-size:10px;font-weight:700;
          letter-spacing:0.06em;text-transform:uppercase;margin-bottom:14px;
        }
        .cp-tag-live { background:rgba(46,204,113,0.1);color:var(--green);border:1px solid rgba(46,204,113,0.2); }
        .cp-tag-road { background:rgba(249,115,22,0.08);color:var(--orange);border:1px solid rgba(249,115,22,0.18); }
        .cp-feat-card-h { font-family:'Bricolage Grotesque',sans-serif;font-size:20px;font-weight:800;color:var(--fg);margin-bottom:10px;line-height:1.2; }
        .cp-feat-card-body { font-size:13.5px;color:var(--fg2);line-height:1.65;margin-bottom:18px; }
        .cp-feat-card-link { font-size:13px;font-weight:600;color:var(--red);text-decoration:none;display:inline-flex;align-items:center;gap:6px; }
        .cp-feat-card-bullets { display:flex;flex-direction:column;gap:7px;margin-bottom:18px; }
        .cp-feat-card-bullet { position:relative;padding-left:22px;font-size:13px;line-height:1.55;color:var(--fg2); }
        .cp-feat-card-bullet::before { content:'→';color:var(--red);position:absolute;left:0;top:0; }
        .cp-feat-card-bullet strong { color:var(--fg); }
        /* Wide card spans 2 cols */
        .cp-feat-card-wide { grid-column:span 2; }

        /* ── PERSONA SECTION ── */
        .cp-personas { max-width:1200px;margin:0 auto;padding:96px 40px; }
        .cp-persona-tabs { display:flex;gap:6px;margin-bottom:40px; }
        .cp-persona-tab {
          padding:9px 20px;border-radius:9px;font-size:14px;font-weight:600;
          cursor:pointer;border:1px solid var(--border);color:var(--fg3);
          background:transparent;transition:all 0.15s;font-family:'Inter',sans-serif;
        }
        .cp-persona-tab.active { background:var(--blue-dim);color:var(--fg);border-color:rgba(37,99,235,0.40); }
        .cp-persona-tab:hover:not(.active) { color:var(--fg);border-color:rgba(255,255,255,0.18); }
        .cp-persona-panel { display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:center; }
        .cp-persona-eyebrow {
          font-size:11px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;
          color:var(--red);margin-bottom:12px;
        }
        .cp-persona-h { font-family:'Bricolage Grotesque',sans-serif;font-size:clamp(28px,3.5vw,40px);font-weight:800;letter-spacing:-0.025em;color:var(--fg);margin-bottom:14px;line-height:1.1; }
        .cp-persona-body { font-size:15px;color:var(--fg2);line-height:1.75;margin-bottom:24px; }
        .cp-persona-checks { display:flex;flex-direction:column;gap:10px; }
        .cp-persona-check { display:flex;align-items:flex-start;gap:10px;font-size:14px;color:var(--fg2); }
        .cp-persona-check-icon { color:var(--green);font-size:13px;flex-shrink:0;margin-top:2px; }
        .cp-persona-check strong { color:var(--fg); }
        .cp-persona-card {
          background:var(--bg2);border:1px solid var(--border);border-radius:20px;padding:32px;
        }

        /* ── PRICING ── */
        .cp-pricing { background:var(--bg2);border-top:1px solid var(--border);border-bottom:1px solid var(--border); }
        .cp-pricing-inner { max-width:1200px;margin:0 auto;padding:96px 40px; }

        /* Audience toggle */
        .cp-pricing-toggle {
          display:inline-flex;gap:2px;padding:4px;
          background:rgba(255,255,255,0.04);border:1px solid var(--border);
          border-radius:12px;margin-bottom:48px;
        }
        .cp-pricing-toggle-btn {
          padding:9px 24px;border-radius:9px;font-size:14px;font-weight:600;
          cursor:pointer;border:none;font-family:'Inter',sans-serif;
          color:var(--fg3);background:transparent;transition:all 0.15s;
        }
        .cp-pricing-toggle-btn.active {
          background:var(--bg);color:var(--fg);
          box-shadow:0 1px 4px rgba(0,0,0,0.4);
        }
        .cp-pricing-toggle-btn:not(.active):hover { color:var(--fg2); }

        /* Audience label above toggle */
        .cp-pricing-header { display:flex;flex-direction:column;align-items:flex-start;gap:0; }
        .cp-pricing-toggle-label {
          font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;
          color:var(--fg3);margin-bottom:14px;
        }

        .cp-pricing-grid { display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--border);border:1px solid var(--border);border-radius:20px;overflow:hidden; }
        .cp-price-card { background:var(--bg2);padding:36px;position:relative;display:flex;flex-direction:column; }
        .cp-price-card .cp-price-features { flex:1; }
        .cp-price-card.featured {
          background:#07102B;
          outline:1px solid rgba(37,99,235,0.55);
          outline-offset:-1px;
        }
        .cp-price-featured-chip {
          display:inline-block;padding:3px 10px;border-radius:5px;
          background:var(--red);color:#fff;font-size:10px;font-weight:700;
          letter-spacing:0.06em;text-transform:uppercase;margin-bottom:20px;
        }
        .cp-price-plan { font-family:'Bricolage Grotesque',sans-serif;font-size:13px;font-weight:800;letter-spacing:0.07em;text-transform:uppercase;color:var(--fg3);margin-bottom:10px; }
        .cp-price-n { font-family:'Bricolage Grotesque',sans-serif;font-size:40px;font-weight:800;color:var(--fg);letter-spacing:-0.03em;line-height:1; }
        .cp-price-n span { font-size:18px;font-weight:600;color:var(--fg2);vertical-align:top;margin-top:6px;display:inline-block; }
        .cp-price-period { font-size:12px;color:var(--fg3);margin-top:4px;margin-bottom:20px; }
        .cp-price-desc { font-size:14px;color:var(--fg2);line-height:1.6;margin-bottom:24px;padding-bottom:24px;border-bottom:1px solid var(--border); }
        .cp-price-features { display:flex;flex-direction:column;gap:9px;margin-bottom:28px; }
        .cp-price-feature { position:relative;padding-left:22px;font-size:13px;line-height:1.5;color:var(--fg2); }
        .cp-price-feature-icon { color:var(--green);position:absolute;left:0;top:0; }
        .cp-price-feature-x { color:rgba(240,236,228,0.2);position:absolute;left:0;top:0; }
        .cp-price-feature strong { color:var(--fg); }
        .cp-price-feature.dimmed { opacity:0.38; }
        .cp-price-cta {
          display:block;width:100%;padding:12px;text-align:center;
          border-radius:9px;font-size:14px;font-weight:700;text-decoration:none;
          transition:all 0.15s;
        }
        .cp-price-cta.primary { background:var(--blue);color:#fff;box-shadow:0 0 24px rgba(37,99,235,0.40); }
        .cp-price-cta.primary:hover { opacity:0.88; }
        .cp-price-cta.ghost { border:1px solid var(--border);color:var(--fg2); }
        .cp-price-cta.ghost:hover { color:var(--fg);border-color:rgba(255,255,255,0.2); }
        .cp-price-divider { height:1px;background:var(--border);margin:20px 0; }
        .cp-price-note { font-size:11px;color:var(--fg3);margin-top:16px;text-align:center;line-height:1.6; }

        /* ── QUOTE ── */
        .cp-quote { max-width:1200px;margin:0 auto;padding:80px 40px; }
        .cp-quote-inner {
          background:var(--bg4);border:1px solid var(--border);
          border-radius:20px;padding:56px;position:relative;overflow:hidden;
        }
        .cp-quote-mark {
          position:absolute;top:-20px;left:36px;
          font-family:'Bricolage Grotesque',sans-serif;font-size:180px;font-weight:800;
          color:rgba(37,99,235,0.10);line-height:1;pointer-events:none;user-select:none;
        }
        .cp-quote-text {
          font-family:'Bricolage Grotesque',sans-serif;
          font-size:clamp(18px,2.5vw,26px);font-weight:700;
          color:var(--fg);line-height:1.45;max-width:760px;position:relative;letter-spacing:-0.01em;
        }
        .cp-quote-attr { margin-top:24px;font-size:13px;color:var(--fg3);position:relative; }

        /* ── CTA BAND ── */
        .cp-cta-band { background:var(--red);border-top:1px solid rgba(255,255,255,0.08); }
        .cp-cta-band-inner {
          max-width:1200px;margin:0 auto;padding:64px 40px;
          display:flex;align-items:center;justify-content:space-between;gap:32px;flex-wrap:wrap;
        }
        .cp-cta-h { font-family:'Bricolage Grotesque',sans-serif;font-size:clamp(24px,3.5vw,40px);font-weight:800;letter-spacing:-0.025em;color:#fff;line-height:1.1; }
        .cp-cta-sub { font-size:15px;color:rgba(255,255,255,0.65);margin-top:6px; }
        .cp-cta-btn {
          padding:15px 32px;font-size:15px;font-weight:700;background:#fff;color:var(--red);
          text-decoration:none;border-radius:11px;white-space:nowrap;flex-shrink:0;transition:opacity 0.12s;
        }
        .cp-cta-btn:hover { opacity:0.9; }

        /* ── FOOTER ── */
        .cp-footer { border-top:1px solid var(--border); }
        .cp-footer-inner {
          max-width:1200px;margin:0 auto;padding:40px;
          display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;
        }
        .cp-footer-logo { display:flex;align-items:center;gap:8px;text-decoration:none; }
        .cp-footer-logo-mark {
          width:28px;height:28px;
          background:linear-gradient(145deg,#0F1F5C 0%,#1D4ED8 50%,#3B82F6 100%);
          border-radius:7px;display:grid;place-items:center;
          box-shadow:0 0 0 1px rgba(96,165,250,0.2);
        }
        .cp-footer-logo-name { font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:14px; }
        .cp-footer-logo-name .club { color:var(--fg); }
        .cp-footer-logo-name .pulse { color:var(--sky); }
        .cp-footer-links { display:flex;gap:20px;flex-wrap:wrap; }
        .cp-footer-links a { font-size:13px;color:var(--fg3);text-decoration:none;transition:color 0.12s; }
        .cp-footer-links a:hover { color:var(--fg); }
        .cp-footer-copy { font-size:12px;color:var(--fg3); }

        /* ── RESPONSIVE ── */
        @media (max-width:900px) {
          .cp-nav-links { display:none; }
          .cp-nav-ctas { display:none; }
          .cp-hamburger { display:flex; }
          .cp-hero-grid { grid-template-columns:1fr; }
          .cp-phone { max-width:340px;margin:0 auto; }
          .cp-steps { grid-template-columns:1fr; }
          .cp-step-arrow { display:none; }
          .cp-feat-grid { grid-template-columns:1fr; }
          .cp-feat-card-wide { grid-column:span 1; }
          .cp-persona-panel { grid-template-columns:1fr; }
          .cp-pricing-grid { grid-template-columns:repeat(2,1fr) !important; }
          .cp-feat-wide-grid { grid-template-columns:1fr;gap:28px; }
          .cp-cta-band-inner { flex-direction:column;text-align:center; }
          .cp-pricing-toggle { width:100%; }
          .cp-pricing-toggle-btn { flex:1; }
        }
        @media (max-width:600px) {
          .cp-pricing-grid { grid-template-columns:1fr !important; }
          .cp-feat-card { padding:28px 22px; }
          .cp-hero-stats { display:grid;grid-template-columns:1fr 1fr;border-top:none; }
          .cp-hero-stat { border-right:none !important;margin-right:0 !important;padding:14px 0 !important;border-top:1px solid var(--border); }
          .cp-nav-inner { padding:0 16px; }
          .cp-hero,.cp-how,.cp-features-inner,.cp-personas,.cp-pricing-inner,
          .cp-quote,.cp-cta-band-inner,.cp-footer-inner {
            padding-left:max(16px, env(safe-area-inset-left, 0px));
            padding-right:max(16px, env(safe-area-inset-right, 0px));
          }
          .cp-social-proof { padding-left:max(16px, env(safe-area-inset-left, 0px)); padding-right:max(16px, env(safe-area-inset-right, 0px)); }
          .cp-persona-tabs { flex-wrap:wrap; }
          .cp-footer-inner { flex-direction:column;align-items:flex-start; }
          .cp-footer-links { gap:12px; }
          .cp-pillars { gap:6px; }
        }
      `}</style>

      <div className="cp-root">
        <div className="cp-grain" aria-hidden="true" />

        <MarketingNav />

        {/* ── HERO ── */}
        <div style={{ position: 'relative', overflow: 'hidden' }}>
          <DotPattern />
          <Meteors />
        <section className="cp-hero" style={{ position: 'relative' }}>
          <div className="cp-hero-orb" aria-hidden="true" />
          <div className="cp-hero-grid">
            <div>
              <div className="cp-live-badge">
                <span className="cp-live-dot-wrap" aria-hidden="true">
                  <span className="cp-sonar-ring" /><span className="cp-sonar-ring2" /><span className="cp-live-dot" />
                </span>
                In development · contacting clubs
              </div>
              <h1 className="cp-hero-h1">
                Run Saturday.<br />
                Grow every <AnimatedGradientText>player</AnimatedGradientText>.
              </h1>
              <p className="cp-hero-sub">
                ClubPulse runs a cricket club&apos;s Saturday, from availability and the XI to ball-by-ball scoring, and gives every player four pillars to grow with: Player Analysis, Community, Wellness and Academy.
              </p>

              {/* The four pillars */}
              <div className="cp-pillars">
                {([['🎥', 'Player Analysis', '#FBBF24'], ['🤝', 'Community', '#60A5FA'], ['🧘', 'Wellness', '#F472B6'], ['🎓', 'Academy', '#2DD4BF']] as const).map(([icon, name, colour]) => (
                  <Link key={name} href="/#pillars" className="cp-pillar" style={{ borderColor: `${colour}66`, color: colour, background: `${colour}14` }}>
                    <Glyph e={icon} size="1.15em" /> {name}
                  </Link>
                ))}
              </div>

              <div className="cp-hero-btns">
                <ShimmerButton href="/contact">Register your club →</ShimmerButton>
                <Link href="/auth/sign-up" className="cp-btn-hero-ghost">Join as a player →</Link>
              </div>
              <div className="cp-hero-stats">
                <div className="cp-hero-stat" ref={stat50Ref}><div className="cp-stat-n">{stat50Count}</div><div className="cp-stat-l">Scores = £1</div></div>
                <div className="cp-hero-stat"><div className="cp-stat-n">From £0</div><div className="cp-stat-l">Player plans</div></div>
                <div className="cp-hero-stat"><div className="cp-stat-n">4</div><div className="cp-stat-l">Player pillars</div></div>
              </div>
            </div>

            {/* PHONE MOCKUP */}
            <div className="cp-phone" ref={phoneRef} style={{willChange:'transform',transition:'transform 0.05s linear'}}>
              <BorderBeam size={120} duration={7} />
              <div className="cp-phone-screen">
                <div className="cp-tab-bar">
                  {(['dash','card','coach','pts'] as PhoneTab[]).map((t, i) => (
                    <button
                      key={t}
                      className={`cp-ph-tab${phoneTab === t ? ' active' : ''}`}
                      onClick={() => setPhoneTab(t)}
                    >
                      {['Home','Score','AI','Scores'][i]}
                    </button>
                  ))}
                </div>
                <div className="cp-phone-content">
                  {phoneTab === 'dash' && (
                    <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
                      <div>
                        <p className="cp-sc-greeting">Good morning 👋</p>
                        <p className="cp-sc-sub">Your Club · 2026 Season</p>
                      </div>
                      <div className="cp-score-card">
                        <div>
                          <div className="cp-score-n">1,250<span className="cp-score-unit"> pts</span></div>
                          <div className="cp-score-label">Your Scores balance</div>
                        </div>
                        <div style={{textAlign:'right'}}>
                          <div className="cp-score-val">≈ £2.50</div>
                          <div className="cp-score-label">Cash value</div>
                        </div>
                      </div>
                      <div className="cp-tiles">
                        <div className="cp-tile"><div className="cp-tile-icon"><Glyph e="📋" /></div><div className="cp-tile-label">Live scorecard</div></div>
                        <div className="cp-tile"><div className="cp-tile-icon"><Glyph e="🎯" /></div><div className="cp-tile-label">AI Coach</div></div>
                        <div className="cp-tile"><div className="cp-tile-icon"><Glyph e="📅" /></div><div className="cp-tile-label">Availability</div></div>
                        <div className="cp-tile"><div className="cp-tile-icon"><Glyph e="💷" /></div><div className="cp-tile-label">Finance</div></div>
                      </div>
                      <div className="cp-avail-bar">
                        <span className="cp-avail-label">✓ Available Saturday</span>
                        <div className="cp-avail-toggle" />
                      </div>
                    </div>
                  )}
                  {phoneTab === 'card' && (
                    <div>
                      <div className="cp-live-chip"><span className="cp-live-chip-dot" />LIVE</div>
                      <p className="cp-sc-match-title">Your Club vs Fairwick CC</p>
                      <p className="cp-sc-match-meta">Sun 20 Oct · Home ground · 2nd innings</p>
                      <div className="cp-sc-innings">
                        <div className="cp-sc-head"><span className="cp-sc-head-name">Your Club batting</span><span className="cp-sc-head-score">142–3</span></div>
                        <div className="cp-sc-bat-row"><span className="cp-sc-bat-name bold">A. Patel*</span><span className="cp-sc-bat-runs">67*</span></div>
                        <div className="cp-sc-bat-row"><span className="cp-sc-bat-name bold">R. Patel*</span><span className="cp-sc-bat-runs">24*</span></div>
                        <div className="cp-sc-bat-row"><span className="cp-sc-bat-name">A. Khan (out)</span><span className="cp-sc-bat-runs">34</span></div>
                        <div className="cp-sc-bat-row"><span className="cp-sc-bat-name">S. Bhatt (out)</span><span className="cp-sc-bat-runs">12</span></div>
                      </div>
                      <div className="cp-sc-innings">
                        <div className="cp-sc-head"><span className="cp-sc-head-name">Fairwick CC</span><span className="cp-sc-head-score">178 all out</span></div>
                      </div>
                    </div>
                  )}
                  {phoneTab === 'coach' && (
                    <div>
                      <div className="cp-coach-cam">
                        <div className="cp-coach-cam-label"><span className="cp-coach-cam-dot" />Pose tracking active</div>
                        <div className="cp-coach-pose">
                          <svg viewBox="0 0 120 180" fill="none" style={{width:'80px',height:'120px',opacity:0.9}}>
                            <ellipse cx="62" cy="16" rx="10" ry="11" fill="rgba(240,236,228,0.85)"/>
                            <path d="M52 14 Q52 4 62 4 Q72 4 72 14 Z" fill="#1D4ED8"/>
                            <rect x="70" y="10" width="8" height="4" rx="1" fill="#1D4ED8"/>
                            <rect x="59" y="27" width="6" height="6" rx="2" fill="rgba(240,236,228,0.7)"/>
                            <path d="M48 33 Q55 30 62 31 Q70 30 76 34 L74 70 Q68 72 62 72 Q55 72 50 70 Z" fill="rgba(240,236,228,0.15)" stroke="rgba(240,236,228,0.35)" strokeWidth="1.2"/>
                            <path d="M76 36 Q86 28 90 18 Q92 12 88 10" stroke="rgba(240,236,228,0.7)" strokeWidth="4" strokeLinecap="round" fill="none"/>
                            <circle cx="88" cy="10" r="4" fill="rgba(240,236,228,0.8)"/>
                            <path d="M50 38 Q36 44 28 52 Q24 56 26 60" stroke="rgba(240,236,228,0.7)" strokeWidth="4" strokeLinecap="round" fill="none"/>
                            <circle cx="26" cy="60" r="4" fill="rgba(240,236,228,0.8)"/>
                            <rect x="22" y="54" width="7" height="38" rx="3" transform="rotate(-35 22 54)" fill="#EFC84A" opacity="0.9"/>
                            <path d="M55 70 Q50 95 42 115 Q40 122 44 126" stroke="rgba(240,236,228,0.65)" strokeWidth="5" strokeLinecap="round" fill="none"/>
                            <path d="M68 70 Q72 92 74 112 Q76 120 72 124" stroke="rgba(240,236,228,0.65)" strokeWidth="5" strokeLinecap="round" fill="none"/>
                            <circle cx="88" cy="10" r="3.5" fill="#2ecc71" opacity="0.9"/>
                            <circle cx="26" cy="60" r="3.5" fill="#2ecc71" opacity="0.9"/>
                            <circle cx="76" cy="36" r="3" fill="#EFC84A" opacity="0.9"/>
                            <circle cx="50" cy="38" r="3" fill="#EFC84A" opacity="0.9"/>
                          </svg>
                        </div>
                      </div>
                      <div className="cp-coach-feedback">
                        <p className="cp-coach-fb-title">Coaching feedback</p>
                        <div className="cp-coach-fb-row"><span className="cp-fb-dot ok"/><span className="cp-fb-text">Head position — <span>level &amp; still ✓</span></span></div>
                        <div className="cp-coach-fb-row"><span className="cp-fb-dot warn"/><span className="cp-fb-text">Elbow height — <span>drop slightly</span></span></div>
                        <div className="cp-coach-fb-row"><span className="cp-fb-dot ok"/><span className="cp-fb-text">Front foot — <span>straight ✓</span></span></div>
                        <div className="cp-coach-fb-row"><span className="cp-fb-dot bad"/><span className="cp-fb-text">Follow-through — <span>cut short</span></span></div>
                      </div>
                    </div>
                  )}
                  {phoneTab === 'pts' && (
                    <div>
                      <div className="cp-pts-hero">
                        <div className="cp-pts-big">1,250</div>
                        <div className="cp-pts-eq">⭐ Scores · ≈ £2.50 value</div>
                      </div>
                      <div className="cp-earn-list">
                        <div className="cp-earn-row"><span className="cp-earn-label">✅ Daily check-in</span><span className="cp-earn-pts">+5</span></div>
                        <div className="cp-earn-row"><span className="cp-earn-label">🎓 Academy lesson</span><span className="cp-earn-pts">+10</span></div>
                        <div className="cp-earn-row"><span className="cp-earn-label">🏏 Training attendance</span><span className="cp-earn-pts">+10</span></div>
                        <div className="cp-earn-row"><span className="cp-earn-label">💷 Match fee on time</span><span className="cp-earn-pts">+10</span></div>
                        <div className="cp-earn-row"><span className="cp-earn-label">🤝 Community post</span><span className="cp-earn-pts">+3</span></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
        </div>

        {/* SOCIAL PROOF */}
        <div className="cp-social-proof">
          <div className="cp-social-proof-inner">
            <span className="cp-social-proof-label">In development</span>
            <div className="cp-social-proof-clubs">
              <div className="cp-social-proof-club"><span className="cp-social-proof-club-dot" /><span>Contacting clubs</span></div>
              <div className="cp-social-proof-club" style={{color:'rgba(240,236,228,0.3)'}}>
                <span className="cp-social-proof-club-dot" style={{background:'rgba(240,236,228,0.15)'}} />
                <span>Talk to us →</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── TWO FRONT DOORS ── */}
        <FrontDoors />

        {/* ── FOUR PILLARS ── */}
        <Pillars />

        {/* ── HOW IT WORKS ── */}
        <section className="cp-how" id="how-it-works">
          <p className="cp-eyebrow">How it works</p>
          <h2 className="cp-section-h2">From first chat to first Saturday.</h2>
          <p className="cp-section-sub">No training sessions and no implementation consultants. We set your club up with you, and players start on the free tier.</p>

          <div className="cp-steps">
            <div className="cp-step">
              <p className="cp-step-num">STEP 01</p>
              <div className="cp-step-icon"><Glyph e="💬" /></div>
              <h3 className="cp-step-h">Talk to us</h3>
              <p className="cp-step-body">Tell us about your club and we set it up with you: your teams, your season and your committee.</p>
              <div className="cp-step-arrow">→</div>
            </div>
            <div className="cp-step">
              <p className="cp-step-num">STEP 02</p>
              <div className="cp-step-icon"><Glyph e="📱" /></div>
              <h3 className="cp-step-h">Invite the squad</h3>
              <p className="cp-step-body">Players start on the free tier, set up their profile and straight away see upcoming fixtures and their Scores balance.</p>
              <div className="cp-step-arrow">→</div>
            </div>
            <div className="cp-step">
              <p className="cp-step-num">STEP 03</p>
              <div className="cp-step-icon"><Glyph e="🏏" /></div>
              <h3 className="cp-step-h">Run Saturday</h3>
              <p className="cp-step-body">Players mark availability, captains pick the XI, scorers record every ball, and stats build up from there.</p>
            </div>
          </div>
        </section>

        {/* ── PRICING TEASER ── */}
        <section className="cp-pricing">
          <div className="cp-pricing-inner" style={{ textAlign: 'center' }}>
            <p className="cp-eyebrow">Pricing</p>
            <h2 className="cp-section-h2">Player plans from £0. Simple for clubs.</h2>
            <p className="cp-section-sub" style={{ margin: '0 auto 28px' }}>
              Players start on Free (£0), with Pro, Elite and Legend above it. Club plans start from £29.99 a month and cover the whole club.
            </p>
            <Link href="/pricing" className="cp-btn-hero-ghost">See pricing →</Link>
            <p style={{ marginTop: 28, fontSize: 13, color: 'rgba(240,236,228,0.45)' }}>
              League and county tools are on the roadmap. <Link href="/contact" style={{ color: '#60A5FA' }}>Get in touch</Link> if you run one.
            </p>
          </div>
        </section>

        {/* ── QUOTE ── */}
        <section className="cp-quote">
          <div className="cp-quote-inner">
            <div className="cp-quote-mark">&ldquo;</div>
            <p className="cp-quote-text">We didn&apos;t set out to build a software company. We just needed Saturday mornings back — and to stop losing the squad thread three days before a match.</p>
            <p className="cp-quote-attr">— Harinarayanan J and Ishwar Suresh, Co-Founders, ClubPulse</p>
          </div>
        </section>

        {/* ── CTA BAND ── */}
        <section className="cp-cta-band">
          <div className="cp-cta-band-inner">
            <div>
              <h2 className="cp-cta-h">Two doors in. One platform.</h2>
              <p className="cp-cta-sub">Clubs: we set you up. Players: start on Free, with or without your club.</p>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link href="/contact" className="cp-cta-btn">Register your club →</Link>
              <Link href="/auth/sign-up" className="cp-cta-btn" style={{ background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.6)' }}>Join as a player →</Link>
            </div>
          </div>
        </section>

        <MarketingFooter />
      </div>
    </>
  );
}
