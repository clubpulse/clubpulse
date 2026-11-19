// Pure. Works out which batting shot was played from the body positions found in a clip, so the
// player does not have to say. It reads the movement of the hands relative to the hips:
//   - hardly any movement            → leave
//   - a short push with no follow-through → defence
//   - a deep knee bend with the hips dropping → sweep
//   - hands travelling across at chest height or above → a cross-bat shot: pull if they finish
//     high, cut if they stay level
//   - otherwise, a full swing through the line → drive
// It is a best guess from one camera. The player can always pick the shot themselves.

import { L, MIN_VISIBILITY, angleAt, type Landmark, type ShotType } from './pose-metrics';

type P = { x: number; y: number };

const mid = (a: P, b: P): P => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const dist = (a: P, b: P) => Math.hypot(a.x - b.x, a.y - b.y);
const seen = (lm: Landmark[], ...ids: number[]) => ids.every((i) => lm[i] && (lm[i].visibility ?? 1) >= MIN_VISIBILITY);

export type Sample = { hands: P; hipY: number; knee: number };

/** One frame as hand position in torso lengths from the hips (y up is negative), or null if unclear. */
export function sample(lm: Landmark[], w: number, h: number): Sample | null {
  if (!seen(lm, L.lShoulder, L.rShoulder, L.lHip, L.rHip)) return null;
  const px = (i: number): P => ({ x: lm[i].x * w, y: lm[i].y * h });
  const hips = mid(px(L.lHip), px(L.rHip));
  const torso = dist(mid(px(L.lShoulder), px(L.rShoulder)), hips);
  if (!(torso > 1)) return null;
  const wrists = [L.lWrist, L.rWrist].filter((i) => seen(lm, i)).map(px);
  if (wrists.length === 0) return null;
  const hands = wrists.length === 2 ? mid(wrists[0], wrists[1]) : wrists[0];
  const knees = ([[L.lHip, L.lKnee, L.lAnkle], [L.rHip, L.rKnee, L.rAnkle]] as const)
    .filter((ids) => seen(lm, ...ids))
    .map(([a, b, c]) => angleAt(px(a), px(b), px(c)));
  return {
    hands: { x: (hands.x - hips.x) / torso, y: (hands.y - hips.y) / torso },
    hipY: hips.y / torso,
    knee: knees.length ? Math.min(...knees) : 180,
  };
}

export type ShotReading = { shot: ShotType; confident: boolean };

/**
 * The shot played in these frames. `confident` is false when the reading was close to a boundary
 * or there was too little to go on, so the screen can ask the player to check it.
 */
export function detectShot(frames: Landmark[][], w: number, h: number): ShotReading {
  const samples = frames.map((f) => sample(f, w, h)).filter((s): s is Sample => s !== null);
  if (samples.length < 6) return { shot: 'drive', confident: false };

  const xs = samples.map((s) => s.hands.x);
  const ys = samples.map((s) => s.hands.y);
  const spanX = Math.max(...xs) - Math.min(...xs);
  const spanY = Math.max(...ys) - Math.min(...ys);
  const span = Math.hypot(spanX, spanY);

  // The fastest moment of the swing: where the hands are and which way they are going
  let peak = 1, peakSpeed = 0;
  for (let i = 1; i < samples.length; i++) {
    const v = dist(samples[i].hands, samples[i - 1].hands);
    if (v > peakSpeed) { peakSpeed = v; peak = i; }
  }
  const a = samples[Math.max(0, peak - 2)].hands;
  const b = samples[Math.min(samples.length - 1, peak + 2)].hands;
  const across = Math.abs(b.x - a.x) > Math.abs(b.y - a.y) * 1.2;
  const heightAtPeak = samples[peak].hands.y;            // about -1 is shoulder height, 0 is hip height
  const finish = Math.min(...ys.slice(peak));            // the highest the hands get after the swing
  // A sweep is a deep knee bend during the swing itself. Looking only around the swing stops
  // walking in, crouching in the stance or picking up a ball from being read as one.
  const around = samples.slice(Math.max(0, peak - 8), peak + 9);
  const hipDrop = Math.max(...around.map((s) => s.hipY)) - samples[0].hipY;
  const lowestKnee = Math.min(...around.map((s) => s.knee));

  if (span < 0.3) return { shot: 'leave', confident: span < 0.22 };
  if (lowestKnee < 105 && hipDrop > 0.22) return { shot: 'sweep', confident: lowestKnee < 95 };
  if (span < 0.75 && finish > -0.95) return { shot: 'defence', confident: span < 0.6 };
  if (across && heightAtPeak < -0.4) {
    const pull = finish < -1.05;
    return { shot: pull ? 'pull' : 'cut', confident: Math.abs(finish + 1.05) > 0.15 };
  }
  return { shot: 'drive', confident: !across && spanY > 0.8 };
}
