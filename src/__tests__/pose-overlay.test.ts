import { L, ON_TARGET, type MetricResult } from '@/lib/analysis/pose-metrics';
import { OVERLAY_BONES, OVERLAY_JOINTS, pickHighlights, smoothOverlayFrame } from '@/lib/analysis/pose-overlay';

function metric(key: string, value: number, score: number, unit = '°'): MetricResult {
  return {
    key, value, score, unit, label: key, ideal: [0, 180], tolerance: 20, tip: '',
  };
}

const FACE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const FINGERS = [17, 18, 19, 20, 21, 22];
const FEET = [29, 30, 31, 32];

describe('simplified pose overlay', () => {
  it('draws the body as thick lines and leaves out the face, fingers and feet', () => {
    const used = new Set(OVERLAY_BONES.flat());
    expect(OVERLAY_BONES).toEqual(expect.arrayContaining([
      [L.lShoulder, L.rShoulder],
      [L.lShoulder, L.lElbow],
      [L.lElbow, L.lWrist],
      [L.rShoulder, L.rElbow],
      [L.rElbow, L.rWrist],
      [L.lHip, L.lKnee],
      [L.lKnee, L.lAnkle],
      [L.rHip, L.rKnee],
      [L.rKnee, L.rAnkle],
    ]));
    for (const index of [...FACE, ...FINGERS, ...FEET]) {
      expect(used.has(index)).toBe(false);
      expect(OVERLAY_JOINTS).not.toContain(index);
    }
    expect(OVERLAY_JOINTS).toContain(L.nose);
    expect(OVERLAY_JOINTS).toContain(L.lAnkle);
    expect(OVERLAY_JOINTS).not.toContain(31);
  });

  it('labels side-on bowling with the arm and the front knee only', () => {
    const marks = pickHighlights([
      metric('armStraightness', 170, 96),
      metric('frontKnee', 167, 90),
      metric('trunkTilt', 30, 40),
      metric('headStability', 0.2, 70, ''),
    ], 'bowling', 'right', 'side');
    expect(marks.map((mark) => mark.key)).toEqual(['armStraightness', 'frontKnee']);
    expect(marks[0].label).toBe('Arm 170°');
    expect(marks[0].onTarget).toBe(true);
    expect(marks[0].limbs).toEqual([[L.rShoulder, L.rElbow, L.rWrist]]);
    expect(marks[1].label).toBe('Knee 167°');
    expect(marks[1].limbs).toEqual([[L.lHip, L.lKnee, L.lAnkle]]);
  });

  it('draws a front-on bowling arm along the real bones, with a vertical at the shoulder', () => {
    const [arm] = pickHighlights([
      metric('armHeight', 18, 70),
    ], 'bowling', 'left', 'front');
    expect(arm.limbs).toEqual([[L.lShoulder, L.lElbow, L.lWrist]]);
    expect(arm.limbs[0]).toHaveLength(3);
    expect(arm.guides).toEqual([{ kind: 'vertical', at: L.lShoulder }]);
    expect(arm.verticalArc).toEqual({ shoulder: L.lShoulder, wrist: L.lWrist });
    expect(arm.label).toBe('Arm 18°');
    expect(arm.onTarget).toBe(false);
  });

  it('keeps a front-on front knee only when the scorer returned one', () => {
    const marks = pickHighlights([
      metric('armHeight', 12, 90),
      metric('frontKnee', 155, 88),
    ], 'bowling', 'right', 'front');
    expect(marks.map((mark) => mark.key)).toEqual(['armHeight', 'frontKnee']);
  });

  it('picks a drive, a pull and a cut from the shot, and a left-hander leads with the other side', () => {
    const batting = [
      metric('frontElbow', 128, 90),
      metric('backElbow', 110, 70),
      metric('kneeFlex', 140, 86),
      metric('headOverKnee', 0.2, 80, ''),
      metric('batSwingPlane', 20, 92),
    ];
    expect(pickHighlights(batting, 'batting', 'right', 'side', 'drive').map((mark) => mark.key))
      .toEqual(['frontElbow', 'kneeFlex', 'headOverKnee']);
    expect(pickHighlights(batting, 'batting', 'right', 'side', 'pull').map((mark) => mark.key))
      .toEqual(['kneeFlex', 'backElbow']);
    expect(pickHighlights(batting, 'batting', 'right', 'side', 'cut').map((mark) => mark.key))
      .toEqual(['frontElbow', 'batSwingPlane', 'headOverKnee']);
    const pull = pickHighlights(batting, 'batting', 'left', 'side', 'pull');
    expect(pull[0].limbs).toEqual([[L.rHip, L.rKnee, L.rAnkle]]);
    expect(pull[1].limbs).toEqual([[L.lShoulder, L.lElbow, L.lWrist]]);
    expect(pull[0].label).toBe('Knee 140°');
    expect(pickHighlights(batting, 'batting', 'right', 'side', 'drive')[2].label).toBe('Head');
  });

  it('smooths a kept joint both ways and leaves a hidden point undrawn', () => {
    const frame = (x: number, visibility = 1) => Array.from({ length: 33 }, (_, joint) => ({
      x: joint === L.rWrist ? x : 0.5, y: 0.4, visibility,
    }));
    const frames = [frame(0), frame(0), frame(10), frame(0), frame(0)];
    const smoothed = smoothOverlayFrame(frames, 2);
    expect(smoothed[L.rWrist].x).toBeGreaterThan(0);
    expect(smoothed[L.rWrist].x).toBeLessThan(10);
    const hidden = frames.map((points, index) => index === 2 ? frame(10, 0.1) : points);
    expect(smoothOverlayFrame(hidden, 2)[L.rWrist].x).toBe(10);
    expect(smoothOverlayFrame(hidden, 2)[L.rWrist].visibility).toBe(0.1);
  });
});
