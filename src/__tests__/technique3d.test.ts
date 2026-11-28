import fs from 'fs';
import path from 'path';
import { authoredReferences } from '@/lib/technique3d/author';
import { sampleClip, sampleTimes } from '@/lib/technique3d/capture';
import { detectEvents } from '@/lib/technique3d/events';
import { technique3dEnabled } from '@/lib/technique3d/flag';
import { easeFitDistance, framesAround, limbLength, lowestFootY, poseOnScreen, prepareClip, readingAtDistance, screenFit, trunkLeanDegrees } from '@/lib/technique3d/figure';
import { alignedReferenceIndex, anglesAt, frameIndexAt, orientFrames, scrubToIndex, yawDelta } from '@/lib/technique3d/math';
import { parseTechniquePose } from '@/lib/technique3d/payload';
import { canReadTechniquePose } from '@/lib/technique3d/privacy';
import { phaseLabel, referencesFor } from '@/lib/technique3d/references';
import { ESTIMATE_NOTE, type PoseFrame, type Vec3 } from '@/lib/technique3d/types';

const dir = path.join(__dirname, '../lib/technique3d/references');

function body(over: Partial<Record<number, Vec3>> = {}): PoseFrame {
  const frame = Array.from({ length: 33 }, () => [0, 0, 0] as Vec3);
  frame[0] = [0, 0.7, 0];
  frame[11] = [-0.2, 0.5, 0];
  frame[12] = [0.2, 0.5, 0];
  frame[13] = [-0.2, 0.25, 0];
  frame[15] = [-0.2, 0, 0];
  frame[23] = [-0.1, 0, 0];
  frame[24] = [0.1, 0, 0];
  frame[25] = [-0.1, -0.4, 0];
  frame[27] = [-0.1, -0.8, 0];
  frame[26] = [0.1, -0.4, 0];
  frame[28] = [0.1, -0.8, 0];
  frame[16] = [0.35, 0.2, 0];
  for (const [index, point] of Object.entries(over)) if (point) frame[Number(index)] = point;
  return frame;
}

describe('3D technique flag and privacy', () => {
  it('stays off unless the flag is exactly true', () => {
    expect(technique3dEnabled({})).toBe(false);
    expect(technique3dEnabled({ NEXT_PUBLIC_3D_TECHNIQUE_ENABLED: 'TRUE' })).toBe(false);
    expect(technique3dEnabled({ NEXT_PUBLIC_3D_TECHNIQUE_ENABLED: 'true' })).toBe(true);
  });

  it('shows an estimate only to the account that owns it', () => {
    expect(ESTIMATE_NOTE).toBe('Estimate from one phone video, not a lab measurement.');
    expect(ESTIMATE_NOTE.toLowerCase()).not.toContain('injury');
    expect(canReadTechniquePose('player', 'player')).toBe(true);
    expect(canReadTechniquePose('coach', 'player')).toBe(false);
    expect(canReadTechniquePose('coach', 'junior')).toBe(false);
    expect(canReadTechniquePose(null, 'junior')).toBe(false);
  });
});

describe('3D technique angles, alignment and capture', () => {
  it('reads a straight front elbow, a front knee and shoulder-hip separation', () => {
    const straight = body();
    const read = anglesAt(straight, 'right');
    expect(read.frontElbow).toBeCloseTo(180, 0);
    expect(read.frontKnee).toBeCloseTo(180, 0);
    expect(read.shoulderHip).toBeCloseTo(0, 5);
    const turned = body({
      11: [-0.2, 0.45, -0.1],
      12: [0.2, 0.45, 0.1],
    });
    expect(Math.abs(anglesAt(turned, 'right').shoulderHip ?? 0)).toBeGreaterThan(20);
  });

  it('finds back-foot contact and release from the skeleton', () => {
    const frames = Array.from({ length: 12 }, (_, i) => body({
      28: [0.1, i === 4 ? -0.95 : -0.7, 0],
      27: [-0.1, i === 7 ? -0.95 : -0.72, 0],
      16: [0.3, i === 9 ? 1.1 : 0.2, 0],
    }));
    expect(detectEvents(frames, 'bowling', 'right')).toMatchObject({ back_foot_contact: 4, release: 9 });
  });

  it('lines a reference up on the chosen event and turns it to the player', () => {
    expect(alignedReferenceIndex(20, 8, 12, 48)).toBe(24);
    expect(alignedReferenceIndex(0, 20, 2, 48)).toBeNull();
    expect(frameIndexAt([0, 0.5, 1], 0.6)).toBe(1);
    const flat = body();
    const flipped = flat.map(([x, y, z]) => [x, -y, -z] as Vec3);
    expect(orientFrames([flipped])[0][0][1]).toBeGreaterThan(0);
    const upright = Array.from({ length: 5 }, () => flat);
    upright[2] = flipped;
    expect(orientFrames(upright)[0][0][1]).toBeGreaterThan(0);
    expect(orientFrames(upright)[2][0][1]).toBeLessThan(0);
    expect(Math.abs(yawDelta(flat, flat))).toBeLessThan(0.01);
  });

  it('keeps only finite world landmarks from a mocked model', async () => {
    const seen: number[] = [];
    const sampled = await sampleClip({
      duration: 0.4,
      maxFrames: 10,
      maxSeconds: 1,
      seek: async (time) => { seen.push(time); },
      detect: () => (seen.length === 2 ? null : body()),
    });
    expect(sampled.frames.length).toBeGreaterThan(2);
    expect(sampled.frames.length).toBe(sampled.times.length);
    expect(sampled.frames[0]).toHaveLength(33);
  });

  it('rejects a payload that is not a pose, including extra personal fields', () => {
    const frames = Array.from({ length: 8 }, () => body());
    const times = frames.map((_, i) => i / 10);
    const ok = parseTechniquePose({ mode: 'bowling', hand: 'right', keyEvent: 'release', keyEventFrame: 3, times, frames, analysisId: null });
    expect(ok.ok).toBe(true);
    expect(parseTechniquePose({ mode: 'bowling', hand: 'right', keyEvent: 'release', keyEventFrame: 3, times, frames, email: 'a@example.com' }).ok).toBe(false);
    expect(parseTechniquePose({ mode: 'bowling', hand: 'right', keyEvent: 'release', keyEventFrame: 3, times, frames: frames.slice(0, 2) }).ok).toBe(false);
  });
});

function standing(): PoseFrame {
  const frame = Array.from({ length: 33 }, () => [0, 0, 0] as Vec3);
  frame[0] = [0, 0.7, 0.05];
  frame[11] = [0.2, 0.5, 0];
  frame[12] = [-0.2, 0.5, 0];
  frame[13] = [0.2, 0.22, 0];
  frame[14] = [-0.2, 0.22, 0.04];
  frame[15] = [0.2, -0.03, 0];
  frame[16] = [-0.34, 0.9, 0.12];
  frame[23] = [0.11, 0, 0];
  frame[24] = [-0.11, 0, 0];
  frame[25] = [0.11, -0.42, 0];
  frame[26] = [-0.11, -0.42, 0];
  frame[27] = [0.11, -0.82, 0];
  frame[28] = [-0.11, -0.82, 0];
  frame[31] = [0.11, -0.9, 0.08];
  frame[32] = [-0.11, -0.9, 0.08];
  return frame;
}

function asImage(frame: PoseFrame): PoseFrame {
  return frame.map(([x, y, z]) => [0.5 + x * 0.22, 0.5 - y * 0.22, -z * 0.22]);
}

function asWorldYDown(frame: PoseFrame): PoseFrame {
  return frame.map(([x, y, z]) => [x, -y, -z]);
}

describe('3D figure framing and limb lengths', () => {
  it('turns a y-down world pose into the picture, with left and right unswapped', () => {
    const truePose = standing();
    const prepared = prepareClip([asWorldYDown(truePose)], [asImage(truePose)])[0];
    expect(prepared[0][1]).toBeGreaterThan(prepared[23][1]);
    expect(prepared[11][0]).toBeGreaterThan(prepared[12][0]);
    expect(prepared[16][0]).toBeLessThan(prepared[15][0]);
    expect(prepared[16][1]).toBeGreaterThan(prepared[15][1]);
    expect(prepared[16][2]).toBeGreaterThan(0);
  });

  it('keeps limb-length ratios plausible when one frame collapses a knee', () => {
    const truePose = standing();
    const image = asImage(truePose);
    const collapsed = asWorldYDown(truePose);
    collapsed[25] = [...collapsed[23]];
    const clip = Array.from({ length: 8 }, (_, index) => (index === 3 ? collapsed.map((point) => [...point] as Vec3) : asWorldYDown(truePose)));
    const prepared = prepareClip(clip, clip.map(() => image));
    for (const frame of prepared) {
      const thigh = limbLength(frame, 23, 25);
      const shin = limbLength(frame, 25, 27);
      const upper = limbLength(frame, 11, 13);
      const fore = limbLength(frame, 13, 15);
      expect(thigh).toBeGreaterThan(0.3);
      expect(shin).toBeGreaterThan(0.28);
      expect(thigh / shin).toBeGreaterThan(0.75);
      expect(thigh / shin).toBeLessThan(1.4);
      expect(upper / fore).toBeGreaterThan(0.7);
      expect(upper / fore).toBeLessThan(1.5);
    }
  });

  it('fits the on-screen box of a lean and a reach, centred, on a phone and on 16:9', () => {
    const lean = standing();
    lean[0] = [-1.05, 1.25, 0.45];
    const reach = standing();
    reach[16] = [1.45, 1.15, -0.4];
    const poses = [standing(), lean, reach];
    for (const pose of poses) {
      const wide = poseOnScreen([pose], 16 / 9);
      expect(wide.limiting).toBeGreaterThan(0.75);
      expect(wide.limiting).toBeLessThan(0.9);
      expect(Math.abs(wide.centerX)).toBeLessThan(0.05);
      expect(Math.abs(wide.centerY)).toBeLessThan(0.05);
      expect(wide.minX).toBeGreaterThanOrEqual(-0.9);
      expect(wide.maxX).toBeLessThanOrEqual(0.9);
      expect(wide.minY).toBeGreaterThanOrEqual(-0.9);
      expect(wide.maxY).toBeLessThanOrEqual(0.9);
      const phone = poseOnScreen([pose], 390 / 520);
      expect(Math.abs(phone.centerX)).toBeLessThan(0.05);
      expect(Math.abs(phone.centerY)).toBeLessThan(0.05);
      const phoneMarginX = (1 - Math.max(-phone.minX, phone.maxX)) / 2;
      const phoneMarginY = (1 - Math.max(-phone.minY, phone.maxY)) / 2;
      expect(phoneMarginX).toBeGreaterThan(0.039);
      expect(phoneMarginY * (520 / 390)).toBeGreaterThan(0.039);
    }
    const follow = standing();
    follow[0] = [-1.15, 0.98, 0.08];
    follow[11] = [-0.55, 0.9, 0];
    follow[12] = [-0.32, 0.9, 0];
    follow[23] = [0.2, 0.86, 0];
    follow[24] = [0.4, 0.86, 0];
    follow[16] = [0.55, 1.15, 0.1];
    const wideFollow = poseOnScreen([follow], 16 / 9);
    expect(wideFollow.limiting).toBeGreaterThan(0.75);
    expect(wideFollow.limiting).toBeLessThan(0.9);
    expect(Math.abs(wideFollow.centerX)).toBeLessThan(0.05);
    expect(Math.abs(wideFollow.centerY)).toBeLessThan(0.05);
    const phoneFollow = poseOnScreen([follow], 390 / 844);
    const phoneWidth = (phoneFollow.maxX - phoneFollow.minX) / 2;
    expect(phoneWidth).toBeGreaterThan(0.86);
    expect(phoneWidth).toBeLessThan(0.94);
    expect(Math.abs(phoneFollow.centerX)).toBeLessThan(0.05);
    expect(Math.abs(phoneFollow.centerY)).toBeLessThan(0.05);
    const followMarginX = (1 - Math.max(-phoneFollow.minX, phoneFollow.maxX)) / 2;
    expect(followMarginX).toBeGreaterThan(0.039);
    const phoneAspect = 314 / 506;
    const aimed = screenFit([follow], phoneAspect, 40, [0, 0.12, 1]);
    const held = readingAtDistance([follow], phoneAspect, [0, 0.12, 1], aimed.distance * 1.35);
    expect(Math.abs(held.centerX)).toBeLessThan(0.02);
    expect(Math.abs(held.centerY)).toBeLessThan(0.02);
    expect(held.horizontal).toBeLessThan(0.8);
    const settled = readingAtDistance([follow], phoneAspect, [0, 0.12, 1], aimed.distance);
    expect(settled.horizontal).toBeGreaterThan(0.86);
    expect(settled.horizontal).toBeLessThan(0.94);
    expect(Math.abs(settled.centerX)).toBeLessThan(0.02);
    expect(easeFitDistance(null, 4, 3.5)).toBe(4);
    expect(easeFitDistance(2, 4, 3.2)).toBeCloseTo(3.2);
    const easedIn = easeFitDistance(5, 3, 2.8);
    expect(easedIn).toBeGreaterThan(3.5);
    expect(easedIn).toBeLessThan(5);
    const times = [0, 0.2, 0.4];
    expect(framesAround(poses, times, 0.2, 0.5)).toHaveLength(3);
    expect(framesAround(poses, times, 0, 0.5).length).toBeLessThan(3);
  });

  it('puts the lowest foot on the ground and keeps a forward trunk lean', () => {
    const leaned = standing();
    for (const index of [0, 11, 12, 13, 14, 15, 16]) leaned[index] = [leaned[index][0] + 0.38, leaned[index][1], leaned[index][2]];
    const prepared = prepareClip([asWorldYDown(leaned)], [asImage(leaned)]);
    expect(lowestFootY(prepared[0])).toBeCloseTo(0, 3);
    expect(trunkLeanDegrees(prepared[0])).toBeGreaterThan(25);
    const hips = (prepared[0][23][0] + prepared[0][24][0]) / 2;
    const shoulders = (prepared[0][11][0] + prepared[0][12][0]) / 2;
    expect(shoulders).toBeGreaterThan(hips + 0.2);

    const front = standing();
    for (const index of [0, 11, 12, 13, 14, 15, 16]) front[index] = [front[index][0], front[index][1], front[index][2] + 0.28];
    const frontal = prepareClip([asWorldYDown(front)], [asImage(front)])[0];
    const hipZ = (frontal[23][2] + frontal[24][2]) / 2;
    const shoulderZ = (frontal[11][2] + frontal[12][2]) / 2;
    expect(shoulderZ).toBeGreaterThan(hipZ + 0.15);
    expect(Math.abs(((frontal[11][0] + frontal[12][0]) / 2) - ((frontal[23][0] + frontal[24][0]) / 2))).toBeLessThan(0.08);
  });

  it('maps a scrub across the whole clip, not only the opening', () => {
    const times = sampleTimes(12);
    expect(times[0]).toBe(0);
    expect(times[times.length - 1]).toBe(12);
    expect(times.length).toBeGreaterThan(20);
    const early = scrubToIndex(times, 0.2);
    const middle = scrubToIndex(times, 0.5);
    const end = scrubToIndex(times, 1);
    expect(early).toBeGreaterThan(0);
    expect(middle).toBeGreaterThan(early + 5);
    expect(end).toBe(times.length - 1);
    expect(end - early).toBeGreaterThan(times.length / 2);
  });

  it('keeps the drawn reference actions in a human limb range', () => {
    for (const reference of authoredReferences()) {
      for (const frame of reference.frames) {
        const thigh = limbLength(frame, reference.hand === 'right' ? 24 : 23, reference.hand === 'right' ? 26 : 25);
        const shin = limbLength(frame, reference.hand === 'right' ? 26 : 25, reference.hand === 'right' ? 28 : 27);
        const upper = limbLength(frame, reference.hand === 'right' ? 12 : 11, reference.hand === 'right' ? 14 : 13);
        const fore = limbLength(frame, reference.hand === 'right' ? 14 : 13, reference.hand === 'right' ? 16 : 15);
        expect(thigh / shin).toBeGreaterThan(0.7);
        expect(thigh / shin).toBeLessThan(1.45);
        expect(upper / fore).toBeGreaterThan(0.7);
        expect(upper / fore).toBeLessThan(1.5);
        expect(frame[0][1]).toBeGreaterThan((frame[23][1] + frame[24][1]) / 2);
      }
    }
  });
});

describe('reference technique library', () => {
  const authored = authoredReferences();

  it('ships four drawn actions and no footage', () => {
    expect(authored.map((item) => item.id)).toEqual(['fast-bowling', 'inswinging-yorker', 'front-foot-drive', 'back-foot-defence']);
    expect(referencesFor('bowling').map((item) => item.title)).toEqual(['Fast bowling action', 'In-swinging yorker']);
    expect(referencesFor('batting')).toHaveLength(2);
    for (const reference of authored) {
      const file = fs.readFileSync(path.join(dir, `${reference.id}.json`), 'utf8');
      expect(JSON.parse(file)).toEqual(reference);
      expect(file).not.toMatch(/youtube|footage of|@[a-z]|\.mp4/i);
      expect(reference.summary.toLowerCase()).not.toContain('injury');
      expect(reference.frames).toHaveLength(48);
      expect(reference.frames[0]).toHaveLength(33);
      expect(reference.keyEventFrame).toBeGreaterThanOrEqual(0);
      expect(phaseLabel(reference, reference.keyEventFrame)).toBeTruthy();
      const read = anglesAt(reference.frames[reference.keyEventFrame], reference.hand);
      expect(read.frontElbow).not.toBeNull();
      expect(read.frontKnee).not.toBeNull();
    }
    expect(phaseLabel(authored[0], 26)).toBe('Release');
    expect(phaseLabel(authored[2], 24)).toBe('Bat-ball contact');
  });
});
