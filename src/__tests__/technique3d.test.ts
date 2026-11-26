import fs from 'fs';
import path from 'path';
import { authoredReferences } from '@/lib/technique3d/author';
import { sampleClip } from '@/lib/technique3d/capture';
import { detectEvents } from '@/lib/technique3d/events';
import { technique3dEnabled } from '@/lib/technique3d/flag';
import { alignedReferenceIndex, anglesAt, frameIndexAt, orientFrames, yawDelta } from '@/lib/technique3d/math';
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
