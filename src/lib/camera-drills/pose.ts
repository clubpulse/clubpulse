import { VISIBILITY_MIN } from './one-euro';

/** A body point from the in-browser pose model. y grows downward, the same way the picture is drawn. */
export type PosePoint = { x: number; y: number; v?: number };

export const J = {
  lShoulder: 11, rShoulder: 12, lElbow: 13, rElbow: 14, lWrist: 15, rWrist: 16,
  lHip: 23, rHip: 24, lKnee: 25, rKnee: 26, lAnkle: 27, rAnkle: 28,
} as const;

export function point(frame: PosePoint[] | undefined, index: number): PosePoint | null {
  const p = frame?.[index];
  if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return null;
  if ((p.v ?? 1) < VISIBILITY_MIN) return null;
  return p;
}

/** Interior angle at b, in degrees. 180 is straight. */
export function jointAngle(a: PosePoint, b: PosePoint, c: PosePoint): number {
  const abx = a.x - b.x;
  const aby = a.y - b.y;
  const cbx = c.x - b.x;
  const cby = c.y - b.y;
  const mag = Math.hypot(abx, aby) * Math.hypot(cbx, cby);
  if (mag < 1e-6) return 180;
  const cos = Math.min(1, Math.max(-1, (abx * cbx + aby * cby) / mag));
  return (Math.acos(cos) * 180) / Math.PI;
}

export function kneeAngle(frame: PosePoint[], side: 'left' | 'right'): number | null {
  const hip = point(frame, side === 'left' ? J.lHip : J.rHip);
  const knee = point(frame, side === 'left' ? J.lKnee : J.rKnee);
  const ankle = point(frame, side === 'left' ? J.lAnkle : J.rAnkle);
  if (!hip || !knee || !ankle) return null;
  return jointAngle(hip, knee, ankle);
}

/** How far the arm has lifted from hanging down, in degrees. 0 is down, 180 is overhead. */
export function armLift(frame: PosePoint[], side: 'left' | 'right'): number | null {
  const shoulder = point(frame, side === 'left' ? J.lShoulder : J.rShoulder);
  const hip = point(frame, side === 'left' ? J.lHip : J.rHip);
  const wrist = point(frame, side === 'left' ? J.lWrist : J.rWrist);
  if (!shoulder || !hip || !wrist) return null;
  const down = { x: hip.x - shoulder.x, y: hip.y - shoulder.y };
  const arm = { x: wrist.x - shoulder.x, y: wrist.y - shoulder.y };
  const mag = Math.hypot(down.x, down.y) * Math.hypot(arm.x, arm.y);
  if (mag < 1e-6) return null;
  const cos = Math.min(1, Math.max(-1, (down.x * arm.x + down.y * arm.y) / mag));
  return (Math.acos(cos) * 180) / Math.PI;
}
