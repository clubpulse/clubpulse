'use client';

import React, { useState } from 'react';
import Link from 'next/link';

type Audience = 'player' | 'club';

/* ── TYPES ── */
type Limit = string | '✓' | '✕';

interface FeatureRow {
  label: string;
  desc: string;
  free: Limit;
  pro: Limit;
  elite: Limit;
  legend: Limit;
}

interface Section {
  title: string;
  rows: FeatureRow[];
}

/* ── PLAYER FEATURE DATA ── */
const PLAYER_SECTIONS: Section[] = [
  {
    title: 'Core',
    rows: [
      { label: 'Live scorecard viewing', desc: 'Watch live innings ball by ball as it happens', free: '✓', pro: '✓', elite: '✓', legend: '✓' },
      { label: 'Basic career stats', desc: 'Runs, wickets, averages and strike rates across all seasons', free: '✓', pro: '✓', elite: '✓', legend: '✓' },
      { label: 'Fixture & match notifications', desc: 'Upcoming games, results, weather alerts and reminders', free: '✓', pro: '✓', elite: '✓', legend: '✓' },
      { label: 'Shareable stats card', desc: 'Public profile link with your season highlights — share anywhere', free: '✓', pro: '✓', elite: '✓', legend: '✓' },
      { label: 'Achievement badges', desc: 'First fifty, hat-trick, season milestones and more', free: '✓', pro: '✓', elite: '✓', legend: '✓' },
      { label: 'Club leaderboard', desc: 'See where you rank among teammates across all metrics', free: '✓', pro: '✓', elite: '✓', legend: '✓' },
      { label: 'Scores — Bronze (1×)', desc: 'Earn loyalty points for every match contribution', free: '✓', pro: '✓', elite: '✓', legend: '✓' },
    ],
  },
  {
    title: 'AI & Coaching',
    rows: [
      { label: 'AI coaching sessions', desc: 'Personalised coaching powered by Claude AI — conversational, specific to your game', free: '2/month', pro: '8/month', elite: '20/month', legend: 'Unlimited' },
      { label: 'Role-based coaching', desc: 'Tailored advice based on your batting or bowling role in the team', free: '✕', pro: '✓', elite: '✓', legend: '✓' },
      { label: 'Drill recommendations', desc: 'Targeted practice drills generated from your performance weaknesses', free: '✕', pro: '2/month', elite: '8/month', legend: 'Unlimited' },
      { label: 'Post-match self-assessment', desc: 'Log how you felt after each game — feeds directly into your AI coaching', free: '✕', pro: '✓', elite: '✓', legend: '✓' },
      { label: 'Match notes & journal', desc: 'Private per-match notes and reflections stored on your profile', free: '✕', pro: '3 saved', elite: '15 saved', legend: 'Unlimited' },
      { label: 'Target setting', desc: 'Set and track seasonal batting or bowling goals with AI check-ins', free: '✕', pro: '1 active', elite: '3 active', legend: 'Unlimited' },
      { label: 'Session history & progress', desc: 'Track your improvement over time with coaching session archives', free: '✕', pro: 'Last 30 days', elite: 'Last 3 months', legend: 'Full history' },
      { label: 'Scores — Silver (2×)', desc: 'Double your points on every match contribution', free: '✕', pro: '✓', elite: '✓', legend: '✓' },
    ],
  },
  {
    title: 'Video Analysis',
    rows: [
      { label: 'Video uploads', desc: 'Upload batting or bowling footage — full nets sessions, match clips, any length', free: '7 lifetime', pro: 'Unlimited', elite: 'Unlimited', legend: 'Unlimited' },
      { label: 'Max file size per video', desc: 'Supports high-quality recordings from any device', free: '250 MB', pro: '750 MB', elite: '2 GB', legend: '4 GB' },
      { label: 'Total monthly storage', desc: 'Your personal video library on ClubPulse', free: '2 GB', pro: '10 GB', elite: '30 GB', legend: '100 GB' },
      { label: 'AI feedback detail', desc: 'Depth of technical analysis returned from your video', free: 'Basic highlights', pro: 'Standard breakdown', elite: 'Detailed technical report', legend: 'Full frame-by-frame analysis' },
      { label: 'Drill recommendations from video', desc: 'Actionable practice drills generated directly from your footage', free: '✕', pro: '1 per video', elite: '3 per video', legend: 'Unlimited' },
      { label: 'Video history retained', desc: 'How long your uploaded videos are stored on ClubPulse', free: '7 days', pro: '1 month', elite: '6 months', legend: 'Unlimited' },
      { label: 'Download your video back', desc: 'Save your footage back to your device at any time', free: '✕', pro: '✕', elite: '✓', legend: '✓' },
    ],
  },
  {
    title: 'Deep Analysis',
    rows: [
      { label: 'Form index', desc: 'Rolling average trend across your last 5, 10 and 20 innings', free: '✕', pro: 'Last 5 only', elite: 'Last 5 & 10', legend: 'Full (5/10/20)' },
      { label: 'Venue & ground breakdown', desc: 'How your performance changes at different grounds and home vs away', free: '✕', pro: '✕', elite: 'Last season', legend: 'All-time' },
      { label: 'Pitch condition analysis', desc: 'Your stats broken down by pace, spin and swing surfaces', free: '✕', pro: '✕', elite: '✓', legend: '✓' },
      { label: 'Head-to-head matchup records', desc: 'Your personal record against specific bowlers or batters', free: '✕', pro: '✕', elite: 'Last season', legend: 'All-time' },
      { label: 'Partnership stats', desc: 'Partnerships built, averages and runs with each teammate', free: '✕', pro: '✕', elite: 'Last season', legend: 'All-time' },
      { label: 'Bowling: economy & dot ball %', desc: 'Deep bowling performance including dot ball rate, economy and wicket patterns', free: '✕', pro: '✕', elite: '✓', legend: '✓' },
      { label: 'Pre-match prep prompts', desc: 'AI-generated mental and physical preparation routine before each match', free: '✕', pro: '✕', elite: '3/month', legend: 'Unlimited' },
      { label: 'Injury log & return tracker', desc: 'Log injuries, track recovery and get return-to-play guidance', free: '✕', pro: '✕', elite: '✓', legend: '✓' },
      { label: 'Season report & stat exports', desc: 'Download your complete season as a shareable PDF report', free: '✕', pro: '✕', elite: '1/season', legend: 'Unlimited' },
      { label: 'Priority rewards redemption', desc: 'Jump the queue on limited reward drops before they sell out', free: '✕', pro: '✕', elite: '✓', legend: '✓' },
      { label: 'Scores — Gold (3×)', desc: 'Triple your points on every match contribution', free: '✕', pro: '✕', elite: '✓', legend: '✓' },
    ],
  },
  {
    title: 'Legend Only',
    rows: [
      { label: 'vs club & regional avg comparison', desc: 'See how your stats stack up beyond your own club — across the region', free: '✕', pro: '✕', elite: '✕', legend: '✓' },
      { label: 'Early feature access', desc: 'Try new ClubPulse features before they launch to everyone else', free: '✕', pro: '✕', elite: '✕', legend: '✓' },
      { label: 'Legend badge & profile flair', desc: 'Exclusive profile distinction that sets you apart on the leaderboard', free: '✕', pro: '✕', elite: '✕', legend: '✓' },
      { label: 'Direct support line', desc: 'Priority human support — not just chat, a real response within hours', free: '✕', pro: '✕', elite: '✕', legend: '✓' },
      { label: 'Scores — Platinum (4×)', desc: 'The maximum points multiplier — every contribution counts more', free: '✕', pro: '✕', elite: '✕', legend: '✓' },
    ],
  },
];

const PLAYER_TIERS = [
  { key: 'free',   label: 'Free',   price: '£0',     period: 'Always free',         desc: 'Get started — stats, scorecard and Bronze Scores.',              featured: false, cta: 'Join free →',    href: '/auth/sign-up' },
  { key: 'pro',    label: 'Pro',    price: '£9.99',  period: 'per month',           desc: 'AI coaching, drills and Silver Scores rewards.',                 featured: true,  cta: 'Get Pro →',      href: '/contact' },
  { key: 'elite',  label: 'Elite',  price: '£22.99', period: 'per month',           desc: 'Deep analysis, venue breakdowns and Gold Scores.',               featured: false, cta: 'Get Elite →',    href: '/contact' },
  { key: 'legend', label: 'Legend', price: '£34.99', period: 'per month',           desc: 'Unlimited everything. Full video analysis. Platinum Scores.',    featured: false, cta: 'Get Legend →',   href: '/contact' },
] as const;

type TierKey = 'free' | 'pro' | 'elite' | 'legend';

function cellValue(val: Limit, tier: TierKey) {
  if (val === '✓') return <span style={{ color: '#4ade80', fontWeight: 700, fontSize: '16px' }}>✓</span>;
  if (val === '✕') return <span style={{ color: 'var(--cp-muted)', fontSize: '15px' }}>✕</span>;
  const isHighlight = tier !== 'free' && val !== '✕';
  return <span style={{ fontSize: '12px', fontWeight: isHighlight ? 600 : 400, color: isHighlight ? 'var(--cp-fg)' : 'var(--cp-muted)', lineHeight: 1.3, display: 'block' }}>{val}</span>;
}

export default function PricingPage() {
  const [audience, setAudience] = useState<Audience>('player');
  const [showFullTable, setShowFullTable] = useState(false);

  return (
    <>
      <style>{`
        :root {
          --cp-bg: #ffffff;
          --cp-bg2: #f8f9fb;
          --cp-bg3: #f1f3f7;
          --cp-fg: #0a0f1e;
          --cp-fg2: #2d3452;
          --cp-muted: #8891aa;
          --cp-border: rgba(0,0,0,0.08);
          --cp-blue: #2563EB;
          --cp-sky: #2563EB;
          --cp-gold: #c89b1a;
          --cp-featured-bg: #07102B;
          --cp-featured-fg: #ffffff;
          --cp-nav-bg: rgba(255,255,255,0.9);
          --cp-nav-border: rgba(0,0,0,0.08);
          --cp-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06);
          color-scheme: light;
        }
        @media (prefers-color-scheme: dark) {
          :root:not([data-theme="light"]) {
            --cp-bg: #04091A;
            --cp-bg2: #07102B;
            --cp-bg3: #0C1A38;
            --cp-fg: #F0ECE4;
            --cp-fg2: rgba(240,236,228,0.7);
            --cp-muted: rgba(240,236,228,0.3);
            --cp-border: rgba(255,255,255,0.07);
            --cp-blue: #2563EB;
            --cp-sky: #60A5FA;
            --cp-gold: #EFC84A;
            --cp-featured-bg: #1a2f6e;
            --cp-featured-fg: #ffffff;
            --cp-nav-bg: rgba(4,9,26,0.92);
            --cp-nav-border: rgba(255,255,255,0.07);
            --cp-shadow: 0 1px 3px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.3);
            color-scheme: dark;
          }
        }
        :root[data-theme="dark"] {
          --cp-bg: #04091A;
          --cp-bg2: #07102B;
          --cp-bg3: #0C1A38;
          --cp-fg: #F0ECE4;
          --cp-fg2: rgba(240,236,228,0.7);
          --cp-muted: rgba(240,236,228,0.3);
          --cp-border: rgba(255,255,255,0.07);
          --cp-blue: #2563EB;
          --cp-sky: #60A5FA;
          --cp-gold: #EFC84A;
          --cp-featured-bg: #1a2f6e;
          --cp-featured-fg: #ffffff;
          --cp-nav-bg: rgba(4,9,26,0.92);
          --cp-nav-border: rgba(255,255,255,0.07);
          --cp-shadow: 0 1px 3px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.3);
          color-scheme: dark;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: var(--cp-bg);
          color: var(--cp-fg);
          font-family: 'Inter', system-ui, sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        /* NAV */
        .cp-nav {
          position: sticky; top: 0; z-index: 100;
          background: var(--cp-nav-bg);
          border-bottom: 1px solid var(--cp-nav-border);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
        .cp-nav-inner {
          max-width: 1200px; margin: 0 auto;
          padding: 0 24px;
          height: 60px;
          display: flex; align-items: center; justify-content: space-between;
        }
        .cp-nav-logo {
          display: flex; align-items: center; gap: 8px;
          text-decoration: none; font-family: 'Syne', sans-serif;
          font-size: 17px; font-weight: 800;
        }
        .cp-nav-logo .club { color: var(--cp-fg); }
        .cp-nav-logo .pulse { color: var(--cp-blue); }
        .cp-nav-links {
          display: flex; align-items: center; gap: 24px;
        }
        .cp-nav-links a {
          font-size: 14px; font-weight: 500;
          color: var(--cp-fg2); text-decoration: none;
          transition: color 0.15s;
        }
        .cp-nav-links a:hover { color: var(--cp-fg); }
        .cp-nav-links a.active { color: var(--cp-blue); font-weight: 700; }
        .cp-nav-cta {
          padding: 8px 18px;
          background: var(--cp-blue);
          color: #fff !important;
          border-radius: 8px;
          font-size: 13px !important;
          font-weight: 700 !important;
        }
        .cp-nav-cta:hover { opacity: 0.9; }

        /* HERO */
        .cp-pricing-hero {
          text-align: center;
          padding: 72px 24px 48px;
          max-width: 700px;
          margin: 0 auto;
        }
        .cp-pricing-eyebrow {
          display: inline-block;
          font-size: 12px; font-weight: 700;
          letter-spacing: 0.12em; text-transform: uppercase;
          color: var(--cp-sky);
          margin-bottom: 16px;
        }
        .cp-pricing-h1 {
          font-family: 'Syne', sans-serif;
          font-size: clamp(32px, 5vw, 52px);
          font-weight: 800;
          color: var(--cp-fg);
          line-height: 1.1;
          margin-bottom: 16px;
          letter-spacing: -0.02em;
        }
        .cp-pricing-sub {
          font-size: 17px;
          color: var(--cp-fg2);
          line-height: 1.6;
          max-width: 520px;
          margin: 0 auto 32px;
        }

        /* AUDIENCE TOGGLE */
        .cp-audience-toggle {
          display: inline-flex;
          background: var(--cp-bg3);
          border: 1px solid var(--cp-border);
          border-radius: 12px;
          padding: 4px;
          gap: 4px;
          margin-bottom: 56px;
        }
        .cp-audience-btn {
          padding: 10px 28px;
          border-radius: 9px;
          border: none;
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 14px; font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          background: transparent;
          color: var(--cp-muted);
        }
        .cp-audience-btn.active {
          background: var(--cp-blue);
          color: #fff;
          box-shadow: 0 2px 8px rgba(37,99,235,0.3);
        }

        /* TIER CARDS */
        .cp-tier-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          max-width: 1100px;
          margin: 0 auto 48px;
          padding: 0 24px;
        }
        @media (max-width: 900px) {
          .cp-tier-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 540px) {
          .cp-tier-grid { grid-template-columns: 1fr; }
        }
        .cp-tier-card {
          background: var(--cp-bg2);
          border: 1px solid var(--cp-border);
          border-radius: 16px;
          padding: 28px 22px;
          display: flex; flex-direction: column;
          position: relative;
          transition: box-shadow 0.2s;
        }
        .cp-tier-card:hover { box-shadow: var(--cp-shadow); }
        .cp-tier-card.featured {
          background: var(--cp-featured-bg);
          border-color: var(--cp-blue);
          box-shadow: 0 0 0 1px var(--cp-blue), var(--cp-shadow);
        }
        .cp-tier-chip {
          position: absolute; top: -12px; left: 50%; transform: translateX(-50%);
          background: var(--cp-blue);
          color: #fff;
          font-size: 11px; font-weight: 700;
          letter-spacing: 0.06em; text-transform: uppercase;
          padding: 4px 12px; border-radius: 20px;
          white-space: nowrap;
        }
        .cp-tier-name {
          font-family: 'Syne', sans-serif;
          font-size: 18px; font-weight: 800;
          color: var(--cp-fg);
          margin-bottom: 4px;
        }
        .cp-tier-card.featured .cp-tier-name { color: #fff; }
        .cp-tier-price {
          font-family: 'Syne', sans-serif;
          font-size: 36px; font-weight: 800;
          color: var(--cp-fg);
          line-height: 1;
          margin: 10px 0 4px;
          letter-spacing: -0.02em;
        }
        .cp-tier-card.featured .cp-tier-price { color: #fff; }
        .cp-tier-price span { font-size: 18px; font-weight: 500; }
        .cp-tier-period {
          font-size: 12px; color: var(--cp-muted);
          margin-bottom: 12px;
        }
        .cp-tier-card.featured .cp-tier-period { color: rgba(255,255,255,0.5); }
        .cp-tier-desc {
          font-size: 13px; color: var(--cp-fg2);
          line-height: 1.5; margin-bottom: 20px;
          flex: 1;
        }
        .cp-tier-card.featured .cp-tier-desc { color: rgba(255,255,255,0.7); }
        .cp-tier-cta {
          display: block; text-align: center;
          padding: 11px 20px;
          border-radius: 9px;
          font-size: 13px; font-weight: 700;
          text-decoration: none;
          transition: all 0.15s;
        }
        .cp-tier-cta.primary {
          background: var(--cp-blue); color: #fff;
        }
        .cp-tier-cta.primary:hover { opacity: 0.9; }
        .cp-tier-cta.ghost {
          background: transparent;
          border: 1px solid var(--cp-border);
          color: var(--cp-fg);
        }
        .cp-tier-cta.ghost:hover { border-color: var(--cp-blue); color: var(--cp-blue); }
        .cp-tier-card.featured .cp-tier-cta.ghost {
          border-color: rgba(255,255,255,0.3);
          color: #fff;
        }
        .cp-tier-card.featured .cp-tier-cta.ghost:hover {
          border-color: #fff; background: rgba(255,255,255,0.1);
        }

        /* FULL TABLE TOGGLE */
        .cp-table-toggle-wrap {
          text-align: center;
          margin-bottom: 32px;
        }
        .cp-table-toggle-btn {
          background: transparent;
          border: 1px solid var(--cp-border);
          border-radius: 9px;
          padding: 10px 24px;
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 14px; font-weight: 600;
          color: var(--cp-sky);
          cursor: pointer;
          transition: all 0.15s;
        }
        .cp-table-toggle-btn:hover {
          background: rgba(37,99,235,0.07);
          border-color: var(--cp-blue);
        }

        /* FEATURE TABLE */
        .cp-feature-table-wrap {
          max-width: 1100px;
          margin: 0 auto 80px;
          padding: 0 24px;
          overflow-x: auto;
        }
        .cp-section-title {
          font-family: 'Syne', sans-serif;
          font-size: 13px; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase;
          color: var(--cp-sky);
          padding: 24px 20px 10px;
          border-top: 1px solid var(--cp-border);
        }
        .cp-section-title:first-child { border-top: none; }

        table.cp-feature-table {
          width: 100%; border-collapse: collapse;
          font-size: 13px;
        }
        .cp-feature-table thead th {
          padding: 14px 16px;
          font-size: 12px; font-weight: 700;
          letter-spacing: 0.06em; text-transform: uppercase;
          text-align: center;
          border-bottom: 2px solid var(--cp-border);
          color: var(--cp-fg2);
          background: var(--cp-bg2);
          position: sticky; top: 60px;
          z-index: 10;
        }
        .cp-feature-table thead th:first-child {
          text-align: left;
          min-width: 240px;
        }
        .cp-feature-table thead th.featured-col {
          color: var(--cp-sky);
          background: rgba(37,99,235,0.08);
        }
        .cp-feature-table tbody tr {
          border-bottom: 1px solid var(--cp-border);
          transition: background 0.1s;
        }
        .cp-feature-table tbody tr:hover {
          background: var(--cp-bg3);
        }
        .cp-feature-table tbody td {
          padding: 13px 16px;
          text-align: center;
          vertical-align: middle;
        }
        .cp-feature-table tbody td:first-child {
          text-align: left;
        }
        .cp-feature-table tbody td.featured-col {
          background: rgba(37,99,235,0.04);
        }
        .cp-feat-label {
          font-weight: 600;
          color: var(--cp-fg);
          font-size: 13px;
        }
        .cp-feat-desc {
          font-size: 11px;
          color: var(--cp-muted);
          margin-top: 2px;
          line-height: 1.4;
          max-width: 260px;
        }

        /* SCORES NOTE */
        .cp-scores-note {
          text-align: center;
          font-size: 12px;
          color: var(--cp-muted);
          margin: -48px auto 72px;
          max-width: 600px;
          padding: 0 24px;
        }

        /* COMING SOON */
        .cp-coming-soon {
          max-width: 700px;
          margin: 0 auto 80px;
          padding: 40px 32px;
          background: var(--cp-bg2);
          border: 1px solid var(--cp-border);
          border-radius: 16px;
          text-align: center;
        }
        .cp-coming-soon h3 {
          font-family: 'Syne', sans-serif;
          font-size: 22px; font-weight: 800;
          color: var(--cp-fg);
          margin-bottom: 10px;
        }
        .cp-coming-soon p {
          font-size: 15px; color: var(--cp-fg2);
          line-height: 1.6; margin-bottom: 24px;
        }
        .cp-coming-soon a {
          display: inline-block;
          padding: 12px 28px;
          background: var(--cp-blue);
          color: #fff;
          border-radius: 9px;
          font-size: 14px; font-weight: 700;
          text-decoration: none;
        }
        .cp-coming-soon a:hover { opacity: 0.9; }

        /* FOOTER */
        .cp-footer-simple {
          border-top: 1px solid var(--cp-border);
          padding: 32px 24px;
          text-align: center;
          font-size: 13px;
          color: var(--cp-muted);
        }
        .cp-footer-simple a { color: var(--cp-sky); text-decoration: none; }

        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Syne:wght@700;800&display=swap');
      `}</style>

      {/* NAV */}
      <nav className="cp-nav">
        <div className="cp-nav-inner">
          <Link href="/" className="cp-nav-logo">
            <span className="club">Club</span><span className="pulse">Pulse</span>
          </Link>
          <div className="cp-nav-links">
            <Link href="/features">Features</Link>
            <Link href="/pricing" className="active">Pricing</Link>
            <Link href="/about">About</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/auth/sign-in">Sign in</Link>
            <Link href="/auth/sign-up" className="cp-nav-cta">Get started →</Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <div className="cp-pricing-hero">
        <span className="cp-pricing-eyebrow">Pricing</span>
        <h1 className="cp-pricing-h1">Simple pricing.<br />Serious value.</h1>
        <p className="cp-pricing-sub">
          Free for every player. Paid plans that unlock the full depth of your game.
          Club plans coming soon — built around how your club actually operates.
        </p>

        {/* AUDIENCE TOGGLE */}
        <div className="cp-audience-toggle">
          <button
            className={`cp-audience-btn${audience === 'player' ? ' active' : ''}`}
            onClick={() => setAudience('player')}
          >🏏 Players</button>
          <button
            className={`cp-audience-btn${audience === 'club' ? ' active' : ''}`}
            onClick={() => setAudience('club')}
          >🏟️ Clubs</button>
        </div>
      </div>

      {/* ── PLAYER PRICING ── */}
      {audience === 'player' && (
        <>
          {/* TIER CARDS */}
          <div className="cp-tier-grid">
            {PLAYER_TIERS.map(tier => (
              <div key={tier.key} className={`cp-tier-card${tier.featured ? ' featured' : ''}`}>
                {tier.featured && <span className="cp-tier-chip">Most popular</span>}
                <div className="cp-tier-name">{tier.label}</div>
                <div className="cp-tier-price">
                  {tier.key === 'free' ? tier.price : <><span>£</span>{tier.price.replace('£','')}</>}
                </div>
                <div className="cp-tier-period">{tier.period}{tier.key !== 'free' ? ' · cancel anytime' : ''}</div>
                <div className="cp-tier-desc">{tier.desc}</div>
                <Link
                  href={tier.href}
                  className={`cp-tier-cta ${tier.featured ? 'primary' : 'ghost'}`}
                >{tier.cta}</Link>
              </div>
            ))}
          </div>

          {/* FULL TABLE TOGGLE */}
          <div className="cp-table-toggle-wrap">
            <button
              className="cp-table-toggle-btn"
              onClick={() => setShowFullTable(v => !v)}
            >
              {showFullTable ? '↑ Hide full feature breakdown' : '↓ See full feature breakdown'}
            </button>
          </div>

          {/* FULL FEATURE TABLE */}
          {showFullTable && (
            <div className="cp-feature-table-wrap">
              {PLAYER_SECTIONS.map(section => (
                <div key={section.title}>
                  <div className="cp-section-title">{section.title}</div>
                  <table className="cp-feature-table">
                    {section.title === PLAYER_SECTIONS[0].title && (
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left' }}>Feature</th>
                          <th>Free</th>
                          <th className="featured-col">Pro £9.99</th>
                          <th>Elite £22.99</th>
                          <th>Legend £34.99</th>
                        </tr>
                      </thead>
                    )}
                    <tbody>
                      {section.rows.map(row => (
                        <tr key={row.label}>
                          <td>
                            <div className="cp-feat-label">{row.label}</div>
                            <div className="cp-feat-desc">{row.desc}</div>
                          </td>
                          <td>{cellValue(row.free, 'free')}</td>
                          <td className="featured-col">{cellValue(row.pro, 'pro')}</td>
                          <td>{cellValue(row.elite, 'elite')}</td>
                          <td>{cellValue(row.legend, 'legend')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}

          <p className="cp-scores-note">
            50 Scores = £1 value · Bronze (1×) · Silver (2×) · Gold (3×) · Platinum (4×)
          </p>
        </>
      )}

      {/* ── CLUB PRICING (COMING SOON) ── */}
      {audience === 'club' && (
        <div style={{ padding: '0 24px 80px' }}>
          <div className="cp-coming-soon">
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>🏟️</div>
            <h3>Club plans coming soon</h3>
            <p>
              We&apos;re designing club pricing around how grassroots cricket clubs actually operate —
              multiple teams, finance tracking, AI tools for captains and admins, and rewards for
              every player in your squad. No per-seat pricing. No surprises.
            </p>
            <Link href="/contact">Get notified when club plans launch →</Link>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="cp-footer-simple">
        <p>© 2026 ClubPulse. Built at Slough CC. · <Link href="/features">Features</Link> · <Link href="/contact">Contact</Link> · <Link href="/auth/sign-in">Sign in</Link></p>
      </footer>
    </>
  );
}
