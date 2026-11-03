/**
 * POST /api/analysis/ball-track
 *
 * Accepts a video upload, saves it to /tmp, runs the Python ball tracker,
 * and returns structured analysis JSON.
 *
 * Body: multipart/form-data
 *   - video:          File  (mp4 / mov / avi)
 *   - white_ball:     "true" | "false"  (optional, default false)
 *   - pitch_length_m: number            (optional, default 20.12)
 *
 * Response 200:
 *   {
 *     frames_processed: number
 *     fps: number
 *     resolution: { w: number; h: number }
 *     ball_positions: Array<{ frame: number; x: number; y: number; radius: number; confidence: number }>
 *     trajectory: Array<{ x: number; y: number }>
 *     bounce_frame: number | null
 *     bounce_point: { x: number; y: number } | null
 *     speed_kph: number | null
 *     swing_px: number
 *     pitch_map: { px: number; py: number } | null
 *   }
 *
 * Security: server-side only — never exposes API keys or model paths to client.
 */

import { NextRequest, NextResponse } from 'next/server';
import { spawn }                     from 'child_process';
import { writeFile, unlink }         from 'fs/promises';
import { join }                      from 'path';
import { randomUUID }                from 'crypto';

// Path to the Python script (relative to project root at runtime)
const TRACKER_SCRIPT = join(process.cwd(), 'scripts', 'cv', 'ball_tracker.py');

// Max upload size: 100 MB
const MAX_BYTES = 100 * 1024 * 1024;

// Allowed video MIME types
const ALLOWED_TYPES = new Set([
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/webm',
]);

// ---------------------------------------------------------------------------
// Helper — run the Python tracker and resolve with parsed JSON output
// ---------------------------------------------------------------------------

function runTracker(args: string[]): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const py = spawn('python3', [TRACKER_SCRIPT, ...args], {
      timeout: 60_000, // 60-second hard limit
    });

    let stdout = '';
    let stderr = '';

    py.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
    py.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

    py.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Tracker exited ${code}: ${stderr.slice(0, 500)}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout) as Record<string, unknown>);
      } catch {
        reject(new Error(`Invalid JSON from tracker: ${stdout.slice(0, 200)}`));
      }
    });

    py.on('error', (err) => reject(err));
  });
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  // Parse multipart form
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

  // Write to /tmp with a unique name so concurrent requests don't clash
  const ext      = file.name.split('.').pop() ?? 'mp4';
  const tmpPath  = join('/tmp', `cp-ball-${randomUUID()}.${ext}`);

  try {
    await writeFile(tmpPath, buffer);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to save upload' }, { status: 500 });
  }

  // Build CLI args
  const whiteBall    = form.get('white_ball') === 'true';
  const pitchLength  = parseFloat((form.get('pitch_length_m') as string) || '20.12');

  const args = [
    '--video',          tmpPath,
    '--pitch_length_m', String(isNaN(pitchLength) ? 20.12 : pitchLength),
  ];
  if (whiteBall)       args.push('--white_ball');

  // Run tracker
  let result: Record<string, unknown>;
  try {
    result = await runTracker(args);
  } catch (err) {
    await unlink(tmpPath).catch(() => null);
    const message = err instanceof Error ? err.message : 'Tracker failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  // Clean up tmp file
  await unlink(tmpPath).catch(() => null);

  // Surface tracker-level errors (e.g. "No ball detected")
  if (result.error) {
    return NextResponse.json(result, { status: 422 });
  }

  return NextResponse.json(result, { status: 200 });
}

// Disable Next.js body parser — we handle streaming ourselves via formData()
export const config = {
  api: { bodyParser: false },
};
