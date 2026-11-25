'use client';

import { Glyph } from '@/components/icons/Glyph';
import React, { useState } from 'react';
import Link from 'next/link';
import MarketingNav from '@/components/marketing/MarketingNav';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { clubMemberPricingEnabled, pricingCopy } from '@/lib/billing/member-pricing';

// Players pay online once checkout is switched on in Vercel; until then the buttons lead to the contact form.
const PLAYER_CTA = process.env.NEXT_PUBLIC_PLAYER_CHECKOUT === 'on' ? '/plan' : '/contact';


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
      { label: 'Basic career stats', desc: 'Runs, wickets, averages and strike rates across all seasons', free: '✓', pro: '✓', elite: '✓', legend: '✓' },
      { label: 'Shareable stats card', desc: 'Public profile link with your season highlights. Share anywhere', free: '✓', pro: '✓', elite: '✓', legend: '✓' },
      { label: 'Achievement badges', desc: 'First fifty, hat-trick, season milestones and more', free: '✓', pro: '✓', elite: '✓', legend: '✓' },
      { label: 'Club leaderboard', desc: 'See where you rank among teammates across all metrics', free: '✓', pro: '✓', elite: '✓', legend: '✓' },
      { label: 'Scores: Bronze (1×)', desc: 'Earn Scores by taking part', free: '✓', pro: '✓', elite: '✓', legend: '✓' },
    ],
  },
  {
    title: 'AI & Coaching',
    rows: [
      { label: 'AI coaching sessions', desc: 'Coach AI feedback in plain English, specific to your game. Coach AI is still in development.', free: '2/month', pro: '8/month', elite: '20/month', legend: 'Unlimited' },
      { label: 'Role-based coaching', desc: 'Tailored advice based on your batting or bowling role in the team', free: '✕', pro: '✓', elite: '✓', legend: '✓' },
      { label: 'Drill recommendations', desc: 'Targeted practice drills generated from your performance weaknesses', free: '✕', pro: '2/month', elite: '8/month', legend: 'Unlimited' },
      { label: 'Post-match self-assessment', desc: 'Log how you felt after each game. Feeds directly into your AI coaching', free: '✕', pro: '✓', elite: '✓', legend: '✓' },
      { label: 'Match notes & journal', desc: 'Private per-match notes and reflections stored on your profile', free: '✕', pro: '3 saved', elite: '15 saved', legend: 'Unlimited' },
      { label: 'Target setting', desc: 'Set and track seasonal batting or bowling goals with AI check-ins', free: '✕', pro: '1 active', elite: '3 active', legend: 'Unlimited' },
      { label: 'Session history & progress', desc: 'Track your improvement over time with coaching session archives', free: '✕', pro: 'Last 30 days', elite: 'Last 3 months', legend: 'Full history' },
      { label: 'Scores: Silver (2×)', desc: 'Earn Scores at twice the Bronze rate', free: '✕', pro: '✓', elite: '✓', legend: '✓' },
    ],
  },
  {
    title: 'Video Analysis',
    rows: [
      { label: 'Video uploads', desc: 'Upload batting or bowling footage: nets sessions or match clips, up to your plan’s file size', free: '7 lifetime', pro: 'Unlimited', elite: 'Unlimited', legend: 'Unlimited' },
      { label: 'Max file size per video', desc: 'Supports high-quality recordings from any device', free: '250 MB', pro: '750 MB', elite: '2 GB', legend: '4 GB' },
      { label: 'Total monthly storage', desc: 'Your personal video library on SHIFTUP', free: '2 GB', pro: '10 GB', elite: '30 GB', legend: '100 GB' },
      { label: 'AI feedback detail', desc: 'Depth of technical analysis returned from your video', free: 'Basic highlights', pro: 'Standard breakdown', elite: 'Detailed technical report', legend: 'Full frame-by-frame analysis' },
      { label: 'Drill recommendations from video', desc: 'Actionable practice drills generated directly from your footage', free: '✕', pro: '1 per video', elite: '3 per video', legend: 'Unlimited' },
      { label: 'Video history retained', desc: 'How long your uploaded videos are stored on SHIFTUP', free: '7 days', pro: '1 month', elite: '6 months', legend: 'Unlimited' },
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
      { label: 'Scores: Gold (3×)', desc: 'Earn Scores at three times the Bronze rate', free: '✕', pro: '✕', elite: '✓', legend: '✓' },
    ],
  },
  {
    title: 'Legend Only',
    rows: [
      { label: 'vs club & regional avg comparison', desc: 'See how your stats stack up beyond your own club, across the region', free: '✕', pro: '✕', elite: '✕', legend: '✓' },
      { label: 'Early feature access', desc: 'Try new SHIFTUP features before they launch to everyone else', free: '✕', pro: '✕', elite: '✕', legend: '✓' },
      { label: 'Legend badge & profile flair', desc: 'Exclusive profile distinction that sets you apart on the leaderboard', free: '✕', pro: '✕', elite: '✕', legend: '✓' },
      { label: 'Direct support line', desc: 'Priority support from a person', free: '✕', pro: '✕', elite: '✕', legend: '✓' },
      { label: 'Scores: Platinum (4×)', desc: 'Earn Scores at four times the Bronze rate', free: '✕', pro: '✕', elite: '✕', legend: '✓' },
    ],
  },
];

const PLAYER_TIERS = [
  { key: 'free',   label: 'Free',   price: '£0',     period: 'Free tier',           desc: 'Get started: your stats, a shareable stats card and Bronze Scores.',              featured: false, cta: 'Start on Free →', href: '/auth/sign-up' },
  { key: 'pro',    label: 'Pro',    price: '£9.99',  period: 'per month',           desc: 'AI coaching, drills and Silver Scores rewards.',                 featured: true,  cta: 'Get Pro →',      href: PLAYER_CTA },
  { key: 'elite',  label: 'Elite',  price: '£14.99', period: 'per month',           desc: 'Deep analysis, venue breakdowns and Gold Scores.',               featured: false, cta: 'Get Elite →',    href: PLAYER_CTA },
  { key: 'legend', label: 'Legend', price: '£19.99', period: 'per month',           desc: 'No limit on coaching sessions, drills or notes. Full frame-by-frame analysis. Platinum Scores.',    featured: false, cta: 'Get Legend →',   href: PLAYER_CTA },
] as const;

type TierKey = 'free' | 'pro' | 'elite' | 'legend';

function cellValue(val: Limit, tier: TierKey) {
  if (val === '✓') return <span style={{ color: '#4ade80', fontWeight: 700, fontSize: '16px' }}><Glyph e="✓" /></span>;
  if (val === '✕') return <span style={{ color: 'var(--cp-muted)', fontSize: '15px' }}><Glyph e="✕" /></span>;
  const isHighlight = tier !== 'free' && val !== '✕';
  return <span style={{ fontSize: '12px', fontWeight: isHighlight ? 600 : 400, color: isHighlight ? 'var(--cp-fg)' : 'var(--cp-muted)', lineHeight: 1.3, display: 'block' }}>{val}</span>;
}

export default function PricingPage() {
  const [audience, setAudience] = useState<Audience>('player');
  const [showFullTable, setShowFullTable] = useState(false);
  const copy = pricingCopy(clubMemberPricingEnabled());
  const tiers = PLAYER_TIERS.map((tier) => {
    const priced = copy.tiers.find((t) => t.key === tier.key);
    return priced?.memberPrice ? { ...tier, memberPrice: priced.memberPrice } : { ...tier, memberPrice: null as string | null };
  });

  return (
    <>
      <style>{`
        :root {
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
          display: flex; align-items: center; gap: 0;
          text-decoration: none; font-family: 'Bricolage Grotesque', sans-serif;
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
          font-family: 'Bricolage Grotesque', sans-serif;
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
        @media (max-width: 640px) {
          .cp-nav-links { gap: 14px; }
          .cp-nav-links a:not(.cp-nav-cta):not(.cp-nav-keep) { display: none; }
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
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 18px; font-weight: 800;
          color: var(--cp-fg);
          margin-bottom: 4px;
        }
        .cp-tier-card.featured .cp-tier-name { color: #fff; }
        .cp-tier-price {
          font-family: 'Bricolage Grotesque', sans-serif;
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
          margin: 0 auto 32px;
          padding: 0 24px;
          overflow-x: auto;
        }
        .cp-section-title {
          font-family: 'Bricolage Grotesque', sans-serif;
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
          /* No negative top margin: it used to pull this line up over the button above when the table was closed */
          margin: 0 auto 72px;
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
          font-family: 'Bricolage Grotesque', sans-serif;
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

        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Bricolage+Grotesque:wght@600;700;800&display=swap');
      `}</style>

      {/* NAV */}
        <MarketingNav />

      {/* HERO */}
      <div className="cp-pricing-hero">
        <span className="cp-pricing-eyebrow">Pricing</span>
        <h1 className="cp-pricing-h1">Players start at £0.<br />Clubs from £29.99 a month.</h1>
        <p className="cp-pricing-sub">{copy.sub}</p>

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
            {tiers.map(tier => (
              <div key={tier.key} className={`cp-tier-card${tier.featured ? ' featured' : ''}`}>
                {tier.featured && <span className="cp-tier-chip">Coaching starts here</span>}
                <div className="cp-tier-name">{tier.label}</div>
                <div className="cp-tier-price">
                  {tier.key === 'free' ? tier.price : <><span>£</span>{tier.price.replace('£','')}</>}
                </div>
                {tier.memberPrice && <div className="cp-tier-period">{tier.memberPrice} a month for a confirmed club member</div>}
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
                          <th>{copy.tableHeaders[1]}</th>
                          <th className="featured-col">{copy.tableHeaders[2]}</th>
                          <th>{copy.tableHeaders[3]}</th>
                          <th>{copy.tableHeaders[4]}</th>
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
            500 Scores = £1 value · Bronze (1×) · Silver (2×) · Gold (3×) · Platinum (4×)
          </p>
        </>
      )}

      {/* ── CLUB PRICING (COMING SOON) ── */}
      {audience === 'club' && (
        <div style={{ padding: '0 24px 80px' }}>
          <div className="cp-coming-soon">
            <div style={{ fontSize: '40px', marginBottom: '16px' }}><Glyph e="🏟️" /></div>
            <h3>Club plans from £29.99 a month</h3>
            <p>
              One plan covers the whole club and comes with the club dashboard for the four pillars. Club plans are not bought online.
              Tell us what your club needs, we confirm it with you, and we sign an agreement for a set period.
              We can also shape the platform around how your club works.
            </p>
            <Link href="/contact">Tell us what your club needs →</Link>
          </div>
        </div>
      )}

      {/* FOOTER */}
        <MarketingFooter />
    </>
  );
}
