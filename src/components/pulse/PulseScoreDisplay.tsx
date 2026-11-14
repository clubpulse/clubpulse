'use client';

import { useEffect, useState } from 'react';
import { getPulseRating, getPulseColor } from '@/lib/types/pulse-score';

interface PulseScoreDisplayProps {
  score: number;
}

export function PulseScoreDisplay({ score }: PulseScoreDisplayProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const rating = getPulseRating(score);
  const colorClass = getPulseColor(score);

  const size = 200;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = animatedScore / 100;
  const dashOffset = circumference * (1 - progress);

  const ringColor =
    score >= 80 ? '#16a34a' :
    score >= 60 ? '#2563eb' :
    score >= 40 ? '#ca8a04' :
    score >= 20 ? '#ea580c' :
    '#dc2626';

  const ratingEmoji =
    score >= 80 ? '🟢' :
    score >= 60 ? '🔵' :
    score >= 40 ? '🟡' :
    score >= 20 ? '🟠' :
    '🔴';

  useEffect(() => {
    const duration = 900;
    const steps = 60;
    const increment = score / steps;
    let current = 0;
    const timer = setInterval(() => {
      current = Math.min(current + increment, score);
      setAnimatedScore(Math.round(current));
      if (current >= score) clearInterval(timer);
    }, duration / steps);
    return () => clearInterval(timer);
  }, [score]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={strokeWidth}
          />
          {/* Progress */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 0.05s ease-out' }}
          />
        </svg>
        {/* Score inside ring */}
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '2px',
        }}>
          <span style={{ fontSize: '3rem', fontWeight: 800, lineHeight: 1, color: '#fff', fontFamily: "'Inter', sans-serif" }}>
            {animatedScore}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', fontFamily: "'Inter', sans-serif" }}>
            out of 100
          </span>
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <span style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: "'Inter', sans-serif" }} className={colorClass}>
          {ratingEmoji} {rating}
        </span>
      </div>
    </div>
  );
}
