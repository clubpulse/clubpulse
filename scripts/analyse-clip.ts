// Score a video file with the same rules as the Analyse page. Nothing is uploaded.
//
//   npx tsx scripts/analyse-clip.ts <video> --discipline bowling|batting --hand right|left [--view side|front] [--shot drive|pull]
//
// Needs ffmpeg's friend ffprobe is not required. Needs Python with mediapipe and
// opencv-python-headless:
//   pip install mediapipe opencv-python-headless
//
// Landmarks come from MediaPipe. The scores and tips come from src/lib/analysis/pose-metrics.ts,
// the same functions the page uses.

import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { detectShot, shotToScore } from '../src/lib/analysis/shot-detect';
import {
  LOW_CONFIDENCE_MESSAGE, analyseDetailed, capConfidence, drillFor, lockPerson, overallScore, weakestMeasure,
  type CameraMotion, type Hand, type Landmark, type Mode, type ShotType, type View,
} from '../src/lib/analysis/pose-metrics';

const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';
const HEAVY_URL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task';

function arg(name: string): string | undefined {
  const at = process.argv.indexOf(name);
  return at >= 0 ? process.argv[at + 1] : undefined;
}

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

async function main() {
  const video = process.argv[2];
  const discipline = arg('--discipline');
  const hand = arg('--hand');
  const viewArg = arg('--view') ?? 'side';
  const shotArg = arg('--shot');
  if (!video || video.startsWith('--')) fail('Usage: npx tsx scripts/analyse-clip.ts <video> --discipline bowling|batting --hand right|left [--view side|front] [--shot drive|pull]');
  if (discipline !== 'bowling' && discipline !== 'batting') fail('--discipline must be bowling or batting');
  if (hand !== 'right' && hand !== 'left') fail('--hand must be right or left');
  if (viewArg !== 'side' && viewArg !== 'front') fail('--view must be side or front');
  if (shotArg !== undefined && shotArg !== 'drive' && shotArg !== 'pull') fail('--shot must be drive or pull');

  const dir = mkdtempSync(path.join(tmpdir(), 'analyse-clip-'));
  const modelPath = path.join(dir, 'pose.task');
  const heavyPath = path.join(dir, 'pose-heavy.task');
  try {
    const model = await fetch(MODEL_URL);
    if (!model.ok) fail('Could not download the pose model.');
    writeFileSync(modelPath, Buffer.from(await model.arrayBuffer()));
    const heavy = await fetch(HEAVY_URL);
    if (heavy.ok) writeFileSync(heavyPath, Buffer.from(await heavy.arrayBuffer()));

    const py = spawnSync('python3', [path.join(process.cwd(), 'scripts/analyse-clip-landmarks.py'), video, modelPath, heavyPath], {
      encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    });
    if (py.status !== 0) {
      const missing = (py.stderr || '').includes('No module named');
      fail(missing
        ? 'Install the pose reader first: pip install mediapipe opencv-python-headless'
        : (py.stderr || 'Could not read poses from the video.'));
    }
    const read = JSON.parse(py.stdout) as {
      width: number; height: number; timestamps: number[]; frames: Landmark[][][];
      world?: Landmark[][][]; motion?: CameraMotion;
    };
    const tracked = lockPerson(read.frames);
    const times = tracked.index.map((i) => read.timestamps[i]);
    const world = read.world
      ? tracked.index.map((frame, i) => read.world?.[frame]?.[tracked.which[i]] ?? [])
      : undefined;
    const detectedShot = discipline === 'batting'
      ? detectShot(tracked.frames, read.width, read.height, { view: viewArg, hand })
      : null;
    const shot = discipline === 'batting' ? shotToScore(detectedShot, (shotArg as ShotType | undefined) ?? 'auto') : undefined;
    const marked = analyseDetailed(tracked.frames, discipline as Mode, hand as Hand, read.width, read.height, shot, viewArg as View, times, { world, motion: read.motion, crowded: tracked.crowded });
    if (tracked.crowded && marked.ok) {
      marked.analysis.warnings.push('more than one person');
      marked.analysis.confidence = capConfidence(marked.analysis.confidence, 'medium');
      marked.analysis.metrics.forEach((metric) => { metric.confidence = marked.analysis.confidence; });
    }
    if (!marked.ok) {
      process.stdout.write(`${JSON.stringify({ ok: false, problem: marked.problem, frames: read.frames.length }, null, 2)}\n`);
      process.exit(2);
    }
    const metrics = marked.analysis.metrics;
    const low = marked.analysis.confidence === 'low';
    const weakest = low ? null : weakestMeasure(metrics);
    process.stdout.write(`${JSON.stringify({
      ok: true,
      discipline,
      hand,
      view: viewArg,
      shot: shot ?? null,
      shotConfident: detectedShot?.confident ?? null,
      confidence: marked.analysis.confidence,
      message: low ? LOW_CONFIDENCE_MESSAGE : null,
      warnings: marked.analysis.warnings,
      frames: read.frames.length,
      overall: low ? null : overallScore(metrics),
      weakest: weakest ? { key: weakest.key, label: weakest.label, score: weakest.score, value: weakest.value, confidence: weakest.confidence ?? marked.analysis.confidence, tip: weakest.tip, drill: drillFor(weakest) } : null,
      metrics: low ? [] : metrics.map((metric) => ({
        key: metric.key, label: metric.label, score: metric.score, value: metric.value, confidence: metric.confidence ?? marked.analysis.confidence, tip: metric.tip, excused: metric.excused ?? false,
      })),
    }, null, 2)}\n`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

main().catch((err) => fail(err instanceof Error ? err.message : 'Analysis failed'));
