/**
 * Segment lengths from a T-pose, or from the middle of the clip when the player skips that.
 * A frame whose limb suddenly shrinks or stretches is pulled back onto that length.
 * Event finding stays on the original points; only the angles are read from the repaired copy.
 */
export type LengthPoint = { x: number; y: number; visibility?: number };

/** Shoulder to elbow, elbow to wrist, hip to knee, knee to ankle, shoulder to hip. Both sides. */
export const BONE_SEGMENTS: readonly [number, number][] = [
  [11, 13], [13, 15], [12, 14], [14, 16],
  [23, 25], [25, 27], [24, 26], [26, 28],
  [11, 23], [12, 24],
];

export type BoneLengths = Record<string, number>;

const MIN_VIS = 0.5;

function key(a: number, b: number) {
  return `${a}-${b}`;
}

function length(frame: LengthPoint[], a: number, b: number, w: number, h: number): number | null {
  const from = frame[a];
  const to = frame[b];
  if (!from || !to || (from.visibility ?? 0) < MIN_VIS || (to.visibility ?? 0) < MIN_VIS) return null;
  return Math.hypot((from.x - to.x) * w, (from.y - to.y) * h);
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
}

/** The player's segment lengths. Pass the two-second T-pose, or the whole clip. */
export function estimateBoneLengths(frames: LengthPoint[][], w: number, h: number): BoneLengths {
  const lengths: BoneLengths = {};
  for (const [a, b] of BONE_SEGMENTS) {
    const samples: number[] = [];
    for (const frame of frames) {
      const value = length(frame, a, b, w, h);
      if (value != null && value > 1) samples.push(value);
    }
    if (samples.length > 0) lengths[key(a, b)] = median(samples);
  }
  return lengths;
}

/**
 * Move a joint back along the bone when that bone is more than 35% off the player's length.
 * Clean frames are copied through unchanged.
 */
export function repairBoneLengths<T extends LengthPoint>(frames: T[][], w: number, h: number, prior?: BoneLengths): T[][] {
  const reference = prior && Object.keys(prior).length > 0 ? prior : estimateBoneLengths(frames, w, h);
  const near = (frame: T[] | undefined, a: number, b: number, expected: number) => {
    if (!frame) return false;
    const value = length(frame, a, b, w, h);
    return value != null && Math.abs(value - expected) / expected <= 0.35;
  };
  return frames.map((frame, index) => {
    const next = frame.map((point) => ({ ...point })) as T[];
    for (const [proximal, distal] of BONE_SEGMENTS) {
      // The trunk is the reference the head is measured against. Pulling a hip
      // back onto a length invents a head wobble, so only the limbs are repaired.
      if ((proximal === 11 && distal === 23) || (proximal === 12 && distal === 24)) continue;
      const expected = reference[key(proximal, distal)];
      const from = next[proximal];
      const to = next[distal];
      if (!expected || expected < 1 || !from || !to) continue;
      if ((from.visibility ?? 0) < MIN_VIS || (to.visibility ?? 0) < MIN_VIS) continue;
      const dx = (to.x - from.x) * w;
      const dy = (to.y - from.y) * h;
      const current = Math.hypot(dx, dy);
      if (current < 1) continue;
      if (Math.abs(current - expected) / expected <= 0.35) continue;
      // A short limb that stays short is the arm pointing at the camera, not a glitch.
      // Only a frame that jumps away from a neighbour at the usual length is pulled back.
      const sudden = near(frames[index - 1], proximal, distal, expected) || near(frames[index + 1], proximal, distal, expected);
      if (!sudden) continue;
      const scale = expected / current;
      next[distal] = { ...to, x: from.x + (dx * scale) / w, y: from.y + (dy * scale) / h };
    }
    return next;
  });
}
