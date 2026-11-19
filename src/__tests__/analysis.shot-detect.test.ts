import { detectShot } from '@/lib/analysis/shot-detect';
import { L, type Landmark } from '@/lib/analysis/pose-metrics';

// A stick figure 1000 x 1000: shoulders at y 300, hips at y 500 (torso 200), feet at 900.
// `hands` is given in torso lengths from the hips; `crouch` lowers the hips and bends the knees.
function frame(hands: [number, number], crouch = 0): Landmark[] {
  const lm: Landmark[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0 }));
  const set = (i: number, x: number, y: number) => { lm[i] = { x: x / 1000, y: y / 1000, visibility: 0.9 }; };
  const drop = crouch * 200;
  set(L.lShoulder, 480, 300 + drop); set(L.rShoulder, 520, 300 + drop);
  set(L.lHip, 485, 500 + drop); set(L.rHip, 515, 500 + drop);
  // Knees move forward as the hips drop, which closes the knee angle
  set(L.lKnee, 485 + crouch * 260, 700 + drop * 0.6); set(L.rKnee, 515 + crouch * 260, 700 + drop * 0.6);
  set(L.lAnkle, 485, 900); set(L.rAnkle, 515, 900);
  const hx = 500 + hands[0] * 200, hy = 500 + drop + hands[1] * 200;
  set(L.lWrist, hx - 8, hy); set(L.rWrist, hx + 8, hy);
  return lm;
}

/** Hands moving in a straight line through the given points, `steps` frames per leg. */
function swing(points: Array<[number, number]>, steps = 6, crouch: number[] = []): Landmark[][] {
  const out: Landmark[][] = [];
  for (let p = 0; p < points.length - 1; p++) {
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const c0 = crouch[p] ?? 0, c1 = crouch[p + 1] ?? 0;
      out.push(frame([points[p][0] + (points[p + 1][0] - points[p][0]) * t, points[p][1] + (points[p + 1][1] - points[p][1]) * t], c0 + (c1 - c0) * t));
    }
  }
  out.push(frame(points[points.length - 1], crouch[points.length - 1] ?? 0));
  return out;
}

const read = (frames: Landmark[][]) => detectShot(frames, 1000, 1000).shot;

describe('shot detection', () => {
  it('reads a leave: the hands barely move', () => {
    expect(read(swing([[0.3, -0.9], [0.32, -0.95], [0.3, -1.0]]))).toBe('leave');
  });

  it('reads a defence: a short push with no follow-through', () => {
    expect(read(swing([[0.2, -0.7], [0.45, -0.25], [0.5, -0.2]]))).toBe('defence');
  });

  it('reads a drive: down and through, finishing high', () => {
    expect(read(swing([[-0.2, -1.1], [0.3, -0.1], [0.7, -0.9], [0.5, -1.5]]))).toBe('drive');
  });

  it('reads a pull: across at chest height, finishing above the shoulders', () => {
    expect(read(swing([[-0.5, -0.9], [0.6, -0.95], [0.5, -1.4]], 5))).toBe('pull');
  });

  it('reads a cut: across at chest height, staying level', () => {
    expect(read(swing([[-0.3, -0.75], [0.9, -0.7], [1.0, -0.6]], 5))).toBe('cut');
  });

  it('reads a sweep: down on one knee', () => {
    expect(read(swing([[0.2, -0.8], [0.5, -0.2], [-0.5, -0.3]], 6, [0, 0.55, 0.6]))).toBe('sweep');
  });

  it('falls back to a drive, unsure, when it cannot see enough', () => {
    expect(detectShot([], 1000, 1000)).toEqual({ shot: 'drive', confident: false });
    expect(detectShot(swing([[0, 0], [1, -1]], 2), 1000, 1000).confident).toBe(false);
  });

  it('gives the same answer for a left-hander filmed from the other side', () => {
    const flip = (frames: Landmark[][]) => frames.map((f) => f.map((p) => ({ ...p, x: 1 - p.x })));
    const drive = swing([[-0.2, -1.1], [0.3, -0.1], [0.7, -0.9], [0.5, -1.5]]);
    const pull = swing([[-0.5, -0.9], [0.6, -0.95], [0.5, -1.4]], 5);
    expect(read(flip(drive))).toBe('drive');
    expect(read(flip(pull))).toBe('pull');
  });
});
