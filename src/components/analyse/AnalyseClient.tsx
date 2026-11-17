'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import type { NormalizedLandmark, PoseLandmarker } from '@mediapipe/tasks-vision';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { createClient } from '@/lib/supabase/client';
import { HIGHLIGHTS_BUCKET, MAX_CLIPS, SEGMENT_SECONDS } from '@/lib/highlights';
import { seedDemoHighlights } from '@/app/analyse/actions';
import { BallTrackClient } from '@/components/analyse/BallTrackClient';

type AnalyseTab = 'pose' | 'ball';

const GOLD   = '#EFC84A';
const CRIMSON = '#1D4ED8';

// Keep in step with the @mediapipe/tasks-vision version in package.json: the wasm runtime must match the JS bundle.
const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.0/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

const RECORD_MS = 5000;
// An uploaded clip is analysed from the start up to this length
const MAX_UPLOAD_MS = 20000;
const MAX_UPLOAD_BYTES = 200 * 1024 * 1024;
const MIN_FRAMES = 10;
// Segments shorter than this (e.g. the tail when the camera stops) aren't worth keeping as clips
const MIN_CLIP_SECONDS = 2;
const MIN_VISIBILITY = 0.5;

// MediaPipe Pose landmark indices ("left" is the player's own left)
const L = { nose: 0, lShoulder: 11, rShoulder: 12, lElbow: 13, rElbow: 14, lWrist: 15, rWrist: 16,
  lHip: 23, rHip: 24, lKnee: 25, rKnee: 26, lAnkle: 27, rAnkle: 28 };

type Mode = 'bowling' | 'batting';
type Hand = 'right' | 'left';
type Phase = 'idle' | 'loading' | 'ready' | 'recording' | 'done';
type Point = { x: number; y: number };

// Shot types — each has different biomechanical targets
type ShotType = 'drive' | 'pull' | 'cut' | 'sweep' | 'defence' | 'leave';

const SHOT_TYPE_LABELS: Record<ShotType, string> = {
  drive:   '🏏 Drive',
  pull:    '💪 Pull / Hook',
  cut:     '✂️ Cut',
  sweep:   '🧹 Sweep',
  defence: '🛡️ Defence',
  leave:   '🚶 Leave',
};

type MetricDef = { key: string; label: string; unit: string; ideal: [number, number]; tolerance: number; tip: string };
type MetricResult = MetricDef & { value: number; score: number };

// Shot-type-aware ideal ranges for batting metrics.
// Each entry overrides the default ideal for that shot.
// Keys match the metric keys in METRICS.batting.
const SHOT_OVERRIDES: Partial<Record<ShotType, Partial<Record<string, [number, number]>>>> = {
  pull: {
    // Pull/hook: weight on back foot, front arm higher, big hip rotation, shoulder dips
    frontElbow:     [100, 145],
    kneeFlex:       [130, 155],  // more loaded back leg
    shoulderLevel:  [5, 20],     // natural tilt playing a short ball
    hipRotation:    [30, 60],    // powerful rotation through the ball
    weightTransfer: [0.3, 0.6],  // weight stays back or only slightly transfers
  },
  cut: {
    frontElbow:     [80, 120],
    shoulderLevel:  [0, 15],
    hipRotation:    [15, 40],
    weightTransfer: [0.3, 0.65],
  },
  sweep: {
    // Sweep: deep knee bend, front knee to the pitch, shoulder rotates hard
    kneeFlex:       [110, 145],
    frontElbow:     [70, 115],
    hipRotation:    [25, 55],
    weightTransfer: [0.55, 0.85],
  },
  defence: {
    // Dead bat defence: minimal hip rotation, head right over the ball, high elbow
    frontElbow:     [95, 130],
    kneeFlex:       [145, 170],
    hipRotation:    [5, 20],
    weightTransfer: [0.6, 0.85],
    headOverKnee:   [0, 0.15],  // tighter — head must be right over it
  },
  drive: {
    // Classic straight/cover drive: full extension, weight fully transferred
    frontElbow:     [90, 125],
    kneeFlex:       [150, 170],
    hipRotation:    [25, 50],
    weightTransfer: [0.65, 0.9],
  },
  leave: {
    // Leave: balanced, minimal movement, head still, weight centred
    kneeFlex:       [150, 170],
    hipRotation:    [0, 10],
    weightTransfer: [0.4, 0.6],
    headStability:  [0, 0.08],  // extra still on a leave
  },
};

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
    // ── Existing metrics (now shot-type aware) ────────────────────────────
    { key: 'frontElbow', label: 'Front elbow height', unit: '°', ideal: [90, 130], tolerance: 40,
      tip: 'Lead with a high front elbow — it keeps the bat face straight and the shot controlled.' },
    { key: 'kneeFlex', label: 'Knee flex', unit: '°', ideal: [140, 165], tolerance: 30,
      tip: 'Maintain a slight bend at the knees so you can move powerfully in either direction.' },
    { key: 'headOverKnee', label: 'Head position', unit: '', ideal: [0, 0.3], tolerance: 0.6,
      tip: 'Get your head over the front knee to stay balanced and keep the ball down.' },
    { key: 'shoulderLevel', label: 'Shoulder alignment', unit: '°', ideal: [0, 10], tolerance: 20,
      tip: 'Level shoulders at the point of contact give you the most control over shot direction.' },
    { key: 'headStability', label: 'Head stability', unit: '', ideal: [0, 0.15], tolerance: 0.35,
      tip: 'A still head is the single biggest predictor of clean contact — keep your eyes locked on the ball.' },
    // ── New metrics ────────────────────────────────────────────────────────
    { key: 'hipRotation', label: 'Hip rotation', unit: '°', ideal: [20, 50], tolerance: 25,
      tip: 'The hips drive power — rotate them through the ball before your arms extend.' },
    { key: 'weightTransfer', label: 'Weight transfer', unit: '', ideal: [0.55, 0.85], tolerance: 0.35,
      tip: 'Shift weight from back to front foot as you play — it converts momentum into shot power.' },
    { key: 'batSwingPlane', label: 'Bat swing plane', unit: '°', ideal: [70, 110], tolerance: 30,
      tip: 'A straight bat plane (near vertical) gives more margin for error than a cross-bat swing.' },
    { key: 'backElbow', label: 'Back elbow position', unit: '°', ideal: [60, 100], tolerance: 35,
      tip: 'A raised back elbow at the top of the backswing powers the downswing — don\'t let it collapse.' },
    { key: 'wristCock', label: 'Wrist cock', unit: '°', ideal: [100, 145], tolerance: 35,
      tip: 'Cocked wrists at the top of backswing store energy — release them through impact for timing.' },
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
  // A right-hander bowls/bats with the right arm and leads with the left side; mirror for left-handers.
  const front = hand === 'right'
    ? { shoulder: L.lShoulder, elbow: L.lElbow, wrist: L.lWrist, hip: L.lHip, knee: L.lKnee, ankle: L.lAnkle }
    : { shoulder: L.rShoulder, elbow: L.rElbow, wrist: L.rWrist, hip: L.rHip, knee: L.rKnee, ankle: L.rAnkle };
  const back = hand === 'right'
    ? { shoulder: L.rShoulder, elbow: L.rElbow, wrist: L.rWrist, hip: L.rHip }
    : { shoulder: L.lShoulder, elbow: L.lElbow, wrist: L.lWrist, hip: L.lHip };

  const shoulderMid = mid(p(L.lShoulder), p(L.rShoulder));
  const hipMid = mid(p(L.lHip), p(L.rHip));
  const shoulderWidth = Math.max(dist(p(L.lShoulder), p(L.rShoulder)), 1);
  const noseX = p(L.nose).x / shoulderWidth;

  if (mode === 'bowling') {
    const trunk = Math.abs((Math.atan2(shoulderMid.x - hipMid.x, hipMid.y - shoulderMid.y) * 180) / Math.PI);
    return {
      noseX,
      wristY: null,
      values: {
        frontKnee: angleAt(p(front.hip), p(front.knee), p(front.ankle)),
        armStraightness: angleAt(p(back.shoulder), p(back.elbow), p(back.wrist)),
        trunkTilt: trunk,
      } as Record<string, number>,
    };
  }

  // ── Batting metrics ────────────────────────────────────────────────────────
  const shoulderSlope = Math.abs(
    (Math.atan2(p(L.rShoulder).y - p(L.lShoulder).y, p(L.rShoulder).x - p(L.lShoulder).x) * 180) / Math.PI
  );

  // Hip rotation: angle of hip line relative to shoulder line (larger = more rotation through the shot)
  const shoulderAngle = Math.atan2(p(L.rShoulder).y - p(L.lShoulder).y, p(L.rShoulder).x - p(L.lShoulder).x);
  const hipAngle = Math.atan2(p(L.rHip).y - p(L.lHip).y, p(L.rHip).x - p(L.lHip).x);
  const hipRotation = Math.abs(((shoulderAngle - hipAngle) * 180) / Math.PI);

  // Weight transfer: horizontal position of centre of mass (hipMid) relative to foot positions
  // 0 = fully back foot, 1 = fully front foot
  const frontAnkle = p(front.ankle);
  const backAnkle = p(back.hip === L.rHip
    ? (hand === 'right' ? L.rAnkle : L.lAnkle)
    : (hand === 'right' ? L.lAnkle : L.rAnkle));
  const footSpan = Math.abs(frontAnkle.x - backAnkle.x);
  const weightTransfer = footSpan > 10
    ? Math.min(1, Math.max(0, Math.abs(hipMid.x - backAnkle.x) / footSpan))
    : 0.5;

  // Bat swing plane: angle of the line from back wrist to front wrist relative to vertical
  // Near 90° = vertical bat, deviating = cross-bat
  const wristLine = Math.abs(
    (Math.atan2(p(back.wrist).x - p(front.wrist).x, p(back.wrist).y - p(front.wrist).y) * 180) / Math.PI
  );
  const batSwingPlane = Math.min(wristLine, 180 - wristLine);

  // Back elbow: angle at back elbow joint — raised = good, collapsed = tip to improve
  const backElbow = angleAt(p(back.shoulder), p(back.elbow), p(back.wrist));

  // Wrist cock: angle between back forearm and the line of the bat (approximated by wrist-to-wrist)
  const wristCock = angleAt(p(back.elbow), p(back.wrist), p(front.wrist));

  return {
    noseX,
    wristY: p(back.wrist).y / h,  // normalised — used for phase detection
    values: {
      frontElbow:    angleAt(p(front.shoulder), p(front.elbow), p(front.wrist)),
      kneeFlex:      mean([
        angleAt(p(L.lHip), p(L.lKnee), p(L.lAnkle)),
        angleAt(p(L.rHip), p(L.rKnee), p(L.rAnkle)),
      ]),
      headOverKnee:  Math.abs(p(L.nose).x - p(front.knee).x) / shoulderWidth,
      shoulderLevel: Math.min(shoulderSlope, 180 - shoulderSlope),
      hipRotation:   Math.min(hipRotation, 90),
      weightTransfer,
      batSwingPlane,
      backElbow,
      wristCock,
    } as Record<string, number>,
  };
}

// Averages each metric across all usable frames; head stability is the spread of head position over the clip.
// For batting, shotType-aware ideal ranges override the defaults via SHOT_OVERRIDES.
function analyse(frames: NormalizedLandmark[][], mode: Mode, hand: Hand, w: number, h: number, shotType?: ShotType): MetricResult[] | null {
  const usable = frames.map((lm) => frameMetrics(lm, mode, hand, w, h)).filter((f) => f !== null);
  if (usable.length < MIN_FRAMES) return null;

  const noseMean = mean(usable.map((f) => f.noseX));
  const headSpread = Math.sqrt(mean(usable.map((f) => (f.noseX - noseMean) ** 2)));

  // Phase detection from wrist vertical velocity: high wrist = backswing, low wrist = contact/follow-through
  // We score contact-phase frames more heavily for batting metrics
  const wristYValues = usable.map((f) => f.wristY).filter((y): y is number => y !== null);
  const wristPeak = wristYValues.length > 0 ? Math.min(...wristYValues) : null; // smallest y = highest point (screen coords)

  const overrides = shotType ? (SHOT_OVERRIDES[shotType] ?? {}) : {};

  return METRICS[mode].map((def) => {
    let value: number;
    if (def.key === 'headStability') {
      value = headSpread;
    } else if (mode === 'batting' && def.key === 'batSwingPlane' && wristPeak !== null) {
      // For swing plane, weight the contact phase (wrist descending) more than the backswing
      const contactFrames = usable.filter((f) => f.wristY !== null && f.wristY > wristPeak + 0.05);
      const pool = contactFrames.length >= MIN_FRAMES / 2 ? contactFrames : usable;
      value = mean(pool.map((f) => f.values[def.key]).filter((v) => !isNaN(v)));
    } else {
      const raw = usable.map((f) => f.values[def.key]).filter((v) => v !== undefined && !isNaN(v));
      value = raw.length > 0 ? mean(raw) : 0;
    }

    // Apply shot-type override if present
    const ideal: [number, number] = overrides[def.key] ?? def.ideal;
    return { ...def, ideal, value, score: scoreFor(value, ideal, def.tolerance) };
  });
}

// Highlight score for one segment: technique score scaled by the share of frames with a clearly visible pose,
// so a strong but mostly occluded clip ranks below a clean, fully visible one.
function segmentScore(frames: NormalizedLandmark[][], totalFrames: number, mode: Mode, hand: Hand, w: number, h: number, shotType?: ShotType) {
  if (totalFrames === 0) return 0;
  const metrics = analyse(frames, mode, hand, w, h, shotType);
  if (!metrics) return 0;
  const usable = frames.filter((lm) => frameMetrics(lm, mode, hand, w, h) !== null).length;
  return Math.round(mean(metrics.map((m) => m.score)) * Math.min(1, usable / totalFrames));
}

// Highlight recording: the camera stream is recorded in back-to-back 5-second segments, each its own playable
// file. Each finished segment is scored from the landmarks seen while it recorded; only the top clips stay in memory.
type ScoredClip = { blob: Blob; score: number; start_sec: number; end_sec: number };
type Segment = { recorder: MediaRecorder; chunks: Blob[]; frames: NormalizedLandmark[][]; totalFrames: number; startedAt: number };
type Session = {
  stream: MediaStream; mimeType: string; width: number; height: number; startedAt: number;
  current: Segment | null; pending: Promise<void>[]; best: ScoredClip[]; segments: number;
};

function pickMimeType() {
  if (typeof MediaRecorder === 'undefined') return null;
  // Safari records MP4 only
  return ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4']
    .find((type) => MediaRecorder.isTypeSupported(type)) ?? null;
}

function startSegment(session: Session, now: number): Segment {
  const recorder = new MediaRecorder(session.stream, { mimeType: session.mimeType, videoBitsPerSecond: 2_500_000 });
  const segment: Segment = { recorder, chunks: [], frames: [], totalFrames: 0, startedAt: now };
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) segment.chunks.push(event.data);
  };
  recorder.start();
  return segment;
}

function finishSegment(session: Session, segment: Segment, mode: Mode, hand: Hand, now = performance.now(), shotType?: ShotType) {
  const seconds = (now - segment.startedAt) / 1000;
  const long = seconds >= MIN_CLIP_SECONDS;
  const score = long ? segmentScore(segment.frames, segment.totalFrames, mode, hand, session.width, session.height, mode === 'batting' ? shotType : undefined) : 0;
  if (long) session.segments += 1;
  segment.frames = [];

  const start_sec = Math.round((segment.startedAt - session.startedAt) / 100) / 10;
  const keep = () => {
    if (score <= 0) return;
    const clip = { blob: new Blob(segment.chunks, { type: session.mimeType }), score, start_sec, end_sec: Math.round((start_sec + seconds) * 10) / 10 };
    session.best = [...session.best, clip].sort((a, b) => b.score - a.score).slice(0, MAX_CLIPS);
  };

  // The final chunk arrives just before "stop", so the file is only complete once that fires
  session.pending.push(new Promise<void>((resolve) => {
    if (segment.recorder.state === 'inactive') {
      keep();
      resolve();
      return;
    }
    segment.recorder.onstop = () => {
      keep();
      resolve();
    };
    segment.recorder.stop();
  }));
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
  const [tab, setTab] = useState<AnalyseTab>('pose');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const connectionsRef = useRef<{ start: number; end: number }[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef(-1);
  const recordingRef = useRef<{ until: number; frames: NormalizedLandmark[][] } | null>(null);
  const sessionRef = useRef<Session | null>(null);

  const [mode, setMode] = useState<Mode>('bowling');
  const [hand, setHand] = useState<Hand>('right');
  const [shotType, setShotType] = useState<ShotType>('drive');
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [results, setResults] = useState<MetricResult[] | null>(null);
  const [frameCount, setFrameCount] = useState(0);
  const [highlights, setHighlights] = useState<'idle' | 'uploading' | 'ready'>('idle');
  // Where the frames come from: the live camera, or a clip the player picked
  const [source, setSource] = useState<'camera' | 'file'>('camera');
  const sourceRef = useRef<'camera' | 'file'>('camera');
  // 'user' is the selfie camera; 'environment' is the back camera, for when someone else films
  const [facing, setFacing] = useState<'user' | 'environment'>('user');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileUrlRef = useRef<string | null>(null);

  // Mode/hand/shotType are read when a recording finishes, from inside the rAF loop
  const settingsRef = useRef({ mode, hand, shotType });
  useEffect(() => {
    settingsRef.current = { mode, hand, shotType };
  }, [mode, hand, shotType]);

  // Tears everything down; a highlight session still in sessionRef is discarded (turnOff takes it out first to keep it)
  const stopCamera = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    const recorder = sessionRef.current?.current?.recorder;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    sessionRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recordingRef.current = null;
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.onended = null;
      video.srcObject = null;
      if (fileUrlRef.current) video.removeAttribute('src');
    }
    if (fileUrlRef.current) URL.revokeObjectURL(fileUrlRef.current);
    fileUrlRef.current = null;
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

    const fromFile = sourceRef.current === 'file';
    if (fromFile) {
      // An uploaded clip is read once: stop on its last analysed frame
      video.pause();
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const { mode: m, hand: hd, shotType: st } = settingsRef.current;
    const metrics = analyse(recording.frames, m, hd, video.videoWidth, video.videoHeight, m === 'batting' ? st : undefined);
    setFrameCount(recording.frames.length);
    if (!metrics) {
      setError(fromFile
        ? "We couldn't see a whole body clearly enough in that video. Use a clip filmed side-on with head to ankles in frame, in good light."
        : "We couldn't see your whole body clearly enough. Step back so head to ankles are in frame, and try again in better light.");
      setPhase(fromFile ? 'idle' : 'ready');
      return;
    }
    setResults(metrics);
    setPhase('done');

    // Save pose results to history (best-effort)
    const overall = Math.round(metrics.reduce((sum, mk) => sum + mk.score, 0) / metrics.length);
    const resultJson = { mode: m, hand: hd, shotType: m === 'batting' ? st : undefined, frameCount: recording.frames.length, overall, metrics: metrics.map((mk) => ({ key: mk.key, label: mk.label, value: mk.value, score: mk.score })) };

    // Generate a coaching paragraph server-side, then save both
    fetch('/api/analysis/coaching-read', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ pose: true, mode: m, hand: hd, shotType: m === 'batting' ? st : undefined, metrics: resultJson.metrics, overall }),
    })
      .then((r) => r.ok ? r.json() : null)
      .then((coachData: { paragraph?: string } | null) => {
        fetch('/api/analysis/save-result', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            analysis_type:      'pose',
            result_json:        resultJson,
            coaching_paragraph: coachData?.paragraph ?? null,
          }),
        }).catch(() => {/* silent */});
      })
      .catch(() => {/* silent */});
  }, [mode, hand]);

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

        const session = sessionRef.current;
        if (session?.current) {
          session.current.totalFrames += 1;
          if (pose) session.current.frames.push(pose);
          if (now - session.current.startedAt >= SEGMENT_SECONDS * 1000) {
            const { mode: m, hand: hd, shotType: st } = settingsRef.current;
            finishSegment(session, session.current, m, hd, now, st);
            session.current = startSegment(session, now);
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
  }, [finishRecording]);

  async function loadLandmarker() {
    if (landmarkerRef.current) return;
    const { FilesetResolver, PoseLandmarker } = await import('@mediapipe/tasks-vision');
    const vision = await FilesetResolver.forVisionTasks(WASM_URL);
    landmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
      runningMode: 'VIDEO',
      numPoses: 1,
    });
    connectionsRef.current = PoseLandmarker.POSE_CONNECTIONS;
  }

  async function startCamera(useFacing: 'user' | 'environment' = facing) {
    setError(null);
    setPhase('loading');
    stopCamera();
    sourceRef.current = 'camera';
    setSource('camera');
    try {
      await loadLandmarker();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: useFacing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      lastVideoTimeRef.current = -1;

      const mimeType = pickMimeType();
      if (mimeType) {
        const now = performance.now();
        const session: Session = {
          stream, mimeType, width: video.videoWidth, height: video.videoHeight, startedAt: now,
          current: null, pending: [], best: [], segments: 0,
        };
        session.current = startSegment(session, now);
        sessionRef.current = session;
      }

      setHighlights('idle');
      startLoop();
      setPhase('ready');
    } catch (err) {
      stopCamera();
      const denied = err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'SecurityError');
      setError(denied
        ? 'Camera access was blocked. Allow camera access in your browser settings and try again.'
        : `Couldn't start motion analysis: ${err instanceof Error ? err.message : 'unknown error'}`);
      setPhase('idle');
    }
  }

  // Swaps between the selfie and back cameras. Any highlight session in progress is dropped.
  function flipCamera() {
    const next = facing === 'user' ? 'environment' : 'user';
    setFacing(next);
    setResults(null);
    void startCamera(next);
  }

  // Runs the same body tracking over a clip from the player's device. Nothing is uploaded:
  // the video is read on the device, and only the scores are saved.
  async function analyseFile(file: File) {
    setError(null);
    setResults(null);
    if (!file.type.startsWith('video/')) {
      setError('Choose a video file.');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError('That video is too large. Trim it to the delivery or shot you want checked (under 200 MB).');
      return;
    }
    stopCamera();
    canvasRef.current?.getContext('2d')?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    sourceRef.current = 'file';
    setSource('file');
    setPhase('loading');
    try {
      await loadLandmarker();
      const video = videoRef.current;
      if (!video) return;
      const url = URL.createObjectURL(file);
      fileUrlRef.current = url;
      video.srcObject = null;
      video.src = url;
      video.onended = () => finishRecording();
      await video.play();
      lastVideoTimeRef.current = -1;
      recordingRef.current = { until: performance.now() + MAX_UPLOAD_MS, frames: [] };
      setPhase('recording');
      startLoop();
    } catch (err) {
      stopCamera();
      setError(`Couldn't read that video: ${err instanceof Error ? err.message : 'unknown error'}. MP4 and MOV clips work best.`);
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
    const session = sessionRef.current;
    sessionRef.current = null;
    if (session?.current) {
      finishSegment(session, session.current, mode, hand, undefined, mode === 'batting' ? shotType : undefined);
      session.current = null;
    }
    stopCamera();
    const canvas = canvasRef.current;
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    setPhase('idle');
    if (session) void saveHighlights(session);
  }

  async function saveHighlights(session: Session) {
    await Promise.all(session.pending);
    if (session.best.length === 0) {
      if (session.segments > 0) toast('No highlight clips this time. Keep your whole body in frame to get a reel.');
      return;
    }

    setHighlights('uploading');
    const toastId = toast.loading('Uploading session… generating highlights');
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sign in to save highlights');

      const contentType = session.mimeType.split(';')[0];
      const extension = contentType === 'video/mp4' ? 'mp4' : 'webm';
      const folder = `${user.id}/${Date.now()}`;
      const clips = await Promise.all(session.best.map(async (clip, i) => {
        const path = `${folder}/clip-${i + 1}.${extension}`;
        const { error: uploadError } = await supabase.storage.from(HIGHLIGHTS_BUCKET).upload(path, clip.blob, { contentType });
        if (uploadError) throw new Error(uploadError.message);
        return { path, score: clip.score, start_sec: clip.start_sec, end_sec: clip.end_sec };
      }));

      const res = await fetch('/api/highlights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, clips }),
      });
      if (!res.ok) throw new Error(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "Couldn't save highlights");

      toast.success('Highlights ready', { id: toastId });
      setHighlights('ready');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save highlights", { id: toastId });
      setHighlights('idle');
    }
  }

  const cameraOn = source === 'camera' && (phase === 'ready' || phase === 'recording' || phase === 'done');
  const fileShown = source === 'file' && (phase === 'recording' || phase === 'done');
  // The selfie camera is shown as a mirror; the back camera and uploaded clips are shown as filmed
  const mirrored = source === 'camera' && facing === 'user';
  const overall = results ? Math.round(mean(results.map((r) => r.score))) : null;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold" style={{ fontFamily: "'Inter', sans-serif" }}>Analyse</h1>
        <p className="mt-1 text-sm text-neutral-400">
          AI-powered cricket analysis — biomechanics and ball tracking in one place.
        </p>
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: '4px', padding: '4px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', width: 'fit-content' }}>
        {([['pose', '🧍 Pose & Technique'], ['ball', '🏏 Ball Tracking']] as [AnalyseTab, string][]).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            style={{
              padding:      '8px 20px',
              borderRadius: '9px',
              border:       'none',
              fontSize:     '13px',
              fontWeight:   600,
              cursor:       'pointer',
              background:   tab === key ? '#111' : 'transparent',
              color:        tab === key ? '#f0ece4' : 'rgba(240,236,228,0.45)',
              boxShadow:    tab === key ? '0 1px 4px rgba(0,0,0,0.4)' : 'none',
              transition:   'all 0.15s',
              fontFamily:   "'Inter', sans-serif",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Ball tracking tab */}
      {tab === 'ball' && <BallTrackClient />}

      {/* Pose tab — existing content */}
      {tab === 'pose' && <>
      {process.env.NODE_ENV === 'development' && (
        <form action={seedDemoHighlights}
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-neutral-700 px-4 py-3 text-sm">
          <span className="text-neutral-400">Dev only: add a sample reel without recording.</span>
          <Button type="submit" variant="secondary" size="sm">Skip to highlights (dev)</Button>
        </form>
      )}

      {highlights === 'ready' && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm"
          style={{ borderColor: 'rgba(239,200,74,0.3)', background: 'rgba(239,200,74,0.08)' }}>
          <span className="font-medium text-white">✨ Highlights ready</span>
          <Link href="/highlights" className="font-semibold hover:underline" style={{ color: GOLD }}>View your reel →</Link>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Toggle label="Discipline" value={mode} onChange={(v) => { setMode(v); setResults(null); }}
          disabled={phase === 'recording'}
          options={[{ value: 'bowling', label: 'Bowling' }, { value: 'batting', label: 'Batting' }]} />
        <Toggle label="Handedness" value={hand} onChange={(v) => { setHand(v); setResults(null); }}
          disabled={phase === 'recording'}
          options={[{ value: 'right', label: 'Right-handed' }, { value: 'left', label: 'Left-handed' }]} />
      </div>

      {/* Shot type selector — batting only */}
      {mode === 'batting' && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">Shot type</p>
          <div className="flex flex-wrap gap-2">
            {(Object.entries(SHOT_TYPE_LABELS) as [ShotType, string][]).map(([key, label]) => {
              const active = shotType === key;
              return (
                <button
                  key={key}
                  type="button"
                  disabled={phase === 'recording'}
                  onClick={() => { setShotType(key); setResults(null); }}
                  className="rounded-lg border px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    borderColor: active ? GOLD : 'rgba(255,255,255,0.12)',
                    background:  active ? 'rgba(239,200,74,0.12)' : 'rgba(255,255,255,0.03)',
                    color:       active ? GOLD : 'rgba(255,255,255,0.65)',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-xs text-neutral-500">
            Scoring targets adjust automatically for the selected shot — a pull and a drive have different ideal positions.
          </p>
        </div>
      )}

      <Card>
        <div className="relative overflow-hidden rounded-xl bg-black" style={{ aspectRatio: '16 / 9' }}>
          {/* Mirrored so it behaves like a mirror; landmarks are computed on the unmirrored frame */}
          <video ref={videoRef} playsInline muted className="absolute inset-0 h-full w-full object-contain"
            style={{ transform: mirrored ? 'scaleX(-1)' : undefined }} />
          <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full object-contain"
            style={{ transform: mirrored ? 'scaleX(-1)' : undefined }} />

          {!cameraOn && !fileShown && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <span className="text-4xl" aria-hidden>🎯</span>
              <p className="max-w-sm text-sm text-neutral-400">
                Set your phone or laptop side-on, step back so your whole body is in frame, then start the camera.
                Or upload a clip you have already filmed.
              </p>
            </div>
          )}

          {phase === 'recording' && (
            <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/70 px-3 py-1 text-sm font-medium">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full" style={{ background: CRIMSON }} aria-hidden />
              {source === 'file' ? 'Analysing your video…' : `Recording · ${secondsLeft}s`}
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          {!cameraOn && (
            <>
              <Button onClick={() => startCamera()} loading={phase === 'loading'} disabled={phase === 'recording'}>
                {phase === 'loading' ? 'Loading pose model…' : 'Start camera'}
              </Button>
              <Button variant="secondary" onClick={() => fileInputRef.current?.click()}
                disabled={phase === 'loading' || phase === 'recording'}>
                {fileShown && phase === 'done' ? 'Upload another video' : 'Upload a video'}
              </Button>
              <input ref={fileInputRef} type="file" accept="video/*" className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  if (file) void analyseFile(file);
                }} />
            </>
          )}
          {cameraOn && (
            <>
              <Button onClick={startRecording} disabled={phase === 'recording'}>
                {phase === 'done' ? 'Record again' : 'Record 5 seconds'}
              </Button>
              <Button variant="secondary" onClick={flipCamera} disabled={phase === 'recording'}>
                {facing === 'user' ? 'Use back camera' : 'Use front camera'}
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
          description={`Averaged over ${frameCount} frames${source === 'file' ? ' of your video' : ''}`}
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
      </>}
    </div>
  );
}
