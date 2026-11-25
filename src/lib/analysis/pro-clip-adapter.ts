/**
 * Load a fixture JSON and turn it into the arguments that
 * analyseDetailed (src/lib/analysis/pose-metrics.ts) consumes.
 *
 * This file is not part of the app repo. Copy
 * src/__tests__/proClips.regression.test.ts into the repo and set
 * PRO_CLIP_FIXTURES to this pack. The test inlines the same logic so
 * Jest can import pose-metrics from the repo under test.
 *
 * Fixtures store every detected person (image and world landmarks) plus
 * real timestamps. The adapter locks onto one person the same way
 * scripts/analyse-clip.ts does, then passes { world, motion }.
 */
import { readFileSync } from 'node:fs';
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

export type FixtureJson = {
  width: number;
  height: number;
  fps: number;
  motion?: CameraMotion;
  timestamps: number[];
  frames: Landmark[][][];
  world?: Landmark[][][];
  sizes?: { playerSize: number; personHeightPx: number }[][];
  variant?: { id: string; hand?: Hand };
};

export type ScoreInput = {
  discipline: Mode;
  hand: Hand;
  view: View;
  shot?: ShotType | null;
};

export function loadFixture(file: string): FixtureJson {
  return JSON.parse(readFileSync(file, 'utf8')) as FixtureJson;
}

/** Map a raw fixture to the frames, times and context analyseDetailed takes. */
export function toAnalyseInput(raw: FixtureJson) {
  const tracked = lockPerson(raw.frames);
  const times = tracked.index.map((i) => raw.timestamps[i]);
  const world = raw.world
    ? tracked.index.map((frame, i) => raw.world?.[frame]?.[tracked.which[i]] ?? [])
    : undefined;
  return {
    frames: tracked.frames,
    times,
    world,
    motion: raw.motion,
    width: raw.width,
    height: raw.height,
    crowded: tracked.crowded,
  };
}

export function scoreFixture(raw: FixtureJson, input: ScoreInput) {
  const prepared = toAnalyseInput(raw);
  const marked = analyseDetailed(
    prepared.frames,
    input.discipline,
    input.hand,
    prepared.width,
    prepared.height,
    input.shot ?? undefined,
    input.view,
    prepared.times,
    { world: prepared.world, motion: prepared.motion, crowded: prepared.crowded },
  );
  if (prepared.crowded && marked.ok) {
    marked.analysis.warnings.push('more than one person');
    marked.analysis.confidence = capConfidence(marked.analysis.confidence, 'medium');
    marked.analysis.metrics.forEach((metric) => {
      metric.confidence = marked.analysis.confidence;
    });
  }
  if (!marked.ok) {
    return {
      ok: false as const,
      problem: marked.problem,
      hidden: true,
      confidence: null,
      overall: null,
      keyTime: null,
      keyFrame: null,
      crowded: prepared.crowded,
      motion: prepared.motion ?? null,
    };
  }
  const hidden = marked.analysis.confidence === 'low';
  const keyFrame = marked.analysis.keyFrame;
  return {
    ok: true as const,
    problem: null,
    hidden,
    confidence: marked.analysis.confidence,
    overall: hidden ? null : overallScore(marked.analysis.metrics),
    overallHidden: overallScore(marked.analysis.metrics),
    keyTime: prepared.times[keyFrame] ?? null,
    keyFrame,
    crowded: prepared.crowded,
    motion: prepared.motion ?? null,
  };
}
