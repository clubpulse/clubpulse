'use client';

import { useState, useEffect, useCallback } from 'react';

export interface SeasonStats {
  displayName: string;
  runs: number;
  wickets: number;
  matches: number;
  clubPulseScore: number;
  year: number;
}

function getSuperlative(stats: SeasonStats): { title: string; subtitle: string } {
  if (stats.runs === 0 && stats.wickets === 0) {
    return { title: 'The Trailblazer', subtitle: 'Every legend starts somewhere. Your story begins now.' };
  }
  if (stats.runs > 500)  return { title: 'The Accumulator',  subtitle: 'You batted like the match always depended on you.' };
  if (stats.wickets > 20) return { title: 'The Destroyer',   subtitle: 'Batters saw you warm up and rethought their life choices.' };
  if (stats.runs > 300 && stats.wickets > 10) return { title: 'The All-Rounder', subtitle: 'Two skills, one unstoppable player.' };
  if (stats.wickets > stats.runs / 15) return { title: 'The Speedster', subtitle: 'You made bowling look like an art form.' };
  if (stats.runs > 200)  return { title: 'The Wall',         subtitle: "You didn't give your wicket away — batters had to earn it." };
  return { title: 'The Comeback Kid', subtitle: 'Every innings was a fresh chapter. Always dangerous.' };
}

const SLIDE_COUNT = 6;

export function SeasonWrapClient({ stats }: { stats: SeasonStats }) {
  const [slide, setSlide] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [runsDisplay, setRunsDisplay] = useState(0);
  const [wicketsDisplay, setWicketsDisplay] = useState(0);
  const [scoreDisplay, setScoreDisplay] = useState(0);
  const [copied, setCopied] = useState(false);

  const superlative = getSuperlative(stats);

  const goNext = useCallback(() => {
    if (animating || slide >= SLIDE_COUNT - 1) return;
    setAnimating(true);
    setTimeout(() => {
      setSlide((s: number) => s + 1);
      setAnimating(false);
    }, 300);
  }, [animating, slide]);

  const goPrev = useCallback(() => {
    if (animating || slide <= 0) return;
    setAnimating(true);
    setTimeout(() => {
      setSlide((s: number) => s - 1);
      setAnimating(false);
    }, 300);
  }, [animating, slide]);

  useEffect(() => {
    if (slide !== 2) return;
    let start = 0;
    const step = Math.max(1, Math.floor(stats.runs / 40));
    const id = setInterval(() => {
      start += step;
      if (start >= stats.runs) { setRunsDisplay(stats.runs); clearInterval(id); }
      else setRunsDisplay(start);
    }, 30);
    return () => clearInterval(id);
  }, [slide, stats.runs]);

  useEffect(() => {
    if (slide !== 3) return;
    let start = 0;
    const step = Math.max(1, Math.floor(stats.wickets / 30));
    const id = setInterval(() => {
      start += step;
      if (start >= stats.wickets) { setWicketsDisplay(stats.wickets); clearInterval(id); }
      else setWicketsDisplay(start);
    }, 50);
    return () => clearInterval(id);
  }, [slide, stats.wickets]);

  useEffect(() => {
    if (slide !== 5) return;
    let start = 0;
    const step = Math.max(1, Math.floor(stats.clubPulseScore / 40));
    const id = setInterval(() => {
      start += step;
      if (start >= stats.clubPulseScore) { setScoreDisplay(stats.clubPulseScore); clearInterval(id); }
      else setScoreDisplay(start);
    }, 25);
    return () => clearInterval(id);
  }, [slide, stats.clubPulseScore]);

  async function handleShare() {
    const text = `My ${stats.year} cricket season on ClubPulse: ${stats.runs} runs, ${stats.wickets} wickets in ${stats.matches} matches. ClubPulse Score: ${stats.clubPulseScore}. "${superlative.title}" 🏏`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt('Copy your season summary:', text);
    }
  }

  const BIG: React.CSSProperties = {
    fontFamily: "'Arial Black', Arial, sans-serif",
    fontSize: 'clamp(80px, 20vw, 140px)',
    fontWeight: 900,
    lineHeight: 1,
  };

  const slides = [
    /* 0 — opener */
    <div key="opener" className="sw-slide">
      <div style={{ fontSize: '80px', marginBottom: '24px' }}>🏏</div>
      <p style={{ fontSize: '14px', letterSpacing: '5px', color: '#6ee7b7', marginBottom: '12px', textTransform: 'uppercase' }}>
        {stats.displayName}
      </p>
      <h1 className="sw-gold-pulse" style={{ fontFamily: "'Arial Black', Arial, sans-serif", fontSize: 'clamp(36px, 8vw, 64px)', fontWeight: 900, color: '#f59e0b', lineHeight: 1.1, margin: 0 }}>
        Your {stats.year}<br/>Season
      </h1>
      <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.5)', marginTop: '24px' }}>Tap to begin ›</p>
    </div>,

    /* 1 — matches */
    <div key="matches" className="sw-slide">
      <p style={{ fontSize: '13px', letterSpacing: '4px', color: '#6ee7b7', textTransform: 'uppercase', marginBottom: '16px' }}>This season you played</p>
      <div className="sw-count" style={{ ...BIG, color: '#ffffff' }}>{stats.matches}</div>
      <p style={{ fontSize: '22px', color: '#f59e0b', fontWeight: 700, marginTop: '8px' }}>{stats.matches === 1 ? 'match' : 'matches'}</p>
    </div>,

    /* 2 — runs */
    <div key="runs" className="sw-slide">
      <p style={{ fontSize: '13px', letterSpacing: '4px', color: '#6ee7b7', textTransform: 'uppercase', marginBottom: '16px' }}>You scored</p>
      <div style={{ ...BIG, color: '#f59e0b' }}>{runsDisplay}</div>
      <p style={{ fontSize: '22px', color: '#ffffff', fontWeight: 700, marginTop: '8px' }}>{runsDisplay === 1 ? 'run' : 'runs'}</p>
    </div>,

    /* 3 — wickets */
    <div key="wickets" className="sw-slide">
      <p style={{ fontSize: '13px', letterSpacing: '4px', color: '#6ee7b7', textTransform: 'uppercase', marginBottom: '16px' }}>You took</p>
      <div style={{ ...BIG, color: '#ffffff' }}>{wicketsDisplay}</div>
      <p style={{ fontSize: '22px', color: '#f59e0b', fontWeight: 700, marginTop: '8px' }}>{wicketsDisplay === 1 ? 'wicket' : 'wickets'}</p>
    </div>,

    /* 4 — superlative */
    <div key="superlative" className="sw-slide">
      <p style={{ fontSize: '13px', letterSpacing: '4px', color: '#6ee7b7', textTransform: 'uppercase', marginBottom: '32px' }}>This season you were</p>
      <div style={{ border: '2px solid #f59e0b', borderRadius: '16px', padding: '28px 32px', maxWidth: '320px', margin: '0 auto', background: 'rgba(245,158,11,0.08)' }}>
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>⭐</div>
        <h2 style={{ fontFamily: "'Arial Black', Arial, sans-serif", fontSize: '28px', fontWeight: 900, color: '#f59e0b', margin: '0 0 12px' }}>{superlative.title}</h2>
        <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.7)', margin: 0, lineHeight: 1.5 }}>{superlative.subtitle}</p>
      </div>
    </div>,

    /* 5 — score + share */
    <div key="score" className="sw-slide">
      <p style={{ fontSize: '13px', letterSpacing: '4px', color: '#6ee7b7', textTransform: 'uppercase', marginBottom: '16px' }}>Your ClubPulse score</p>
      <div className="sw-gold-pulse" style={{ ...BIG, color: '#f59e0b', fontSize: 'clamp(80px, 20vw, 130px)' }}>{scoreDisplay}</div>
      <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.5)', marginTop: '24px', maxWidth: '280px', lineHeight: 1.5 }}>Every match played, every contribution made — it all counts.</p>
      <button
        onClick={(e) => { e.stopPropagation(); handleShare(); }}
        style={{ marginTop: '32px', padding: '14px 32px', background: copied ? '#065f46' : '#f59e0b', color: copied ? '#6ee7b7' : '#0f2318', border: 'none', borderRadius: '10px', fontWeight: 900, fontSize: '15px', cursor: 'pointer', letterSpacing: '0.5px', transition: 'all 0.2s' }}
      >
        {copied ? '✓ Copied!' : '🔗 Share your season'}
      </button>
    </div>,
  ];

  return (
    <>
      <style>{`
        @keyframes sw-fadeup  { from { opacity:0; transform:translateY(40px); } to { opacity:1; transform:translateY(0); } }
        @keyframes sw-pulse   { 0%,100% { text-shadow:0 0 20px #f59e0b80; } 50% { text-shadow:0 0 40px #f59e0bcc,0 0 80px #f59e0b40; } }
        @keyframes sw-countup { from { opacity:0; transform:scale(0.7); } to { opacity:1; transform:scale(1); } }
        .sw-slide      { animation: sw-fadeup 0.6s ease both; text-align:center; }
        .sw-gold-pulse { animation: sw-pulse 2.5s ease-in-out infinite; }
        .sw-count      { animation: sw-countup 0.5s cubic-bezier(.17,.67,.35,1.3) both; }
      `}</style>

      <div
        onClick={goNext}
        style={{
          position: 'fixed', inset: 0,
          background: 'linear-gradient(135deg, #0a1f14 0%, #1a3326 60%, #0f2318 100%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          color: '#ffffff',
          cursor: slide < SLIDE_COUNT - 1 ? 'pointer' : 'default',
          userSelect: 'none',
          overflowY: 'auto',
          zIndex: 50,
        }}
      >
        {/* Progress dots */}
        <div style={{ position: 'fixed', top: '24px', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '8px', zIndex: 60 }}>
          {Array.from({ length: SLIDE_COUNT }).map((_, i) => (
            <div
              key={i}
              onClick={(e) => { e.stopPropagation(); setSlide(i); }}
              style={{ width: i === slide ? '24px' : '8px', height: '8px', borderRadius: '4px', background: i === slide ? '#f59e0b' : 'rgba(255,255,255,0.25)', transition: 'all 0.3s ease', cursor: 'pointer' }}
            />
          ))}
        </div>

        {/* Back arrow */}
        {slide > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            style={{ position: 'fixed', left: '20px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', fontSize: '24px', width: '44px', height: '44px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            ‹
          </button>
        )}

        {/* Slide content */}
        <div
          style={{
            padding: '80px 24px 60px', maxWidth: '480px', width: '100%',
            opacity: animating ? 0 : 1,
            transform: animating ? 'translateY(20px)' : 'translateY(0)',
            transition: 'opacity 0.3s ease, transform 0.3s ease',
          }}
        >
          {slides[slide]}
        </div>

        {/* Slide counter */}
        <div style={{ position: 'fixed', bottom: '24px', fontSize: '12px', color: 'rgba(255,255,255,0.3)', letterSpacing: '2px' }}>
          {slide + 1} / {SLIDE_COUNT}
        </div>
      </div>
    </>
  );
}
