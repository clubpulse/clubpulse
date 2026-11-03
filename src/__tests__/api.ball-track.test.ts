/**
 * Tests for POST /api/analysis/ball-track
 *
 * The route: accepts a video upload → writes to /tmp → spawns Python tracker
 * → returns structured JSON.
 *
 * We mock `child_process.spawn` and `fs/promises` so no real file I/O or
 * Python execution happens.
 */

import { NextRequest } from 'next/server';
import { EventEmitter } from 'events';

// ── Mocks (must be declared before the import that uses them) ────────────────

const mockWriteFile = jest.fn().mockResolvedValue(undefined);
const mockUnlink    = jest.fn().mockResolvedValue(undefined);

jest.mock('fs/promises', () => ({
  writeFile: (...args: unknown[]) => mockWriteFile(...args),
  unlink:    (...args: unknown[]) => mockUnlink(...args),
}));

/** Minimal EventEmitter that acts like a ChildProcess */
function makeProcess(opts: {
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  spawnError?: Error;
}) {
  const proc = new EventEmitter() as EventEmitter & {
    stdout: EventEmitter;
    stderr: EventEmitter;
  };
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();

  setImmediate(() => {
    if (opts.spawnError) {
      proc.emit('error', opts.spawnError);
      return;
    }
    if (opts.stdout) proc.stdout.emit('data', Buffer.from(opts.stdout));
    if (opts.stderr) proc.stderr.emit('data', Buffer.from(opts.stderr));
    proc.emit('close', opts.exitCode ?? 0);
  });

  return proc;
}

const mockSpawn = jest.fn();
jest.mock('child_process', () => ({ spawn: (...args: unknown[]) => mockSpawn(...args) }));

// ── Import AFTER mocks are set up ────────────────────────────────────────────

import { POST } from '@/app/api/analysis/ball-track/route';

// ── Helpers ──────────────────────────────────────────────────────────────────

const SAMPLE_RESULT = {
  frames_processed: 120,
  fps: 30,
  resolution: { w: 1920, h: 1080 },
  ball_positions: [{ frame: 1, x: 100, y: 200, radius: 10, confidence: 0.9 }],
  trajectory: [{ x: 100, y: 200 }, { x: 150, y: 210 }],
  bounce_frame: 60,
  bounce_point: { x: 960, y: 700 },
  speed_kph: 125.3,
  swing_px: 12.4,
  pitch_map: { px: 0.5, py: 0.7 },
  calibration: null,
};

function makeRequest(opts: {
  file?: File | null;
  whiteBall?: boolean;
}): NextRequest {
  const form = new FormData();
  if (opts.file !== null) {
    const f = opts.file ?? new File(['fake-video-bytes'], 'delivery.mp4', { type: 'video/mp4' });
    form.append('video', f);
  }
  form.append('white_ball', String(opts.whiteBall ?? false));

  // NextRequest requires a valid URL
  return new NextRequest('http://localhost/api/analysis/ball-track', {
    method: 'POST',
    body:   form,
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/analysis/ball-track', () => {
  jest.setTimeout(15000);

  beforeEach(() => {
    mockWriteFile.mockResolvedValue(undefined);
    mockUnlink.mockResolvedValue(undefined);
  });

  it('returns 400 when no video file is attached', async () => {
    const req = new NextRequest('http://localhost/api/analysis/ball-track', {
      method: 'POST',
      body:   new FormData(), // empty — no "video" field
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/no video/i);
  });

  it('returns 415 for an unsupported MIME type', async () => {
    const form = new FormData();
    form.append('video', new File(['bytes'], 'clip.gif', { type: 'image/gif' }));
    const req = new NextRequest('http://localhost/api/analysis/ball-track', {
      method: 'POST',
      body:   form,
    });
    const res = await POST(req);
    expect(res.status).toBe(415);
    const body = await res.json();
    expect(body.error).toMatch(/unsupported/i);
  });

  it('returns 413 when the file exceeds 100 MB', async () => {
    // Create a File whose arrayBuffer resolves to 101 MB
    const bigBuffer = new Uint8Array(101 * 1024 * 1024);
    const bigFile = new File([bigBuffer], 'huge.mp4', { type: 'video/mp4' });

    const form = new FormData();
    form.append('video', bigFile);
    const req = new NextRequest('http://localhost/api/analysis/ball-track', {
      method: 'POST',
      body:   form,
    });
    const res = await POST(req);
    expect(res.status).toBe(413);
    const body = await res.json();
    expect(body.error).toMatch(/too large/i);
  });

  it('returns 500 when the Python tracker exits with a non-zero code', async () => {
    mockSpawn.mockReturnValue(
      makeProcess({ stderr: 'cv2 error', exitCode: 1 })
    );

    const res = await POST(makeRequest({}));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBeDefined();
    // Temp file should still be cleaned up
    expect(mockUnlink).toHaveBeenCalled();
  });

  it('returns 500 when the Python tracker outputs invalid JSON', async () => {
    mockSpawn.mockReturnValue(
      makeProcess({ stdout: 'NOT JSON', exitCode: 0 })
    );

    const res = await POST(makeRequest({}));
    expect(res.status).toBe(500);
    expect(mockUnlink).toHaveBeenCalled();
  });

  it('returns 200 with structured result on success', async () => {
    mockSpawn.mockReturnValue(
      makeProcess({ stdout: JSON.stringify(SAMPLE_RESULT), exitCode: 0 })
    );

    const res = await POST(makeRequest({}));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.frames_processed).toBe(120);
    expect(body.speed_kph).toBe(125.3);
    expect(body.swing_px).toBe(12.4);
    expect(body.ball_positions).toHaveLength(1);
    expect(mockUnlink).toHaveBeenCalled();
  });

  it('passes --white_ball flag when white_ball=true', async () => {
    mockSpawn.mockReturnValue(
      makeProcess({ stdout: JSON.stringify(SAMPLE_RESULT), exitCode: 0 })
    );

    await POST(makeRequest({ whiteBall: true }));

    const spawnArgs: string[] = mockSpawn.mock.calls[0][1]; // argv passed to python3
    expect(spawnArgs).toContain('--white_ball');
  });

  it('writes the upload to /tmp and cleans it up after success', async () => {
    mockSpawn.mockReturnValue(
      makeProcess({ stdout: JSON.stringify(SAMPLE_RESULT), exitCode: 0 })
    );

    await POST(makeRequest({}));

    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.stringMatching(/^\/tmp\/cp-ball-/),
      expect.any(Buffer),
    );
    expect(mockUnlink).toHaveBeenCalledWith(
      expect.stringMatching(/^\/tmp\/cp-ball-/),
    );
  });
});
