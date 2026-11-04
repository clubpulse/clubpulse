'use client';

/**
 * /player-report  —  AI Player Performance Report
 *
 * Generates a structured AI report from the player's last 10 match performances.
 * Server handles all Claude API calls — key never reaches the client.
 */

import { useState } from 'react';

type FormRating = 'excellent' | 'good' | 'average' | 'poor';
type Trend = 'rising' | 'steady' | 'falling';

type Report = {
  summary: string;
  battingAnalysis?: string;
  bowlingAnalysis?: string;
  keyStrengths: string[];
  focusAreas: string[];
  nextMatchTarget: string;
  formRating: FormRating;
  trend: Trend;
};

const RATING_CONFIG: Record<FormRating, { label: string; color: string; bg: string }> = {
  excellent: { label: 'Excellent form', color: '#2ecc71', bg: 'rgba(46,204,113,0.1)' },
  good:      { label: 'Good form',      color: '#60A5FA', bg: 'rgba(96,165,250,0.1)' },
  average:   { label: 'Average form',   color: '#EFC84A', bg: 'rgba(239,200,74,0.1)' },
  poor:      { label: 'Needs work',     color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
};

const TREND_CONFIG: Record<Trend, { icon: string; label: string; color: string }> = {
  rising:  { icon: '↑', label: 'Rising',  color: '#2ecc71' },
  steady:  { icon: '→', label: 'Steady',  color: 'rgba(255,255,255,0.4)' },
  falling: { icon: '↓', label: 'Falling', color: '#f97316' },
};

export default function PlayerReportPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [matchesAnalysed, setMatchesAnalysed] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState(false);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/analysis/player-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json() as { report?: Report; matchesAnalysed?: number; error?: string };
      if (!res.ok || data.error) {
        setError(data.error ?? 'Could not generate report');
      } else {
        setReport(data.report!);
        setMatchesAnalysed(data.matchesAnalysed ?? 0);
        setGenerated(true);
      }
    } catch {
      setError('Failed to reach the server. Try again.');
    } finally {
      setLoading(false);
    }
  }

  const ratingCfg = report ? RATING_CONFIG[report.formRating] ?? RATING_CONFIG.average : null;
  const trendCfg  = report ? TREND_CONFIG[report.trend] ?? TREND_CONFIG.steady : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '720px' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}} .fade-in{animation:fadeIn 0.3s ease}`}</style>

      {/* Header */}
      <div>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '26px', color: '#fff', margin: 0, letterSpacing: '-0.3px', marginBottom: '6px' }}>
          AI Player Report
        </h1>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
          Your personalised performance analysis based on the last {matchesAnalysed || 10} matches.
        </p>
      </div>

      {/* Generate button */}
      {!generated && (
        <div style={{ background: 'rgba(37,99,235,0.07)', border: '1px solid rgba(37,99,235,0.15)', borderRadius: '14px', padding: '28px', textAlign: 'center' }}>
          <div style={{ fontSize: '44px', marginBottom: '14px' }}>📊</div>
          <p style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
            Get your performance breakdown
          </p>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)', marginBottom: '24px', maxWidth: '400px', margin: '0 auto 24px' }}>
            ClubPulse analyses your last 10 matches and generates a coaching report with strengths, areas to focus on, and your next match target.
          </p>
          <button
            onClick={generate}
            disabled={loading}
            style={{ padding: '14px 32px', background: loading ? 'rgba(37,99,235,0.4)' : '#2563EB', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '15px', fontWeight: 700, cursor: loading ? 'wait' : 'pointer' }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                Analysing your matches…
              </span>
            ) : 'Generate my report →'}
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ padding: '14px 18px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', fontSize: '14px', color: '#fca5a5' }}>
          {error}
          {error.includes('No match data') && (
            <span> <a href="/log-performance" style={{ color: '#60A5FA', textDecoration: 'underline' }}>Log a performance</a> to get started.</span>
          )}
        </div>
      )}

      {/* Report */}
      {report && ratingCfg && trendCfg && (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Form badge row */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ padding: '10px 18px', background: ratingCfg.bg, border: `1px solid ${ratingCfg.color}33`, borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px', fontWeight: 800, color: ratingCfg.color }}>{ratingCfg.label}</span>
            </div>
            <div style={{ padding: '10px 18px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px', color: trendCfg.color, fontWeight: 800 }}>{trendCfg.icon}</span>
              <span style={{ fontSize: '14px', color: trendCfg.color, fontWeight: 600 }}>{trendCfg.label}</span>
            </div>
            <div style={{ padding: '10px 18px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px' }}>
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>Based on </span>
              <span style={{ fontSize: '13px', color: '#fff', fontWeight: 700 }}>{matchesAnalysed} matches</span>
            </div>
          </div>

          {/* Summary */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '20px' }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Overall Assessment</p>
            <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.65, margin: 0 }}>{report.summary}</p>
          </div>

          {/* Batting & Bowling */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {report.battingAnalysis && (
              <div style={{ background: 'rgba(96,165,250,0.05)', border: '1px solid rgba(96,165,250,0.12)', borderRadius: '14px', padding: '20px' }}>
                <p style={{ fontSize: '12px', fontWeight: 700, color: '#60A5FA', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>🏏 Batting</p>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, margin: 0 }}>{report.battingAnalysis}</p>
              </div>
            )}
            {report.bowlingAnalysis && (
              <div style={{ background: 'rgba(239,200,74,0.05)', border: '1px solid rgba(239,200,74,0.12)', borderRadius: '14px', padding: '20px' }}>
                <p style={{ fontSize: '12px', fontWeight: 700, color: '#EFC84A', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>⚡ Bowling</p>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, margin: 0 }}>{report.bowlingAnalysis}</p>
              </div>
            )}
          </div>

          {/* Strengths & Focus areas */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            <div style={{ background: 'rgba(46,204,113,0.05)', border: '1px solid rgba(46,204,113,0.12)', borderRadius: '14px', padding: '20px' }}>
              <p style={{ fontSize: '12px', fontWeight: 700, color: '#2ecc71', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>✓ Key Strengths</p>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {report.keyStrengths.map((s, i) => (
                  <li key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <span style={{ color: '#2ecc71', flexShrink: 0, marginTop: '1px' }}>•</span>
                    <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ background: 'rgba(249,115,22,0.05)', border: '1px solid rgba(249,115,22,0.12)', borderRadius: '14px', padding: '20px' }}>
              <p style={{ fontSize: '12px', fontWeight: 700, color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>↗ Focus Areas</p>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {report.focusAreas.map((f, i) => (
                  <li key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <span style={{ color: '#f97316', flexShrink: 0, marginTop: '1px' }}>•</span>
                    <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Next match target */}
          <div style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: '14px', padding: '20px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            <div style={{ fontSize: '28px', flexShrink: 0 }}>🎯</div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 700, color: '#60A5FA', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Next Match Target</p>
              <p style={{ fontSize: '15px', color: '#fff', fontWeight: 600, lineHeight: 1.5, margin: 0 }}>{report.nextMatchTarget}</p>
            </div>
          </div>

          {/* Regenerate */}
          <button
            onClick={generate}
            disabled={loading}
            style={{ alignSelf: 'flex-start', padding: '10px 20px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'rgba(255,255,255,0.5)', fontSize: '13px', cursor: 'pointer' }}
          >
            {loading ? 'Refreshing…' : '↺ Refresh report'}
          </button>
        </div>
      )}
    </div>
  );
}
