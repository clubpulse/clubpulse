'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';

type PhoneTab = 'dash' | 'card' | 'coach' | 'pts';
type NavOpen = boolean;

function useCountUp(target: number, duration = 1800) {
  const [count, setCount] = useState(0);
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
  const [navOpen, setNavOpen] = useState<NavOpen>(false);
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

  const { ref: stat50Ref, count: stat50Count } = useCountUp(50);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Inter:wght@400;500;600;700&display=swap');

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
        .cp-logo-name { font-family:'Syne',sans-serif;font-weight:800;font-size:17px; }
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
          font-family:'Syne',sans-serif;
          font-size:clamp(48px,6.5vw,82px);font-weight:800;
          line-height:0.94;letter-spacing:-0.04em;color:var(--fg);margin-bottom:24px;
        }
        .cp-hero-h1 .red { color:var(--red); }
        .cp-hero-sub {
          font-size:17px;color:var(--fg2);line-height:1.7;
          max-width:500px;margin-bottom:32px;
        }

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
          font-family:'Syne',sans-serif;font-size:26px;font-weight:800;
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
        .cp-sc-greeting { font-family:'Syne',sans-serif;font-size:17px;font-weight:800;color:#fff;margin-bottom:2px; }
        .cp-sc-sub { font-size:10px;color:rgba(255,255,255,0.3);margin-bottom:12px; }
        .cp-score-card {
          background:linear-gradient(135deg,rgba(239,200,74,0.12),rgba(239,200,74,0.04));
          border:1px solid rgba(239,200,74,0.2);border-radius:14px;
          padding:14px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:flex-end;
        }
        .cp-score-n { font-family:'Syne',sans-serif;font-size:36px;font-weight:800;color:var(--gold);line-height:1;letter-spacing:-0.02em; }
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
        .cp-sc-match-title { font-family:'Syne',sans-serif;font-size:13px;font-weight:800;color:#fff;margin-bottom:2px; }
        .cp-sc-match-meta { font-size:9px;color:rgba(255,255,255,0.3);margin-bottom:12px; }
        .cp-sc-innings { background:#111;border:1px solid rgba(255,255,255,0.06);border-radius:10px;overflow:hidden;margin-bottom:8px; }
        .cp-sc-head {
          display:flex;justify-content:space-between;padding:8px 10px;
          background:rgba(37,99,235,0.14);border-bottom:1px solid rgba(255,255,255,0.04);
        }
        .cp-sc-head-name { font-weight:700;color:#fff;font-size:10px; }
        .cp-sc-head-score { font-family:'Syne',sans-serif;font-weight:800;font-size:13px;color:var(--gold); }
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
        .cp-pts-big { font-family:'Syne',sans-serif;font-size:48px;font-weight:800;color:var(--gold);line-height:1;letter-spacing:-0.03em; }
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
        .cp-section-h2 {
          font-family:'Syne',sans-serif;
          font-size:clamp(30px,4vw,46px);font-weight:800;
          letter-spacing:-0.03em;color:var(--fg);margin-bottom:8px;
        }
        .cp-section-sub { font-size:16px;color:var(--fg2);line-height:1.7;max-width:540px;margin-bottom:56px; }

        .cp-steps { display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--border);border:1px solid var(--border);border-radius:20px;overflow:hidden; }
        .cp-step { background:var(--bg2);padding:40px 36px;position:relative; }
        .cp-step-num {
          font-family:'Syne',sans-serif;font-size:11px;font-weight:800;
          letter-spacing:0.1em;color:rgba(29,78,216,0.7);margin-bottom:20px;
        }
        .cp-step-icon { font-size:32px;margin-bottom:16px; }
        .cp-step-h { font-family:'Syne',sans-serif;font-size:20px;font-weight:800;color:var(--fg);margin-bottom:10px; }
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
          transition:background 0.15s;position:relative;overflow:hidden;
        }
        .cp-feat-card:hover { background:#07102B; }
        .cp-feat-card-icon { font-size:28px;margin-bottom:16px; }
        .cp-feat-card-tag {
          display:inline-flex;align-items:center;gap:5px;
          padding:3px 9px;border-radius:5px;font-size:10px;font-weight:700;
          letter-spacing:0.06em;text-transform:uppercase;margin-bottom:14px;
        }
        .cp-tag-live { background:rgba(46,204,113,0.1);color:var(--green);border:1px solid rgba(46,204,113,0.2); }
        .cp-tag-road { background:rgba(249,115,22,0.08);color:var(--orange);border:1px solid rgba(249,115,22,0.18); }
        .cp-feat-card-h { font-family:'Syne',sans-serif;font-size:20px;font-weight:800;color:var(--fg);margin-bottom:10px;line-height:1.2; }
        .cp-feat-card-body { font-size:13.5px;color:var(--fg2);line-height:1.65;margin-bottom:18px; }
        .cp-feat-card-link { font-size:13px;font-weight:600;color:var(--red);text-decoration:none;display:inline-flex;align-items:center;gap:6px; }
        .cp-feat-card-bullets { display:flex;flex-direction:column;gap:7px;margin-bottom:18px; }
        .cp-feat-card-bullet { display:flex;align-items:flex-start;gap:8px;font-size:13px;color:var(--fg2); }
        .cp-feat-card-bullet::before { content:'→';color:var(--red);flex-shrink:0;margin-top:1px; }
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
        .cp-persona-h { font-family:'Syne',sans-serif;font-size:clamp(28px,3.5vw,40px);font-weight:800;letter-spacing:-0.025em;color:var(--fg);margin-bottom:14px;line-height:1.1; }
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
        .cp-price-card { background:var(--bg2);padding:36px;position:relative; }
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
        .cp-price-plan { font-family:'Syne',sans-serif;font-size:13px;font-weight:800;letter-spacing:0.07em;text-transform:uppercase;color:var(--fg3);margin-bottom:10px; }
        .cp-price-n { font-family:'Syne',sans-serif;font-size:40px;font-weight:800;color:var(--fg);letter-spacing:-0.03em;line-height:1; }
        .cp-price-n span { font-size:18px;font-weight:600;color:var(--fg2);vertical-align:top;margin-top:6px;display:inline-block; }
        .cp-price-period { font-size:12px;color:var(--fg3);margin-top:4px;margin-bottom:20px; }
        .cp-price-desc { font-size:14px;color:var(--fg2);line-height:1.6;margin-bottom:24px;padding-bottom:24px;border-bottom:1px solid var(--border); }
        .cp-price-features { display:flex;flex-direction:column;gap:9px;margin-bottom:28px; }
        .cp-price-feature { display:flex;align-items:flex-start;gap:8px;font-size:13px;color:var(--fg2); }
        .cp-price-feature-icon { color:var(--green);flex-shrink:0;margin-top:1px; }
        .cp-price-feature-x { color:rgba(240,236,228,0.2);flex-shrink:0;margin-top:1px; }
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
          font-family:'Syne',sans-serif;font-size:180px;font-weight:800;
          color:rgba(37,99,235,0.10);line-height:1;pointer-events:none;user-select:none;
        }
        .cp-quote-text {
          font-family:'Syne',sans-serif;
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
        .cp-cta-h { font-family:'Syne',sans-serif;font-size:clamp(24px,3.5vw,40px);font-weight:800;letter-spacing:-0.025em;color:#fff;line-height:1.1; }
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
        .cp-footer-logo-name { font-family:'Syne',sans-serif;font-weight:800;font-size:14px; }
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
          .cp-pricing-grid { grid-template-columns:1fr; }
          .cp-cta-band-inner { flex-direction:column;text-align:center; }
          .cp-pricing-toggle { width:100%; }
          .cp-pricing-toggle-btn { flex:1; }
        }
        @media (max-width:600px) {
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

        {/* ── NAV ── */}
        <nav className="cp-nav">
          <div className="cp-nav-inner">
            <Link href="/" className="cp-logo">
              <span className="cp-logo-mark">
                <svg width="22" height="22" viewBox="0 0 36 36" fill="none">
                  <defs>
                    <linearGradient id="homeNavPulse" x1="0" y1="0" x2="36" y2="0" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#7F1D1D"/>
                      <stop offset="40%" stopColor="#DC2626"/>
                      <stop offset="100%" stopColor="#1D4ED8"/>
                    </linearGradient>
                  </defs>
                  <rect x="10.5" y="5" width="2.8" height="18" rx="1.4" fill="white"/>
                  <rect x="16.6" y="5" width="2.8" height="18" rx="1.4" fill="white"/>
                  <rect x="22.7" y="5" width="2.8" height="18" rx="1.4" fill="white"/>
                  <rect x="10.5" y="4" width="15" height="2.5" rx="1.25" fill="white"/>
                  <path d="M3 29.5 L7 29.5 L9.5 25 L12.5 33 L16 18 L19.5 29.5 L22 29.5 L25 26 L29 26 L33 26"
                        stroke="url(#homeNavPulse)" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
              <span className="cp-logo-name"><span className="club">Club</span><span className="pulse">Pulse</span></span>
            </Link>
            <div className="cp-nav-links">
              <Link href="/features/availability">Availability</Link>
              <Link href="/features/scorecard">Scorecard</Link>
              <Link href="/features/ai-coach">AI Coach</Link>
              <Link href="/features/scores">Scores</Link>
              <Link href="/features/finance">Finance</Link>
              <Link href="/about">About</Link>
              <Link href="/contact">Contact</Link>
            </div>
            <div className="cp-nav-ctas">
              <Link href="/auth/sign-in" className="cp-btn-ghost">Sign in</Link>
              <Link href="/contact" className="cp-btn-red">Get started</Link>
            </div>
            <button
              className={`cp-hamburger${navOpen ? ' open' : ''}`}
              aria-label={navOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={navOpen}
              onClick={() => setNavOpen(o => !o)}
            >
              <span /><span /><span />
            </button>
          </div>
        </nav>

        {/* ── MOBILE NAV ── */}
        <div className={`cp-mobile-nav${navOpen ? ' open' : ''}`} role="dialog" aria-label="Navigation menu">
          <Link href="/features/availability" onClick={() => setNavOpen(false)}>Availability</Link>
          <Link href="/features/scorecard" onClick={() => setNavOpen(false)}>Scorecard</Link>
          <Link href="/features/ai-coach" onClick={() => setNavOpen(false)}>AI Coach</Link>
          <Link href="/features/scores" onClick={() => setNavOpen(false)}>Scores</Link>
          <Link href="/features/finance" onClick={() => setNavOpen(false)}>Finance</Link>
          <Link href="/about" onClick={() => setNavOpen(false)}>About</Link>
          <Link href="/contact" onClick={() => setNavOpen(false)}>Contact</Link>
          <div className="cp-mobile-nav-divider" />
          <div className="cp-mobile-nav-ctas">
            <Link href="/auth/sign-in" className="cp-btn-ghost" onClick={() => setNavOpen(false)}>Sign in</Link>
            <Link href="/contact" className="cp-btn-red" onClick={() => setNavOpen(false)}>Get started free →</Link>
          </div>
        </div>

        {/* ── HERO ── */}
        <section className="cp-hero">
          <div className="cp-hero-orb" aria-hidden="true" />
          <div className="cp-hero-grid">
            <div>
              <div className="cp-live-badge">
                <span className="cp-live-dot-wrap" aria-hidden="true">
                  <span className="cp-sonar-ring" /><span className="cp-sonar-ring2" /><span className="cp-live-dot" />
                </span>
                Live at Slough CC · 2026 Season
              </div>
              <h1 className="cp-hero-h1">
                The <span className="red">complete</span><br />
                platform for<br />
                grassroots cricket.
              </h1>
              <p className="cp-hero-sub">
                Five tools. One app. Built by a cricketer, for cricketers. Availability, live scoring, AI coaching, loyalty rewards and club finance — everything your club has been doing manually, done properly.
              </p>

              {/* 5 product pillars */}
              <div className="cp-pillars">
                <Link href="/features/availability" className="cp-pillar">
                  <span className="cp-pillar-dot live" />📅 Availability
                </Link>
                <Link href="/features/scorecard" className="cp-pillar">
                  <span className="cp-pillar-dot live" />📋 Live Scorecard
                </Link>
                <Link href="/features/ai-coach" className="cp-pillar">
                  <span className="cp-pillar-dot road" />🎯 AI Coach
                </Link>
                <Link href="/features/scores" className="cp-pillar">
                  <span className="cp-pillar-dot live" />⭐ Scores
                </Link>
                <Link href="/features/finance" className="cp-pillar">
                  <span className="cp-pillar-dot road" />💷 Finance
                </Link>
              </div>

              <div className="cp-hero-btns">
                <Link href="/contact" className="cp-btn-hero">Get started free →</Link>
                <a href="#how-it-works" className="cp-btn-hero-ghost">See how it works</a>
              </div>
              <div className="cp-hero-stats">
                <div className="cp-hero-stat" ref={stat50Ref}><div className="cp-stat-n">{stat50Count}</div><div className="cp-stat-l">Scores = £1</div></div>
                <div className="cp-hero-stat"><div className="cp-stat-n">&lt;1s</div><div className="cp-stat-l">Scorecard sync</div></div>
                <div className="cp-hero-stat"><div className="cp-stat-n">£0</div><div className="cp-stat-l">Free for players</div></div>
                <div className="cp-hero-stat"><div className="cp-stat-n">5</div><div className="cp-stat-l">Tools in one app</div></div>
              </div>
            </div>

            {/* PHONE MOCKUP */}
            <div className="cp-phone" ref={phoneRef} style={{willChange:'transform',transition:'transform 0.05s linear'}}>
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
                        <p className="cp-sc-greeting">Good morning, Ishwar 👋</p>
                        <p className="cp-sc-sub">Slough CC · 2026 Season</p>
                      </div>
                      <div className="cp-score-card">
                        <div>
                          <div className="cp-score-n">1,250<span className="cp-score-unit"> pts</span></div>
                          <div className="cp-score-label">Your Scores balance</div>
                        </div>
                        <div style={{textAlign:'right'}}>
                          <div className="cp-score-val">≈ £25.00</div>
                          <div className="cp-score-label">Cash value</div>
                        </div>
                      </div>
                      <div className="cp-tiles">
                        <div className="cp-tile"><div className="cp-tile-icon">📋</div><div className="cp-tile-label">Live scorecard</div></div>
                        <div className="cp-tile"><div className="cp-tile-icon">🎯</div><div className="cp-tile-label">AI Coach</div></div>
                        <div className="cp-tile"><div className="cp-tile-icon">📅</div><div className="cp-tile-label">Availability</div></div>
                        <div className="cp-tile"><div className="cp-tile-icon">💷</div><div className="cp-tile-label">Finance</div></div>
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
                      <p className="cp-sc-match-title">Slough CC vs Henley CC</p>
                      <p className="cp-sc-match-meta">Sun 20 Oct · Arbour Park · 2nd innings</p>
                      <div className="cp-sc-innings">
                        <div className="cp-sc-head"><span className="cp-sc-head-name">Slough CC batting</span><span className="cp-sc-head-score">142–3</span></div>
                        <div className="cp-sc-bat-row"><span className="cp-sc-bat-name bold">I. Suresh*</span><span className="cp-sc-bat-runs">67*</span></div>
                        <div className="cp-sc-bat-row"><span className="cp-sc-bat-name bold">R. Patel*</span><span className="cp-sc-bat-runs">24*</span></div>
                        <div className="cp-sc-bat-row"><span className="cp-sc-bat-name">A. Khan (out)</span><span className="cp-sc-bat-runs">34</span></div>
                        <div className="cp-sc-bat-row"><span className="cp-sc-bat-name">S. Bhatt (out)</span><span className="cp-sc-bat-runs">12</span></div>
                      </div>
                      <div className="cp-sc-innings">
                        <div className="cp-sc-head"><span className="cp-sc-head-name">Henley CC</span><span className="cp-sc-head-score">178 all out</span></div>
                      </div>
                    </div>
                  )}
                  {phoneTab === 'coach' && (
                    <div>
                      <div className="cp-coach-cam">
                        <div className="cp-coach-cam-label"><span className="cp-coach-cam-dot" />Pose tracking active · 30fps</div>
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
                        <div className="cp-pts-eq">⭐ Scores · ≈ £25.00 value</div>
                      </div>
                      <div className="cp-earn-list">
                        <div className="cp-earn-row"><span className="cp-earn-label">✅ Marked available</span><span className="cp-earn-pts">+5</span></div>
                        <div className="cp-earn-row"><span className="cp-earn-label">🏏 Match played</span><span className="cp-earn-pts">+50</span></div>
                        <div className="cp-earn-row"><span className="cp-earn-label">🎯 AI session</span><span className="cp-earn-pts">+25</span></div>
                        <div className="cp-earn-row"><span className="cp-earn-label">💷 Fee payment</span><span className="cp-earn-pts">+200</span></div>
                        <div className="cp-earn-row"><span className="cp-earn-label">🤝 Referral bonus</span><span className="cp-earn-pts">+100</span></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SOCIAL PROOF */}
        <div className="cp-social-proof">
          <div className="cp-social-proof-inner">
            <span className="cp-social-proof-label">Live at</span>
            <div className="cp-social-proof-clubs">
              <div className="cp-social-proof-club"><span className="cp-social-proof-club-dot" /><span>Slough CC</span></div>
              <div className="cp-social-proof-club" style={{color:'rgba(240,236,228,0.3)'}}>
                <span className="cp-social-proof-club-dot" style={{background:'rgba(240,236,228,0.15)'}} />
                <span>Your club next →</span>
              </div>
            </div>
          </div>
        </div>

        {/* MARQUEE */}
        <div className="cp-marquee-wrap" aria-hidden="true">
          <div className="cp-marquee-track">
            {[
              '📅 Availability','📋 Live Scorecard','🎯 AI Coaching','⭐ Scores Rewards','💷 Club Finance',
              '🏏 Real-time scoring','📱 Mobile-first','🔒 On-device AI','⚡ Under 1s sync','🇬🇧 Built in the UK',
              '📅 Availability','📋 Live Scorecard','🎯 AI Coaching','⭐ Scores Rewards','💷 Club Finance',
              '🏏 Real-time scoring','📱 Mobile-first','🔒 On-device AI','⚡ Under 1s sync','🇬🇧 Built in the UK',
            ].map((item, i) => (
              <span key={i} className="cp-marquee-item">
                <span className="dot">·</span><strong>{item}</strong>
              </span>
            ))}
          </div>
        </div>

        {/* ── HOW IT WORKS ── */}
        <section className="cp-how" id="how-it-works">
          <p className="cp-eyebrow">How it works</p>
          <h2 className="cp-section-h2">Up and running in minutes.</h2>
          <p className="cp-section-sub">No training sessions. No implementation consultants. No 12-month contracts. Just sign up, invite your squad, and start your season.</p>

          <div className="cp-steps">
            <div className="cp-step">
              <p className="cp-step-num">STEP 01</p>
              <div className="cp-step-icon">🏏</div>
              <h3 className="cp-step-h">Create your club</h3>
              <p className="cp-step-body">Sign up as a club admin. Add your club name, teams, and season dates. Takes under 5 minutes — no card required to start.</p>
              <div className="cp-step-arrow">→</div>
            </div>
            <div className="cp-step">
              <p className="cp-step-num">STEP 02</p>
              <div className="cp-step-icon">📱</div>
              <h3 className="cp-step-h">Invite your squad</h3>
              <p className="cp-step-body">Share a link or add players by email. Players join free, set up their profile, and immediately see upcoming fixtures and their Scores balance.</p>
              <div className="cp-step-arrow">→</div>
            </div>
            <div className="cp-step">
              <p className="cp-step-num">STEP 03</p>
              <div className="cp-step-icon">⚡</div>
              <h3 className="cp-step-h">Run your season</h3>
              <p className="cp-step-body">Players mark availability. Captains pick the XI. Scorers log every ball live. Stats build automatically. Finance tracks itself. Done.</p>
            </div>
          </div>
        </section>

        {/* ── FEATURES GRID ── */}
        <section className="cp-features" id="features">
          <div className="cp-features-inner">
            <p className="cp-eyebrow">The full platform</p>
            <h2 className="cp-section-h2">Five tools. One platform.</h2>
            <p className="cp-section-sub">Each feature works standalone. Together they eliminate every spreadsheet, WhatsApp chain, and Sunday-night admin task your club has.</p>

            <div className="cp-feat-grid">
              {/* Availability — wide */}
              <div className="cp-feat-card cp-feat-card-wide" style={{borderBottom:'1px solid var(--border)'}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'40px',alignItems:'center'}}>
                  <div>
                    <div className="cp-feat-card-icon">📅</div>
                    <span className="cp-feat-card-tag cp-tag-live">✓ Live</span>
                    <h3 className="cp-feat-card-h">Availability<br />management</h3>
                    <p className="cp-feat-card-body">No more Wednesday night WhatsApp chains. Players tap once. Captains see a live count — 9/11, 10/11 — and confirm the XI in one click. Push notifications go out automatically.</p>
                    <div className="cp-feat-card-bullets">
                      <div className="cp-feat-card-bullet"><strong>One-tap response</strong> for players</div>
                      <div className="cp-feat-card-bullet"><strong>Live squad count</strong> for captains in real time</div>
                      <div className="cp-feat-card-bullet"><strong>+5 Scores</strong> awarded automatically for responding</div>
                    </div>
                    <Link href="/features/availability" className="cp-feat-card-link">Learn more →</Link>
                  </div>
                  <div style={{background:'#04091A',border:'1px solid var(--border)',borderRadius:'16px',padding:'24px'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
                      <div>
                        <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:'15px',color:'#fff'}}>Availability</div>
                        <div style={{fontSize:'11px',color:'var(--fg3)'}}>Sat 26 Oct · vs Henley CC</div>
                      </div>
                      <span style={{fontSize:'11px',padding:'4px 10px',background:'rgba(46,204,113,0.1)',border:'1px solid rgba(46,204,113,0.2)',borderRadius:'6px',color:'var(--green)',fontWeight:600}}>10 / 11 ✓</span>
                    </div>
                    {[['I. Suresh','Available','yes'],['R. Patel','Available','yes'],['A. Khan','Available','yes'],['S. Bhatt','Unavailable','no'],['D. Sharma','No response','maybe']].map(([name,status,cls]) => (
                      <div key={name} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 10px',borderRadius:'8px',background:'#111',border:'1px solid rgba(255,255,255,0.04)',marginBottom:'6px'}}>
                        <span style={{fontSize:'12px',fontWeight:500,color:'rgba(255,255,255,0.7)'}}>{name}</span>
                        <span style={{padding:'3px 8px',borderRadius:'5px',fontSize:'9px',fontWeight:700,textTransform:'uppercase' as const,
                          background:cls==='yes'?'rgba(46,204,113,0.12)':cls==='no'?'rgba(249,115,22,0.08)':'rgba(255,255,255,0.04)',
                          color:cls==='yes'?'var(--green)':cls==='no'?'var(--orange)':'rgba(255,255,255,0.35)',
                          border:`1px solid ${cls==='yes'?'rgba(46,204,113,0.2)':cls==='no'?'rgba(249,115,22,0.2)':'rgba(255,255,255,0.08)'}`
                        }}>{status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Live Scorecard */}
              <div className="cp-feat-card">
                <div className="cp-feat-card-icon">📋</div>
                <span className="cp-feat-card-tag cp-tag-live">✓ Live</span>
                <h3 className="cp-feat-card-h">Live scorecard</h3>
                <p className="cp-feat-card-body">Scorer enters each delivery. Every player, parent and supporter sees the update in under a second. No paper. No spreadsheet. Ball-by-ball history stored forever.</p>
                <div className="cp-feat-card-bullets">
                  <div className="cp-feat-card-bullet"><strong>Under 1s sync</strong> — Supabase Realtime</div>
                  <div className="cp-feat-card-bullet"><strong>Career stats</strong> built automatically</div>
                  <div className="cp-feat-card-bullet"><strong>Shareable link</strong> for anyone outside the club</div>
                </div>
                <Link href="/features/scorecard" className="cp-feat-card-link">Learn more →</Link>
              </div>

              {/* Scores */}
              <div className="cp-feat-card">
                <div className="cp-feat-card-icon">⭐</div>
                <span className="cp-feat-card-tag cp-tag-live">✓ Live</span>
                <h3 className="cp-feat-card-h">Scores rewards</h3>
                <p className="cp-feat-card-body">Players earn Scores for every contribution — marking available, playing matches, paying fees, coaching sessions. 50 Scores = £1 toward kit, fee offsets and rewards.</p>
                <div className="cp-feat-card-bullets">
                  <div className="cp-feat-card-bullet"><strong>+5</strong> mark available · <strong>+50</strong> match played</div>
                  <div className="cp-feat-card-bullet"><strong>+200</strong> pay season fee · <strong>+100</strong> referral</div>
                  <div className="cp-feat-card-bullet"><strong>Bronze / Silver / Gold</strong> tier multipliers</div>
                </div>
                <Link href="/features/scores" className="cp-feat-card-link">Learn more →</Link>
              </div>

              {/* AI Coach */}
              <div className="cp-feat-card">
                <div className="cp-feat-card-icon">🎯</div>
                <span className="cp-feat-card-tag cp-tag-road">Coming soon</span>
                <h3 className="cp-feat-card-h">AI batting coach</h3>
                <p className="cp-feat-card-body">Your phone camera analyses your stance, elbow position, head level and follow-through at 30fps — entirely on-device. No uploads. No latency. Real coaching feedback, every session.</p>
                <div className="cp-feat-card-bullets">
                  <div className="cp-feat-card-bullet"><strong>On-device only</strong> — nothing leaves your phone</div>
                  <div className="cp-feat-card-bullet"><strong>30fps live analysis</strong> — real-time shot feedback</div>
                  <div className="cp-feat-card-bullet"><strong>Progress tracked</strong> over the season</div>
                </div>
                <Link href="/features/ai-coach" className="cp-feat-card-link">Learn more →</Link>
              </div>

              {/* Finance */}
              <div className="cp-feat-card">
                <div className="cp-feat-card-icon">💷</div>
                <span className="cp-feat-card-tag cp-tag-road">Coming soon</span>
                <h3 className="cp-feat-card-h">Club finance</h3>
                <p className="cp-feat-card-body">Track every transaction, chase outstanding fee payments, and send Wise payouts — all from one admin dashboard. Your treasurer gets their Sunday afternoons back.</p>
                <div className="cp-feat-card-bullets">
                  <div className="cp-feat-card-bullet"><strong>Full transaction history</strong> in one place</div>
                  <div className="cp-feat-card-bullet"><strong>Fee tracking</strong> — see who&apos;s paid, chase in one click</div>
                  <div className="cp-feat-card-bullet"><strong>One-click export</strong> for AGM or committee</div>
                </div>
                <Link href="/features/finance" className="cp-feat-card-link">Learn more →</Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── PERSONA / WHO IT'S FOR ── */}
        <section className="cp-personas">
          <p className="cp-eyebrow">Who it&apos;s for</p>
          <h2 className="cp-section-h2">Built for every role in the club.</h2>
          <p className="cp-section-sub">Whether you play, captain, or run the committee — ClubPulse is built around how you actually use it.</p>

          <PersonaSection />
        </section>

        {/* ── PRICING ── */}
        <section className="cp-pricing">
          <div className="cp-pricing-inner">
            <p className="cp-eyebrow">Pricing</p>
            <h2 className="cp-section-h2">Fair pricing for real clubs.</h2>
            <p className="cp-section-sub">Two separate tracks — one for players, one for clubs. No hidden fees, no annual lock-in.</p>
            <PricingSection />
          </div>
        </section>

        {/* ── QUOTE ── */}
        <section className="cp-quote">
          <div className="cp-quote-inner">
            <div className="cp-quote-mark">&ldquo;</div>
            <p className="cp-quote-text">We didn&apos;t set out to build a software company. We just needed Saturday mornings back — and to stop losing the squad thread three days before a match.</p>
            <p className="cp-quote-attr">— Founder, ClubPulse · Performance &amp; Operations Manager, Slough CC</p>
          </div>
        </section>

        {/* ── CTA BAND ── */}
        <section className="cp-cta-band">
          <div className="cp-cta-band-inner">
            <div>
              <h2 className="cp-cta-h">Ready to run your club properly?</h2>
              <p className="cp-cta-sub">Free for players. Club plans from £14.99/month. No contracts, no hidden fees.</p>
            </div>
            <Link href="/contact" className="cp-cta-btn">Get started — it&apos;s free →</Link>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="cp-footer">
          <div className="cp-footer-inner">
            <Link href="/" className="cp-footer-logo">
              <span className="cp-footer-logo-mark">
                <svg width="18" height="18" viewBox="0 0 36 36" fill="none">
                  <defs>
                    <linearGradient id="homeFooterPulse" x1="0" y1="0" x2="36" y2="0" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#7F1D1D"/>
                      <stop offset="40%" stopColor="#DC2626"/>
                      <stop offset="100%" stopColor="#1D4ED8"/>
                    </linearGradient>
                  </defs>
                  <rect x="10.5" y="5" width="2.8" height="18" rx="1.4" fill="white"/>
                  <rect x="16.6" y="5" width="2.8" height="18" rx="1.4" fill="white"/>
                  <rect x="22.7" y="5" width="2.8" height="18" rx="1.4" fill="white"/>
                  <rect x="10.5" y="4" width="15" height="2.5" rx="1.25" fill="white"/>
                  <path d="M3 29.5 L7 29.5 L9.5 25 L12.5 33 L16 18 L19.5 29.5 L22 29.5 L25 26 L29 26 L33 26"
                        stroke="url(#homeFooterPulse)" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
              <span className="cp-footer-logo-name"><span className="club">Club</span><span className="pulse">Pulse</span></span>
            </Link>
            <div className="cp-footer-links">
              <Link href="/features/availability">Availability</Link>
              <Link href="/features/scorecard">Scorecard</Link>
              <Link href="/features/ai-coach">AI Coach</Link>
              <Link href="/features/scores">Scores</Link>
              <Link href="/features/finance">Finance</Link>
              <Link href="/about">About</Link>
              <Link href="/contact">Contact</Link>
              <Link href="/auth/sign-in">Sign in</Link>
            </div>
            <p className="cp-footer-copy">© 2026 ClubPulse. Built at Slough CC.</p>
          </div>
        </footer>
      </div>
    </>
  );
}

/* ── PRICING SECTION ── */
type PricingAudience = 'player' | 'club';

function PricingSection() {
  const [audience, setAudience] = useState<PricingAudience>('player');

  return (
    <>
      {/* Audience toggle */}
      <div className="cp-pricing-toggle-label">I am a…</div>
      <div className="cp-pricing-toggle">
        <button
          className={`cp-pricing-toggle-btn${audience === 'player' ? ' active' : ''}`}
          onClick={() => setAudience('player')}
        >🏏 Player</button>
        <button
          className={`cp-pricing-toggle-btn${audience === 'club' ? ' active' : ''}`}
          onClick={() => setAudience('club')}
        >🏟️ Club</button>
      </div>

      {/* ── PLAYER PRICING ── */}
      {audience === 'player' && (
        <>
          <div className="cp-pricing-grid">
            {/* Free */}
            <div className="cp-price-card">
              <p className="cp-price-plan">Free</p>
              <div className="cp-price-n">£0</div>
              <p className="cp-price-period">Always free · no card needed</p>
              <p className="cp-price-desc">Everything you need to play, track your stats and engage with your club.</p>
              <div className="cp-price-divider" />
              <div className="cp-price-features">
                <div className="cp-price-feature"><span className="cp-price-feature-icon">✓</span><span>Mark availability</span></div>
                <div className="cp-price-feature"><span className="cp-price-feature-icon">✓</span><span>Live scorecard access</span></div>
                <div className="cp-price-feature"><span className="cp-price-feature-icon">✓</span><span>Career batting &amp; bowling stats</span></div>
                <div className="cp-price-feature"><span className="cp-price-feature-icon">✓</span><span>Earn &amp; track Scores (Bronze tier)</span></div>
                <div className="cp-price-feature dimmed"><span className="cp-price-feature-x">✕</span><span>AI coaching sessions</span></div>
                <div className="cp-price-feature dimmed"><span className="cp-price-feature-x">✕</span><span>Performance insights &amp; trends</span></div>
                <div className="cp-price-feature dimmed"><span className="cp-price-feature-x">✕</span><span>Silver / Gold Scores multipliers</span></div>
              </div>
              <Link href="/auth/sign-up" className="cp-price-cta ghost">Join free →</Link>
            </div>

            {/* Pro — featured */}
            <div className="cp-price-card featured">
              <span className="cp-price-featured-chip">Most popular</span>
              <p className="cp-price-plan">Pro</p>
              <div className="cp-price-n"><span>£</span>2.99</div>
              <p className="cp-price-period">per month · cancel anytime</p>
              <p className="cp-price-desc">For the serious club cricketer. AI coaching, deeper stats and Silver tier Scores rewards.</p>
              <div className="cp-price-divider" />
              <div className="cp-price-features">
                <div className="cp-price-feature"><span className="cp-price-feature-icon">✓</span><span><strong>Everything in Free</strong></span></div>
                <div className="cp-price-feature"><span className="cp-price-feature-icon">✓</span><span>AI coaching sessions (unlimited)</span></div>
                <div className="cp-price-feature"><span className="cp-price-feature-icon">✓</span><span>Performance insights &amp; shot trends</span></div>
                <div className="cp-price-feature"><span className="cp-price-feature-icon">✓</span><span><strong>Silver tier</strong> — 2× Scores multiplier</span></div>
                <div className="cp-price-feature"><span className="cp-price-feature-icon">✓</span><span>Session history &amp; progress tracking</span></div>
                <div className="cp-price-feature dimmed"><span className="cp-price-feature-x">✕</span><span>Gold tier Scores multiplier</span></div>
                <div className="cp-price-feature dimmed"><span className="cp-price-feature-x">✕</span><span>Priority rewards redemption</span></div>
              </div>
              <Link href="/contact" className="cp-price-cta primary">Get Pro →</Link>
            </div>

            {/* Elite */}
            <div className="cp-price-card">
              <p className="cp-price-plan">Elite</p>
              <div className="cp-price-n"><span>£</span>5.99</div>
              <p className="cp-price-period">per month · cancel anytime</p>
              <p className="cp-price-desc">Max rewards, priority features and Gold tier status. For players who take their game seriously.</p>
              <div className="cp-price-divider" />
              <div className="cp-price-features">
                <div className="cp-price-feature"><span className="cp-price-feature-icon">✓</span><span><strong>Everything in Pro</strong></span></div>
                <div className="cp-price-feature"><span className="cp-price-feature-icon">✓</span><span><strong>Gold tier</strong> — 3× Scores multiplier</span></div>
                <div className="cp-price-feature"><span className="cp-price-feature-icon">✓</span><span>Priority rewards redemption</span></div>
                <div className="cp-price-feature"><span className="cp-price-feature-icon">✓</span><span>Early access to new features</span></div>
                <div className="cp-price-feature"><span className="cp-price-feature-icon">✓</span><span>Exportable stats &amp; season report</span></div>
                <div className="cp-price-feature"><span className="cp-price-feature-icon">✓</span><span>Direct support line</span></div>
              </div>
              <Link href="/contact" className="cp-price-cta ghost">Get Elite →</Link>
            </div>
          </div>
          <p className="cp-price-note">50 Scores = £1 value · Bronze (0–499 pts, 1×) · Silver (500–1,999 pts, 2×) · Gold (2,000+ pts, 3×)</p>
        </>
      )}

      {/* ── CLUB PRICING ── */}
      {audience === 'club' && (
        <>
          <div className="cp-pricing-grid" style={{gridTemplateColumns:'repeat(2,1fr)'}}>
            {/* Starter */}
            <div className="cp-price-card">
              <p className="cp-price-plan">Starter</p>
              <div className="cp-price-n"><span>£</span>9.99</div>
              <p className="cp-price-period">per month · cancel anytime</p>
              <p className="cp-price-desc">Perfect for a single team getting started. Core availability, scoring and basic finance.</p>
              <div className="cp-price-divider" />
              <div className="cp-price-features">
                <div className="cp-price-feature"><span className="cp-price-feature-icon">✓</span><span>1 team · up to 25 players</span></div>
                <div className="cp-price-feature"><span className="cp-price-feature-icon">✓</span><span>Availability management</span></div>
                <div className="cp-price-feature"><span className="cp-price-feature-icon">✓</span><span>Live scorecard &amp; XI selection</span></div>
                <div className="cp-price-feature"><span className="cp-price-feature-icon">✓</span><span>Basic finance &amp; fee tracking</span></div>
                <div className="cp-price-feature"><span className="cp-price-feature-icon">✓</span><span>Scores rewards for all players</span></div>
                <div className="cp-price-feature dimmed"><span className="cp-price-feature-x">✕</span><span>Multiple teams</span></div>
                <div className="cp-price-feature dimmed"><span className="cp-price-feature-x">✕</span><span>Full finance dashboard &amp; Wise payouts</span></div>
              </div>
              <Link href="/contact" className="cp-price-cta ghost">Get started →</Link>
            </div>

            {/* Club — featured */}
            <div className="cp-price-card featured">
              <span className="cp-price-featured-chip">Recommended</span>
              <p className="cp-price-plan">Club</p>
              <div className="cp-price-n"><span>£</span>14.99</div>
              <p className="cp-price-period">per month · cancel anytime</p>
              <p className="cp-price-desc">For established clubs with multiple teams. Unlimited players, full finance and every admin tool.</p>
              <div className="cp-price-divider" />
              <div className="cp-price-features">
                <div className="cp-price-feature"><span className="cp-price-feature-icon">✓</span><span><strong>Everything in Starter</strong></span></div>
                <div className="cp-price-feature"><span className="cp-price-feature-icon">✓</span><span>Unlimited teams &amp; players</span></div>
                <div className="cp-price-feature"><span className="cp-price-feature-icon">✓</span><span>Full admin dashboard</span></div>
                <div className="cp-price-feature"><span className="cp-price-feature-icon">✓</span><span>Full finance dashboard &amp; Wise payouts</span></div>
                <div className="cp-price-feature"><span className="cp-price-feature-icon">✓</span><span>Scores management across all players</span></div>
                <div className="cp-price-feature"><span className="cp-price-feature-icon">✓</span><span>Club-wide stats &amp; season reports</span></div>
                <div className="cp-price-feature"><span className="cp-price-feature-icon">✓</span><span>Priority support</span></div>
              </div>
              <Link href="/contact" className="cp-price-cta primary">Get started →</Link>
            </div>
          </div>
          <p className="cp-price-note">All club plans include free player accounts for your entire squad. No per-seat pricing.</p>
        </>
      )}
    </>
  );
}

/* ── PERSONA SECTION (client component for tab state) ── */
type Persona = 'player' | 'captain' | 'admin';

function PersonaSection() {
  const [persona, setPersona] = useState<Persona>('player');

  const personas: Record<Persona, {
    eyebrow: string; h: string; body: string;
    checks: { label: string; detail: string }[];
    card: React.ReactNode;
  }> = {
    player: {
      eyebrow: 'For players',
      h: 'Your cricket life, in one app.',
      body: 'Mark availability, track your career stats, follow the live scorecard, get AI coaching feedback, and earn Scores rewards — everything you do at the club, reflected back to you.',
      checks: [
        { label: 'Availability in one tap', detail: 'No more WhatsApp threads. Respond in seconds.' },
        { label: 'Career stats, every match', detail: 'Batting, bowling, fielding — built automatically.' },
        { label: 'Earn as you play', detail: 'Scores rewards for every contribution you make.' },
        { label: 'AI coaching feedback', detail: 'Live batting analysis from your phone camera.' },
      ],
      card: (
        <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
          <div style={{background:'linear-gradient(135deg,rgba(239,200,74,0.12),rgba(239,200,74,0.04))',border:'1px solid rgba(239,200,74,0.2)',borderRadius:'14px',padding:'20px'}}>
            <div style={{fontSize:'11px',fontWeight:700,letterSpacing:'0.06em',textTransform:'uppercase' as const,color:'rgba(239,200,74,0.6)',marginBottom:'4px'}}>Your Scores balance</div>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:'40px',fontWeight:800,color:'#EFC84A',letterSpacing:'-0.02em',lineHeight:1}}>1,250 <span style={{fontSize:'16px',color:'rgba(239,200,74,0.5)'}}>pts</span></div>
            <div style={{fontSize:'13px',color:'rgba(240,236,228,0.4)',marginTop:'6px'}}>≈ £25.00 cash value</div>
          </div>
          <div style={{background:'#111',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'12px',overflow:'hidden'}}>
            {[['Match played · vs Henley CC','+50 pts'],['Marked available · Sat','+5 pts'],['Season fee paid','+200 pts'],['AI coaching session','+25 pts']].map(([l,p])=>(
              <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'10px 14px',borderBottom:'1px solid rgba(255,255,255,0.04)',fontSize:'12px'}}>
                <span style={{color:'rgba(255,255,255,0.5)'}}>{l}</span>
                <span style={{fontWeight:700,color:'#EFC84A'}}>{p}</span>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    captain: {
      eyebrow: 'For captains',
      h: 'Run your XI without the chaos.',
      body: 'See availability responses live as they come in. Know exactly who\'s confirmed at any moment. Pick your XI when you\'re ready, send notifications in one click, and let the app handle the chasing.',
      checks: [
        { label: 'Live availability dashboard', detail: 'Watch responses come in — 8/11, 9/11, 10/11.' },
        { label: 'Confirm XI instantly', detail: 'Squad confirmed. Push notification goes to all 11.' },
        { label: 'No more group chat admin', detail: 'Stop manually counting who replied.' },
        { label: 'Full squad history', detail: 'Who played when, career records, form guides.' },
      ],
      card: (
        <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',background:'#111',border:'1px solid rgba(37,99,235,0.22)',borderRadius:'12px',padding:'16px'}}>
            <div>
              <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:'15px',color:'#fff'}}>vs Henley CC — Away</div>
              <div style={{fontSize:'11px',color:'var(--fg3)'}}>Sat 26 Oct · 10:30am</div>
            </div>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:'28px',fontWeight:800,color:'var(--green)'}}>10<span style={{fontSize:'14px',fontWeight:500,color:'rgba(240,236,228,0.3)'}}>/11</span></div>
          </div>
          {[['I. Suresh','yes'],['R. Patel','yes'],['A. Khan','yes'],['S. Bhatt','no'],['D. Sharma','maybe']].map(([n,s])=>(
            <div key={n} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 12px',borderRadius:'8px',background:'#111',border:'1px solid rgba(255,255,255,0.04)'}}>
              <span style={{fontSize:'13px',color:'rgba(255,255,255,0.7)'}}>{n}</span>
              <span style={{padding:'3px 9px',borderRadius:'5px',fontSize:'10px',fontWeight:700,textTransform:'uppercase' as const,
                background:s==='yes'?'rgba(46,204,113,0.12)':s==='no'?'rgba(249,115,22,0.08)':'rgba(255,255,255,0.04)',
                color:s==='yes'?'var(--green)':s==='no'?'var(--orange)':'rgba(255,255,255,0.35)',
                border:`1px solid ${s==='yes'?'rgba(46,204,113,0.2)':s==='no'?'rgba(249,115,22,0.2)':'rgba(255,255,255,0.08)'}`
              }}>
                {s==='yes'?'Available':s==='no'?'Unavailable':'No response'}
              </span>
            </div>
          ))}
          <button style={{width:'100%',padding:'12px',background:'var(--red)',color:'#fff',border:'none',borderRadius:'9px',fontSize:'13px',fontWeight:700,fontFamily:"'Inter',sans-serif",cursor:'pointer'}}>
            Confirm XI &amp; notify squad →
          </button>
        </div>
      ),
    },
    admin: {
      eyebrow: 'For club admins',
      h: 'Run the whole club from one dashboard.',
      body: 'Availability, scorecards, finance, Scores rewards — all in one place. Stop switching between spreadsheets, banking apps and WhatsApp threads. One platform handles it all.',
      checks: [
        { label: 'Full club overview', detail: 'Every team, every match, every player in one view.' },
        { label: 'Finance & fee tracking', detail: 'Know who\'s paid, chase in one click, Wise payouts.' },
        { label: 'Scores management', detail: 'Award, adjust and redeem points across all players.' },
        { label: 'Match management', detail: 'Set fixtures, scorers, results — admin made simple.' },
      ],
      card: (
        <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
          <div style={{background:'linear-gradient(135deg,rgba(46,204,113,0.1),rgba(46,204,113,0.02))',border:'1px solid rgba(46,204,113,0.15)',borderRadius:'14px',padding:'20px'}}>
            <div style={{fontSize:'10px',fontWeight:700,letterSpacing:'0.07em',textTransform:'uppercase' as const,color:'rgba(46,204,113,0.6)',marginBottom:'4px'}}>Club balance</div>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:'40px',fontWeight:800,color:'var(--green)',letterSpacing:'-0.02em',lineHeight:1}}>£4,280</div>
            <div style={{fontSize:'12px',color:'var(--fg3)',marginTop:'4px'}}>18 fee payments received this season</div>
          </div>
          <div style={{background:'#111',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'12px',overflow:'hidden'}}>
            <div style={{padding:'10px 14px',fontSize:'10px',fontWeight:700,letterSpacing:'0.06em',textTransform:'uppercase' as const,color:'var(--fg3)',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>Recent transactions</div>
            {[['Season fee — I. Suresh','+£80.00','cr'],['Season fee — R. Patel','+£80.00','cr'],['Ground hire — Arbour Park','−£120.00','db']].map(([n,a,t])=>(
              <div key={n} style={{display:'flex',justifyContent:'space-between',padding:'10px 14px',borderBottom:'1px solid rgba(255,255,255,0.04)',fontSize:'12px'}}>
                <span style={{color:'rgba(255,255,255,0.55)'}}>{n}</span>
                <span style={{fontWeight:700,color:t==='cr'?'var(--green)':'rgba(255,255,255,0.4)'}}>{a}</span>
              </div>
            ))}
          </div>
        </div>
      ),
    },
  };

  const p = personas[persona];

  return (
    <>
      <div className="cp-persona-tabs">
        {(['player','captain','admin'] as Persona[]).map(id => (
          <button
            key={id}
            className={`cp-persona-tab${persona === id ? ' active' : ''}`}
            onClick={() => setPersona(id)}
          >
            {id === 'player' ? '🏏 Player' : id === 'captain' ? '📋 Captain' : '⚙️ Admin'}
          </button>
        ))}
      </div>
      <div className="cp-persona-panel">
        <div>
          <p className="cp-persona-eyebrow">{p.eyebrow}</p>
          <h3 className="cp-persona-h">{p.h}</h3>
          <p className="cp-persona-body">{p.body}</p>
          <div className="cp-persona-checks">
            {p.checks.map(c => (
              <div key={c.label} className="cp-persona-check">
                <span className="cp-persona-check-icon">✓</span>
                <span><strong>{c.label}</strong> — {c.detail}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="cp-persona-card">{p.card}</div>
      </div>
    </>
  );
}
