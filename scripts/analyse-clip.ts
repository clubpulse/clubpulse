// Score a video file with the same rules as the Analyse page. Nothing is uploaded.
//
//   npx tsx scripts/analyse-clip.ts <video> --discipline bowling|batting --hand right|left
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
import {
  analyseDetailed, drillFor, overallScore, weakestMeasure,
  type Hand, type Landmark, type Mode,
} from '../src/lib/analysis/pose-metrics';

const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

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
  if (!video || video.startsWith('--')) fail('Usage: npx tsx scripts/analyse-clip.ts <video> --discipline bowling|batting --hand right|left');
  if (discipline !== 'bowling' && discipline !== 'batting') fail('--discipline must be bowling or batting');
  if (hand !== 'right' && hand !== 'left') fail('--hand must be right or left');

  const dir = mkdtempSync(path.join(tmpdir(), 'analyse-clip-'));
  const modelPath = path.join(dir, 'pose.task');
  try {
    const model = await fetch(MODEL_URL);
    if (!model.ok) fail('Could not download the pose model.');
    writeFileSync(modelPath, Buffer.from(await model.arrayBuffer()));

    const py = spawnSync('python3', [path.join(process.cwd(), 'scripts/analyse-clip-landmarks.py'), video, modelPath], {
      encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    });
    if (py.status !== 0) {
      const missing = (py.stderr || '').includes('No module named');
      fail(missing
        ? 'Install the pose reader first: pip install mediapipe opencv-python-headless'
        : (py.stderr || 'Could not read poses from the video.'));
    }
    const read = JSON.parse(py.stdout) as { width: number; height: number; frames: Landmark[][] };
    const marked = analyseDetailed(read.frames, discipline as Mode, hand as Hand, read.width, read.height);
    if (!marked.ok) {
      process.stdout.write(`${JSON.stringify({ ok: false, problem: marked.problem, frames: read.frames.length }, null, 2)}\n`);
      process.exit(2);
    }
    const metrics = marked.analysis.metrics;
    const weakest = weakestMeasure(metrics);
    process.stdout.write(`${JSON.stringify({
      ok: true,
      discipline,
      hand,
      view: 'side',
      frames: read.frames.length,
      overall: overallScore(metrics),
      weakest: weakest ? { key: weakest.key, label: weakest.label, score: weakest.score, value: weakest.value, tip: weakest.tip, drill: drillFor(weakest) } : null,
      metrics: metrics.map((metric) => ({
        key: metric.key, label: metric.label, score: metric.score, value: metric.value, tip: metric.tip, excused: metric.excused ?? false,
      })),
    }, null, 2)}\n`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

main().catch((err) => fail(err instanceof Error ? err.message : 'Analysis failed'));
