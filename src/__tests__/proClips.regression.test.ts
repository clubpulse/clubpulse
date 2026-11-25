/**
 * Regression checks against the private pro-clip landmark fixtures.
 *
 * Copy this file into the app repo at src/__tests__/proClips.regression.test.ts
 * (do not commit the videos; this pack has landmarks only). Then:
 *
 *   PRO_CLIP_FIXTURES=/path/to/fixtures-pack npm test -- src/__tests__/proClips.regression.test.ts
 *
 * The suite is skipped when PRO_CLIP_FIXTURES is unset, so ordinary CI stays green.
 *
 * Fixtures are the MediaPipe poses for each clip and variant (full, half size,
 * mirrored, 10 fps, trimmed). Scoring uses analyseDetailed the same way
 * scripts/analyse-clip.ts does: lockPerson, world landmarks, camera motion,
 * and a medium cap when the clip is crowded.
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import {
  analyseDetailed,
  capConfidence,
  lockPerson,
  overallScore,
  type CameraMotion,
  type Hand,
  type Landmark,
  type Mode,
  type ShotType,
  type View,
} from '@/lib/analysis/pose-metrics';

const ROOT = process.env.PRO_CLIP_FIXTURES;

type FixtureJson = {
  width: number;
  height: number;
  fps: number;
  motion?: CameraMotion;
  timestamps: number[];
  frames: Landmark[][][];
  world?: Landmark[][][];
};

type ExpectedClip = {
  id: string;
  label: string;
  discipline: Mode;
  view: View;
  hand: Hand;
  shot: ShotType | null;
  event: 'release' | 'contact';
  eventTime: number;
  tolerance: number;
  scorable: boolean;
  scoreMin: number | null;
  spreadMax: number | null;
  hiddenReason: string | null;
  fps10MayHide: boolean;
  variants: {
    id: string;
    file: string;
    kind: string;
    hand: Hand;
    inSpread: boolean;
    fps10MayHide?: boolean;
  }[];
};

function loadExpected(dir: string): ExpectedClip {
  return JSON.parse(readFileSync(path.join(dir, 'expected.json'), 'utf8')) as ExpectedClip;
}

function loadFixture(file: string): FixtureJson {
  return JSON.parse(readFileSync(file, 'utf8')) as FixtureJson;
}

function scoreFixture(
  raw: FixtureJson,
  input: { discipline: Mode; hand: Hand; view: View; shot?: ShotType | null },
) {
  const tracked = lockPerson(raw.frames);
  const times = tracked.index.map((i) => raw.timestamps[i]);
  const world = raw.world
    ? tracked.index.map((frame, i) => raw.world?.[frame]?.[tracked.which[i]] ?? [])
    : undefined;
  const marked = analyseDetailed(
    tracked.frames,
    input.discipline,
    input.hand,
    raw.width,
    raw.height,
    input.shot ?? undefined,
    input.view,
    times,
    { world, motion: raw.motion, crowded: tracked.crowded },
  );
  if (tracked.crowded && marked.ok) {
    marked.analysis.warnings.push('more than one person');
    marked.analysis.confidence = capConfidence(marked.analysis.confidence, 'medium');
    marked.analysis.metrics.forEach((metric) => {
      metric.confidence = marked.analysis.confidence;
    });
  }
  if (!marked.ok) {
    return { ok: false as const, hidden: true, confidence: null as string | null, overall: null as number | null, keyTime: null as number | null };
  }
  const hidden = marked.analysis.confidence === 'low';
  return {
    ok: true as const,
    hidden,
    confidence: marked.analysis.confidence,
    overall: hidden ? null : overallScore(marked.analysis.metrics),
    keyTime: times[marked.analysis.keyFrame] ?? null,
  };
}

function clipDirs(root: string): string[] {
  const base = path.join(root, 'clips');
  return readdirSync(base, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(base, entry.name))
    .sort();
}

describe('pro clip regression fixtures', () => {
  if (!ROOT) {
    it.skip('needs PRO_CLIP_FIXTURES', () => {});
    return;
  }
  const root = ROOT;

  it('has a pack with one expected.json per clip', () => {
    const dirs = clipDirs(root);
    expect(dirs.length).toBeGreaterThanOrEqual(10);
    for (const dir of dirs) {
      const expected = loadExpected(dir);
      expect(expected.id).toBe(path.basename(dir));
      expect(expected.eventTime).toEqual(expect.any(Number));
      expect(expected.tolerance).toBe(0.1);
      expect(expected.variants.length).toBeGreaterThan(0);
    }
  });

  const dirs = clipDirs(root);
  for (const dir of dirs) {
    const expected = loadExpected(dir);

    describe(expected.id, () => {
      for (const variant of expected.variants) {
        it(`${variant.id}: timing, hidden or scorable, and score band`, () => {
          const raw = loadFixture(path.join(dir, variant.file));
          const result = scoreFixture(raw, {
            discipline: expected.discipline,
            hand: variant.hand,
            view: expected.view,
            shot: expected.shot,
          });

          const fps10MayHide = expected.fps10MayHide && (variant.kind === 'fps10' || variant.fps10MayHide);
          if (fps10MayHide && result.hidden) {
            return;
          }

          if (!expected.scorable) {
            expect(result.hidden).toBe(true);
            if (result.keyTime != null) {
              expect(Math.abs(result.keyTime - expected.eventTime)).toBeLessThanOrEqual(expected.tolerance + 1e-6);
            }
            return;
          }

          expect(result.hidden).toBe(false);
          expect(result.ok).toBe(true);
          expect(result.overall).not.toBeNull();
          expect(result.overall as number).toBeGreaterThanOrEqual(expected.scoreMin ?? 75);
          expect(result.keyTime).not.toBeNull();
          expect(Math.abs((result.keyTime as number) - expected.eventTime)).toBeLessThanOrEqual(expected.tolerance + 1e-6);
        });
      }

      it('keeps shown variant scores within the spread cap', () => {
        const scores: number[] = [];
        for (const variant of expected.variants) {
          if (!variant.inSpread) continue;
          const raw = loadFixture(path.join(dir, variant.file));
          const result = scoreFixture(raw, {
            discipline: expected.discipline,
            hand: variant.hand,
            view: expected.view,
            shot: expected.shot,
          });
          if (!expected.scorable) {
            expect(result.hidden).toBe(true);
            continue;
          }
          if (result.hidden || result.overall == null) {
            throw new Error(`${expected.id} ${variant.id} hid a clean clip that should be scorable`);
          }
          scores.push(result.overall);
        }
        if (expected.scorable && scores.length >= 2) {
          expect(Math.max(...scores) - Math.min(...scores)).toBeLessThanOrEqual(expected.spreadMax ?? 12);
        }
      });
    });
  }
});
