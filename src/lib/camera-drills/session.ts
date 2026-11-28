import { PoseSmoother } from './one-euro';
import { J, armLift, point, type PosePoint } from './pose';
import type { DrillDef } from './plan';
import {
  HoldTimer, RepCounter, SQUAT_CONFIG, bestKneeAngle, depthForm, plankInPosition, type RepConfig,
} from './rep-counter';
import { balanceHoldSeconds, countJumps, shoulderRange } from './reps';
import { ringCue, ringFill } from './ring';

/** The reach drill: the signal is 180 minus the arm lift, so an arm hanging down reads 180 and an arm overhead reads near 0. */
export const REACH_CONFIG: RepConfig = { down: 50, up: 150, start: 140, minRepSeconds: 0.5 };
/** Foot off the ground by this much of the picture height counts as lifted. */
const FOOT_LIFT = 0.06;

export type Readout = {
  mode: DrillDef['mode'];
  /** Reps counted, seconds held, degrees moved, or bounces. The ring and the big number both show this. */
  count: number;
  target: number;
  unit: DrillDef['unit'];
  /** 0 to 1. The ring fills with the count, not with form. */
  fill: number;
  form: number;
  cue: string;
  /** The number shown large, such as "3 / 8 reps" or "0:12". */
  big: string;
  /** For a hold: true while the person is in position. */
  holding: boolean;
};

export type DrillResult = { fill: number; form: number; score: number; detail: Record<string, number>; line: string };

export function formatSeconds(s: number): string {
  const whole = Math.max(0, Math.floor(s));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

/**
 * Everything the camera page knows about one drill run, with no browser in it. The page feeds it each pose and reads
 * back the count to show. Only the score and the few numbers in `result().detail` are ever saved: the poses
 * kept here are dropped when the run ends and the video never leaves the phone.
 */
export class DrillTracker {
  private readonly smoother = new PoseSmoother();
  private frames: PosePoint[][] = [];
  private times: number[] = [];
  private readonly reps: RepCounter;
  private readonly left = new HoldTimer(0.5);
  private readonly right = new HoldTimer(0.5);
  private readonly plank = new HoldTimer(1);
  private plankSeen = false;

  constructor(private readonly drill: DrillDef) {
    this.reps = new RepCounter(drill.key === 'reach' ? REACH_CONFIG : SQUAT_CONFIG);
  }

  /** Takes the raw pose (visibility on `v`) and the seconds since the run began. Returns the smoothed pose for drawing. */
  push(raw: PosePoint[], t: number): { pose: PosePoint[]; readout: Readout } {
    const pose = this.smoother.smooth(raw, t);
    this.frames.push(pose);
    this.times.push(t);
    if (this.drill.key === 'squat') this.reps.push(bestKneeAngle(pose), t);
    else if (this.drill.key === 'reach') this.reps.push(reachSignal(pose), t);
    else if (this.drill.key === 'balance') {
      this.left.push(footLifted(pose, 'left'), t);
      this.right.push(footLifted(pose, 'right'), t);
    } else if (this.drill.key === 'plank') {
      const inPosition = plankInPosition(pose);
      if (inPosition !== null) this.plankSeen = true;
      this.plank.push(inPosition, t);
    }
    return { pose, readout: this.readout() };
  }

  readout(): Readout {
    const d = this.drill;
    const base = { mode: d.mode, target: d.target, unit: d.unit } as const;
    if (d.key === 'squat' || d.key === 'reach') {
      const s = this.reps.state();
      const form = d.key === 'reach' ? 1 : depthForm(s.deepest);
      const fill = clamp01(s.reps / d.target);
      return { ...base, count: s.reps, fill, form, cue: this.repCue(fill, form, s.partials), big: `${s.reps} / ${d.target} reps`, holding: s.phase === 'down' };
    }
    if (d.key === 'balance') {
      const l = this.left.read();
      const r = this.right.read();
      const held = Math.min(l.total, r.total);
      const fill = clamp01(held / d.target);
      const now = Math.max(l.current, r.current);
      return { ...base, count: held, fill, form: held > 0 ? 1 : 0, cue: l.holding || r.holding ? 'Hold it steady' : ringCue(fill, held > 0 ? 1 : 0), big: formatSeconds(now), holding: l.holding || r.holding };
    }
    if (d.key === 'plank') {
      const h = this.plank.read();
      const fill = clamp01(h.best / d.target);
      const cue = fill >= 1 ? 'Nice work' : h.holding ? 'Hold it. Keep your body in one line' : this.plankSeen ? 'Back into a straight line to keep counting' : 'Get into a plank with your whole body in view';
      return { ...base, count: h.best, fill, form: 1, cue, big: formatSeconds(h.current), holding: h.holding };
    }
    const result = this.result();
    const count = d.key === 'shoulder' ? (result.detail.degrees ?? 0) : (result.detail.reps ?? 0);
    return { ...base, count, fill: result.fill, form: result.form, cue: ringCue(result.fill, result.form), big: d.key === 'shoulder' ? `${count}°` : `${count} bounces`, holding: false };
  }

  result(): DrillResult {
    const d = this.drill;
    if (d.key === 'squat' || d.key === 'reach') {
      const s = this.reps.state();
      const form = d.key === 'reach' ? 1 : depthForm(s.deepest);
      const fill = ringFill(s.reps, d.target, form);
      return { fill, form, score: Math.round(fill * 100), detail: { reps: s.reps, deepest: Math.round(s.deepest), partials: s.partials }, line: `${s.reps} reps. Score ${Math.round(fill * 100)}.` };
    }
    if (d.key === 'balance') {
      const left = balanceHoldSeconds(this.frames.map((f, i) => ({ freeY: f[J.lAnkle]?.y ?? 1, standY: f[J.rAnkle]?.y ?? 1, t: this.times[i] ?? 0 })), FOOT_LIFT);
      const right = balanceHoldSeconds(this.frames.map((f, i) => ({ freeY: f[J.rAnkle]?.y ?? 1, standY: f[J.lAnkle]?.y ?? 1, t: this.times[i] ?? 0 })), FOOT_LIFT);
      const held = Math.min(left, right);
      const fill = ringFill(held, d.target, held > 0 ? 1 : 0);
      return { fill, form: held > 0 ? 1 : 0, score: Math.round(fill * 100), detail: { left, right }, line: `Left ${left}s, right ${right}s. Score ${Math.round(fill * 100)}.` };
    }
    if (d.key === 'plank') {
      const h = this.plank.read();
      const fill = ringFill(h.best, d.target, 1);
      return { fill, form: 1, score: Math.round(fill * 100), detail: { seconds: h.best, total: h.total }, line: `Held ${formatSeconds(h.best)}. Score ${Math.round(fill * 100)}.` };
    }
    if (d.key === 'shoulder') {
      const range = shoulderRange(this.frames);
      const fill = ringFill(range.range, d.target, range.form);
      return { fill, form: range.form, score: Math.round(fill * 100), detail: { degrees: range.range }, line: `${range.range} degrees of movement. Score ${Math.round(fill * 100)}.` };
    }
    const ground = this.frames[0]?.[J.lAnkle]?.y ?? 1;
    const jumps = countJumps(this.frames.map((f, i) => ({ ankleY: Math.min(f[J.lAnkle]?.y ?? 1, f[J.rAnkle]?.y ?? 1), t: this.times[i] ?? 0 })), ground);
    const fill = ringFill(jumps.reps, d.target, jumps.form);
    return { fill, form: jumps.form, score: Math.round(fill * 100), detail: { reps: jumps.reps, flight: jumps.flight }, line: `${jumps.reps} bounces. Score ${Math.round(fill * 100)}.` };
  }

  /** Drops every pose. Called when the run ends. */
  clear() {
    this.frames = [];
    this.times = [];
    this.smoother.reset();
  }

  private repCue(fill: number, form: number, partials: number): string {
    if (fill >= 0.999) return 'Nice work';
    if (partials > 0 && form < 0.8) return 'Go a little lower, then stand tall';
    return ringCue(fill, form);
  }
}

function clamp01(n: number): number {
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0;
}

/** 180 when both arms hang down, near 0 when an arm is overhead. null when no arm can be seen. */
export function reachSignal(frame: PosePoint[]): number | null {
  const lifts = [armLift(frame, 'left'), armLift(frame, 'right')].filter((n): n is number => n !== null);
  return lifts.length === 0 ? null : 180 - Math.max(...lifts);
}

/** True while this foot is clearly off the ground. null when an ankle cannot be seen. */
export function footLifted(frame: PosePoint[], side: 'left' | 'right'): boolean | null {
  const free = point(frame, side === 'left' ? J.lAnkle : J.rAnkle);
  const stand = point(frame, side === 'left' ? J.rAnkle : J.lAnkle);
  if (!free || !stand) return null;
  return stand.y - free.y >= FOOT_LIFT;
}
