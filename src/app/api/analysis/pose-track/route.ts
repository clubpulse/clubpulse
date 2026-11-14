/**
 * POST /api/analysis/pose-track
 *
 * Accepts a video upload, saves it to /tmp, runs the Python pose tracker,
 * and returns structured biomechanical analysis JSON.
 *
 * Body: multipart/form-data
 *   - video:        File  (mp4 / mov / avi / webm)
 *   - sample_rate:  number  (optional, default 5 — analyse every Nth frame)
 *
 * Response 200:
 *   {
 *     frames_processed: number
 *     fps: number
 *     resolution: { w: number; h: number }
 *     bat_lift: number           // 0-100 backswing quality
 *     balance: number            // 0-100 weight distribution
 *     follow_through: number     // 0-100 follow-through extension
 *     elbow_angle: number | null // degrees at top of swing
 *     head_stability: number     // 0-100 head stillness
 *     keyframes: Array<{
 *       frame: number
 *       landmarks: Record<string, [number, number, number]>
 *       scores: { bat_lift: number; balance: number; follow_through: number }
 *     }>
 *   }
 *
 * Security: server-side only — never exposes API keys to client.
 */

import { NextRequest, NextResponse } from 'next/server';
import { spawn }                     from 'child_process';
import { writeFile, unlink }         from 'fs/promises';
import { join }                      from 'path';
import { randomUUID }                from 'crypto';

const POSE_SCRIPT = join(process.cwd(), 'scripts', 'cv', 'pose_tracker.py');
const MAX_BYTES   = 100 * 1024 * 1024;  // 100 MB
const ALLOWED_TYPES = new Set([
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/webm',
]);

function runPoseTracker(args: string[]): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const py = spawn('python3', [POSE_SCRIPT, ...args], { timeout: 120_000 });

    let stdout = '';
    let stderr = '';

    py.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
    py.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

    py.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Pose tracker exited ${code}: ${stderr.slice(0, 500)}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout) as Record<string, unknown>);
      } catch {
        reject(new Error(`Invalid JSON from pose tracker: ${stdout.slice(0, 200)}`));
      }
    });

    py.on('error', (err) => reject(err));
  });
}

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = form.get('video');
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'No video file provided' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: `Unsupported file type: ${file.type}` },
      { status: 415 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: 'File too large (max 100 MB)' }, { status: 413 });
  }

  const ext     = file.name.split('.').pop() ?? 'mp4';
  const tmpPath = join('/tmp', `cp-pose-${randomUUID()}.${ext}`);

  try {
    await writeFile(tmpPath, buffer);
  } catch {
    return NextResponse.json({ error: 'Failed to save upload' }, { status: 500 });
  }

  const sampleRate = parseInt((form.get('sample_rate') as string) || '5', 10);
  const args = [
    '--video', tmpPath,
    '--sample_rate', String(isNaN(sampleRate) ? 5 : Math.max(1, sampleRate)),
  ];

  let result: Record<string, unknown>;
  try {
    result = await runPoseTracker(args);
  } catch (err) {
    await unlink(tmpPath).catch(() => null);
    const message = err instanceof Error ? err.message : 'Pose tracker failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  await unlink(tmpPath).catch(() => null);

  if (result.error) {
    return NextResponse.json(result, { status: 422 });
  }

  return NextResponse.json(result, { status: 200 });
}

export const config = {
  api: { bodyParser: false },
};
