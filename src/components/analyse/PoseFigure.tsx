'use client';

import { useEffect, useRef } from 'react';
import { MIN_VISIBILITY, type Hand, type Landmark, type MetricResult, type Mode, type ShotType, type View } from '@/lib/analysis/pose-metrics';
import { paintOverlay, pickHighlights } from '@/lib/analysis/pose-overlay';

const SIZE = 340;

/**
 * The biomechanics figure: the player's body position at one moment, drawn large on its own,
 * with the measured joint angles marked and coloured by how they scored. It is cropped to the
 * player, so it stays readable even when they are small in the video.
 */
export function PoseFigure({ pose, width, height, metrics, mode, hand, view = 'side', shot, mirrored, labels = 'measured', bat, size = SIZE, label }: {
  pose: Landmark[]; width: number; height: number; metrics: MetricResult[]; mode: Mode; hand: Hand; view?: View; shot?: ShotType; mirrored?: boolean;
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

    const pixels = pose.map((point, index) => {
      const placed = at(index);
      return { x: placed.x, y: placed.y, visibility: point?.visibility ?? 0 };
    });
    paintOverlay(ctx, pixels, {
      mode,
      hand,
      highlights: pickHighlights(metrics, mode, hand, view, shot, labels === 'target'),
      scale: 1,
      headCap: 22 * (size / 720),
    });
  }, [pose, width, height, metrics, mode, hand, view, shot, mirrored, labels, bat, size]);

  return (
    <canvas ref={ref} role="img" aria-label={label ?? 'Diagram of your body position with the measured joint angles marked'}
      className="mx-auto block rounded-xl" style={{ width: size, maxWidth: '100%', aspectRatio: '1', background: '#0B0B0B' }} />
  );
}
