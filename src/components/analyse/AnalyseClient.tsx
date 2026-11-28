'use client';

import { Glyph } from '@/components/icons/Glyph';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import type { NormalizedLandmark, PoseLandmarker } from '@mediapipe/tasks-vision';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { createClient } from '@/lib/supabase/client';
import { HIGHLIGHT_UPLOAD_ENABLED, HIGHLIGHTS_BUCKET, MAX_CLIPS, SEGMENT_SECONDS } from '@/lib/highlights';
import { seedDemoHighlights } from '@/app/analyse/actions';
import { BallTrackClient } from '@/components/analyse/BallTrackClient';
import { PoseFigure } from '@/components/analyse/PoseFigure';
import { REFERENCE_SIZE, getReference, referenceBat, referencePose } from '@/lib/analysis/reference';
import {
  ELBOW_EXTENSION_LIMIT, ELBOW_KIND_LABELS, MIN_VISIBILITY, ON_TARGET, SHOT_TYPE_LABELS, UNIQUE_ACTIONS, analyseDetailed, drillFor, formatRange, formatValue,
  LOW_CONFIDENCE_MESSAGE, capConfidence, choosePose, overallScore, segmentScore, weakestMeasure,
  type Analysis, type Hand, type MetricResult, type Mode, type ShotType, type View,
} from '@/lib/analysis/pose-metrics';
import { compareAnalyses, trendOver, type Comparison, type SavedAnalysis, type Trend } from '@/lib/analysis/compare';
import { ComparisonPanel } from '@/components/analyse/ComparisonPanel';
import { FilmGuide } from '@/components/analyse/FilmGuide';
import { GUIDE_SEEN_KEY, guideCardFor, guideIndex, type GuideCardId } from '@/lib/analysis/film-guide';
import {
  highlightsVisible, paintOverlay, paintTimeBadge, pickHighlights, smoothOverlayFrame, strengthPhrase, strongestMeasure, workOnPhrase,
} from '@/lib/analysis/pose-overlay';
import { framingPrompt } from '@/lib/analysis/framing';
import { estimateBoneLengths, type BoneLengths } from '@/lib/analysis/bone-length';
import { CLEAR_IMAGE, heavyFrameIndexes, preferLiteModel, retakeLine, retakePlan } from '@/lib/analysis/metric-confidence';
import { POSE_HEAVY_MODEL_URL, POSE_LITE_MODEL_URL, POSE_WASM_URL } from '@/lib/analysis/pose-runtime';
import { scoreMeaning, topFix, coachingChains } from '@/lib/analysis/coaching-causes';

/** An earlier analysis, tagged with the recording it came from */
type PastAnalysis = SavedAnalysis & { token: string };
import { detectShot, shotToScore, type ShotReading } from '@/lib/analysis/shot-detect';
import { bestAndWorst, clipTime, splitDeliveries, splitShots, windowAround, type ShotWindow } from '@/lib/analysis/shot-split';

type AnalyseTab = 'pose' | 'ball';

const GOLD   = '#EFC84A';
const CRIMSON = '#1D4ED8';

const WASM_URL = POSE_WASM_URL;
const MODEL_URL = POSE_LITE_MODEL_URL;
const HEAVY_URL = POSE_HEAVY_MODEL_URL;

const RECORD_MS = 5000;
// An uploaded clip is analysed from the start up to this length
// An uploaded clip can be a stretch of a net session with several shots in it
const MAX_UPLOAD_MS = 180000;
const MAX_UPLOAD_BYTES = 500 * 1024 * 1024;
/** The most frames read from one clip; a longer clip is read at wider steps to stay inside it */
const MAX_SEEK_FRAMES = 2400;
// Segments shorter than this (e.g. the tail when the camera stops) aren't worth keeping as clips
const MIN_CLIP_SECONDS = 2;

/** One shot or delivery found in an uploaded clip, already marked */
type ShotEntry = {
  /** The frames of the whole clip that belong to it */
  win: ShotWindow;
  /** Frame of the whole clip to show for it, and when in the clip it happened */
  key: number;
  time: number;
  /** Batting only: the shot played */
  shot?: ShotType;
  read: ShotReading | null;
  analysis: Analysis;
  overall: number;
};

/** Marks one shot or delivery of a clip by itself. Null when a player cannot be seen well enough in it. */
function markWindow(
  data: { frames: NormalizedLandmark[][]; times: number[] }, win: ShotWindow,
  settings: { mode: Mode; hand: Hand; view: View; shotType: ShotChoice }, w: number, h: number,
  lengths?: BoneLengths,
): ShotEntry | null {
  const part = data.frames.slice(win.start, win.end + 1);
  const batting = settings.mode === 'batting';
  const read = batting ? detectShot(part, w, h, { view: settings.view, hand: settings.hand }) : null;
  const shot: ShotType | undefined = batting ? shotToScore(read, settings.shotType) : undefined;
  const marked = analyseDetailed(part, settings.mode, settings.hand, w, h, shot, settings.view, data.times.slice(win.start, win.end + 1), { lengths });
  if (!marked.ok) return null;
  return {
    win, key: win.start + marked.analysis.keyFrame, time: data.times[win.peak], shot, read,
    analysis: marked.analysis, overall: overallScore(marked.analysis.metrics),
  };
}

type Phase = 'idle' | 'loading' | 'ready' | 'recording' | 'done';

// Highlight recording: the camera stream is recorded in back-to-back 5-second segments, each its own playable
// file. Each finished segment is scored from the landmarks seen while it recorded; only the top clips stay in memory.
type ScoredClip = { blob: Blob; score: number; start_sec: number; end_sec: number };
/** The shot the player picked, or 'auto' to have it worked out from the clip. */
type ShotChoice = ShotType | 'auto';

type Segment = { recorder: MediaRecorder; chunks: Blob[]; frames: NormalizedLandmark[][]; totalFrames: number; startedAt: number };
type Session = {
  stream: MediaStream; mimeType: string; width: number; height: number; startedAt: number;
  current: Segment | null; pending: Promise<void>[]; best: ScoredClip[]; segments: number;
};

/** Waits until a clip has its first picture, or fails if this device cannot play it. */
function clipReady(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= 2) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const done = () => { cleanup(); resolve(); };
    const fail = () => { cleanup(); reject(video.error ?? new Error('unreadable')); };
    const timer = window.setTimeout(fail, 20000);
    const cleanup = () => {
      window.clearTimeout(timer);
      video.removeEventListener('loadeddata', done);
      video.removeEventListener('error', fail);
    };
    video.addEventListener('loadeddata', done);
    video.addEventListener('error', fail);
    video.load();
  });
}

/** Time between the frames read when a clip is stepped through, in seconds (30 a second). */
const SEEK_STEP = 1 / 30;

/** Moves a paused clip to a moment and waits until that picture is on screen. */
function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => { video.removeEventListener('seeked', done); reject(new Error('unreadable')); }, 8000);
    const done = () => {
      window.clearTimeout(timer);
      // One more frame so the new picture has been drawn before it is read
      requestAnimationFrame(() => resolve());
    };
    video.addEventListener('seeked', done, { once: true });
    // Asking for the moment it is already on would never report back
    video.currentTime = Math.abs(video.currentTime - time) < 0.001 ? time + 0.001 : time;
  });
}

/** What to tell the player when an uploaded clip cannot be read. */
function clipError(err: unknown): string {
  const unsupported = typeof MediaError !== 'undefined' && err instanceof MediaError
    && (err.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED || err.code === MediaError.MEDIA_ERR_DECODE);
  if (unsupported || (err instanceof DOMException && err.name === 'NotSupportedError')) {
    return 'This device cannot play that kind of video. Clips filmed on a phone (MP4 or MOV) always work. For another format, save or export it as MP4 first.';
  }
  return 'We could not read that video. Try it again, or use a clip filmed on your phone.';
}

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

function finishSegment(session: Session, segment: Segment, mode: Mode, hand: Hand, now = performance.now(), choice?: ShotChoice, view: View = 'side') {
  const shotType: ShotType | undefined = mode === 'batting'
    ? shotToScore(detectShot(segment.frames, session.width, session.height, { view, hand }), choice ?? 'auto')
    : undefined;
  const seconds = (now - segment.startedAt) / 1000;
  const long = seconds >= MIN_CLIP_SECONDS;
  const score = long ? segmentScore(segment.frames, segment.totalFrames, mode, hand, session.width, session.height, shotType, view) : 0;
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

function drawPose(ctx: CanvasRenderingContext2D, lm: NormalizedLandmark[], options?: {
  mode: Mode; hand: Hand; view: View; shot?: ShotType; metrics?: MetricResult[]; highlights?: boolean; badge?: number;
}) {
  const { width: w, height: h } = ctx.canvas;
  const k = screenScale(ctx.canvas);
  const points = lm.map((point) => ({ x: point.x * w, y: point.y * h, visibility: point.visibility }));
  paintOverlay(ctx, points, {
    mode: options?.mode ?? 'batting',
    hand: options?.hand ?? 'right',
    highlights: options?.highlights && options.metrics
      ? pickHighlights(options.metrics, options.mode, options.hand, options.view, options.shot)
      : [],
    scale: k,
    headCap: 22 * k,
  });
  if (options?.badge != null) paintTimeBadge(ctx, options.badge, k);
}

function scoreColour(score: number) {
  if (score >= ON_TARGET) return GOLD;
  if (score >= 60) return '#f59e0b';
  return '#ef4444';
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
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef(-1);
  const recordingRef = useRef<{ until: number; frames: NormalizedLandmark[][]; times: number[]; seen: number; extra: number } | null>(null);
  // The last analysed clip's poses and when each was seen, for replaying an uploaded video with the skeleton
  const replayRef = useRef<{ frames: NormalizedLandmark[][]; times: number[]; seen: number; extra: number } | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const trackedPose = useRef<NormalizedLandmark[] | null>(null);

  const [mode, setMode] = useState<Mode>('bowling');
  const [hand, setHand] = useState<Hand>('right');
  const [shotType, setShotType] = useState<ShotChoice>('auto');
  // What the clip was read as, when the shot was left on Auto
  const [reading, setReading] = useState<ShotReading | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  // How far through an uploaded clip the frame-by-frame read is, as a percentage
  const [progress, setProgress] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [results, setResults] = useState<MetricResult[] | null>(null);
  const [frameCount, setFrameCount] = useState(0);
  const [highlights, setHighlights] = useState<'idle' | 'uploading' | 'ready'>('idle');
  // Where the frames come from: the live camera, or a clip the player picked
  const [source, setSource] = useState<'camera' | 'file'>('camera');
  const sourceRef = useRef<'camera' | 'file'>('camera');
  // 'user' is the selfie camera; 'environment' is the back camera, for when someone else films
  const [facing, setFacing] = useState<'user' | 'environment'>('environment');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [framingHint, setFramingHint] = useState<string | null>(null);
  const [sizing, setSizing] = useState(false);
  const [refining, setRefining] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideStep, setGuideStep] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileUrlRef = useRef<string | null>(null);
  // The position shown in the figure under the video
  const [detail, setDetail] = useState<(Analysis & { pose: NormalizedLandmark[]; width: number; height: number }) | null>(null);
  const [coaching, setCoaching] = useState<{ state: 'idle' | 'loading' | 'ready'; text?: string }>({ state: 'idle' });
  // Shape of the picture, so an upright phone video gets an upright box
  const [aspect, setAspect] = useState<number>(16 / 9);
  const [replaying, setReplaying] = useState(false);
  // Shown in the empty video box when a clip was cleared and a new one is needed
  const [notice, setNotice] = useState<string | null>(null);
  // The separate shots or deliveries found in an uploaded clip, and the one on screen
  const [shots, setShots] = useState<ShotEntry[] | null>(null);
  const [shotPick, setShotPick] = useState(0);
  // Written feedback already fetched for a shot, so going back to it does not ask again
  const coachCache = useRef(new Map<number, string>());
  // Earlier analyses by kind (discipline, view, shot), for "what changed since last time"
  const historyRef = useRef(new Map<string, PastAnalysis[]>());
  const groupRef = useRef(0);
  const compareSeq = useRef(0);
  const [compare, setCompare] = useState<{ state: 'idle' | 'loading' | 'ready'; data?: Comparison | null; trend?: Trend | null }>({ state: 'idle' });
  // Which analysed frame of an uploaded clip is on screen, and how many there are, for stepping through
  const [frameAt, setFrameAt] = useState<{ index: number | null; total: number; key: number } | null>(null);

  // Mode/hand/shotType are read when a recording finishes, from inside the rAF loop
  // Where the camera is standing: square of the wicket, or looking straight down the pitch
  const [view, setView] = useState<View>('side');
  const settingsRef = useRef({ mode, hand, shotType, view });
  const lengthsRef = useRef<BoneLengths | undefined>(undefined);
  const sizingRef = useRef(false);
  const sizeFrames = useRef<NormalizedLandmark[][]>([]);
  const heavyRef = useRef<PoseLandmarker | null>(null);
  const sizeTimer = useRef<number | null>(null);
  useEffect(() => {
    settingsRef.current = { mode, hand, shotType, view };
  }, [mode, hand, shotType, view]);

  const PREFS_KEY = 'shiftup.analyse';
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(PREFS_KEY) ?? 'null') as { mode?: Mode; hand?: Hand; view?: View; facing?: 'user' | 'environment' } | null;
        if (saved?.mode === 'bowling' || saved?.mode === 'batting') setMode(saved.mode);
        if (saved?.hand === 'right' || saved?.hand === 'left') setHand(saved.hand);
        if (saved?.view === 'side' || saved?.view === 'front') setView(saved.view);
        if (saved?.facing === 'user' || saved?.facing === 'environment') setFacing(saved.facing);
        else if (window.matchMedia('(pointer: coarse)').matches) setFacing('environment');
      } catch { /* a bad saved value just leaves the defaults */ }
      setPrefsLoaded(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!prefsLoaded) return;
    localStorage.setItem(PREFS_KEY, JSON.stringify({ mode, hand, view, facing }));
  }, [prefsLoaded, mode, hand, view, facing]);
  useEffect(() => {
    if (!prefsLoaded) return;
    let unseen = false;
    try { unseen = localStorage.getItem(GUIDE_SEEN_KEY) !== 'seen'; } catch { unseen = false; }
    if (!unseen) return;
    const timer = window.setTimeout(() => {
      setGuideStep(0);
      setGuideOpen(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [prefsLoaded]);
  const closeGuide = useCallback(() => {
    try { localStorage.setItem(GUIDE_SEEN_KEY, 'seen'); } catch { /* ignore */ }
    setGuideOpen(false);
  }, []);
  const openGuide = useCallback((card: GuideCardId) => {
    setGuideStep(guideIndex(card));
    setGuideOpen(true);
  }, []);

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

  // Asks for the written feedback on one analysis. `save` also stores the result in history.
  const requestCoaching = useCallback((
    analysis: Analysis, shot: ShotType | undefined, frames: number, cacheKey: number | null, save: boolean, extra: Record<string, unknown> = {},
  ) => {
    const { mode: m, hand: hd, view: vw } = settingsRef.current;

    // Compare with earlier analyses of the same kind. A new recording starts a new group, so the
    // shots of one session are compared with earlier sessions and never with each other.
    if (save) groupRef.current += 1;
    const recording = groupRef.current;
    const kind = `${m}|${vw}|${m === 'batting' ? shot ?? '' : ''}`;
    const seq = ++compareSeq.current;
    const overall = overallScore(analysis.metrics);
    const now = { overall, metrics: analysis.metrics };
    const resultJson = {
      mode: m, hand: hd, view: vw, shotType: shot, frameCount: frames, overall,
      elbowCheck: analysis.elbow ?? null, unique: analysis.unique,
      metrics: analysis.metrics.map((mk) => ({ key: mk.key, label: mk.label, value: mk.value, score: mk.score, excused: mk.excused ?? false })),
      ...extra,
    };

    // Asks for the written feedback, telling Coach AI what changed since last time
    const write = (earlier: PastAnalysis[]) => {
      const cached = cacheKey !== null ? coachCache.current.get(cacheKey) : undefined;
      if (cached) {
        setCoaching({ state: 'ready', text: cached });
        return;
      }
      const previous = earlier[0];
      setCoaching({ state: 'loading' });
      fetch('/api/analysis/coaching-read', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          pose: true, mode: m, hand: hd, view: vw, unique: analysis.unique, shotType: shot, metrics: resultJson.metrics.filter((mk) => !mk.excused), overall,
          previous: previous ? { overall: previous.overall, metrics: previous.metrics.filter((p) => !p.excused).map((p) => ({ key: p.key, score: p.score })) } : undefined,
          trend: earlier.length >= 2 ? [...earlier].reverse().map((p) => p.overall) : undefined,
        }),
      })
        .then((r) => r.ok ? r.json() : null)
        .then((coachData: { paragraph?: string } | null) => {
          if (coachData?.paragraph && cacheKey !== null) coachCache.current.set(cacheKey, coachData.paragraph);
          if (seq === compareSeq.current) setCoaching(coachData?.paragraph ? { state: 'ready', text: coachData.paragraph } : { state: 'idle' });
          if (!save) return;
          // Remembered for the rest of this visit, so the next recording is compared with this one
          historyRef.current.set(kind, [
            { mode: m, view: vw, shotType: shot ?? null, overall, metrics: resultJson.metrics, createdAt: new Date().toISOString(), token: `${recording}:${cacheKey}` },
            ...(historyRef.current.get(kind) ?? []),
          ]);
          fetch('/api/analysis/save-result', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ analysis_type: 'pose', result_json: resultJson, coaching_paragraph: coachData?.paragraph ?? null }),
          }).catch(() => {/* silent */});
        })
        .catch(() => { if (seq === compareSeq.current) setCoaching({ state: 'idle' }); });
    };

    const show = (list: PastAnalysis[]) => {
      // Everything from before this recording, newest first
      const earlier = list.filter((r) => !r.token.startsWith(`${recording}:`)).slice(0, 4);
      if (seq === compareSeq.current) {
        setCompare({ state: 'ready', data: earlier[0] ? compareAnalyses(now, earlier[0]) : null, trend: trendOver(now, earlier) });
      }
      write(earlier);
    };

    const known = historyRef.current.get(kind);
    if (known) show(known);
    else {
      setCompare({ state: 'loading' });
      setCoaching({ state: 'loading' });
      fetch(`/api/analysis/history?mode=${m}&view=${vw}&shot=${m === 'batting' ? shot ?? '' : ''}`)
        .then((r) => (r.ok ? r.json() : { results: [] }))
        .catch(() => ({ results: [] }))
        .then((d: { results?: SavedAnalysis[] }) => {
          const fetched = (d.results ?? []).map((r, i) => ({ ...r, token: `saved:${i}` }));
          const merged = [...(historyRef.current.get(kind) ?? []), ...fetched];
          historyRef.current.set(kind, merged);
          show(merged);
        });
    }
  }, []);

  // Puts one shot of a session on screen: its marks, its figure, and the clip held on its key position
  const presentShot = useCallback((entry: ShotEntry, index: number) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const data = replayRef.current;
    if (!video || !data) return;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    video.pause();
    setReplaying(false);
    setShotPick(index);
    setReading(entry.read);
    setFrameCount(entry.analysis.framesSeen);
    setResults(entry.analysis.metrics);
    setDetail({ ...entry.analysis, pose: data.frames[entry.key], width: video.videoWidth, height: video.videoHeight });
    setFrameAt({ index: entry.key, total: data.frames.length, key: entry.key });
    const draw = () => {
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const settings = settingsRef.current;
      drawPose(ctx, smoothOverlayFrame(data.frames, entry.key), {
        mode: settings.mode, hand: settings.hand, view: settings.view, shot: entry.shot,
        metrics: entry.analysis.metrics, highlights: true,
      });
    };
    if (Math.abs(video.currentTime - data.times[entry.key]) < 0.001) draw();
    else {
      video.addEventListener('seeked', draw, { once: true });
      video.currentTime = data.times[entry.key];
    }
  }, []);

  const refineUpload = useCallback(async (
    video: HTMLVideoElement, frames: NormalizedLandmark[][], times: number[], key: number, shot: ShotType,
  ) => {
    const device = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
    if (preferLiteModel({ cores: device.hardwareConcurrency, memory: device.deviceMemory, saveData: device.connection?.saveData })) return;
    setRefining(true);
    try {
      if (!heavyRef.current) {
        const { FilesetResolver, PoseLandmarker } = await import('@mediapipe/tasks-vision');
        const vision = await FilesetResolver.forVisionTasks(WASM_URL);
        heavyRef.current = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: HEAVY_URL, delegate: 'GPU' },
          runningMode: 'IMAGE',
          numPoses: 1,
        });
      }
      const next = frames.map((frame) => frame.map((point) => ({ ...point })));
      for (const index of heavyFrameIndexes(key, frames.length, 3)) {
        await seekTo(video, times[index] ?? 0);
        const found = heavyRef.current.detect(video);
        const pose = choosePose(found.landmarks as NormalizedLandmark[][], null, video.videoWidth, video.videoHeight);
        if (pose) next[index] = pose as NormalizedLandmark[];
      }
      const settings = settingsRef.current;
      const outcome = analyseDetailed(
        next, settings.mode, settings.hand, video.videoWidth, video.videoHeight,
        settings.mode === 'batting' ? shot : undefined, settings.view, times, { lengths: lengthsRef.current },
      );
      if (!outcome.ok) return;
      setResults(outcome.analysis.metrics);
      setDetail({ ...outcome.analysis, pose: next[outcome.analysis.keyFrame], width: video.videoWidth, height: video.videoHeight });
      replayRef.current = { frames: next, times, seen: frames.length, extra: 0 };
    } catch {
      // The lite reading stays. A failed heavy model must not wipe the result.
    } finally {
      setRefining(false);
    }
  }, []);

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

    const { mode: m, hand: hd, shotType: choice, view: vw } = settingsRef.current;

    // A clip with several shots or deliveries in it is marked one at a time
    if (fromFile) {
      const data = { frames: recording.frames, times: recording.times };
      const found = m === 'batting'
        ? splitShots(data.frames, data.times, video.videoWidth, video.videoHeight)
        : splitDeliveries(data.frames, data.times, hd, video.videoWidth, video.videoHeight);
      const entries = found.flatMap((win) => markWindow(data, win, settingsRef.current, video.videoWidth, video.videoHeight, lengthsRef.current) ?? []);
      if (entries.length >= 2) {
        if (recording.seen > 0 && recording.extra / recording.seen >= 0.3) {
          for (const entry of entries) {
            if (!entry.analysis.warnings.includes('more than one person')) {
              entry.analysis.warnings.push('more than one person');
              entry.analysis.confidence = capConfidence(entry.analysis.confidence, 'medium');
            }
          }
        }
        const first = bestAndWorst(entries.map((e) => e.overall))?.best ?? 0;
        coachCache.current.clear();
        replayRef.current = { frames: recording.frames, times: recording.times, seen: recording.seen, extra: recording.extra };
        setShots(entries);
        setPhase('done');
        presentShot(entries[first], first);
        // History keeps the best one in full and a line for each of the others
        requestCoaching(entries[first].analysis, entries[first].shot, recording.frames.length, first, true, {
          shots: entries.map((e, i) => ({ number: i + 1, at: Math.round(e.time * 10) / 10, shotType: e.shot, overall: e.overall })),
        });
        return;
      }
    }
    setShots(null);

    const read = m === 'batting' ? detectShot(recording.frames, video.videoWidth, video.videoHeight, { view: vw, hand: hd }) : null;
    const st: ShotType = m === 'batting' ? shotToScore(read, choice) : 'drive';
    setReading(read);
    const outcome = analyseDetailed(recording.frames, m, hd, video.videoWidth, video.videoHeight, m === 'batting' ? st : undefined, vw, recording.times, { lengths: lengthsRef.current });
    if (!outcome.ok) {
      setError(outcome.problem === 'no-action'
        ? `We could see a player but not a bowling action after the front foot landed. Check Bowling and ${hd === 'right' ? 'Right' : 'Left'}-handed, and that the clip includes the delivery.`
        : outcome.problem === 'feet-out-of-frame'
          ? 'Feet out of frame. Step back until your head and both feet are inside the picture.'
          : fromFile
            ? "We couldn't see a player clearly enough in that video. Use a clip with one person, head to ankles, in good light."
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
    if (recording.seen > 0 && recording.extra / recording.seen >= 0.3 && !analysis.warnings.includes('more than one person')) {
      analysis.warnings.push('more than one person');
      analysis.confidence = capConfidence(analysis.confidence, 'medium');
    }
    const framing = framingPrompt(recording.frames[analysis.keyFrame], vw);
    if (framing && !analysis.warnings.includes(framing)) analysis.warnings.push(framing);
    setFramingHint(framing);
    const metrics = analysis.metrics;
    setFrameCount(analysis.framesSeen);
    setResults(metrics);
    setDetail({ ...analysis, pose: recording.frames[analysis.keyFrame], width: video.videoWidth, height: video.videoHeight });
    replayRef.current = fromFile ? { frames: recording.frames, times: recording.times, seen: recording.seen, extra: recording.extra } : null;
    setFrameAt(fromFile ? { index: analysis.keyFrame, total: recording.frames.length, key: analysis.keyFrame } : null);
    setPhase('done');

    if (fromFile) {
      // Leave the clip paused on the key position with the skeleton drawn over it
      const canvas = canvasRef.current;
      const show = () => {
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const settings = settingsRef.current;
        drawPose(ctx, smoothOverlayFrame(recording.frames, analysis.keyFrame), {
          mode: settings.mode, hand: settings.hand, view: settings.view,
          shot: settings.mode === 'batting' ? st : undefined,
          metrics: analysis.metrics, highlights: true,
        });
      };
      video.addEventListener('seeked', show, { once: true });
      video.currentTime = recording.times[analysis.keyFrame];
    }

    // Written feedback, saved to history with the result
    requestCoaching(analysis, m === 'batting' ? st : undefined, recording.frames.length, null, true);
    if (fromFile) void refineUpload(video, recording.frames, recording.times, analysis.keyFrame, st);
  }, [stopCamera, presentShot, requestCoaching, refineUpload]);

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
        const pose = choosePose(result.landmarks as NormalizedLandmark[][], trackedPose.current, video.videoWidth, video.videoHeight) as NormalizedLandmark[] | null;
        if (pose) trackedPose.current = pose;
        if (pose && sizingRef.current) sizeFrames.current.push(pose);
        if (sourceRef.current === 'camera') {
          const hint = framingPrompt(pose, settingsRef.current.view);
          setFramingHint((current) => (current === hint ? current : hint));
        }
        const bodies = (result.landmarks ?? []).filter((lm) => lm.some((point) => (point.visibility ?? 0) >= 0.5));
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          if (pose) drawPose(ctx, pose, { mode: settingsRef.current.mode, hand: settingsRef.current.hand, view: settingsRef.current.view });
        }

        const recording = recordingRef.current;
        if (recording) {
          if (bodies.length > 0) recording.seen += 1;
          if (bodies.length > 1) recording.extra += 1;
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
            const { mode: m, hand: hd, shotType: st, view: vw } = settingsRef.current;
            finishSegment(session, session.current, m, hd, now, st, vw);
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
      numPoses: 3,
    });
  }

  async function retake() {
    setResults(null);
    setDetail(null);
    setShots(null);
    setShotPick(0);
    setCoaching({ state: 'idle' });
    setFramingHint(null);
    setFrameAt(null);
    replayRef.current = null;
    videoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await startCamera(facing);
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

      const mimeType = HIGHLIGHT_UPLOAD_ENABLED ? pickMimeType() : null;
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
    setShots(null);
    setCoaching({ state: 'idle' });
    setCompare({ state: 'idle' });
    replayRef.current = null;
    // Some phones hand over a clip with no type at all, so the file name is checked too
    const isVideo = file.type.startsWith('video/') || (!file.type && /\.(mp4|mov|m4v|webm|3gp|avi|mkv)$/i.test(file.name));
    if (!isVideo) {
      setError('Choose a video file.');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError('That video is too large. Trim it to the part of the session you want checked (under 500 MB).');
      return;
    }
    setProgress(null);
    setFrameAt(null);
    setNotice(null);
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
      // Phones only let a clip start by itself when it is silent and plays inside the page.
      // Set as attributes as well as properties: some browsers only look at one of them.
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      video.autoplay = true;
      video.setAttribute('muted', '');
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', 'true');
      video.setAttribute('autoplay', '');
      video.src = url;
      video.onended = () => finishRecording();
      await clipReady(video);
      try {
        await video.play();
      } catch (err) {
        // Some phones refuse to start a clip by themselves (always in Low Power Mode, and often
        // straight after the photo picker closes). The clip does not need to play to be read:
        // step through it frame by frame instead.
        if (err instanceof DOMException && err.name === 'NotAllowedError') {
          await readBySeeking(video);
          return;
        }
        throw err;
      }
      readWhilePlaying();
    } catch (err) {
      stopCamera();
      setProgress(null);
      setError(clipError(err));
      setPhase('idle');
    }
  }

  // The clip is playing: collect poses from it as it goes
  function readWhilePlaying() {
    lastVideoTimeRef.current = -1;
    recordingRef.current = { until: performance.now() + MAX_UPLOAD_MS, frames: [], times: [], seen: 0, extra: 0 };
    setPhase('recording');
    startLoop();
  }

  // Reads a clip without playing it: moves through it a frame at a time and reads the pose at
  // each stop. Slower than playing, but it needs no permission from the phone and misses nothing.
  async function readBySeeking(video: HTMLVideoElement) {
    const landmarker = landmarkerRef.current;
    const canvas = canvasRef.current;
    if (!landmarker || !canvas || !Number.isFinite(video.duration) || video.duration <= 0) throw new Error('unreadable');
    const recording = { until: Infinity, frames: [] as NormalizedLandmark[][], times: [] as number[], seen: 0, extra: 0 };
    recordingRef.current = recording;
    setProgress(0);
    setPhase('recording');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    const end = Math.min(video.duration, MAX_UPLOAD_MS / 1000);
    const step = Math.max(SEEK_STEP, end / MAX_SEEK_FRAMES);
    for (let time = 0; time < end; time += step) {
      await seekTo(video, time);
      // Someone started the camera or chose another clip while this one was being read
      if (recordingRef.current !== recording) return;
      const found = landmarker.detectForVideo(video, performance.now());
      const pose = choosePose(found.landmarks as NormalizedLandmark[][], trackedPose.current, video.videoWidth, video.videoHeight) as NormalizedLandmark[] | null;
      if (pose) trackedPose.current = pose;
      const bodies = (found.landmarks ?? []).filter((lm) => lm.some((point) => (point.visibility ?? 0) >= 0.5));
      if (bodies.length > 0) recording.seen += 1;
      if (bodies.length > 1) recording.extra += 1;
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (pose) drawPose(ctx, pose, { mode: settingsRef.current.mode, hand: settingsRef.current.hand, view: settingsRef.current.view });
      }
      if (pose) {
        recording.frames.push(pose);
        recording.times.push(time);
      }
      setProgress(Math.round((time / end) * 100));
    }
    setProgress(null);
    finishRecording();
  }

  // A clip is on screen and has been analysed
  const clipLoaded = () => sourceRef.current === 'file' && replayRef.current !== null && phase === 'done';

  // Marks the clip on screen again with new settings, without uploading it again
  function reanalyse(settings: { mode: Mode; hand: Hand; view: View; shotType: ShotChoice }) {
    const data = replayRef.current;
    if (!data) return;
    settingsRef.current = settings;
    recordingRef.current = { until: 0, frames: data.frames, times: data.times, seen: data.seen, extra: data.extra };
    finishRecording();
  }

  // Bowling and batting need different clips: changing discipline clears the clip and asks for a new one
  function changeMode(next: Mode) {
    if (next === mode) return;
    setMode(next);
    setResults(null);
    if (sourceRef.current !== 'file') return;
    stopCamera();
    canvasRef.current?.getContext('2d')?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setShots(null);
    setDetail(null);
    setReading(null);
    setFrameAt(null);
    setCoaching({ state: 'idle' });
    setCompare({ state: 'idle' });
    setPhase('idle');
    setNotice(`That clip was analysed as ${mode}. Upload a ${next} video to analyse ${next}.`);
  }

  function changeHand(next: Hand) {
    setHand(next);
    if (clipLoaded()) reanalyse({ mode, hand: next, view, shotType });
    else setResults(null);
  }

  function changeView(next: View) {
    setView(next);
    if (clipLoaded()) reanalyse({ mode, hand, view: next, shotType });
    else setResults(null);
  }

  // Picking a shot type. With a session on screen it corrects the shot being looked at; with a
  // single clip it marks the clip again as that shot.
  function changeShot(next: ShotChoice) {
    setShotType(next);
    const data = replayRef.current;
    const video = videoRef.current;
    if (!clipLoaded() || !data || !video) {
      setReading(null);
      setResults(null);
      return;
    }
    if (!shots) {
      reanalyse({ mode, hand, view, shotType: next });
      return;
    }
    const again = markWindow(data, shots[shotPick].win, { mode, hand, view, shotType: next }, video.videoWidth, video.videoHeight, lengthsRef.current);
    if (!again) return;
    coachCache.current.delete(shotPick);
    setShots(shots.map((e, i) => (i === shotPick ? again : e)));
    pickShot(again, shotPick);
  }

  // Adds a shot or delivery the software missed, at the frame on screen
  function markHere() {
    const data = replayRef.current;
    const video = videoRef.current;
    const index = frameAt?.index;
    if (!data || !video || index === null || index === undefined) return;
    const entry = markWindow(data, windowAround(data.times, index, mode), { mode, hand, view, shotType }, video.videoWidth, video.videoHeight, lengthsRef.current);
    if (!entry) {
      toast('We could not see the player clearly enough around that frame.');
      return;
    }
    const next = [...(shots ?? []), entry].sort((a, b) => a.time - b.time);
    coachCache.current.clear();
    setShots(next);
    pickShot(entry, next.indexOf(entry));
  }

  // Takes out something that was not really a shot
  function removeShot(index: number) {
    if (!shots || shots.length <= 1) return;
    const next = shots.filter((_, i) => i !== index);
    coachCache.current.clear();
    setShots(next);
    const show = Math.min(index === shotPick ? 0 : shotPick > index ? shotPick - 1 : shotPick, next.length - 1);
    pickShot(next[show], show);
  }

  // A shot in the list was tapped: show it and fetch its written feedback
  function pickShot(entry: ShotEntry, index: number) {
    presentShot(entry, index);
    requestCoaching(entry.analysis, entry.shot, entry.analysis.framesSeen, index, false);
  }

  // Holds the clip on one analysed frame with its skeleton, for going through an action a frame at a time
  function showFrame(index: number) {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const data = replayRef.current;
    if (!video || !canvas || !data || data.frames.length === 0) return;
    const at = Math.max(0, Math.min(data.frames.length - 1, index));
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    video.pause();
    setReplaying(false);
    setFrameAt((current) => (current ? { ...current, index: at } : current));
    const draw = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const key = frameAt?.key;
      const near = key != null && highlightsVisible(data.times[at] ?? 0, data.times[key] ?? 0);
      drawPose(ctx, smoothOverlayFrame(data.frames, at), {
        mode, hand, view, shot: mode === 'batting' ? (shots?.[shotPick]?.shot ?? (shotType === 'auto' ? reading?.shot : shotType)) : undefined,
        metrics: results ?? undefined, highlights: near || at === key, badge: data.times[at],
      });
    };
    if (Math.abs(video.currentTime - data.times[at]) < 0.001) draw();
    else {
      video.addEventListener('seeked', draw, { once: true });
      video.currentTime = data.times[at];
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
        if (Math.abs(data.times[cursor] - time) < 0.12) {
          const key = frameAt?.key;
          const near = key != null && highlightsVisible(time, data.times[key] ?? time);
          drawPose(ctx, smoothOverlayFrame(data.frames, cursor), {
            mode, hand, view, shot: mode === 'batting' ? (shots?.[shotPick]?.shot ?? (shotType === 'auto' ? reading?.shot : shotType)) : undefined,
            metrics: results ?? undefined, highlights: near, badge: time,
          });
        }
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
    setFrameAt((current) => (current ? { ...current, index: null } : current));
    video.play().then(() => {
      rafRef.current = requestAnimationFrame(tick);
    }).catch(() => setReplaying(false));
  }

  function beginRecording() {
    setError(null);
    setResults(null);
    setSecondsLeft(RECORD_MS / 1000);
    setDetail(null);
    setShots(null);
    setCoaching({ state: 'idle' });
    setCompare({ state: 'idle' });
    setCountdown(null);
    recordingRef.current = { until: performance.now() + RECORD_MS, frames: [], times: [], seen: 0, extra: 0 };
    setPhase('recording');
  }

  function startSizeCheck() {
    sizeFrames.current = [];
    sizingRef.current = true;
    setSizing(true);
    if (sizeTimer.current) window.clearTimeout(sizeTimer.current);
    sizeTimer.current = window.setTimeout(() => {
      sizingRef.current = false;
      setSizing(false);
      const video = videoRef.current;
      if (sizeFrames.current.length >= 5 && video) {
        lengthsRef.current = estimateBoneLengths(sizeFrames.current, video.videoWidth || 1, video.videoHeight || 1);
      }
    }, 2000);
  }

  function skipSizeCheck() {
    sizingRef.current = false;
    setSizing(false);
    sizeFrames.current = [];
    if (sizeTimer.current) window.clearTimeout(sizeTimer.current);
  }

  function startRecording() {
    if (countdown !== null) return;
    setCountdown(3);
    let left = 3;
    const timer = window.setInterval(() => {
      left -= 1;
      if (left <= 0) {
        window.clearInterval(timer);
        beginRecording();
      } else setCountdown(left);
    }, 1000);
  }

  function turnOff() {
    const session = sessionRef.current;
    sessionRef.current = null;
    if (session?.current) {
      finishSegment(session, session.current, mode, hand, undefined, mode === 'batting' ? shotType : undefined, view);
      session.current = null;
    }
    stopCamera();
    const canvas = canvasRef.current;
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    setPhase('idle');
    if (HIGHLIGHT_UPLOAD_ENABLED && session) void saveHighlights(session);
  }

  async function saveHighlights(session: Session) {
    if (!HIGHLIGHT_UPLOAD_ENABLED) return;
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
  const overall = results ? overallScore(results) : null;
  // Which of a session's shots to point out, and a plain name for a shot ("pull / hook")
  const pick = shots ? bestAndWorst(shots.map((e) => e.overall)) : null;
  const name = (i: number) => {
    const e = shots?.[i];
    if (!e) return '';
    return e.shot ? `shot ${i + 1}, a ${SHOT_TYPE_LABELS[e.shot].replace(/^\S+\s/, '').toLowerCase()}` : `ball ${i + 1}`;
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold" style={{ fontFamily: "'Inter', sans-serif" }}>Analyse</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Technique analysis and ball tracking in one place. Your video stays on your phone.
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
      <FilmGuide open={guideOpen} step={guideStep} onStep={setGuideStep} onClose={closeGuide} />
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
        <Toggle label="Discipline" value={mode} onChange={changeMode}
          disabled={phase === 'recording'}
          options={[{ value: 'bowling', label: 'Bowling' }, { value: 'batting', label: 'Batting' }]} />
        <Toggle label="Handedness" value={hand} onChange={changeHand}
          disabled={phase === 'recording'}
          options={[{ value: 'right', label: 'Right-handed' }, { value: 'left', label: 'Left-handed' }]} />
        <Toggle label="Camera view" value={view} onChange={changeView}
          disabled={phase === 'recording'}
          options={[{ value: 'side', label: 'Side-on view' }, { value: 'front', label: 'Front-on view' }]} />
      </div>
      <p className="-mt-3 text-xs text-neutral-500">
        {view === 'side'
          ? 'Side-on: camera square of the wicket, level with the crease. Shows the knee, the arm coming over and the lean.'
          : mode === 'bowling'
            ? 'Front-on: camera looking straight down the pitch from the batter\'s end, with the bowler coming towards it. Shows arm height, side bend, head and alignment.'
            : 'Front-on: camera looking straight down the pitch from the bowler\'s end, facing the batter. Shows the head, the line of the bat and balance.'}
        {' '}Film both views for the full picture.
      </p>

      {/* Shot type selector — batting only */}
      {mode === 'batting' && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">Shot type</p>
          <div className="flex flex-wrap gap-2">
            {([['auto', '✨ Auto'], ...Object.entries(SHOT_TYPE_LABELS)] as [ShotChoice, string][]).map(([key, label]) => {
              const active = shotType === key;
              return (
                <button
                  key={key}
                  type="button"
                  disabled={phase === 'recording'}
                  onClick={() => changeShot(key)}
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
            {shotType === 'auto'
              ? 'On Auto, the shot is worked out from your clip. Each shot is scored against its own ideal positions.'
              : 'Each shot is scored against its own ideal positions: a pull and a drive are not judged the same way.'}
          </p>
        </div>
      )}

      <Card>
        <div className="relative mx-auto overflow-hidden rounded-xl bg-black"
          style={{ aspectRatio: String(aspect), maxHeight: '70vh', maxWidth: `calc(70vh * ${aspect})` }}>
          {/* Mirrored so it behaves like a mirror; landmarks are computed on the unmirrored frame */}
          <video ref={videoRef} playsInline muted autoPlay className="absolute inset-0 h-full w-full object-contain"
            // iOS Safari and the Expo web view only autoplay a silent clip that stays inside the page.
            {...{ 'webkit-playsinline': 'true' }}
            onLoadedMetadata={(event) => {
              const { videoWidth, videoHeight } = event.currentTarget;
              if (videoWidth && videoHeight) setAspect(videoWidth / videoHeight);
            }}
            style={{ transform: mirrored ? 'scaleX(-1)' : undefined }} />
          <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full object-contain"
            style={{ transform: mirrored ? 'scaleX(-1)' : undefined }} />

          {!cameraOn && !fileShown && !(source === 'file' && phase === 'loading') && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <span className="text-4xl" aria-hidden><Glyph e="🎯" /></span>
              {notice && <p className="max-w-sm text-sm font-medium text-white">{notice}</p>}
              <p className="max-w-sm text-sm text-neutral-400">
                Set your phone or laptop {view === 'side' ? 'side-on' : 'front-on, looking straight down the pitch'}, step back so your whole body is in frame, then start the camera.
                Or upload a clip you have already filmed.
              </p>
            </div>
          )}

          {source === 'camera' && framingHint && (phase === 'ready' || phase === 'recording' || countdown !== null) && (
            <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-3">
              <p className="rounded-full bg-black/70 px-3 py-1 text-center text-sm font-medium text-white">{sizing ? 'Hold a T-pose' : framingHint}</p>
            </div>
          )}

          {countdown !== null && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-7xl font-bold text-white" aria-live="assertive">
              {countdown}
            </div>
          )}

          {refining && (
            <div className="absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1 text-sm font-medium text-white">Refining…</div>
          )}

          {phase === 'recording' && (
            <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/70 px-3 py-1 text-sm font-medium">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full" style={{ background: CRIMSON }} aria-hidden />
              {source === 'file' ? `Analysing your video…${progress !== null ? ` ${progress}%` : ''}` : `Recording · ${secondsLeft}s`}
            </div>
          )}
        </div>

        {fileShown && phase === 'done' && frameAt && frameAt.total > 1 && (
          <div className="mt-4">
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => showFrame((frameAt.index ?? frameAt.key) - 1)}
                disabled={frameAt.index === 0} aria-label="Previous frame">◀ Frame</Button>
              <input type="range" min={0} max={frameAt.total - 1} step={1} value={frameAt.index ?? frameAt.key}
                onChange={(event) => showFrame(Number(event.target.value))}
                className="h-2 min-w-0 flex-1 accent-sky-400" aria-label="Move through the clip frame by frame" />
              <Button variant="secondary" onClick={() => showFrame((frameAt.index ?? frameAt.key) + 1)}
                disabled={frameAt.index === frameAt.total - 1} aria-label="Next frame">Frame ▶</Button>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 text-xs text-neutral-400">
              <span>{frameAt.index === null ? 'Playing' : `Frame ${frameAt.index + 1} of ${frameAt.total}${frameAt.index === frameAt.key ? ' · key position' : ''}`}</span>
              <span className="flex gap-4">
                {frameAt.index !== null && (
                  <button type="button" onClick={markHere} className="font-medium text-sky-400 underline-offset-2 hover:underline">
                    {mode === 'bowling' ? 'Mark a ball here' : 'Mark a shot here'}
                  </button>
                )}
                <button type="button" onClick={() => showFrame(frameAt.key)} className="font-medium text-sky-400 underline-offset-2 hover:underline">
                  Go to key position
                </button>
              </span>
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-3">
          {!cameraOn && (
            <>
              <Button onClick={() => fileInputRef.current?.click()} loading={phase === 'loading' && source === 'file'} disabled={phase === 'loading' || phase === 'recording'}>
                {phase === 'loading' && source === 'file' ? 'Reading your clip…' : 'Film or choose a clip'}
              </Button>
              <Button variant="secondary" onClick={() => startCamera()} disabled={phase === 'loading' || phase === 'recording'}>
                Use the live camera
              </Button>
              {fileShown && phase === 'done' && (
                <>
                  <Button variant="secondary" onClick={() => replay(1)} disabled={replaying}>Replay with skeleton</Button>
                  <Button variant="secondary" onClick={() => replay(0.25)} disabled={replaying}>Slow motion</Button>
                </>
              )}
              <input ref={fileInputRef} type="file" accept="video/*" capture="environment" className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  if (file) void analyseFile(file);
                }} />
            </>
          )}
          {cameraOn && (
            <>
              <Button onClick={startRecording} disabled={phase === 'recording' || countdown !== null}>
                {countdown !== null ? countdown : phase === 'done' ? 'Record again' : 'Record 5 seconds'}
              </Button>
              {phase === 'ready' && !sizing && (
                <button type="button" onClick={startSizeCheck} className="self-center text-sm font-medium text-sky-400 underline-offset-2 hover:underline">
                  Stand in a T for 2 seconds
                </button>
              )}
              {sizing && (
                <button type="button" onClick={skipSizeCheck} className="self-center text-sm font-medium text-neutral-300 underline-offset-2 hover:underline">
                  Skip the T-pose
                </button>
              )}
              <Button variant="secondary" onClick={flipCamera} disabled={phase === 'recording' || countdown !== null}>
                {facing === 'environment' ? 'Use front camera' : 'Use back camera'}
              </Button>
              <Button variant="secondary" onClick={turnOff} disabled={phase === 'recording'}>Stop camera</Button>
            </>
          )}
          <button type="button" onClick={() => openGuide('angle')} className="self-center text-sm font-medium text-sky-400 underline-offset-2 hover:underline">
            How to film
          </button>
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}
      </Card>

      {shots && phase === 'done' && (
          <Card title={mode === 'bowling' ? 'Deliveries in this clip' : 'Shots in this clip'}
            description={`We found ${shots.length} ${mode === 'bowling' ? (shots.length === 1 ? 'delivery' : 'deliveries') : (shots.length === 1 ? 'shot' : 'shots')} and marked each one. Tap one to see it in full.`}>
            {pick && (
              <p className="mb-4 text-sm leading-relaxed text-neutral-300">
                Your best was {name(pick.best)}, at {shots[pick.best].overall}. {name(pick.toWorkOn).replace(/^./, (c) => c.toUpperCase())} has
                the most room to grow, so it is a good one to look at next.
              </p>
            )}
            <ul className="space-y-2">
              {shots.map((entry, i) => {
                const on = i === shotPick;
                return (
                  <li key={i}>
                    <div className="flex items-stretch gap-2">
                    <button type="button" aria-pressed={on}
                      onClick={() => pickShot(entry, i)}
                      className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition ${on ? 'border-sky-400/60 bg-sky-400/10' : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05]'}`}>
                      <span className="w-14 shrink-0 text-xs text-neutral-500">{clipTime(entry.time)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-white">
                          {mode === 'bowling' ? `Ball ${i + 1}` : `Shot ${i + 1}`}{entry.shot ? ` · ${SHOT_TYPE_LABELS[entry.shot].replace(/^\S+\s/, '')}` : ''}
                        </span>
                        {pick && i === pick.best && <span className="text-xs font-medium" style={{ color: GOLD }}>Best of the session</span>}
                        {pick && i === pick.toWorkOn && <span className="text-xs font-medium text-amber-400">One to work on</span>}
                      </span>
                      <span className="text-xl font-bold" style={{ color: scoreColour(entry.overall) }}>{entry.overall}</span>
                    </button>
                    {shots.length > 1 && (
                      <button type="button" onClick={() => removeShot(i)} aria-label={`Remove ${mode === 'bowling' ? 'ball' : 'shot'} ${i + 1}`}
                        className="rounded-lg border border-white/10 px-3 text-sm text-neutral-400 hover:bg-white/[0.05] hover:text-white"><Glyph e="✕" /></button>
                    )}
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-xs leading-relaxed text-neutral-500">
              {mode === 'bowling'
                ? 'Deliveries are found from the bowling arm coming over. If one is missing, move the clip to its release with the frame buttons and tap "Mark a ball here". Use ✕ to take out anything that was not a delivery.'
                : 'Shots are found from the movement of the hands, so a leave can be missed. If one is missing, move the clip to it with the frame buttons and tap "Mark a shot here". Use ✕ to take out anything that was not a shot. To correct a shot\'s name, open it and pick the right shot type above.'}
            </p>
          </Card>
      )}

      {results && overall !== null && detail && (
        <Card
          title={shots ? `${mode === 'bowling' ? 'Ball' : 'Shot'} ${shotPick + 1} of ${shots.length}` : `${mode === 'bowling' ? 'Bowling' : 'Batting'} analysis`}
        >
          {(() => {
            const viewMismatch = detail.warnings.some((warning) => /front-on|side-on|Turn the phone|Face the camera/i.test(warning));
            const plan = retakePlan(results, mode, view, { playerSize: detail.playerSize, viewMismatch });
            const clipLine = detail.confidence === 'low'
              ? retakeLine('head', detail.playerSize < 0.36 ? 'small' : viewMismatch ? 'angle' : detail.warnings.some((warning) => /feet|whole body/i.test(warning)) ? 'hidden' : 'blur', view)
              : null;
            const retakeText = clipLine ?? plan.line;
            const hidden = detail.confidence === 'low' || plan.withhold;
            const fix = topFix(results);
            const weak = weakestMeasure(results);
            const strong = strongestMeasure(results);
            return (
              <div className="rounded-xl px-4 py-4" style={{ background: 'rgba(11,11,11,0.88)' }}>
                <p className="text-4xl font-bold leading-none" style={{ color: hidden ? '#BEBEC4' : scoreColour(overall) }}>
                  {hidden ? 'Let’s film that again' : overall}
                </p>
                {!hidden && (
                  <p className="mt-3 text-sm leading-relaxed text-neutral-300">
                    <span className="text-[#BEBEC4]">What does this score mean? </span>{scoreMeaning(overall)}
                  </p>
                )}
                {retakeText && (
                  <div className="mt-4 rounded-lg border border-amber-900/80 bg-amber-950/40 px-3 py-3">
                    <p className="text-sm font-medium text-white">Retake recommended</p>
                    <p className="mt-1 text-sm leading-relaxed text-amber-100">{retakeText}</p>
                    <Button className="mt-3" onClick={() => void retake()}>Retake</Button>
                  </div>
                )}
                {hidden && !retakeText && (
                  <p className="mt-3 text-sm leading-relaxed text-amber-200">{LOW_CONFIDENCE_MESSAGE}</p>
                )}
                {!hidden && strong && (
                  <p className="mt-4 text-sm leading-relaxed text-white">
                    <span className="text-[#BEBEC4]">Strength. </span>{strengthPhrase(strong)}
                  </p>
                )}
                {!hidden && fix && (
                  <p className="mt-2 text-sm leading-relaxed text-white">
                    <span className="text-[#BEBEC4]">One fix. </span>{fix.fix}
                  </p>
                )}
                {!hidden && !fix && weak && (
                  <p className="mt-2 text-sm leading-relaxed text-white">
                    <span className="text-[#BEBEC4]">{weak.score >= ON_TARGET ? 'Keep an eye on' : 'Work on'}. </span>{workOnPhrase(weak)}
                  </p>
                )}
              </div>
            );
          })()}

          <details className="mt-4 rounded-lg border border-neutral-800 bg-neutral-950/40 px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium text-white">More detail</summary>
            <div className="mt-4">
          <p className="mb-3 text-sm text-neutral-400">{detail.confidence} confidence · player seen in {frameCount} frames</p>
          {detail.warnings.length > 0 && <p className="mb-3 text-sm text-amber-200">{detail.warnings.join(' · ')}</p>}
          {guideCardFor(detail.warnings) && (
            <button type="button" onClick={() => openGuide(guideCardFor(detail.warnings) ?? 'angle')} className="mb-4 text-sm font-medium text-sky-400 underline-offset-2 hover:underline">
              How to film this
            </button>
          )}
          {(() => {
            const chains = coachingChains(results);
            if (chains.length === 0) {
              const weak = weakestMeasure(results);
              return weak ? (
                <p className="mb-4 text-sm leading-relaxed text-neutral-200">
                  <span className="font-semibold text-white">One drill. </span>{drillFor(weak)}
                </p>
              ) : null;
            }
            return (
              <ul className="mb-4 space-y-3">
                {chains.map((chain) => (
                  <li key={chain.key} className="rounded-lg border border-white/10 px-3 py-2 text-sm leading-relaxed text-neutral-200">
                    <p><span className="font-medium text-white">Problem. </span>{chain.problem}</p>
                    <p className="mt-1"><span className="font-medium text-white">Likely cause. </span>{chain.likelyCause}</p>
                    <p className="mt-1"><span className="font-medium text-white">Fix. </span>{chain.fix}</p>
                  </li>
                ))}
              </ul>
            );
          })()}
          {coaching.state !== 'idle' && (
            <div className="mb-4 rounded-lg border px-4 py-3" style={{ borderColor: 'rgba(239,200,74,0.3)', background: 'rgba(239,200,74,0.06)' }}>
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: GOLD }}>Coach AI</p>
              <p className="mt-1.5 text-sm leading-relaxed text-neutral-200">
                {coaching.state === 'loading' ? 'Writing a longer read…' : coaching.text}
              </p>
            </div>
          )}

          {mode === 'batting' && reading && (
            <p className="mb-4 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-neutral-300">
              We read this as a <strong className="text-white">{SHOT_TYPE_LABELS[reading.shot].replace(/^\S+\s/, '')}</strong>
              {reading.confident ? '.' : ', though it was a close call.'} If that is not the shot you played, pick the right one above and it will be marked again.
            </p>
          )}
          {detail && detail.playerSize < 0.3 && (
            <p className="mb-4 rounded-lg border border-amber-900 bg-amber-950/40 px-3 py-2 text-sm text-amber-200">
              The player is small in this video (about {Math.round(detail.playerSize * 100)}% of the picture height), so these
              numbers are less reliable. Film closer, with the player filling at least a third of the height.
            </p>
          )}

          {detail && detail.unique.length > 0 && (
            <div className="mb-5 rounded-lg border px-4 py-3" style={{ borderColor: 'rgba(96,165,250,0.45)', background: 'rgba(96,165,250,0.08)' }}>
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: '#93C5FD' }}>Unique action noticed</p>
              {detail.unique.map((key) => (
                <div key={key} className="mt-2">
                  <p className="text-sm font-medium text-white">{UNIQUE_ACTIONS[key].title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-neutral-300">{UNIQUE_ACTIONS[key].detail}</p>
                </div>
              ))}
              <p className="mt-2 text-xs leading-relaxed text-neutral-400">
                The rest of the scores still compare against the textbook. A unique action should be judged on what it produces,
                so have a coach look at it as its own action before changing anything.
              </p>
            </div>
          )}

          {detail && (() => {
            const shownShot: ShotType = shotType === 'auto' ? (reading?.shot ?? 'drive') : shotType;
            const reference = getReference(mode, mode === 'batting' ? shownShot : undefined, view);
            const otherView: View = view === 'side' ? 'front' : 'side';
            const other = getReference(mode, mode === 'batting' ? shownShot : undefined, otherView);
            return (
              <div className="mb-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">You · {detail.keyLabel}</p>
                    <PoseFigure pose={detail.pose} width={detail.width} height={detail.height} metrics={results} mode={mode} hand={hand}
                      view={view} shot={mode === 'batting' ? shownShot : undefined} mirrored={mirrored} size={300} />
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide" style={{ color: GOLD }}>
                      {reference.title} · {reference.moment}
                    </p>
                    <PoseFigure pose={referencePose(reference, hand)} width={REFERENCE_SIZE} height={REFERENCE_SIZE} metrics={results}
                      mode={mode} hand={hand} view={view} shot={mode === 'batting' ? shownShot : undefined} labels="target" bat={referenceBat(reference, hand)} size={300}
                      label={`Diagram of the ${reference.title.toLowerCase()} with the target joint angles marked`} />
                  </div>
                </div>
                <p className="mt-2 text-xs text-neutral-500">
                  On your figure, gold is on target, amber is close, red needs work. The textbook figure shows the range to aim for at
                  the same places. It is drawn {hand === 'right' ? 'right' : 'left'}-handed from {view === 'side' ? 'side-on' : 'front-on'}, so
                  it may face the other way from your video.
                </p>

                <div className="mt-4 rounded-lg border border-neutral-800 bg-neutral-950/60 px-4 py-3">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
                    The same position from {otherView === 'side' ? 'side-on' : 'front-on'}
                  </p>
                  <PoseFigure pose={referencePose(other, hand)} width={REFERENCE_SIZE} height={REFERENCE_SIZE} metrics={[]}
                    mode={mode} hand={hand} view={otherView} labels="target" bat={referenceBat(other, hand)} size={240}
                    label={`Diagram of the ${other.title.toLowerCase()}`} />
                  <p className="mt-2 text-xs text-neutral-500">
                    Film a {otherView === 'side' ? 'side-on' : 'front-on'} clip and switch Camera view to have this side of your technique measured too.
                  </p>
                </div>

                <details className="mt-4 rounded-lg border border-neutral-800 bg-neutral-950/60 px-4 py-3">
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
            {results.map((m) => {
              const offerOptionalRetake = m.confidence === 'low' && retakePlan(results, mode, view).keyFails.length === 0;
              return (
              <li key={m.key}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium text-white">
                    {m.label}
                    {m.excused && m.confidence !== 'low' && (
                      <span className="ml-2 rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: 'rgba(96,165,250,0.15)', color: '#93C5FD' }}>
                        unique action · not counted
                      </span>
                    )}
                  </span>
                  <span className="text-right text-neutral-400">
                    {m.confidence === 'low'
                      ? CLEAR_IMAGE
                      : <>{formatValue(m)} · <span className="font-semibold" style={{ color: m.excused ? '#93C5FD' : scoreColour(m.score) }}>{m.score}/100</span>
                        <span className="text-neutral-500"> · {m.confidence ?? detail?.confidence ?? 'medium'}</span></>}
                  </span>
                </div>
                {offerOptionalRetake && (
                  <button type="button" onClick={() => void retake()} className="mt-1 text-xs font-medium text-sky-400 underline-offset-2 hover:underline">
                    Retake if you like
                  </button>
                )}
                {m.confidence !== 'low' && (
                  <>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-neutral-800">
                  <div className="h-full rounded-full" style={{ width: `${m.score}%`, background: m.excused ? '#60A5FA' : scoreColour(m.score) }} />
                </div>
                <p className="mt-1.5 text-xs text-neutral-400">
                  Target {formatRange(m)}
                  {m.best !== undefined && m.best >= m.ideal[0] && m.best <= m.ideal[1] ? `, best at ${m.best}${m.unit}` : ''}.{' '}
                  {m.score >= 97 ? 'Textbook.' : m.score >= ON_TARGET ? `Inside the range. ${m.tip}` : m.tip}
                </p>
                  </>
                )}
              </li>
            );
            })}
          </ul>

          {mode === 'bowling' && detail?.elbow && (() => {
            const { extension, frames: seen, mostBent, atRelease, hyperextension, kind } = detail.elbow;
            const over = extension !== null && extension > ELBOW_EXTENSION_LIMIT;
            return (
              <div className="mt-6 rounded-lg border px-4 py-3"
                style={{ borderColor: over ? 'rgba(245,158,11,0.45)' : 'rgba(255,255,255,0.1)', background: over ? 'rgba(245,158,11,0.07)' : 'rgba(255,255,255,0.02)' }}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-medium text-white">Bowling arm reference check</p>
                  <p className="whitespace-nowrap text-sm font-semibold" style={{ color: extension === null ? 'rgba(255,255,255,0.5)' : over ? '#f59e0b' : GOLD }}>
                    {extension === null ? 'No reading' : `Extension ${Math.round(extension)}° of ${ELBOW_EXTENSION_LIMIT}°`}
                  </p>
                </div>
                {kind && (
                  <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                    <dt className="text-neutral-400">Movement seen</dt>
                    <dd className="font-semibold text-white">{ELBOW_KIND_LABELS[kind]}</dd>
                    <dt className="text-neutral-400">Extension</dt>
                    <dd className="text-neutral-200">{Math.round(extension ?? 0)}° <span className="text-neutral-500">(counted, reference {ELBOW_EXTENSION_LIMIT}°)</span></dd>
                    <dt className="text-neutral-400">Hyperextension</dt>
                    <dd className="text-neutral-200">{Math.round(hyperextension ?? 0)}° <span className="text-neutral-500">(past straight, not counted)</span></dd>
                  </dl>
                )}
                {extension !== null && (
                  <div className="relative mt-3 h-2 rounded-full bg-neutral-800">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, (extension / 30) * 100)}%`, background: over ? '#f59e0b' : GOLD }} />
                    {/* The 15 degree reference line */}
                    <div className="absolute -top-1 h-4 w-0.5 bg-white/70" style={{ left: '50%' }} aria-hidden />
                  </div>
                )}
                <p className="mt-2 text-xs leading-relaxed text-neutral-400">
                  {extension === null
                    ? 'The arm could not be read reliably from horizontal to release in this clip, so no figure is given. Film side-on in slow motion (120 or 240 frames a second) so that part of the action covers more frames.'
                    : over
                      ? `The elbow appeared to straighten by about ${Math.round(extension)}° between the arm reaching horizontal and release (from ${Math.round(mostBent ?? 0)}° to ${Math.round(atRelease ?? 0)}°). That is above the ${ELBOW_EXTENSION_LIMIT}° reference in the Laws, so further testing is recommended: film it again side-on and from behind in slow motion, and have a qualified coach look at it.`
                      : `The elbow appeared to straighten by about ${Math.round(extension)}° between the arm reaching horizontal and release, inside the ${ELBOW_EXTENSION_LIMIT}° reference in the Laws.`}
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-neutral-400">
                  Extension is counted only when the elbow bends after the arm passes horizontal and then straightens before release.
                  An arm that stays straight all the way up reads zero.
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-neutral-500">
                  Reference only, from {seen} frame{seen === 1 ? '' : 's'} of one camera. It is not a ruling on whether an action is legal
                  and it does not count towards the score. Only a multi-camera laboratory assessment can decide that.
                </p>
              </div>
            );
          })()}

          {compare.state === 'ready' && <ComparisonPanel comparison={compare.data ?? null} trend={compare.trend ?? null} />}
            </div>
          </details>

          <p className="mt-5 text-xs text-neutral-600">
            Scores are estimates from a single camera angle. 100 is only given for the textbook position itself; anything inside the
            target range scores 85 or more. Use them as a guide, not a verdict.
          </p>
        </Card>
      )}
      </>}
    </div>
  );
}
