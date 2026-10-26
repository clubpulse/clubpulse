'use client';

import Link from 'next/link';
import { useState } from 'react';

type PhoneTab = 'dash' | 'card' | 'coach' | 'pts';
type FeatTab = 'avail' | 'score' | 'ai' | 'scores' | 'fin';

export default function HomePage() {
  const [phoneTab, setPhoneTab] = useState<PhoneTab>('dash');
  const [featTab, setFeatTab] = useState<FeatTab>('avail');

  return (
    <>
      <style>{`
        .cp-root * { box-sizing: border-box; margin: 0; padding: 0; }
        .cp-root {
          --bg: #080808; --bg2: #0d0d0d; --bg3: #111;
          --fg: #f0ece4; --fg2: rgba(240,236,228,0.5); --fg3: rgba(240,236,228,0.25);
          --red: #9b1c1c; --red-dim: rgba(155,28,28,0.15); --red-glow: rgba(155,28,28,0.08);
          --gold: #c9a54c; --gold-dim: rgba(201,165,76,0.12);
          --green: #2ecc71; --green-dim: rgba(46,204,113,0.08);
          --orange: #f97316;
          --border: rgba(255,255,255,0.07);
          background: var(--bg);
          color: var(--fg);
          font-family: 'Inter', sans-serif;
          overflow-x: hidden;
        }

        /* ── NAV ── */
        .cp-nav {
          position: sticky; top: 0; z-index: 100;
          background: rgba(8,8,8,0.92);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--border);
        }
        .cp-nav-inner {
          max-width: 1200px; margin: 0 auto; padding: 0 40px;
          height: 64px; display: flex; align-items: center; gap: 32px;
        }
        .cp-logo {
          display: flex; align-items: center; gap: 10px;
          text-decoration: none; flex-shrink: 0;
        }
        .cp-logo-mark {
          width: 36px; height: 36px; background: var(--red);
          border-radius: 9px; display: grid; place-items: center;
          font-family: 'Syne', sans-serif; font-weight: 800;
          font-size: 16px; color: #fff;
          box-shadow: 0 0 20px rgba(155,28,28,0.4);
        }
        .cp-logo-name {
          font-family: 'Syne', sans-serif; font-weight: 700;
          font-size: 17px; color: var(--fg);
        }
        .cp-nav-links {
          display: flex; gap: 4px; flex: 1; justify-content: center;
        }
        .cp-nav-links a {
          padding: 6px 13px; font-size: 13px; color: var(--fg2);
          text-decoration: none; border-radius: 7px;
          transition: color 0.12s, background 0.12s;
        }
        .cp-nav-links a:hover { color: var(--fg); background: rgba(255,255,255,0.04); }
        .cp-nav-ctas { display: flex; gap: 8px; flex-shrink: 0; }
        .cp-btn-ghost {
          padding: 8px 16px; font-size: 13px; font-weight: 500;
          color: var(--fg2); text-decoration: none; border-radius: 8px;
          border: 1px solid var(--border); transition: all 0.12s;
        }
        .cp-btn-ghost:hover { color: var(--fg); border-color: rgba(255,255,255,0.2); }
        .cp-btn-red {
          padding: 8px 18px; font-size: 13px; font-weight: 600;
          background: var(--red); color: #fff; text-decoration: none;
          border-radius: 8px; transition: opacity 0.12s;
          box-shadow: 0 0 20px rgba(155,28,28,0.3);
        }
        .cp-btn-red:hover { opacity: 0.88; }

        /* ── HERO ── */
        .cp-hero {
          max-width: 1200px; margin: 0 auto;
          padding: 80px 40px 0; position: relative;
        }
        .cp-hero-top {
          display: grid; grid-template-columns: 1fr 420px;
          gap: 56px; align-items: start;
        }
        .cp-live-badge {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 5px 14px;
          background: rgba(46,204,113,0.08);
          border: 1px solid rgba(46,204,113,0.2);
          border-radius: 100px; font-size: 11px; font-weight: 700;
          letter-spacing: 0.09em; text-transform: uppercase;
          color: var(--green); margin-bottom: 28px;
        }
        .cp-live-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--green);
          animation: cp-blink 2s ease-in-out infinite;
        }
        @keyframes cp-blink {
          0%, 100% { box-shadow: 0 0 0 3px rgba(46,204,113,0.18); }
          50% { box-shadow: 0 0 0 8px rgba(46,204,113,0.04); }
        }
        .cp-hero-h1 {
          font-family: 'Syne', sans-serif;
          font-size: clamp(52px,7vw,88px); font-weight: 800;
          line-height: 0.92; letter-spacing: -0.04em;
          color: var(--fg); margin-bottom: 28px;
        }
        .cp-hero-h1 .red { color: var(--red); }
        .cp-hero-h1 .gold { color: var(--gold); }
        .cp-hero-sub {
          font-size: 17px; color: var(--fg2); line-height: 1.75;
          max-width: 480px; margin-bottom: 36px;
        }
        .cp-hero-btns { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 48px; }
        .cp-btn-hero {
          padding: 15px 32px; font-size: 15px; font-weight: 700;
          background: var(--red); color: #fff; text-decoration: none;
          border-radius: 11px;
          box-shadow: 0 0 40px rgba(155,28,28,0.35);
          transition: all 0.15s;
        }
        .cp-btn-hero:hover {
          box-shadow: 0 0 60px rgba(155,28,28,0.5);
          transform: translateY(-1px);
        }
        .cp-btn-hero-ghost {
          padding: 15px 26px; font-size: 15px; font-weight: 500;
          border: 1px solid var(--border); color: var(--fg2);
          text-decoration: none; border-radius: 11px; transition: all 0.12s;
        }
        .cp-btn-hero-ghost:hover { color: var(--fg); border-color: rgba(255,255,255,0.2); }
        .cp-hero-stats {
          display: flex; gap: 0; border-top: 1px solid var(--border);
        }
        .cp-hero-stat {
          padding: 20px 0; padding-right: 32px; margin-right: 32px;
          border-right: 1px solid var(--border);
        }
        .cp-hero-stat:last-child { border-right: none; padding-right: 0; margin-right: 0; }
        .cp-stat-n {
          font-family: 'Syne', sans-serif; font-size: 28px; font-weight: 800;
          color: var(--gold); letter-spacing: -0.02em; line-height: 1;
        }
        .cp-stat-l { font-size: 11px; color: var(--fg3); margin-top: 3px; }

        /* ── PHONE ── */
        .cp-phone {
          background: #0a0a0a;
          border: 1.5px solid rgba(255,255,255,0.1);
          border-radius: 36px; padding: 14px;
          box-shadow: 0 40px 80px rgba(0,0,0,0.7),
            0 0 0 1px rgba(255,255,255,0.03),
            0 0 60px rgba(155,28,28,0.06);
          position: relative; width: 100%;
        }
        .cp-phone::before {
          content: ''; position: absolute; top: 11px;
          left: 50%; transform: translateX(-50%);
          width: 56px; height: 5px;
          background: rgba(255,255,255,0.07); border-radius: 10px;
        }
        .cp-phone-screen {
          background: #0c0c0c; border-radius: 24px;
          overflow: hidden; margin-top: 6px;
        }
        .cp-tab-bar {
          display: flex; gap: 0;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .cp-ph-tab {
          flex: 1; padding: 10px 4px; font-size: 9px; font-weight: 600;
          color: rgba(255,255,255,0.25); text-align: center; cursor: pointer;
          transition: all 0.15s; letter-spacing: 0.04em; text-transform: uppercase;
          border: none; background: transparent; font-family: 'Inter', sans-serif;
          border-bottom: 2px solid transparent;
        }
        .cp-ph-tab.active { color: var(--red); border-bottom-color: var(--red); }
        .cp-phone-content { padding: 16px; min-height: 360px; }

        /* Dashboard */
        .cp-sc-greeting {
          font-family: 'Syne', sans-serif; font-size: 17px;
          font-weight: 800; color: #fff; margin-bottom: 2px;
        }
        .cp-sc-sub { font-size: 10px; color: rgba(255,255,255,0.3); margin-bottom: 12px; }
        .cp-score-card {
          background: linear-gradient(135deg,rgba(201,165,76,0.12),rgba(201,165,76,0.04));
          border: 1px solid rgba(201,165,76,0.2); border-radius: 14px;
          padding: 14px; margin-bottom: 12px;
          display: flex; justify-content: space-between; align-items: flex-end;
        }
        .cp-score-n {
          font-family: 'Syne', sans-serif; font-size: 36px; font-weight: 800;
          color: var(--gold); line-height: 1; letter-spacing: -0.02em;
        }
        .cp-score-unit { font-size: 10px; color: rgba(201,165,76,0.5); }
        .cp-score-label { font-size: 10px; color: rgba(255,255,255,0.3); margin-top: 2px; }
        .cp-score-val { font-size: 12px; font-weight: 600; color: var(--gold); }
        .cp-tiles {
          display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;
        }
        .cp-tile {
          background: #111; border: 1px solid rgba(255,255,255,0.06);
          border-radius: 10px; padding: 10px; text-align: center;
        }
        .cp-tile-icon { font-size: 18px; margin-bottom: 4px; }
        .cp-tile-label { font-size: 8.5px; color: rgba(255,255,255,0.35); font-weight: 500; }
        .cp-avail-bar {
          background: rgba(46,204,113,0.08);
          border: 1px solid rgba(46,204,113,0.15);
          border-radius: 10px; padding: 10px 12px;
          display: flex; align-items: center; justify-content: space-between;
        }
        .cp-avail-label { font-size: 9px; font-weight: 600; color: var(--green); }
        .cp-avail-toggle {
          width: 28px; height: 16px; background: var(--green);
          border-radius: 8px; position: relative;
        }
        .cp-avail-toggle::after {
          content: ''; position: absolute; right: 3px; top: 3px;
          width: 10px; height: 10px; background: #fff; border-radius: 50%;
        }

        /* Scorecard screen */
        .cp-live-chip {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 2px 7px;
          background: rgba(46,204,113,0.1);
          border: 1px solid rgba(46,204,113,0.2);
          border-radius: 5px; font-size: 8px; font-weight: 700;
          color: var(--green); margin-bottom: 8px;
        }
        .cp-live-chip-dot {
          width: 4px; height: 4px; border-radius: 50%;
          background: var(--green); animation: cp-blink 1.5s infinite;
        }
        .cp-sc-match-title {
          font-family: 'Syne', sans-serif; font-size: 13px;
          font-weight: 800; color: #fff; margin-bottom: 2px;
        }
        .cp-sc-match-meta { font-size: 9px; color: rgba(255,255,255,0.3); margin-bottom: 12px; }
        .cp-sc-innings {
          background: #111; border: 1px solid rgba(255,255,255,0.06);
          border-radius: 10px; overflow: hidden; margin-bottom: 8px;
        }
        .cp-sc-head {
          display: flex; justify-content: space-between; padding: 8px 10px;
          background: rgba(155,28,28,0.12);
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }
        .cp-sc-head-name { font-weight: 700; color: #fff; font-size: 10px; }
        .cp-sc-head-score {
          font-family: 'Syne', sans-serif; font-weight: 800;
          font-size: 13px; color: var(--gold);
        }
        .cp-sc-bat-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 6px 10px; border-bottom: 1px solid rgba(255,255,255,0.03);
          font-size: 10px;
        }
        .cp-sc-bat-row:last-child { border-bottom: none; }
        .cp-sc-bat-name { color: rgba(255,255,255,0.6); }
        .cp-sc-bat-name.bold { color: #fff; font-weight: 600; }
        .cp-sc-bat-runs { font-weight: 700; color: #fff; }

        /* AI Coach screen */
        .cp-coach-feedback {
          background: #111; border: 1px solid rgba(255,255,255,0.06);
          border-radius: 10px; padding: 10px; margin-top: 10px;
        }
        .cp-coach-fb-title { font-weight: 700; color: #fff; font-size: 10px; margin-bottom: 6px; }
        .cp-coach-fb-row {
          display: flex; align-items: center; gap: 6px; padding: 4px 0;
          border-bottom: 1px solid rgba(255,255,255,0.04); font-size: 9px;
        }
        .cp-coach-fb-row:last-child { border-bottom: none; }
        .cp-fb-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
        .cp-fb-dot.ok { background: var(--green); }
        .cp-fb-dot.warn { background: var(--orange); }
        .cp-fb-dot.bad { background: var(--red); }
        .cp-fb-text { color: rgba(255,255,255,0.5); }
        .cp-fb-text span { color: #fff; }

        /* Scores screen */
        .cp-pts-hero {
          background: linear-gradient(135deg,rgba(201,165,76,0.14),rgba(155,28,28,0.06));
          border: 1px solid rgba(201,165,76,0.18);
          border-radius: 14px; padding: 16px; text-align: center; margin-bottom: 10px;
        }
        .cp-pts-big {
          font-family: 'Syne', sans-serif; font-size: 48px; font-weight: 800;
          color: var(--gold); line-height: 1; letter-spacing: -0.03em;
        }
        .cp-pts-eq { font-size: 11px; color: rgba(240,236,228,0.4); margin-top: 4px; }
        .cp-earn-list {
          background: #111; border: 1px solid rgba(255,255,255,0.06);
          border-radius: 10px; overflow: hidden;
        }
        .cp-earn-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 8px 10px; border-bottom: 1px solid rgba(255,255,255,0.03);
          font-size: 9.5px;
        }
        .cp-earn-row:last-child { border-bottom: none; }
        .cp-earn-label { color: rgba(255,255,255,0.5); }
        .cp-earn-pts { font-weight: 700; color: var(--gold); }

        /* ── DIVIDER ── */
        .cp-divider {
          max-width: 1200px; margin: 0 auto; padding: 0 40px;
          padding-top: 72px;
        }
        .cp-divider hr { border: none; border-top: 1px solid var(--border); }

        /* ── FEATURES SECTION ── */
        .cp-features {
          max-width: 1200px; margin: 0 auto; padding: 80px 40px;
        }
        .cp-eyebrow {
          font-size: 11px; font-weight: 700; letter-spacing: 0.1em;
          text-transform: uppercase; color: var(--red); margin-bottom: 12px;
        }
        .cp-section-h2 {
          font-family: 'Syne', sans-serif;
          font-size: clamp(32px,4vw,48px); font-weight: 800;
          letter-spacing: -0.03em; color: var(--fg); margin-bottom: 8px;
        }
        .cp-section-sub {
          font-size: 16px; color: var(--fg2); line-height: 1.7;
          max-width: 520px; margin-bottom: 48px;
        }
        .cp-feat-tabs { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 32px; }
        .cp-feat-tab {
          padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600;
          cursor: pointer; border: 1px solid var(--border); color: var(--fg3);
          background: transparent; transition: all 0.15s; font-family: 'Inter', sans-serif;
        }
        .cp-feat-tab.active {
          background: var(--red-dim); color: var(--fg);
          border-color: rgba(155,28,28,0.35);
        }
        .cp-feat-tab:hover:not(.active) { color: var(--fg); border-color: rgba(255,255,255,0.18); }
        .cp-feat-panel {
          display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: center;
        }
        .cp-feat-tag {
          display: inline-flex; align-items: center;
          padding: 4px 10px; border-radius: 6px; font-size: 10px;
          font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase;
          margin-bottom: 16px;
        }
        .cp-tag-live {
          background: rgba(46,204,113,0.1); color: var(--green);
          border: 1px solid rgba(46,204,113,0.2);
        }
        .cp-tag-road {
          background: rgba(249,115,22,0.08); color: var(--orange);
          border: 1px solid rgba(249,115,22,0.18);
        }
        .cp-feat-h {
          font-family: 'Syne', sans-serif; font-size: 32px; font-weight: 800;
          letter-spacing: -0.025em; color: var(--fg); margin-bottom: 12px; line-height: 1.1;
        }
        .cp-feat-body {
          font-size: 15px; color: var(--fg2); line-height: 1.75; margin-bottom: 24px;
        }
        .cp-feat-bullets { display: flex; flex-direction: column; gap: 10px; }
        .cp-feat-bullet {
          display: flex; align-items: flex-start; gap: 10px;
          font-size: 14px; color: var(--fg2);
        }
        .cp-feat-bullet::before {
          content: '→'; color: var(--red); flex-shrink: 0; margin-top: 1px;
        }
        .cp-feat-bullet strong { color: var(--fg); }
        .cp-mock {
          background: #0d0d0d; border: 1px solid var(--border);
          border-radius: 20px; padding: 24px; min-height: 380px;
        }

        /* Availability mock */
        .cp-avail-h {
          font-family: 'Syne', sans-serif; font-size: 16px;
          font-weight: 800; color: #fff;
        }
        .cp-avail-meta { font-size: 11px; color: var(--fg3); }
        .cp-avail-header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 16px;
        }
        .cp-avail-count-chip {
          font-size: 11px; padding: 4px 10px;
          background: rgba(46,204,113,0.1);
          border: 1px solid rgba(46,204,113,0.2);
          border-radius: 6px; color: var(--green); font-weight: 600;
        }
        .cp-avail-match-card {
          background: #111; border: 1px solid rgba(155,28,28,0.2);
          border-radius: 12px; padding: 14px; margin-bottom: 14px;
        }
        .cp-avail-match-name { font-weight: 700; font-size: 13px; color: #fff; margin-bottom: 2px; }
        .cp-avail-match-date { font-size: 11px; color: var(--fg3); margin-bottom: 10px; }
        .cp-avail-squad-count { display: flex; align-items: center; gap: 8px; }
        .cp-avail-count { font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 800; color: var(--green); }
        .cp-avail-count-label { font-size: 11px; color: var(--fg3); }
        .cp-avail-players { display: flex; flex-direction: column; gap: 4px; }
        .cp-avail-player {
          display: flex; align-items: center; justify-content: space-between;
          padding: 7px 10px; border-radius: 8px;
          background: #111; border: 1px solid rgba(255,255,255,0.04);
        }
        .cp-avail-player-name { font-size: 12px; font-weight: 500; color: rgba(255,255,255,0.7); }
        .cp-avail-chip {
          padding: 3px 8px; border-radius: 5px; font-size: 9px;
          font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;
        }
        .cp-avail-chip.yes {
          background: rgba(46,204,113,0.12); color: var(--green);
          border: 1px solid rgba(46,204,113,0.2);
        }
        .cp-avail-chip.no {
          background: rgba(249,115,22,0.08); color: var(--orange);
          border: 1px solid rgba(249,115,22,0.2);
        }
        .cp-avail-chip.maybe {
          background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.35);
          border: 1px solid rgba(255,255,255,0.08);
        }
        .cp-avail-confirm-btn {
          width: 100%; margin-top: 12px; padding: 11px;
          background: var(--red); color: #fff; border: none;
          border-radius: 9px; font-size: 13px; font-weight: 700;
          font-family: 'Inter', sans-serif; cursor: pointer; transition: opacity 0.12s;
        }
        .cp-avail-confirm-btn:hover { opacity: 0.85; }

        /* Scorecard mock */
        .cp-score-live-bar {
          display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;
        }
        .cp-score-live-chip {
          display: flex; align-items: center; gap: 6px; padding: 4px 10px;
          background: rgba(46,204,113,0.1); border: 1px solid rgba(46,204,113,0.2);
          border-radius: 6px; font-size: 10px; font-weight: 700; color: var(--green);
        }
        .cp-score-live-dot {
          width: 5px; height: 5px; border-radius: 50%;
          background: var(--green); animation: cp-blink 1.5s infinite;
        }
        .cp-score-update { font-size: 10px; color: var(--fg3); }
        .cp-score-team {
          background: #111; border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px; overflow: hidden; margin-bottom: 10px;
        }
        .cp-score-team-head {
          display: flex; justify-content: space-between; align-items: center;
          padding: 10px 14px; background: rgba(155,28,28,0.1);
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }
        .cp-score-team-name { font-weight: 700; font-size: 12px; color: #fff; }
        .cp-score-team-total {
          font-family: 'Syne', sans-serif; font-size: 18px;
          font-weight: 800; color: var(--gold);
        }
        .cp-score-bat-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 6px 14px; border-bottom: 1px solid rgba(255,255,255,0.03); font-size: 11px;
        }
        .cp-score-bat-row:last-child { border-bottom: none; }
        .cp-score-bat-name { color: rgba(255,255,255,0.55); }
        .cp-score-bat-name.bat { color: #fff; font-weight: 600; }
        .cp-score-bat-runs { font-weight: 700; color: #fff; min-width: 32px; text-align: right; }
        .cp-score-bat-balls { color: rgba(255,255,255,0.35); min-width: 28px; text-align: right; }
        .cp-bbb {
          background: rgba(201,165,76,0.04); border: 1px solid rgba(201,165,76,0.1);
          border-radius: 10px; padding: 10px 12px;
        }
        .cp-bbb-label {
          font-size: 9px; font-weight: 700; letter-spacing: 0.07em;
          text-transform: uppercase; color: var(--fg3); margin-bottom: 7px;
        }
        .cp-balls { display: flex; gap: 5px; }
        .cp-ball {
          width: 26px; height: 26px; border-radius: 50%;
          display: grid; place-items: center; font-size: 10px;
          font-weight: 800; font-family: 'Syne', sans-serif;
        }
        .cp-ball.dot { background: #111; color: rgba(255,255,255,0.25); border: 1px solid rgba(255,255,255,0.06); }
        .cp-ball.run { background: rgba(255,255,255,0.07); color: #fff; border: 1px solid rgba(255,255,255,0.1); }
        .cp-ball.four { background: rgba(201,165,76,0.15); color: var(--gold); border: 1px solid rgba(201,165,76,0.25); }
        .cp-ball.six { background: rgba(155,28,28,0.2); color: #f87171; border: 1px solid rgba(155,28,28,0.3); }
        .cp-ball.wkt { background: rgba(249,115,22,0.15); color: var(--orange); border: 1px solid rgba(249,115,22,0.25); }

        /* AI coach mock */
        .cp-coach-cam {
          background: #0a0a0a; border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px; padding: 14px; margin-bottom: 12px;
        }
        .cp-coach-cam-label {
          display: flex; align-items: center; gap: 5px; font-size: 9px;
          font-weight: 700; color: var(--green); letter-spacing: 0.07em;
          text-transform: uppercase; margin-bottom: 8px;
        }
        .cp-coach-cam-dot {
          width: 5px; height: 5px; border-radius: 50%;
          background: var(--green); animation: cp-blink 2s infinite;
        }
        .cp-coach-pose {
          aspect-ratio: 4/3; background: #050505; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          position: relative; overflow: hidden;
        }
        .cp-coach-pose::after {
          content: ''; position: absolute; inset: 0;
          background: radial-gradient(ellipse at 50% 100%, rgba(155,28,28,0.08), transparent 60%);
        }
        .cp-coach-fb-cards { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
        .cp-coach-fb-card {
          background: #111; border: 1px solid rgba(255,255,255,0.06);
          border-radius: 10px; padding: 10px;
        }
        .cp-coach-fb-icon { font-size: 16px; margin-bottom: 5px; }
        .cp-coach-fb-label { font-size: 9px; font-weight: 600; color: rgba(255,255,255,0.5); margin-bottom: 3px; }
        .cp-coach-fb-val { font-size: 11px; font-weight: 700; }
        .cp-coach-fb-val.ok { color: var(--green); }
        .cp-coach-fb-val.warn { color: var(--orange); }

        /* Scores mock */
        .cp-scores-big-card {
          background: linear-gradient(135deg, rgba(201,165,76,0.12), rgba(155,28,28,0.06));
          border: 1px solid rgba(201,165,76,0.2); border-radius: 14px;
          padding: 20px; display: flex; justify-content: space-between;
          align-items: center; margin-bottom: 12px;
        }
        .cp-scores-big-n {
          font-family: 'Syne', sans-serif; font-size: 52px; font-weight: 800;
          color: var(--gold); line-height: 1; letter-spacing: -0.03em;
        }
        .cp-scores-big-eq { font-size: 13px; color: rgba(201,165,76,0.6); }
        .cp-scores-big-equiv {
          font-family: 'Syne', sans-serif; font-size: 28px;
          font-weight: 700; color: var(--fg); text-align: right;
        }
        .cp-scores-big-equiv-label { font-size: 10px; color: var(--fg3); text-align: right; }
        .cp-scores-earn-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px; }
        .cp-scores-earn-card {
          background: #111; border: 1px solid rgba(255,255,255,0.06);
          border-radius: 10px; padding: 12px;
        }
        .cp-scores-earn-icon { font-size: 18px; margin-bottom: 5px; }
        .cp-scores-earn-label { font-size: 10px; color: rgba(255,255,255,0.4); margin-bottom: 2px; }
        .cp-scores-earn-pts {
          font-family: 'Syne', sans-serif; font-size: 18px;
          font-weight: 800; color: var(--gold);
        }
        .cp-scores-history {
          background: #111; border: 1px solid rgba(255,255,255,0.06);
          border-radius: 10px; overflow: hidden;
        }
        .cp-scores-hist-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 8px 12px; border-bottom: 1px solid rgba(255,255,255,0.03); font-size: 11px;
        }
        .cp-scores-hist-row:last-child { border-bottom: none; }
        .cp-scores-hist-label { color: rgba(255,255,255,0.5); }
        .cp-scores-hist-pts { font-weight: 700; color: var(--gold); }

        /* Finance mock */
        .cp-fin-balance {
          background: linear-gradient(135deg, rgba(46,204,113,0.1), rgba(46,204,113,0.02));
          border: 1px solid rgba(46,204,113,0.15); border-radius: 14px;
          padding: 18px; margin-bottom: 12px;
        }
        .cp-fin-bal-label {
          font-size: 10px; font-weight: 600; letter-spacing: 0.06em;
          text-transform: uppercase; color: rgba(46,204,113,0.6); margin-bottom: 4px;
        }
        .cp-fin-bal-n {
          font-family: 'Syne', sans-serif; font-size: 40px; font-weight: 800;
          color: var(--green); letter-spacing: -0.02em; line-height: 1;
        }
        .cp-fin-bal-sub { font-size: 11px; color: var(--fg3); margin-top: 4px; }
        .cp-fin-tx-list {
          background: #111; border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px; overflow: hidden;
        }
        .cp-fin-tx-head {
          padding: 10px 14px; font-size: 10px; font-weight: 700;
          letter-spacing: 0.06em; text-transform: uppercase; color: var(--fg3);
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }
        .cp-fin-tx-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 9px 14px; border-bottom: 1px solid rgba(255,255,255,0.03);
        }
        .cp-fin-tx-row:last-child { border-bottom: none; }
        .cp-fin-tx-name { font-size: 12px; font-weight: 500; color: rgba(255,255,255,0.75); }
        .cp-fin-tx-date { font-size: 9px; color: rgba(255,255,255,0.25); }
        .cp-fin-tx-amount { font-size: 13px; font-weight: 700; }
        .cp-fin-tx-amount.cr { color: var(--green); }
        .cp-fin-tx-amount.db { color: rgba(255,255,255,0.45); }

        /* ── WHY SECTION ── */
        .cp-why { background: var(--bg2); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
        .cp-why-inner { max-width: 1200px; margin: 0 auto; padding: 80px 40px; }
        .cp-why-grid {
          display: grid; grid-template-columns: repeat(3,1fr);
          gap: 1px; background: var(--border);
          border: 1px solid var(--border); border-radius: 16px;
          overflow: hidden; margin-top: 48px;
        }
        .cp-why-cell { background: var(--bg2); padding: 32px; }
        .cp-why-n {
          font-family: 'Syne', sans-serif; font-size: 11px; font-weight: 800;
          letter-spacing: 0.1em; color: rgba(155,28,28,0.4); margin-bottom: 14px;
        }
        .cp-why-h { font-family: 'Syne', sans-serif; font-size: 17px; font-weight: 800; color: var(--fg); margin-bottom: 8px; }
        .cp-why-body { font-size: 13.5px; color: var(--fg2); line-height: 1.65; }

        /* ── QUOTE ── */
        .cp-quote { max-width: 1200px; margin: 0 auto; padding: 80px 40px; }
        .cp-quote-inner {
          background: #0a0a0a; border: 1px solid var(--border);
          border-radius: 20px; padding: 56px; position: relative; overflow: hidden;
        }
        .cp-quote-mark {
          position: absolute; top: -20px; left: 36px;
          font-family: 'Syne', sans-serif; font-size: 180px; font-weight: 800;
          color: rgba(155,28,28,0.07); line-height: 1;
          pointer-events: none; user-select: none;
        }
        .cp-quote-text {
          font-family: 'Syne', sans-serif;
          font-size: clamp(18px,2.5vw,28px); font-weight: 700;
          color: var(--fg); line-height: 1.45; max-width: 780px;
          position: relative; letter-spacing: -0.01em;
        }
        .cp-quote-attr {
          margin-top: 24px; font-size: 13px; color: var(--fg3); position: relative;
        }

        /* ── CTA BAND ── */
        .cp-cta-band { background: var(--red); border-top: 1px solid rgba(255,255,255,0.08); }
        .cp-cta-band-inner {
          max-width: 1200px; margin: 0 auto; padding: 64px 40px;
          display: flex; align-items: center; justify-content: space-between;
          gap: 32px; flex-wrap: wrap;
        }
        .cp-cta-h {
          font-family: 'Syne', sans-serif;
          font-size: clamp(24px,3.5vw,40px); font-weight: 800;
          letter-spacing: -0.025em; color: #fff; line-height: 1.1;
        }
        .cp-cta-sub { font-size: 15px; color: rgba(255,255,255,0.65); margin-top: 6px; }
        .cp-cta-btn {
          padding: 15px 32px; font-size: 15px; font-weight: 700;
          background: #fff; color: var(--red); text-decoration: none;
          border-radius: 11px; white-space: nowrap; flex-shrink: 0; transition: opacity 0.12s;
        }
        .cp-cta-btn:hover { opacity: 0.9; }

        /* ── FOOTER ── */
        .cp-footer { border-top: 1px solid var(--border); }
        .cp-footer-inner {
          max-width: 1200px; margin: 0 auto; padding: 40px;
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: 16px;
        }
        .cp-footer-logo { display: flex; align-items: center; gap: 8px; text-decoration: none; }
        .cp-footer-logo-mark {
          width: 28px; height: 28px; background: var(--red); border-radius: 7px;
          display: grid; place-items: center;
          font-family: 'Syne', sans-serif; font-weight: 800; font-size: 12px; color: #fff;
        }
        .cp-footer-logo-name { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 14px; color: var(--fg); }
        .cp-footer-links { display: flex; gap: 20px; }
        .cp-footer-links a { font-size: 13px; color: var(--fg3); text-decoration: none; transition: color 0.12s; }
        .cp-footer-links a:hover { color: var(--fg); }
        .cp-footer-copy { font-size: 12px; color: var(--fg3); }

        /* ── RESPONSIVE ── */
        @media (max-width: 900px) {
          .cp-nav-links { display: none; }
          .cp-hero-top { grid-template-columns: 1fr; }
          .cp-phone { max-width: 340px; margin: 0 auto; }
          .cp-feat-panel { grid-template-columns: 1fr; }
          .cp-why-grid { grid-template-columns: 1fr 1fr; }
          .cp-cta-band-inner { flex-direction: column; text-align: center; }
          .cp-coach-fb-cards { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 600px) {
          .cp-nav-inner { padding: 0 16px; }
          .cp-hero, .cp-features, .cp-why-inner, .cp-quote,
          .cp-cta-band-inner, .cp-footer-inner, .cp-divider {
            padding-left: max(16px, env(safe-area-inset-left, 0px));
            padding-right: max(16px, env(safe-area-inset-right, 0px));
          }
          .cp-why-grid { grid-template-columns: 1fr; }
          .cp-scores-earn-grid { grid-template-columns: 1fr; }
          .cp-coach-fb-cards { grid-template-columns: 1fr; }
          .cp-footer-inner { flex-direction: column; align-items: flex-start; }
        }
      `}</style>

      <div className="cp-root">
        {/* NAV */}
        <nav className="cp-nav">
          <div className="cp-nav-inner">
            <Link href="/" className="cp-logo">
              <span className="cp-logo-mark">C</span>
              <span className="cp-logo-name">ClubPulse</span>
            </Link>
            <div className="cp-nav-links">
              <a href="#features">Availability</a>
              <a href="#features">Scorecard</a>
              <a href="#features">AI Coach</a>
              <a href="#features">Scores</a>
              <a href="#features">Finance</a>
              <Link href="/about">About</Link>
              <Link href="/contact">Contact</Link>
            </div>
            <div className="cp-nav-ctas">
              <Link href="/auth/sign-in" className="cp-btn-ghost">Sign in</Link>
              <Link href="/contact" className="cp-btn-red">Get started</Link>
            </div>
          </div>
        </nav>

        {/* HERO */}
        <section className="cp-hero">
          <div className="cp-hero-top">
            <div>
              <div className="cp-live-badge">
                <span className="cp-live-dot" />
                Live at Slough CC · 2026 Season
              </div>
              <h1 className="cp-hero-h1">
                The <span className="red">operating<br />system</span> for<br />
                grassroots<br /><span className="gold">cricket.</span>
              </h1>
              <p className="cp-hero-sub">
                Availability, live scorecards, AI batting coaching, Scores rewards, and club finance — all in one platform. Built on a real cricket club. For every cricket club.
              </p>
              <div className="cp-hero-btns">
                <Link href="/contact" className="cp-btn-hero">Get started free →</Link>
                <a href="#features" className="cp-btn-hero-ghost">See all features</a>
              </div>
              <div className="cp-hero-stats">
                <div className="cp-hero-stat"><div className="cp-stat-n">50</div><div className="cp-stat-l">Scores = £1 value</div></div>
                <div className="cp-hero-stat"><div className="cp-stat-n">&lt;1s</div><div className="cp-stat-l">Scorecard sync</div></div>
                <div className="cp-hero-stat"><div className="cp-stat-n">£0</div><div className="cp-stat-l">Free for players</div></div>
                <div className="cp-hero-stat"><div className="cp-stat-n">33</div><div className="cp-stat-l">Pose landmarks</div></div>
              </div>
            </div>

            {/* PHONE MOCKUP */}
            <div className="cp-phone">
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
                          <svg width="90" height="140" viewBox="0 0 90 140" fill="none" style={{opacity:0.65}}>
                            <circle cx="45" cy="18" r="10" stroke="#9b1c1c" strokeWidth="2"/>
                            <line x1="45" y1="28" x2="45" y2="70" stroke="#c9a54c" strokeWidth="2.5"/>
                            <line x1="45" y1="38" x2="72" y2="28" stroke="#2ecc71" strokeWidth="2"/>
                            <line x1="72" y1="28" x2="86" y2="10" stroke="#2ecc71" strokeWidth="2"/>
                            <line x1="45" y1="38" x2="20" y2="52" stroke="#c9a54c" strokeWidth="2"/>
                            <line x1="45" y1="70" x2="28" y2="108" stroke="#c9a54c" strokeWidth="2"/>
                            <line x1="45" y1="70" x2="62" y2="108" stroke="#c9a54c" strokeWidth="2"/>
                            <line x1="28" y1="108" x2="18" y2="118" stroke="#c9a54c" strokeWidth="2"/>
                            <line x1="62" y1="108" x2="72" y2="118" stroke="#c9a54c" strokeWidth="2"/>
                            <circle cx="45" cy="38" r="3" fill="#c9a54c"/>
                            <circle cx="72" cy="28" r="3" fill="#2ecc71"/>
                            <circle cx="86" cy="10" r="3" fill="#2ecc71"/>
                            <circle cx="20" cy="52" r="3" fill="#c9a54c"/>
                            <circle cx="28" cy="108" r="3" fill="#c9a54c"/>
                            <circle cx="62" cy="108" r="3" fill="#c9a54c"/>
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

        <div className="cp-divider"><hr /></div>

        {/* FEATURES */}
        <section className="cp-features" id="features">
          <p className="cp-eyebrow">The full platform</p>
          <h2 className="cp-section-h2">Every tool your club needs.</h2>
          <p className="cp-section-sub">Click any feature below to see it in action — this is exactly what your players and admins will see when they sign in.</p>

          <div className="cp-feat-tabs">
            {([
              ['avail','📅 Availability'],
              ['score','📋 Live Scorecard'],
              ['ai','🎯 AI Coach'],
              ['scores','⭐ Scores'],
              ['fin','💷 Finance'],
            ] as [FeatTab, string][]).map(([id, label]) => (
              <button
                key={id}
                className={`cp-feat-tab${featTab === id ? ' active' : ''}`}
                onClick={() => setFeatTab(id)}
              >{label}</button>
            ))}
          </div>

          {/* Availability */}
          {featTab === 'avail' && (
            <div className="cp-feat-panel">
              <div>
                <span className="cp-feat-tag cp-tag-live">✓ Live</span>
                <h3 className="cp-feat-h">No more Wednesday night<br />WhatsApp chains.</h3>
                <p className="cp-feat-body">Players mark themselves available in one tap. Captains see a live running count, drill into who&apos;s confirmed, and publish the XI the moment they&apos;re ready — notifications go out automatically.</p>
                <div className="cp-feat-bullets">
                  <div className="cp-feat-bullet"><strong>One-tap responses</strong> — players spend 2 seconds, not 20 reading a thread</div>
                  <div className="cp-feat-bullet"><strong>Live squad count</strong> — captain sees 9/11, 10/11 in real time as responses come in</div>
                  <div className="cp-feat-bullet"><strong>Publish XI instantly</strong> — squad confirmed, push notification goes to all 11</div>
                  <div className="cp-feat-bullet"><strong>+5 Scores awarded</strong> — automatically, for every player who responds</div>
                </div>
              </div>
              <div>
                <div className="cp-mock">
                  <div className="cp-avail-header">
                    <div><p className="cp-avail-h">Availability</p><p className="cp-avail-meta">Sat 26 Oct · Slough CC vs Henley CC</p></div>
                    <span className="cp-avail-count-chip">10 / 11 ✓</span>
                  </div>
                  <div className="cp-avail-match-card">
                    <p className="cp-avail-match-name">vs Henley CC — Away</p>
                    <p className="cp-avail-match-date">Saturday 26 Oct · 10:30am · Henley-on-Thames CC</p>
                    <div className="cp-avail-squad-count">
                      <span className="cp-avail-count">10</span>
                      <span className="cp-avail-count-label">confirmed · 1 awaiting</span>
                    </div>
                  </div>
                  <div className="cp-avail-players">
                    <div className="cp-avail-player"><span className="cp-avail-player-name">I. Suresh</span><span className="cp-avail-chip yes">Available</span></div>
                    <div className="cp-avail-player"><span className="cp-avail-player-name">R. Patel</span><span className="cp-avail-chip yes">Available</span></div>
                    <div className="cp-avail-player"><span className="cp-avail-player-name">A. Khan</span><span className="cp-avail-chip yes">Available</span></div>
                    <div className="cp-avail-player"><span className="cp-avail-player-name">S. Bhatt</span><span className="cp-avail-chip no">Unavailable</span></div>
                    <div className="cp-avail-player"><span className="cp-avail-player-name">D. Sharma</span><span className="cp-avail-chip maybe">No response</span></div>
                  </div>
                  <button className="cp-avail-confirm-btn">Confirm XI &amp; notify squad →</button>
                </div>
              </div>
            </div>
          )}

          {/* Scorecard */}
          {featTab === 'score' && (
            <div className="cp-feat-panel">
              <div>
                <span className="cp-feat-tag cp-tag-live">✓ Live</span>
                <h3 className="cp-feat-h">Real-time. Every ball.<br />For everyone.</h3>
                <p className="cp-feat-body">Scorer enters each delivery and the scorecard updates in under a second for every player, parent, committee member and supporter watching — no paper, no spreadsheet.</p>
                <div className="cp-feat-bullets">
                  <div className="cp-feat-bullet"><strong>Under 1 second sync</strong> — Supabase Realtime, every ball</div>
                  <div className="cp-feat-bullet"><strong>Ball-by-ball record</strong> — full over-by-over breakdown stored forever</div>
                  <div className="cp-feat-bullet"><strong>Career stats built automatically</strong> — every match feeds a player&apos;s all-time record</div>
                  <div className="cp-feat-bullet"><strong>Shareable link</strong> — send one URL to anyone outside the club</div>
                </div>
              </div>
              <div>
                <div className="cp-mock">
                  <div className="cp-score-live-bar">
                    <div className="cp-score-live-chip"><span className="cp-score-live-dot" />LIVE</div>
                    <span className="cp-score-update">Updated 4 seconds ago</span>
                  </div>
                  <div className="cp-score-team">
                    <div className="cp-score-team-head">
                      <span className="cp-score-team-name">Slough CC (batting)</span>
                      <span className="cp-score-team-total">142–3 (28.4 ov)</span>
                    </div>
                    <div className="cp-score-bat-row"><span className="cp-score-bat-name bat">I. Suresh*</span><span className="cp-score-bat-runs">67*</span><span className="cp-score-bat-balls">(52)</span></div>
                    <div className="cp-score-bat-row"><span className="cp-score-bat-name bat">R. Patel*</span><span className="cp-score-bat-runs">24*</span><span className="cp-score-bat-balls">(19)</span></div>
                    <div className="cp-score-bat-row"><span className="cp-score-bat-name">A. Khan — b Simms</span><span className="cp-score-bat-runs">34</span><span className="cp-score-bat-balls">(41)</span></div>
                    <div className="cp-score-bat-row"><span className="cp-score-bat-name">S. Bhatt — c&amp;b Raj</span><span className="cp-score-bat-runs">12</span><span className="cp-score-bat-balls">(18)</span></div>
                  </div>
                  <div className="cp-score-team">
                    <div className="cp-score-team-head">
                      <span className="cp-score-team-name">Henley CC (completed)</span>
                      <span className="cp-score-team-total">178 all out</span>
                    </div>
                  </div>
                  <div className="cp-bbb">
                    <p className="cp-bbb-label">Over 28 — I. Suresh facing</p>
                    <div className="cp-balls">
                      <div className="cp-ball dot">·</div>
                      <div className="cp-ball run">1</div>
                      <div className="cp-ball four">4</div>
                      <div className="cp-ball dot">·</div>
                      <div className="cp-ball six">6</div>
                      <div className="cp-ball wkt">W</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AI Coach */}
          {featTab === 'ai' && (
            <div className="cp-feat-panel">
              <div>
                <span className="cp-feat-tag cp-tag-road">Roadmap</span>
                <h3 className="cp-feat-h">A batting coach in your pocket. On-device.</h3>
                <p className="cp-feat-body">MediaPipe Pose maps 33 3D body landmarks at 30fps — directly on your phone camera. No server, no upload, no waiting. Real-time feedback on your stance, elbow position, head level, and follow-through.</p>
                <div className="cp-feat-bullets">
                  <div className="cp-feat-bullet"><strong>33 pose landmarks</strong> — head, shoulders, elbows, wrists, hips, knees, ankles</div>
                  <div className="cp-feat-bullet"><strong>30fps real-time</strong> — live analysis as you play each shot</div>
                  <div className="cp-feat-bullet"><strong>On-device only</strong> — nothing leaves your phone, zero latency</div>
                  <div className="cp-feat-bullet"><strong>Progress history</strong> — every session logged, improvement tracked over time</div>
                </div>
              </div>
              <div>
                <div className="cp-mock">
                  <div className="cp-coach-cam">
                    <div className="cp-coach-cam-label"><span className="cp-coach-cam-dot" />Pose tracking active · 30fps</div>
                    <div className="cp-coach-pose">
                      <svg width="140" height="220" viewBox="0 0 140 220" fill="none">
                        <circle cx="70" cy="28" r="15" stroke="#9b1c1c" strokeWidth="2.5"/>
                        <line x1="70" y1="43" x2="70" y2="110" stroke="#c9a54c" strokeWidth="3"/>
                        <line x1="70" y1="60" x2="110" y2="45" stroke="#2ecc71" strokeWidth="2.5"/>
                        <line x1="110" y1="45" x2="135" y2="15" stroke="#2ecc71" strokeWidth="2.5"/>
                        <line x1="70" y1="60" x2="32" y2="80" stroke="#c9a54c" strokeWidth="2.5"/>
                        <line x1="70" y1="110" x2="45" y2="168" stroke="#c9a54c" strokeWidth="2.5"/>
                        <line x1="70" y1="110" x2="95" y2="168" stroke="#c9a54c" strokeWidth="2.5"/>
                        <line x1="45" y1="168" x2="30" y2="188" stroke="#c9a54c" strokeWidth="2.5"/>
                        <line x1="95" y1="168" x2="110" y2="188" stroke="#c9a54c" strokeWidth="2.5"/>
                        <circle cx="70" cy="60" r="4" fill="#c9a54c"/>
                        <circle cx="110" cy="45" r="4" fill="#2ecc71"/>
                        <circle cx="135" cy="15" r="5" fill="#2ecc71"/>
                        <circle cx="32" cy="80" r="4" fill="#c9a54c"/>
                        <circle cx="45" cy="168" r="4" fill="#c9a54c"/>
                        <circle cx="95" cy="168" r="4" fill="#c9a54c"/>
                      </svg>
                    </div>
                  </div>
                  <div className="cp-coach-fb-cards">
                    <div className="cp-coach-fb-card"><div className="cp-coach-fb-icon">🧠</div><div className="cp-coach-fb-label">Head</div><div className="cp-coach-fb-val ok">Level ✓</div></div>
                    <div className="cp-coach-fb-card"><div className="cp-coach-fb-icon">💪</div><div className="cp-coach-fb-label">Elbow</div><div className="cp-coach-fb-val warn">Drop 8°</div></div>
                    <div className="cp-coach-fb-card"><div className="cp-coach-fb-icon">👣</div><div className="cp-coach-fb-label">Front foot</div><div className="cp-coach-fb-val ok">Straight ✓</div></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Scores */}
          {featTab === 'scores' && (
            <div className="cp-feat-panel">
              <div>
                <span className="cp-feat-tag cp-tag-live">✓ Live</span>
                <h3 className="cp-feat-h">Get rewarded for<br />showing up.</h3>
                <p className="cp-feat-body">Scores is ClubPulse&apos;s loyalty currency. Players earn automatically for every contribution. 50 Scores = £1 toward kit, fee offsets, and rewards.</p>
                <div className="cp-feat-bullets">
                  <div className="cp-feat-bullet"><strong>+5</strong> — for marking yourself available</div>
                  <div className="cp-feat-bullet"><strong>+25</strong> — for each AI coaching session</div>
                  <div className="cp-feat-bullet"><strong>+50</strong> — for every match played</div>
                  <div className="cp-feat-bullet"><strong>+100</strong> — when you refer a teammate</div>
                  <div className="cp-feat-bullet"><strong>+200</strong> — when you pay your season fee</div>
                </div>
              </div>
              <div>
                <div className="cp-mock">
                  <div className="cp-scores-big-card">
                    <div>
                      <div className="cp-scores-big-n">1,250</div>
                      <div className="cp-scores-big-eq">⭐ Your Scores balance</div>
                    </div>
                    <div>
                      <div className="cp-scores-big-equiv">£25.00</div>
                      <div className="cp-scores-big-equiv-label">Cash equivalent</div>
                    </div>
                  </div>
                  <div className="cp-scores-earn-grid">
                    <div className="cp-scores-earn-card"><div className="cp-scores-earn-icon">📅</div><div className="cp-scores-earn-label">Available</div><div className="cp-scores-earn-pts">+5</div></div>
                    <div className="cp-scores-earn-card"><div className="cp-scores-earn-icon">🏏</div><div className="cp-scores-earn-label">Match played</div><div className="cp-scores-earn-pts">+50</div></div>
                    <div className="cp-scores-earn-card"><div className="cp-scores-earn-icon">🎯</div><div className="cp-scores-earn-label">AI session</div><div className="cp-scores-earn-pts">+25</div></div>
                    <div className="cp-scores-earn-card"><div className="cp-scores-earn-icon">💷</div><div className="cp-scores-earn-label">Fee payment</div><div className="cp-scores-earn-pts">+200</div></div>
                  </div>
                  <div className="cp-scores-history">
                    <div className="cp-scores-hist-row"><span className="cp-scores-hist-label">✅ Marked available · Sat match</span><span className="cp-scores-hist-pts">+5</span></div>
                    <div className="cp-scores-hist-row"><span className="cp-scores-hist-label">🏏 Match vs Henley CC</span><span className="cp-scores-hist-pts">+50</span></div>
                    <div className="cp-scores-hist-row"><span className="cp-scores-hist-label">💷 Season fee — Oct</span><span className="cp-scores-hist-pts">+200</span></div>
                    <div className="cp-scores-hist-row"><span className="cp-scores-hist-label">🤝 Referral — R. Patel joined</span><span className="cp-scores-hist-pts">+100</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Finance */}
          {featTab === 'fin' && (
            <div className="cp-feat-panel">
              <div>
                <span className="cp-feat-tag cp-tag-road">Roadmap</span>
                <h3 className="cp-feat-h">Club accounts, without the spreadsheet.</h3>
                <p className="cp-feat-body">Track every transaction, chase fee payments, and send payouts via Wise — all from one admin dashboard. No more treasurer juggling a spreadsheet and a bank app on match days.</p>
                <div className="cp-feat-bullets">
                  <div className="cp-feat-bullet"><strong>Full transaction history</strong> — income, expenses, fee payments all in one place</div>
                  <div className="cp-feat-bullet"><strong>Fee tracking</strong> — see who&apos;s paid, who hasn&apos;t, send reminders in one click</div>
                  <div className="cp-feat-bullet"><strong>Wise payouts</strong> — direct bank transfers from the dashboard</div>
                  <div className="cp-feat-bullet"><strong>Treasurer report</strong> — one-click export for AGM or committee meetings</div>
                </div>
              </div>
              <div>
                <div className="cp-mock">
                  <div className="cp-fin-balance">
                    <p className="cp-fin-bal-label">Club balance</p>
                    <p className="cp-fin-bal-n">£4,280.00</p>
                    <p className="cp-fin-bal-sub">As of today · 18 fee payments received</p>
                  </div>
                  <div className="cp-fin-tx-list">
                    <div className="cp-fin-tx-head">Recent transactions</div>
                    <div className="cp-fin-tx-row"><div><div className="cp-fin-tx-name">Season fee — I. Suresh</div><div className="cp-fin-tx-date">26 Oct 2026</div></div><div className="cp-fin-tx-amount cr">+£80.00</div></div>
                    <div className="cp-fin-tx-row"><div><div className="cp-fin-tx-name">Season fee — R. Patel</div><div className="cp-fin-tx-date">24 Oct 2026</div></div><div className="cp-fin-tx-amount cr">+£80.00</div></div>
                    <div className="cp-fin-tx-row"><div><div className="cp-fin-tx-name">Ground hire — Arbour Park</div><div className="cp-fin-tx-date">20 Oct 2026</div></div><div className="cp-fin-tx-amount db">−£120.00</div></div>
                    <div className="cp-fin-tx-row"><div><div className="cp-fin-tx-name">Kit order — Masuri helmets</div><div className="cp-fin-tx-date">15 Oct 2026</div></div><div className="cp-fin-tx-amount db">−£340.00</div></div>
                    <div className="cp-fin-tx-row"><div><div className="cp-fin-tx-name">Season fee — A. Khan</div><div className="cp-fin-tx-date">12 Oct 2026</div></div><div className="cp-fin-tx-amount cr">+£80.00</div></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* WHY */}
        <section className="cp-why">
          <div className="cp-why-inner">
            <p className="cp-eyebrow">Why ClubPulse</p>
            <h2 className="cp-section-h2">Built different. On purpose.</h2>
            <div className="cp-why-grid">
              <div className="cp-why-cell"><p className="cp-why-n">01</p><h3 className="cp-why-h">Cricket first</h3><p className="cp-why-body">Every decision is made from the perspective of someone who plays on Saturdays, not a product team that&apos;s never faced a seam bowler.</p></div>
              <div className="cp-why-cell"><p className="cp-why-n">02</p><h3 className="cp-why-h">Grassroots, not glamour</h3><p className="cp-why-body">We&apos;re not building for county academies or T20 franchises. We&apos;re building for clubs that share a pavilion and argue about who brings the teas.</p></div>
              <div className="cp-why-cell"><p className="cp-why-n">03</p><h3 className="cp-why-h">Community owned</h3><p className="cp-why-body">Scores are earned by the players and stay in the club&apos;s ecosystem. No VC cash-out clause. No platform cut on your members&apos; rewards.</p></div>
              <div className="cp-why-cell"><p className="cp-why-n">04</p><h3 className="cp-why-h">Actually useful</h3><p className="cp-why-body">We only ship features that save real admin time or make players better. No vanity dashboards. No engagement gamification for its own sake.</p></div>
              <div className="cp-why-cell"><p className="cp-why-n">05</p><h3 className="cp-why-h">Privacy by default</h3><p className="cp-why-body">AI coaching runs on-device. Your players&apos; pose data never leaves their phone. We don&apos;t sell data, ever.</p></div>
              <div className="cp-why-cell"><p className="cp-why-n">06</p><h3 className="cp-why-h">Fair pricing</h3><p className="cp-why-body">Players join free. Club plans are priced for clubs that hold fundraisers to buy a new sightscreen. Not for clubs with a hospitality suite.</p></div>
            </div>
          </div>
        </section>

        {/* QUOTE */}
        <section className="cp-quote">
          <div className="cp-quote-inner">
            <div className="cp-quote-mark">&ldquo;</div>
            <p className="cp-quote-text">We didn&apos;t set out to build a software company. We just needed Saturday mornings back — and to stop losing the squad thread three days before a match.</p>
            <p className="cp-quote-attr">— Founder, ClubPulse · Slough CC · Performance &amp; Operations Manager</p>
          </div>
        </section>

        {/* CTA */}
        <section className="cp-cta-band">
          <div className="cp-cta-band-inner">
            <div>
              <h2 className="cp-cta-h">Ready to run your club properly?</h2>
              <p className="cp-cta-sub">Free for players. Get in touch to bring ClubPulse to your club.</p>
            </div>
            <Link href="/contact" className="cp-cta-btn">Get started — it&apos;s free →</Link>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="cp-footer">
          <div className="cp-footer-inner">
            <Link href="/" className="cp-footer-logo">
              <span className="cp-footer-logo-mark">C</span>
              <span className="cp-footer-logo-name">ClubPulse</span>
            </Link>
            <div className="cp-footer-links">
              <Link href="/about">About</Link>
              <Link href="/contact">Contact</Link>
              <Link href="/auth/sign-in">Sign in</Link>
              <Link href="/auth/sign-up">Sign up</Link>
            </div>
            <p className="cp-footer-copy">© 2026 ClubPulse. Built at Slough CC.</p>
          </div>
        </footer>
      </div>
    </>
  );
}
