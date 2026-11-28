import { J, kneeAngle, point, type PosePoint, jointAngle } from './pose';

/**
 * Counts full down-and-up cycles of one angle (the knee, for a squat).
 *
 * Two lines with a gap between them keep a shaky reading from counting twice:
 *  - the angle must fall to `down` or lower to be "down",
 *  - and it must rise back to `up` or higher to be "up" again.
 * Inside the gap nothing changes. A rep is counted when the person returns to "up" after being "down".
 * A dip that starts but never reaches `down` is counted as a partial, not a rep.
 */
export type RepConfig = {
  /** Angle at or below this is the bottom of the movement. */
  down: number;
  /** Angle at or above this is standing again. */
  up: number;
  /** Below this the person has started to go down, so a shallow dip can be told apart from a wobble. */
  start: number;
  /** Seconds a rep must take at least, from leaving "up" to returning. Quicker is noise. */
  minRepSeconds: number;
};

export const SQUAT_CONFIG: RepConfig = { down: 110, up: 155, start: 145, minRepSeconds: 0.5 };

export type RepState = { reps: number; partials: number; deepest: number; phase: 'up' | 'down'; lastRepAt: number | null };

export class RepCounter {
  private phase: 'up' | 'down' = 'up';
  private reps = 0;
  private partials = 0;
  private deepest = 180;
  private started = false;
  private reached = false;
  private leftUpAt = 0;
  private lastRepAt: number | null = null;

  constructor(private readonly cfg: RepConfig = SQUAT_CONFIG) {}

  /** Feed one reading. A missing reading (NaN or null) is skipped, never counted as standing or as down. */
  push(angle: number | null | undefined, t: number): RepState {
    if (angle !== null && angle !== undefined && Number.isFinite(angle)) this.step(angle, t);
    return this.state();
  }

  state(): RepState {
    return { reps: this.reps, partials: this.partials, deepest: this.deepest, phase: this.phase, lastRepAt: this.lastRepAt };
  }

  private step(angle: number, t: number) {
    this.deepest = Math.min(this.deepest, angle);
    if (!this.started) {
      if (angle < this.cfg.start) {
        this.started = true;
        this.leftUpAt = t;
        this.reached = false;
      }
    }
    if (this.started && angle <= this.cfg.down) {
      this.reached = true;
      this.phase = 'down';
    }
    if (this.started && angle >= this.cfg.up) {
      if (this.reached && t - this.leftUpAt >= this.cfg.minRepSeconds) {
        this.reps += 1;
        this.lastRepAt = t;
      } else if (!this.reached) {
        this.partials += 1;
      }
      this.started = false;
      this.reached = false;
      this.phase = 'up';
    }
  }
}

export function countCycles(angles: number[], times: number[] | null, cfg: RepConfig = SQUAT_CONFIG): RepState {
  const counter = new RepCounter(cfg);
  angles.forEach((angle, i) => counter.push(angle, times?.[i] ?? i / 30));
  return counter.state();
}

/**
 * The knee angle for one frame. When both legs are visible the two are averaged, which is steadier than one leg
 * and works for a front-on or a side-on phone. When only one leg is visible, that one is used.
 */
export function bestKneeAngle(frame: PosePoint[]): number | null {
  const l = kneeAngle(frame, 'left');
  const r = kneeAngle(frame, 'right');
  if (l !== null && r !== null) return (l + r) / 2;
  return l ?? r;
}

/** Score for how well the deepest point reached the depth line: 1 at or below it, falling to 0 at standing. */
export function depthForm(deepest: number, cfg: RepConfig = SQUAT_CONFIG): number {
  const span = cfg.up - cfg.down;
  return span <= 0 ? 0 : Math.min(1, Math.max(0, (cfg.up - deepest) / span));
}

/**
 * Timed hold. Time counts while the person is in position. A short loss of the body (a dropped frame, a blink of
 * low confidence) does not end the hold, but a real break does. The longest hold and the total are both kept.
 */
export class HoldTimer {
  private since: number | null = null;
  private lastIn = 0;
  private current = 0;
  private best = 0;
  private total = 0;

  constructor(private readonly graceSeconds = 0.5) {}

  push(inPosition: boolean | null, t: number): { current: number; best: number; total: number; holding: boolean } {
    if (inPosition === true) {
      if (this.since === null) this.since = t;
      this.lastIn = t;
      this.current = t - this.since;
    } else if (this.since !== null) {
      const away = t - this.lastIn;
      // null means "could not see the body": it only counts against the hold once the grace time has gone.
      if (inPosition === false || away > this.graceSeconds) this.endHold();
    }
    return this.read();
  }

  private endHold() {
    this.total += this.current;
    this.best = Math.max(this.best, this.current);
    this.since = null;
    this.current = 0;
  }

  read() {
    return {
      current: round1(this.current),
      best: round1(Math.max(this.best, this.current)),
      total: round1(this.total + this.current),
      holding: this.since !== null,
    };
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Plank check from a side-on phone: shoulder, hip and ankle make a straight line (angle near 180) and that line lies
 * close to flat. Returns null when the body points are not visible enough to say.
 */
export function plankInPosition(frame: PosePoint[], opts: { straight?: number; maxTilt?: number } = {}): boolean | null {
  const straight = opts.straight ?? 155;
  const maxTilt = opts.maxTilt ?? 30;
  for (const side of ['left', 'right'] as const) {
    const shoulder = point(frame, side === 'left' ? J.lShoulder : J.rShoulder);
    const hip = point(frame, side === 'left' ? J.lHip : J.rHip);
    const ankle = point(frame, side === 'left' ? J.lAnkle : J.rAnkle);
    if (!shoulder || !hip || !ankle) continue;
    const line = jointAngle(shoulder, hip, ankle);
    const tilt = Math.abs((Math.atan2(ankle.y - shoulder.y, Math.abs(ankle.x - shoulder.x)) * 180) / Math.PI);
    return line >= straight && tilt <= maxTilt;
  }
  return null;
}
