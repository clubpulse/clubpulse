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
import { PoseFigure } from '@/components/analyse/PoseFigure';
import { REFERENCE_SIZE, getReference, referenceBat, referencePose } from '@/lib/analysis/reference';
import {
  MIN_VISIBILITY, SHOT_TYPE_LABELS, analyseDetailed, mean, segmentScore,
  type Analysis, type Hand, type MetricResult, type Mode, type ShotType,
} from '@/lib/analysis/pose-metrics';

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
// Segments shorter than this (e.g. the tail when the camera stops) aren't worth keeping as clips
const MIN_CLIP_SECONDS = 2;

type Phase = 'idle' | 'loading' | 'ready' | 'recording' | 'done';

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

// How many canvas pixels make one pixel on screen. A 1080-wide phone video shown 300 wide needs
// lines 3.6 times thicker, or the skeleton is too thin to see.
function screenScale(canvas: HTMLCanvasElement) {
  if (!canvas.clientWidth || !canvas.clientHeight) return 1;
  return Math.max(1, canvas.width / canvas.clientWidth, canvas.height / canvas.clientHeight);
}

function drawPose(ctx: CanvasRenderingContext2D, lm: NormalizedLandmark[], connections: { start: number; end: number }[]) {
  const { width: w, height: h } = ctx.canvas;
  const k = screenScale(ctx.canvas);
  // Skip the face mesh points (1–10); the nose alone marks the head
  const isBody = (i: number) => i === 0 || i >= 11;

  ctx.lineWidth = 3 * k;
  ctx.lineCap = 'round';
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

  const radius = 4.5 * k;
  lm.forEach((point, i) => {
    if (!isBody(i) || point.visibility < MIN_VISIBILITY) return;
    ctx.beginPath();
    ctx.arc(point.x * w, point.y * h, radius, 0, Math.PI * 2);
    ctx.fillStyle = CRIMSON;
    ctx.fill();
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 1.5 * k;
    ctx.stroke();
  });
}

function scoreColour(score: number) {
  if (score >= 80) return GOLD;
  if (score >= 50) return '#d97706';
  return '#ef4444';
}

function formatRange(m: MetricResult) {
  const [lo, hi] = m.ideal;
  if (m.unit === '°') return `${lo}° to ${hi}°`;
  return lo === 0 ? `under ${hi}` : `${lo} to ${hi}`;
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
  const recordingRef = useRef<{ until: number; frames: NormalizedLandmark[][]; times: number[] } | null>(null);
  // The last analysed clip's poses and when each was seen, for replaying an uploaded video with the skeleton
  const replayRef = useRef<{ frames: NormalizedLandmark[][]; times: number[] } | null>(null);
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
  // The position shown in the figure under the video
  const [detail, setDetail] = useState<(Analysis & { pose: NormalizedLandmark[]; width: number; height: number }) | null>(null);
  const [coaching, setCoaching] = useState<{ state: 'idle' | 'loading' | 'ready'; text?: string }>({ state: 'idle' });
  // Shape of the picture, so an upright phone video gets an upright box
  const [aspect, setAspect] = useState<number>(16 / 9);
  const [replaying, setReplaying] = useState(false);

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
    replayRef.current = null;
    setReplaying(false);
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
    const outcome = analyseDetailed(recording.frames, m, hd, video.videoWidth, video.videoHeight, m === 'batting' ? st : undefined);
    if (!outcome.ok) {
      setError(outcome.problem === 'no-action'
        ? `We could see a player but not a bowling action. The ${hd === 'right' ? 'right' : 'left'} arm never came over above the head. Check Bowling and ${hd === 'right' ? 'Right' : 'Left'}-handed are the right settings, and that the clip includes the delivery.`
        : fromFile
          ? "We couldn't see a player clearly enough in that video. Use a clip filmed side-on with head to ankles in the picture, in good light, with the player filling at least a third of the height."
          : "We couldn't see your whole body clearly enough. Step back so head to ankles are in frame, and try again in better light.");
      if (fromFile) {
        // Take the clip off screen so the starting message is not drawn over it
        stopCamera();
        canvasRef.current?.getContext('2d')?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      setPhase(fromFile ? 'idle' : 'ready');
      return;
    }
    const { analysis } = outcome;
    const metrics = analysis.metrics;
    setFrameCount(analysis.framesSeen);
    setResults(metrics);
    setDetail({ ...analysis, pose: recording.frames[analysis.keyFrame], width: video.videoWidth, height: video.videoHeight });
    replayRef.current = fromFile ? { frames: recording.frames, times: recording.times } : null;
    setPhase('done');

    if (fromFile) {
      // Leave the clip paused on the key position with the skeleton drawn over it
      const canvas = canvasRef.current;
      const show = () => {
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawPose(ctx, recording.frames[analysis.keyFrame], connectionsRef.current);
      };
      video.addEventListener('seeked', show, { once: true });
      video.currentTime = recording.times[analysis.keyFrame];
    }

    // Save pose results to history (best-effort)
    const overall = Math.round(metrics.reduce((sum, mk) => sum + mk.score, 0) / metrics.length);
    const resultJson = { mode: m, hand: hd, shotType: m === 'batting' ? st : undefined, frameCount: recording.frames.length, overall, metrics: metrics.map((mk) => ({ key: mk.key, label: mk.label, value: mk.value, score: mk.score })) };

    // Generate a coaching paragraph server-side, then save both
    setCoaching({ state: 'loading' });
    fetch('/api/analysis/coaching-read', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ pose: true, mode: m, hand: hd, shotType: m === 'batting' ? st : undefined, metrics: resultJson.metrics, overall }),
    })
      .then((r) => r.ok ? r.json() : null)
      .then((coachData: { paragraph?: string } | null) => {
        setCoaching(coachData?.paragraph ? { state: 'ready', text: coachData.paragraph } : { state: 'idle' });
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
      .catch(() => setCoaching({ state: 'idle' }));
  }, [stopCamera]);

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
          if (pose) {
            recording.frames.push(pose);
            recording.times.push(video.currentTime);
          }
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
    setDetail(null);
    setCoaching({ state: 'idle' });
    replayRef.current = null;
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
      recordingRef.current = { until: performance.now() + MAX_UPLOAD_MS, frames: [], times: [] };
      setPhase('recording');
      startLoop();
    } catch (err) {
      stopCamera();
      setError(`Couldn't read that video: ${err instanceof Error ? err.message : 'unknown error'}. MP4 and MOV clips work best.`);
      setPhase('idle');
    }
  }

  // Plays an analysed clip again with the skeleton drawn over it, from the poses already found
  function replay(rate: number) {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const data = replayRef.current;
    if (!video || !canvas || !data) return;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    let cursor = 0;
    const tick = () => {
      const ctx = canvas.getContext('2d');
      const time = video.currentTime;
      while (cursor < data.times.length - 1 && data.times[cursor + 1] <= time) cursor++;
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Only draw a pose that belongs to this moment of the clip
        if (Math.abs(data.times[cursor] - time) < 0.12) drawPose(ctx, data.frames[cursor], connectionsRef.current);
      }
      const lastTime = data.times[data.times.length - 1];
      if (video.ended || video.paused || time > lastTime + 0.1) {
        video.pause();
        rafRef.current = null;
        setReplaying(false);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    video.onended = null;
    video.playbackRate = rate;
    video.currentTime = 0;
    setReplaying(true);
    video.play().then(() => {
      rafRef.current = requestAnimationFrame(tick);
    }).catch(() => setReplaying(false));
  }

  function startRecording() {
    setError(null);
    setResults(null);
    setSecondsLeft(RECORD_MS / 1000);
    setDetail(null);
    setCoaching({ state: 'idle' });
    recordingRef.current = { until: performance.now() + RECORD_MS, frames: [], times: [] };
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
        <div className="relative mx-auto overflow-hidden rounded-xl bg-black"
          style={{ aspectRatio: String(aspect), maxHeight: '70vh', maxWidth: `calc(70vh * ${aspect})` }}>
          {/* Mirrored so it behaves like a mirror; landmarks are computed on the unmirrored frame */}
          <video ref={videoRef} playsInline muted className="absolute inset-0 h-full w-full object-contain"
            onLoadedMetadata={(event) => {
              const { videoWidth, videoHeight } = event.currentTarget;
              if (videoWidth && videoHeight) setAspect(videoWidth / videoHeight);
            }}
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
              {fileShown && phase === 'done' && (
                <>
                  <Button variant="secondary" onClick={() => replay(1)} disabled={replaying}>Replay with skeleton</Button>
                  <Button variant="secondary" onClick={() => replay(0.25)} disabled={replaying}>Slow motion</Button>
                </>
              )}
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
          description={mode === 'bowling'
            ? `Measured at the moment of release. Player seen in ${frameCount} frames${source === 'file' ? ' of your video' : ''}.`
            : `Averaged over ${frameCount} frames${source === 'file' ? ' of your video' : ''}.`}
          action={
            <div className="text-right">
              <div className="text-3xl font-bold" style={{ color: scoreColour(overall) }}>{overall}</div>
              <div className="text-xs text-neutral-500">overall / 100</div>
            </div>
          }
        >
          {detail && detail.playerSize < 0.3 && (
            <p className="mb-4 rounded-lg border border-amber-900 bg-amber-950/40 px-3 py-2 text-sm text-amber-200">
              The player is small in this video (about {Math.round(detail.playerSize * 100)}% of the picture height), so these
              numbers are less reliable. Film closer, with the player filling at least a third of the height.
            </p>
          )}

          {detail && (() => {
            const reference = getReference(mode, mode === 'batting' ? shotType : undefined);
            return (
              <div className="mb-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">You · {detail.keyLabel}</p>
                    <PoseFigure pose={detail.pose} width={detail.width} height={detail.height} metrics={results} mode={mode} hand={hand}
                      mirrored={mirrored} size={300} />
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide" style={{ color: GOLD }}>
                      {reference.title} · {reference.moment}
                    </p>
                    <PoseFigure pose={referencePose(reference, hand)} width={REFERENCE_SIZE} height={REFERENCE_SIZE} metrics={results}
                      mode={mode} hand={hand} labels="target" bat={referenceBat(reference, hand)} size={300}
                      label={`Diagram of the ${reference.title.toLowerCase()} with the target joint angles marked`} />
                  </div>
                </div>
                <p className="mt-2 text-xs text-neutral-500">
                  On your figure, gold is on target, amber is close, red needs work. The textbook figure shows the range to aim for at
                  the same joints. It is drawn {hand === 'right' ? 'right' : 'left'}-handed from side-on, so it may face the other way
                  from your video.
                </p>

                <details className="mt-4 rounded-lg border border-neutral-800 bg-neutral-950/60 px-4 py-3" open>
                  <summary className="cursor-pointer text-sm font-medium text-white">What the textbook says</summary>
                  <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-neutral-300">
                    {reference.checkpoints.map((point) => <li key={point}>{point}</li>)}
                  </ul>
                  {reference.sources.length > 0 && (
                    <p className="mt-3 text-xs text-neutral-500">
                      Based on:{' '}
                      {reference.sources.map((sourceItem, i) => (
                        <span key={sourceItem.url}>
                          {i > 0 && '; '}
                          <a href={sourceItem.url} target="_blank" rel="noreferrer" className="underline hover:text-neutral-300">{sourceItem.label}</a>
                        </span>
                      ))}
                      , and standard coaching practice.
                    </p>
                  )}
                  {reference.sources.length === 0 && (
                    <p className="mt-3 text-xs text-neutral-500">Based on standard coaching practice.</p>
                  )}
                </details>
              </div>
            );
          })()}

          <ul className="space-y-5">
            {results.map((m) => (
              <li key={m.key}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium text-white">{m.label}</span>
                  <span className="whitespace-nowrap text-neutral-400">
                    {formatValue(m)} · <span className="font-semibold" style={{ color: scoreColour(m.score) }}>{m.score}/100</span>
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-neutral-800">
                  <div className="h-full rounded-full" style={{ width: `${m.score}%`, background: scoreColour(m.score) }} />
                </div>
                <p className="mt-1.5 text-xs text-neutral-400">
                  Target {formatRange(m)}. {m.score >= 80 ? 'On target.' : m.tip}
                </p>
              </li>
            ))}
          </ul>

          {coaching.state !== 'idle' && (
            <div className="mt-5 rounded-lg border px-4 py-3" style={{ borderColor: 'rgba(239,200,74,0.3)', background: 'rgba(239,200,74,0.06)' }}>
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: GOLD }}>Coach AI&apos;s read</p>
              <p className="mt-1.5 text-sm leading-relaxed text-neutral-200">
                {coaching.state === 'loading' ? 'Writing your feedback…' : coaching.text}
              </p>
            </div>
          )}

          <p className="mt-5 text-xs text-neutral-600">
            Scores are estimates from a single camera angle and work best filmed side-on. Use them as a guide, not a verdict.
          </p>
        </Card>
      )}
      </>}
    </div>
  );
}
