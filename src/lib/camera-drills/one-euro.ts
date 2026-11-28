import type { PosePoint } from './pose';

/**
 * One Euro filter (Casiez, Roussel, Vogel 2012). Steady joints are smoothed hard so they stop shaking,
 * and the smoothing relaxes as a joint moves faster so a quick squat does not lag behind the body.
 * Times are in seconds. Coordinates are the model's 0 to 1 picture coordinates, so beta is larger than it
 * would be for pixels.
 */
export type OneEuroOptions = { minCutoff: number; beta: number; dCutoff: number };

export const POSE_FILTER: OneEuroOptions = { minCutoff: 1.2, beta: 5, dCutoff: 1 };

function alpha(cutoff: number, dt: number): number {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / dt);
}

export class OneEuroFilter {
  private x: number | null = null;
  private dx = 0;
  private last = 0;

  constructor(private readonly opts: OneEuroOptions = POSE_FILTER) {}

  reset() {
    this.x = null;
    this.dx = 0;
  }

  filter(value: number, t: number): number {
    if (!Number.isFinite(value)) return this.x ?? value;
    if (this.x === null) {
      this.x = value;
      this.last = t;
      return value;
    }
    const dt = t - this.last;
    if (!(dt > 0)) return this.x;
    this.last = t;
    const rawSpeed = (value - this.x) / dt;
    this.dx += alpha(this.opts.dCutoff, dt) * (rawSpeed - this.dx);
    const cutoff = this.opts.minCutoff + this.opts.beta * Math.abs(this.dx);
    this.x += alpha(cutoff, dt) * (value - this.x);
    return this.x;
  }
}

/** A joint below this visibility is not trusted: it is not drawn, and it is not used for an angle. */
export const VISIBILITY_MIN = 0.5;
/** A joint that was hidden for longer than this starts a fresh filter, so it does not glide from an old spot. */
export const STALE_AFTER_S = 0.3;

export type SmoothPoint = PosePoint & { visible: boolean };

/** Smooths all 33 body points frame to frame. Points below the visibility line pass through marked as hidden. */
export class PoseSmoother {
  private readonly fx: OneEuroFilter[] = [];
  private readonly fy: OneEuroFilter[] = [];
  private readonly seen: number[] = [];

  constructor(private readonly opts: OneEuroOptions = POSE_FILTER, private readonly minVisibility = VISIBILITY_MIN) {}

  reset() {
    this.fx.length = 0;
    this.fy.length = 0;
    this.seen.length = 0;
  }

  smooth(frame: PosePoint[], t: number): SmoothPoint[] {
    return frame.map((p, i) => {
      const trusted = Number.isFinite(p.x) && Number.isFinite(p.y) && (p.v ?? 1) >= this.minVisibility;
      if (!trusted) return { ...p, visible: false };
      this.fx[i] ??= new OneEuroFilter(this.opts);
      this.fy[i] ??= new OneEuroFilter(this.opts);
      if (this.seen[i] !== undefined && t - this.seen[i] > STALE_AFTER_S) {
        this.fx[i].reset();
        this.fy[i].reset();
      }
      this.seen[i] = t;
      return { x: this.fx[i].filter(p.x, t), y: this.fy[i].filter(p.y, t), v: p.v, visible: true };
    });
  }
}
