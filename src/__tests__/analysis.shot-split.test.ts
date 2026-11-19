import { detectShot } from '@/lib/analysis/shot-detect';
import { bestAndWorst, clipTime, splitShots } from '@/lib/analysis/shot-split';
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

const still = (frames: number): Landmark[][] => Array.from({ length: frames }, () => frame([0.3, -0.9]));
// Each shot ends with the hands coming slowly back to the stance, as they do in a real net
const back = (from: [number, number]) => swing([from, [0.3, -0.9]], 30).slice(1);
const drive = () => [...swing([[0.3, -0.9], [0.1, -1.3], [0.5, 0.1], [0.9, -1.4]], 5), ...back([0.9, -1.4])];
const pull = () => [...swing([[0.3, -0.9], [-0.3, -1.1], [0.9, -0.9], [1.0, -1.5]], 5), ...back([1.0, -1.5])];
const times = (frames: Landmark[][]) => frames.map((_, i) => i / 30);

describe('splitting a session into shots', () => {
  it('finds each swing in a clip with waiting in between', () => {
    const frames = [...still(60), ...drive(), ...still(90), ...pull(), ...still(90), ...drive(), ...still(30)];
    const shots = splitShots(frames, times(frames), 1000, 1000);
    expect(shots).toHaveLength(3);
    // In order, without overlapping
    expect(shots[0].end).toBeLessThan(shots[1].start);
    expect(shots[1].end).toBeLessThan(shots[2].start);
    for (const shot of shots) {
      expect(shot.peak).toBeGreaterThanOrEqual(shot.start);
      expect(shot.peak).toBeLessThanOrEqual(shot.end);
    }
  });

  it('reads each shot by itself, not the session as a whole', () => {
    const frames = [...still(60), ...drive(), ...still(90), ...pull(), ...still(60)];
    const shots = splitShots(frames, times(frames), 1000, 1000);
    const kinds = shots.map((shot) => detectShot(frames.slice(shot.start, shot.end + 1), 1000, 1000).shot);
    expect(kinds).toEqual(['drive', 'pull']);
  });

  it('finds nothing when nobody swings', () => {
    const frames = still(200);
    expect(splitShots(frames, times(frames), 1000, 1000)).toEqual([]);
  });

  it('treats one swing as one shot even though it speeds up twice', () => {
    const frames = [...still(40), ...drive(), ...still(40)];
    expect(splitShots(frames, times(frames), 1000, 1000)).toHaveLength(1);
  });

  it('does not join two clips across a gap in the footage', () => {
    const frames = [...still(40), ...still(40).map(() => frame([0.9, -1.4]))];
    const t = frames.map((_, i) => (i < 40 ? i / 30 : 10 + i / 30));
    expect(splitShots(frames, t, 1000, 1000)).toEqual([]);
  });
});

describe('best and worst', () => {
  it('picks the highest and lowest scores', () => {
    expect(bestAndWorst([62, 81, 47, 70])).toEqual({ best: 1, toWorkOn: 2 });
  });
  it('singles nothing out for one shot or level scores', () => {
    expect(bestAndWorst([70])).toBeNull();
    expect(bestAndWorst([70, 70, 70])).toBeNull();
  });
});

describe('clip time', () => {
  it('shows minutes and seconds', () => {
    expect(clipTime(0)).toBe('0:00');
    expect(clipTime(74.9)).toBe('1:14');
  });
});
