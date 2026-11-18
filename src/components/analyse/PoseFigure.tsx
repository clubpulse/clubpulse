'use client';

import { useEffect, useRef } from 'react';
import {
  L, MIN_VISIBILITY, ON_TARGET, angleAt, formatRange, formatValue, metricGuides, metricJoints,
  type Hand, type Landmark, type MetricResult, type Mode,
} from '@/lib/analysis/pose-metrics';

const GOLD = '#EFC84A';
const SIZE = 340;

// Body segments to draw (MediaPipe Pose indices)
const BONES: [number, number][] = [
  [L.lShoulder, L.rShoulder], [L.lShoulder, L.lElbow], [L.lElbow, L.lWrist], [L.rShoulder, L.rElbow], [L.rElbow, L.rWrist],
  [L.lShoulder, L.lHip], [L.rShoulder, L.rHip], [L.lHip, L.rHip],
  [L.lHip, L.lKnee], [L.lKnee, L.lAnkle], [L.rHip, L.rKnee], [L.rKnee, L.rAnkle],
  [L.lAnkle, 31], [L.rAnkle, 32], [L.lAnkle, 29], [L.rAnkle, 30],
];

function colourFor(score: number) {
  if (score >= ON_TARGET) return GOLD;
  if (score >= 60) return '#f59e0b';
  return '#ef4444';
}

/**
 * The biomechanics figure: the player's body position at one moment, drawn large on its own,
 * with the measured joint angles marked and coloured by how they scored. It is cropped to the
 * player, so it stays readable even when they are small in the video.
 */
export function PoseFigure({ pose, width, height, metrics, mode, hand, mirrored, labels = 'measured', bat, size = SIZE, label }: {
  pose: Landmark[]; width: number; height: number; metrics: MetricResult[]; mode: Mode; hand: Hand; mirrored?: boolean;
  /** 'measured' writes the angle in this position; 'target' writes the range to aim for (for the textbook figure) */
  labels?: 'measured' | 'target';
  /** Bat to draw, from the hands to the toe, in the same 0 to 1 units as the pose */
  bat?: [number, number, number, number] | null;
  size?: number;
  label?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const ratio = Math.min(3, window.devicePixelRatio || 1);
    canvas.width = size * ratio;
    canvas.height = size * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, size, size);

    const seen = (i: number) => (pose[i]?.visibility ?? 0) >= MIN_VISIBILITY;
    // Work in video pixels so angles are true, then fit the player's bounding box to the canvas
    const raw = (i: number) => ({ x: (mirrored ? 1 - pose[i].x : pose[i].x) * width, y: pose[i].y * height });
    const body = pose.map((_, i) => i).filter((i) => (i === 0 || i >= 11) && seen(i));
    if (body.length < 4) return;
    const xs = body.map((i) => raw(i).x);
    const ys = body.map((i) => raw(i).y);
    // Keep the whole bat in the picture too
    if (bat) {
      xs.push((mirrored ? 1 - bat[0] : bat[0]) * width, (mirrored ? 1 - bat[2] : bat[2]) * width);
      ys.push(bat[1] * height, bat[3] * height);
    }
    const boxW = Math.max(1, Math.max(...xs) - Math.min(...xs));
    const boxH = Math.max(1, Math.max(...ys) - Math.min(...ys));
    const pad = size * 0.14;
    const scale = Math.min((size - pad * 2) / boxW, (size - pad * 2) / boxH);
    const offsetX = (size - boxW * scale) / 2 - Math.min(...xs) * scale;
    const offsetY = (size - boxH * scale) / 2 - Math.min(...ys) * scale;
    const at = (i: number) => ({ x: raw(i).x * scale + offsetX, y: raw(i).y * scale + offsetY });

    // Ground line under the lower foot
    const ground = Math.max(...body.map((i) => at(i).y)) + 6;
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(16, ground);
    ctx.lineTo(size - 16, ground);
    ctx.stroke();

    // Bat, behind the body
    if (bat) {
      const flip = (x: number) => (mirrored ? 1 - x : x) * width;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#C8A46B';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(flip(bat[0]) * scale + offsetX, bat[1] * height * scale + offsetY);
      ctx.lineTo(flip(bat[2]) * scale + offsetX, bat[3] * height * scale + offsetY);
      ctx.stroke();
    }

    // Skeleton
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 5;
    for (const [a, b] of BONES) {
      if (!seen(a) || !seen(b)) continue;
      ctx.beginPath();
      ctx.moveTo(at(a).x, at(a).y);
      ctx.lineTo(at(b).x, at(b).y);
      ctx.stroke();
    }
    // Head
    if (seen(L.nose) && seen(L.lShoulder) && seen(L.rShoulder)) {
      const shoulderWidth = Math.hypot(at(L.lShoulder).x - at(L.rShoulder).x, at(L.lShoulder).y - at(L.rShoulder).y);
      const torso = seen(L.lHip) ? Math.hypot(at(L.lShoulder).x - at(L.lHip).x, at(L.lShoulder).y - at(L.lHip).y) : shoulderWidth;
      ctx.beginPath();
      ctx.arc(at(L.nose).x, at(L.nose).y, Math.max(9, Math.max(shoulderWidth, torso) * 0.2), 0, Math.PI * 2);
      ctx.fillStyle = '#0B0B0B';
      ctx.fill();
      ctx.stroke();
    }
    // Joints
    for (const i of body) {
      if (i === 0 || i > 28) continue;
      ctx.beginPath();
      ctx.arc(at(i).x, at(i).y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#1D4ED8';
      ctx.fill();
    }

    ctx.font = '600 13px Inter, system-ui, sans-serif';
    // Where labels have gone so far, so a new one can be moved clear of them
    const placed: { x: number; y: number; w: number }[] = [];
    const writeLabel = (text: string, x: number, y: number, colour: string) => {
      const textWidth = ctx.measureText(text).width;
      const lx = Math.min(size - textWidth - 8, Math.max(8, x - textWidth / 2));
      let ly = Math.min(size - 10, Math.max(16, y));
      const clashes = () => placed.some((other) => Math.abs(other.y - ly) < 19 && lx < other.x + other.w + 8 && other.x < lx + textWidth + 8);
      for (let tries = 0; tries < 6 && clashes(); tries++) ly = Math.min(size - 10, ly + 20);
      placed.push({ x: lx, y: ly, w: textWidth });
      ctx.fillStyle = 'rgba(11,11,11,0.85)';
      ctx.fillRect(lx - 4, ly - 13, textWidth + 8, 18);
      ctx.fillStyle = colour;
      ctx.fillText(text, lx, ly);
    };

    // Measures that are a line or an alignment, not a joint angle: eye line, arm, trunk, plumb lines
    for (const metric of metrics) {
      const colour = labels === 'target' ? GOLD : colourFor(metric.score);
      for (const guide of metricGuides(metric.key, pose, mode, hand)) {
        const place = (point: { x: number; y: number }) => ({
          x: (mirrored ? 1 - point.x : point.x) * width * scale + offsetX,
          y: point.y * height * scale + offsetY,
        });
        const from = place(guide.from);
        const to = place(guide.to);
        ctx.save();
        ctx.strokeStyle = colour;
        ctx.lineWidth = guide.plumb ? 2 : 4;
        if (guide.plumb) ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
        ctx.restore();
        const text = labels === 'target' ? formatRange(metric).replace(/° to /, '–') : formatValue(metric);
        // Beside the line, to the right of its middle
        writeLabel(text, (from.x + to.x) / 2 + 34, (from.y + to.y) / 2 + 5, colour);
      }
    }

    // Measured angles: the two limbs picked out in colour, an arc at the joint and the angle beside it
    for (const metric of metrics) {
      for (const [a, joint, c] of metricJoints(metric.key, mode, hand)) {
        if (!seen(a) || !seen(joint) || !seen(c)) continue;
        const colour = labels === 'target' ? GOLD : colourFor(metric.score);
        const pa = at(a);
        const pj = at(joint);
        const pc = at(c);
        ctx.strokeStyle = colour;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pj.x, pj.y);
        ctx.lineTo(pc.x, pc.y);
        ctx.stroke();

        const start = Math.atan2(pa.y - pj.y, pa.x - pj.x);
        const end = Math.atan2(pc.y - pj.y, pc.x - pj.x);
        let sweep = end - start;
        while (sweep > Math.PI) sweep -= Math.PI * 2;
        while (sweep < -Math.PI) sweep += Math.PI * 2;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pj.x, pj.y, 15, start, start + sweep, sweep < 0);
        ctx.stroke();

        // Label on the outside of the bend, kept inside the canvas
        const middle = start + sweep / 2;
        const text = labels === 'target'
          ? `${metric.ideal[0]}–${metric.ideal[1]}°`
          : `${Math.round(angleAt(raw(a), raw(joint), raw(c)))}°`;
        writeLabel(text, pj.x - Math.cos(middle) * 30, pj.y - Math.sin(middle) * 30 + 5, colour);
      }
    }
  }, [pose, width, height, metrics, mode, hand, mirrored, labels, bat, size]);

  return (
    <canvas ref={ref} role="img" aria-label={label ?? 'Diagram of your body position with the measured joint angles marked'}
      className="mx-auto block rounded-xl" style={{ width: size, maxWidth: '100%', aspectRatio: '1', background: '#0B0B0B' }} />
  );
}
