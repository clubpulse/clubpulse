'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { NormalizedLandmark, PoseLandmarker } from '@mediapipe/tasks-vision';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

// Keep in step with the @mediapipe/tasks-vision version in package.json: the wasm runtime must match the JS bundle.
const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.0/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

const RECORD_MS = 5000;
const MIN_FRAMES = 10;
const MIN_VISIBILITY = 0.5;
const GOLD = '#c9a54c';
const CRIMSON = '#9b1c1c';

// MediaPipe Pose landmark indices ("left" is the player's own left)
const L = { nose: 0, lShoulder: 11, rShoulder: 12, lElbow: 13, rElbow: 14, lWrist: 15, rWrist: 16,
  lHip: 23, rHip: 24, lKnee: 25, rKnee: 26, lAnkle: 27, rAnkle: 28 };

type Mode = 'bowling' | 'batting';
type Hand = 'right' | 'left';
type Phase = 'idle' | 'loading' | 'ready' | 'recording' | 'done';
type Point = { x: number; y: number };

type MetricDef = { key: string; label: string; unit: string; ideal: [number, number]; tolerance: number; tip: string };
type MetricResult = MetricDef & { value: number; score: number };

const METRICS: Record<Mode, MetricDef[]> = {
  bowling: [
    { key: 'frontKnee', label: 'Front knee brace', unit: '°', ideal: [165, 180], tolerance: 30,
      tip: 'Land on a firm, straight front leg to transfer momentum into the ball.' },
    { key: 'armStraightness', label: 'Bowling arm', unit: '°', ideal: [165, 180], tolerance: 25,
      tip: 'Keep the bowling arm as straight as possible through the action.' },
    { key: 'trunkTilt', label: 'Trunk tilt', unit: '°', ideal: [5, 25], tolerance: 20,
      tip: 'A moderate lean toward the off side helps; too much strains the lower back.' },
    { key: 'headStability', label: 'Head stability', unit: '', ideal: [0, 0.15], tolerance: 0.35,
      tip: 'Keep your eyes level and head still to stay accurate.' },
  ],
  batting: [
    { key: 'frontElbow', label: 'Front elbow', unit: '°', ideal: [90, 130], tolerance: 40,
      tip: 'Lead with a high front elbow to keep the bat face straight.' },
    { key: 'kneeFlex', label: 'Knee flex', unit: '°', ideal: [140, 165], tolerance: 30,
      tip: 'Stay slightly bent at the knees so you can move quickly either way.' },
    { key: 'headOverKnee', label: 'Head over front knee', unit: '', ideal: [0, 0.3], tolerance: 0.6,
      tip: 'Get your head over the front knee to control the shot and keep it down.' },
    { key: 'shoulderLevel', label: 'Shoulder level', unit: '°', ideal: [0, 10], tolerance: 20,
      tip: 'Keep your shoulders level in the stance for a balanced base.' },
    { key: 'headStability', label: 'Head stability', unit: '', ideal: [0, 0.15], tolerance: 0.35,
      tip: 'A still head gives you the best view of the ball.' },
  ],
};

function angleAt(a: Point, b: Point, c: Point) {
  const ab = Math.atan2(a.y - b.y, a.x - b.x);
  const cb = Math.atan2(c.y - b.y, c.x - b.x);
  const deg = Math.abs(((ab - cb) * 180) / Math.PI);
  return deg > 180 ? 360 - deg : deg;
}

function mid(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function dist(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function scoreFor(value: number, [lo, hi]: [number, number], tolerance: number) {
  const off = value < lo ? lo - value : value > hi ? value - hi : 0;
  return Math.round(Math.max(0, 100 - (100 * off) / tolerance));
}

function mean(values: number[]) {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

// Per-frame metrics in pixel space (normalised coords would skew angles on non-square video).
// Returns null when the joints we need aren't confidently visible.
function frameMetrics(lm: NormalizedLandmark[], mode: Mode, hand: Hand, w: number, h: number) {
  const needed = [L.nose, L.lShoulder, L.rShoulder, L.lElbow, L.rElbow, L.lWrist, L.rWrist,
    L.lHip, L.rHip, L.lKnee, L.rKnee, L.lAnkle, L.rAnkle];
  if (needed.some((i) => (lm[i]?.visibility ?? 0) < MIN_VISIBILITY)) return null;

  const p = (i: number): Point => ({ x: lm[i].x * w, y: lm[i].y * h });
  // A right-hander bowls with the right arm and leads with the left side; mirror for left-handers.
  const front = hand === 'right'
    ? { shoulder: L.lShoulder, elbow: L.lElbow, wrist: L.lWrist, hip: L.lHip, knee: L.lKnee, ankle: L.lAnkle }
    : { shoulder: L.rShoulder, elbow: L.rElbow, wrist: L.rWrist, hip: L.rHip, knee: L.rKnee, ankle: L.rAnkle };
  const back = hand === 'right'
    ? { shoulder: L.rShoulder, elbow: L.rElbow, wrist: L.rWrist }
    : { shoulder: L.lShoulder, elbow: L.lElbow, wrist: L.lWrist };

  const shoulderMid = mid(p(L.lShoulder), p(L.rShoulder));
  const hipMid = mid(p(L.lHip), p(L.rHip));
  const shoulderWidth = Math.max(dist(p(L.lShoulder), p(L.rShoulder)), 1);
  const noseX = p(L.nose).x / shoulderWidth;

  if (mode === 'bowling') {
    const trunk = Math.abs((Math.atan2(shoulderMid.x - hipMid.x, hipMid.y - shoulderMid.y) * 180) / Math.PI);
    return {
      noseX,
      values: {
        frontKnee: angleAt(p(front.hip), p(front.knee), p(front.ankle)),
        armStraightness: angleAt(p(back.shoulder), p(back.elbow), p(back.wrist)),
        trunkTilt: trunk,
      } as Record<string, number>,
    };
  }

  const shoulderSlope = Math.abs(
    (Math.atan2(p(L.rShoulder).y - p(L.lShoulder).y, p(L.rShoulder).x - p(L.lShoulder).x) * 180) / Math.PI
  );
  return {
    noseX,
    values: {
      frontElbow: angleAt(p(front.shoulder), p(front.elbow), p(front.wrist)),
      kneeFlex: mean([
        angleAt(p(L.lHip), p(L.lKnee), p(L.lAnkle)),
        angleAt(p(L.rHip), p(L.rKnee), p(L.rAnkle)),
      ]),
      headOverKnee: Math.abs(p(L.nose).x - p(front.knee).x) / shoulderWidth,
      shoulderLevel: Math.min(shoulderSlope, 180 - shoulderSlope),
    } as Record<string, number>,
  };
}

// Averages each metric across all usable frames; head stability is the spread of head position over the clip.
function analyse(frames: NormalizedLandmark[][], mode: Mode, hand: Hand, w: number, h: number): MetricResult[] | null {
  const usable = frames.map((lm) => frameMetrics(lm, mode, hand, w, h)).filter((f) => f !== null);
  if (usable.length < MIN_FRAMES) return null;

  const noseMean = mean(usable.map((f) => f.noseX));
  const headSpread = Math.sqrt(mean(usable.map((f) => (f.noseX - noseMean) ** 2)));

  return METRICS[mode].map((def) => {
    const value = def.key === 'headStability' ? headSpread : mean(usable.map((f) => f.values[def.key]));
    return { ...def, value, score: scoreFor(value, def.ideal, def.tolerance) };
  });
}

function drawPose(ctx: CanvasRenderingContext2D, lm: NormalizedLandmark[], connections: { start: number; end: number }[]) {
  const { width: w, height: h } = ctx.canvas;
  // Skip the face mesh points (1–10); the nose alone marks the head
  const isBody = (i: number) => i === 0 || i >= 11;

  ctx.lineWidth = Math.max(2, w / 220);
  ctx.strokeStyle = GOLD;
  for (const { start, end } of connections) {
    if (!isBody(start) || !isBody(end)) continue;
    const a = lm[start];
    const b = lm[end];
    if (a.visibility < MIN_VISIBILITY || b.visibility < MIN_VISIBILITY) continue;
    ctx.beginPath();
    ctx.moveTo(a.x * w, a.y * h);
    ctx.lineTo(b.x * w, b.y * h);
    ctx.stroke();
  }

  const radius = Math.max(3, w / 160);
  lm.forEach((point, i) => {
    if (!isBody(i) || point.visibility < MIN_VISIBILITY) return;
    ctx.beginPath();
    ctx.arc(point.x * w, point.y * h, radius, 0, Math.PI * 2);
    ctx.fillStyle = CRIMSON;
    ctx.fill();
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });
}

function scoreColour(score: number) {
  if (score >= 80) return GOLD;
  if (score >= 50) return '#d97706';
  return '#ef4444';
}

function formatValue(m: MetricResult) {
  return m.unit === '°' ? `${Math.round(m.value)}°` : m.value.toFixed(2);
}

function Toggle<T extends string>({ value, options, onChange, disabled, label }: {
  value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; disabled?: boolean; label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg border border-neutral-800 bg-neutral-900 p-1">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className="rounded-md px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60"
            style={{ background: active ? CRIMSON : 'transparent', color: active ? '#fff' : 'rgba(255,255,255,0.55)' }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function AnalyseClient() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const connectionsRef = useRef<{ start: number; end: number }[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef(-1);
  const recordingRef = useRef<{ until: number; frames: NormalizedLandmark[][] } | null>(null);

  const [mode, setMode] = useState<Mode>('bowling');
  const [hand, setHand] = useState<Hand>('right');
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [results, setResults] = useState<MetricResult[] | null>(null);
  const [frameCount, setFrameCount] = useState(0);

  // Mode/hand are read when a recording finishes, from inside the rAF loop
  const settingsRef = useRef({ mode, hand });
  useEffect(() => {
    settingsRef.current = { mode, hand };
  }, [mode, hand]);

  const stopCamera = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recordingRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
    };
  }, [stopCamera]);

  const finishRecording = useCallback(() => {
    const recording = recordingRef.current;
    const video = videoRef.current;
    recordingRef.current = null;
    if (!recording || !video) return;

    const { mode: m, hand: hd } = settingsRef.current;
    const metrics = analyse(recording.frames, m, hd, video.videoWidth, video.videoHeight);
    setFrameCount(recording.frames.length);
    if (!metrics) {
      setError('We couldn’t see your whole body clearly enough. Step back so head to ankles are in frame, and try again in better light.');
      setPhase('ready');
      return;
    }
    setResults(metrics);
    setPhase('done');
  }, []);

  const startLoop = useCallback(() => {
    const tick = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const landmarker = landmarkerRef.current;

      if (video && canvas && landmarker && video.readyState >= 2 && video.currentTime !== lastVideoTimeRef.current) {
        lastVideoTimeRef.current = video.currentTime;
        if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
        if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;

        const now = performance.now();
        const result = landmarker.detectForVideo(video, now);
        const ctx = canvas.getContext('2d');
        const pose = result.landmarks[0];
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          if (pose) drawPose(ctx, pose, connectionsRef.current);
        }

        const recording = recordingRef.current;
        if (recording) {
          if (pose) recording.frames.push(pose);
          setSecondsLeft(Math.max(0, Math.ceil((recording.until - now) / 1000)));
          if (now >= recording.until) finishRecording();
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
  }, [finishRecording]);

  async function startCamera() {
    setError(null);
    setPhase('loading');
    try {
      if (!landmarkerRef.current) {
        const { FilesetResolver, PoseLandmarker } = await import('@mediapipe/tasks-vision');
        const vision = await FilesetResolver.forVisionTasks(WASM_URL);
        landmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
          runningMode: 'VIDEO',
          numPoses: 1,
        });
        connectionsRef.current = PoseLandmarker.POSE_CONNECTIONS;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      lastVideoTimeRef.current = -1;
      startLoop();
      setPhase('ready');
    } catch (err) {
      stopCamera();
      const denied = err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'SecurityError');
      setError(denied
        ? 'Camera access was blocked. Allow camera access in your browser settings and try again.'
        : `Couldn’t start motion analysis: ${err instanceof Error ? err.message : 'unknown error'}`);
      setPhase('idle');
    }
  }

  function startRecording() {
    setError(null);
    setResults(null);
    setSecondsLeft(RECORD_MS / 1000);
    recordingRef.current = { until: performance.now() + RECORD_MS, frames: [] };
    setPhase('recording');
  }

  function turnOff() {
    stopCamera();
    const canvas = canvasRef.current;
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    setPhase('idle');
  }

  const cameraOn = phase === 'ready' || phase === 'recording' || phase === 'done';
  const overall = results ? Math.round(mean(results.map((r) => r.score))) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold" style={{ fontFamily: "'Inter', sans-serif" }}>Analyse</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Record a 5-second clip and get instant feedback on your {mode} technique. Video stays on your device.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Toggle label="Discipline" value={mode} onChange={(v) => { setMode(v); setResults(null); }}
          disabled={phase === 'recording'}
          options={[{ value: 'bowling', label: 'Bowling' }, { value: 'batting', label: 'Batting' }]} />
        <Toggle label="Handedness" value={hand} onChange={(v) => { setHand(v); setResults(null); }}
          disabled={phase === 'recording'}
          options={[{ value: 'right', label: 'Right-handed' }, { value: 'left', label: 'Left-handed' }]} />
      </div>

      <Card>
        <div className="relative overflow-hidden rounded-xl bg-black" style={{ aspectRatio: '16 / 9' }}>
          {/* Mirrored so it behaves like a mirror; landmarks are computed on the unmirrored frame */}
          <video ref={videoRef} playsInline muted className="absolute inset-0 h-full w-full object-contain"
            style={{ transform: 'scaleX(-1)' }} />
          <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full object-contain"
            style={{ transform: 'scaleX(-1)' }} />

          {!cameraOn && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <span className="text-4xl" aria-hidden>🎯</span>
              <p className="max-w-sm text-sm text-neutral-400">
                Set your phone or laptop side-on, step back so your whole body is in frame, then start the camera.
              </p>
            </div>
          )}

          {phase === 'recording' && (
            <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/70 px-3 py-1 text-sm font-medium">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full" style={{ background: CRIMSON }} aria-hidden />
              Recording · {secondsLeft}s
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          {!cameraOn && (
            <Button onClick={startCamera} loading={phase === 'loading'}>
              {phase === 'loading' ? 'Loading pose model…' : 'Start camera'}
            </Button>
          )}
          {cameraOn && (
            <>
              <Button onClick={startRecording} disabled={phase === 'recording'}>
                {phase === 'done' ? 'Record again' : 'Record 5 seconds'}
              </Button>
              <Button variant="secondary" onClick={turnOff} disabled={phase === 'recording'}>Stop camera</Button>
            </>
          )}
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}
      </Card>

      {results && overall !== null && (
        <Card
          title={`${mode === 'bowling' ? 'Bowling' : 'Batting'} analysis`}
          description={`Averaged over ${frameCount} frames`}
          action={
            <div className="text-right">
              <div className="text-3xl font-bold" style={{ color: scoreColour(overall) }}>{overall}</div>
              <div className="text-xs text-neutral-500">overall / 100</div>
            </div>
          }
        >
          <ul className="space-y-4">
            {results.map((m) => (
              <li key={m.key}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium text-white">{m.label}</span>
                  <span className="text-neutral-400">
                    {formatValue(m)} · <span style={{ color: scoreColour(m.score) }}>{m.score}</span>
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-800">
                  <div className="h-full rounded-full" style={{ width: `${m.score}%`, background: scoreColour(m.score) }} />
                </div>
                {m.score < 80 && <p className="mt-1.5 text-xs text-neutral-500">{m.tip}</p>}
              </li>
            ))}
          </ul>
          <p className="mt-5 text-xs text-neutral-600">
            Scores are estimates from a single camera angle and work best filmed side-on. Use them as a guide, not a verdict.
          </p>
        </Card>
      )}
    </div>
  );
}
