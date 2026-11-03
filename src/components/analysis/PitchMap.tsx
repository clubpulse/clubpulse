'use client';

/**
 * PitchMap
 * --------
 * Renders a top-down cricket pitch with a bounce-point marker and
 * the smoothed ball trajectory overlaid.
 *
 * Props:
 *   pitchMap:    { px: 0–1, py: 0–1 } | null   — normalised bounce coords
 *   trajectory:  Array<{ x: number; y: number }> — raw pixel trajectory
 *                (will be normalised against resolution internally)
 *   resolution:  { w: number; h: number }        — original video dimensions
 *   speedKph:    number | null
 *   swingPx:     number                          — lateral movement in pixels
 *   bounceFrame: number | null
 */

import React, { useRef, useEffect } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

interface PitchCoord   { px: number; py: number }
interface TrajectoryPt { x: number; y: number }
interface Resolution   { w: number; h: number }

interface PitchMapProps {
  pitchMap?:    PitchCoord    | null;
  trajectory?:  TrajectoryPt[];
  resolution?:  Resolution    | null;
  speedKph?:    number        | null;
  swingPx?:     number;
  bounceFrame?: number        | null;
  className?:   string;
}

// ── Pitch geometry constants (relative, 0–1 space) ───────────────────────────

// Standard cricket pitch: 20.12 m long × 3.05 m wide (stumps to stumps)
// We pad 10% at each end for the crease run-ups.
const CREASE_TOP    = 0.10;   // bowling crease (top of pitch view)
const CREASE_BOTTOM = 0.90;   // batting crease (bottom)
const STUMP_LEFT    = 0.35;
const STUMP_RIGHT   = 0.65;
const POPPING_TOP   = 0.15;
const POPPING_BOT   = 0.85;

// Good length zone — py roughly 0.35–0.50
const GOOD_LENGTH_TOP = 0.35;
const GOOD_LENGTH_BOT = 0.50;

// ── Colour tokens (dark-first to match ClubPulse palette) ────────────────────

const C = {
  pitch:       '#c8a96e',
  pitchDark:   '#a07840',
  grass:       '#1a3a1a',
  crease:      'rgba(255,255,255,0.85)',
  stump:       '#f0ece4',
  goodLength:  'rgba(46,204,113,0.15)',
  goodLenBdr:  'rgba(46,204,113,0.4)',
  trajectory:  'rgba(201,165,76,0.7)',
  bounceRing:  '#1D4ED8',
  bounceFill:  '#ef4444',
  swingArrow:  'rgba(249,115,22,0.9)',
  text:        'rgba(240,236,228,0.8)',
  textDim:     'rgba(240,236,228,0.4)',
};

// ── Canvas renderer ───────────────────────────────────────────────────────────

function drawPitch(
  canvas: HTMLCanvasElement,
  props: PitchMapProps,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;

  const px  = (rel: number) => rel * W;
  const py  = (rel: number) => rel * H;

  ctx.clearRect(0, 0, W, H);

  // ── Background (grass) ──
  ctx.fillStyle = C.grass;
  ctx.fillRect(0, 0, W, H);

  // ── Pitch surface ──
  const pitchL = px(STUMP_LEFT  - 0.08);
  const pitchR = px(STUMP_RIGHT + 0.08);
  const pitchT = py(CREASE_TOP);
  const pitchB = py(CREASE_BOTTOM);

  const grad = ctx.createLinearGradient(pitchL, pitchT, pitchR, pitchB);
  grad.addColorStop(0,   C.pitchDark);
  grad.addColorStop(0.5, C.pitch);
  grad.addColorStop(1,   C.pitchDark);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(pitchL, pitchT, pitchR - pitchL, pitchB - pitchT, 4);
  ctx.fill();

  // ── Good length zone ──
  ctx.fillStyle = C.goodLength;
  ctx.strokeStyle = C.goodLenBdr;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.rect(pitchL, py(GOOD_LENGTH_TOP), pitchR - pitchL, py(GOOD_LENGTH_BOT) - py(GOOD_LENGTH_TOP));
  ctx.fill();
  ctx.stroke();

  // "Good length" label
  ctx.fillStyle = C.goodLenBdr;
  ctx.font      = `${Math.max(8, W * 0.035)}px Inter, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('good length', px(0.5), py((GOOD_LENGTH_TOP + GOOD_LENGTH_BOT) / 2) + 4);

  // ── Crease lines ──
  ctx.strokeStyle = C.crease;
  ctx.lineWidth   = 1.5;

  for (const yRel of [CREASE_TOP, POPPING_TOP, POPPING_BOT, CREASE_BOTTOM]) {
    const y = py(yRel);
    ctx.beginPath();
    ctx.moveTo(pitchL - 4, y);
    ctx.lineTo(pitchR + 4, y);
    ctx.stroke();
  }

  // ── Stumps ──
  ctx.strokeStyle = C.stump;
  ctx.lineWidth   = 2;
  const stumpGap = (px(STUMP_RIGHT) - px(STUMP_LEFT)) / 4;
  for (let i = 0; i <= 2; i++) {
    const sx = px(STUMP_LEFT) + stumpGap * (i + 0.5);
    for (const syRel of [CREASE_TOP, CREASE_BOTTOM]) {
      ctx.beginPath();
      ctx.moveTo(sx, py(syRel));
      ctx.lineTo(sx, py(syRel) + (syRel < 0.5 ? 10 : -10));
      ctx.stroke();
    }
  }

  // ── Ball trajectory ──
  if (props.trajectory && props.trajectory.length > 1 && props.resolution) {
    const { w: vidW, h: vidH } = props.resolution;

    // Normalise video-space coords into pitch canvas space
    // We map video X → pitch width, video Y → pitch length
    const pts = props.trajectory.map(pt => ({
      cx: pitchL + ((pt.x / vidW) * (pitchR - pitchL)),
      cy: pitchT  + ((pt.y / vidH) * (pitchB - pitchT)),
    }));

    ctx.strokeStyle = C.trajectory;
    ctx.lineWidth   = 2;
    ctx.lineJoin    = 'round';
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(pts[0].cx, pts[0].cy);
    for (const pt of pts.slice(1)) ctx.lineTo(pt.cx, pt.cy);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // ── Bounce point ──
  if (props.pitchMap) {
    const bx = pitchL + props.pitchMap.px * (pitchR - pitchL);
    const by = pitchT + props.pitchMap.py * (pitchB - pitchT);

    // Outer pulsing ring
    ctx.strokeStyle = C.bounceRing;
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.arc(bx, by, 10, 0, Math.PI * 2);
    ctx.stroke();

    // Inner fill
    ctx.fillStyle = C.bounceFill;
    ctx.beginPath();
    ctx.arc(bx, by, 5, 0, Math.PI * 2);
    ctx.fill();

    // Cross-hair
    ctx.strokeStyle = C.bounceRing;
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(bx - 14, by); ctx.lineTo(bx + 14, by);
    ctx.moveTo(bx, by - 14); ctx.lineTo(bx, by + 14);
    ctx.stroke();
  }

  // ── Swing arrow ──
  if (props.swingPx && Math.abs(props.swingPx) > 5 && props.pitchMap) {
    const bx  = pitchL + props.pitchMap.px * (pitchR - pitchL);
    const by  = pitchT + props.pitchMap.py * (pitchB - pitchT);
    // Scale swing: ±50px original → arrow length across half pitch width
    const swingNorm = Math.sign(props.swingPx) *
      Math.min(Math.abs(props.swingPx) / 120, 1);
    const arrowLen  = swingNorm * (pitchR - pitchL) * 0.4;

    ctx.strokeStyle = C.swingArrow;
    ctx.fillStyle   = C.swingArrow;
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.moveTo(bx - arrowLen, by + 10);
    ctx.lineTo(bx,            by + 10);
    ctx.stroke();

    // Arrow head
    ctx.beginPath();
    ctx.moveTo(bx,            by + 10);
    ctx.lineTo(bx - 6 * Math.sign(arrowLen), by + 6);
    ctx.lineTo(bx - 6 * Math.sign(arrowLen), by + 14);
    ctx.closePath();
    ctx.fill();
  }
}

// ── Stat pill ─────────────────────────────────────────────────────────────────

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      gap:            '2px',
      padding:        '8px 14px',
      background:     'rgba(255,255,255,0.04)',
      border:         '1px solid rgba(255,255,255,0.07)',
      borderRadius:   '10px',
      minWidth:       '72px',
    }}>
      <span style={{ fontSize: '18px', fontWeight: 700, color: '#f0ece4', letterSpacing: '-0.5px' }}>
        {value}
      </span>
      <span style={{ fontSize: '10px', color: 'rgba(240,236,228,0.45)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
        {label}
      </span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PitchMap({
  pitchMap,
  trajectory,
  resolution,
  speedKph,
  swingPx = 0,
  bounceFrame,
  className,
}: PitchMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawPitch(canvas, { pitchMap, trajectory, resolution, speedKph, swingPx, bounceFrame });
  }, [pitchMap, trajectory, resolution, speedKph, swingPx, bounceFrame]);

  // Swing direction label
  const swingLabel = Math.abs(swingPx) < 5
    ? 'straight'
    : swingPx > 0
      ? 'away swing'
      : 'in-swing';

  const swingAmt = Math.abs(swingPx) < 5 ? '—' : `${Math.abs(swingPx).toFixed(0)}px`;

  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={240}
        height={380}
        style={{
          width:        '100%',
          maxWidth:     '240px',
          height:       'auto',
          borderRadius: '12px',
          border:       '1px solid rgba(255,255,255,0.07)',
          display:      'block',
        }}
        aria-label="Cricket pitch map showing ball trajectory and bounce point"
      />

      {/* Stats row */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <StatPill
          label="Speed"
          value={speedKph != null ? `${speedKph} kph` : '—'}
        />
        <StatPill
          label="Swing"
          value={swingAmt}
        />
        <StatPill
          label="Shape"
          value={swingLabel}
        />
        <StatPill
          label="Bounce"
          value={bounceFrame != null ? `fr ${bounceFrame}` : '—'}
        />
      </div>
    </div>
  );
}
