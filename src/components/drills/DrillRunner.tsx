'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { POSE_LITE_MODEL_URL, POSE_WASM_URL } from '@/lib/analysis/pose-runtime';
import { saveDrillResult } from '@/lib/actions/camera-drills';
import { J, type PosePoint } from '@/lib/camera-drills/pose';
import { balanceHoldSeconds, countJumps, countSquats, shoulderRange, squatAngles } from '@/lib/camera-drills/reps';
import { ringCue, ringFill, WARMUP_NOTE } from '@/lib/camera-drills/ring';
import type { DrillDef } from '@/lib/camera-drills/plan';

const BONES: Array<[number, number]> = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28]];

export function DrillRunner({ drill, baseline }: { drill: DrillDef; baseline: boolean }) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frames = useRef<PosePoint[][]>([]);
  const times = useRef<number[]>([]);
  const [phase, setPhase] = useState<'ready' | 'count' | 'go' | 'done'>('ready');
  const [facing, setFacing] = useState<'user' | 'environment'>('user');
  const [count, setCount] = useState(3);
  const [fill, setFill] = useState(0);
  const [cue, setCue] = useState(WARMUP_NOTE);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => () => {
    videoRef.current?.srcObject && (videoRef.current.srcObject as MediaStream).getTracks().forEach((track) => track.stop());
  }, []);

  const start = async () => {
    setError(null);
    frames.current = [];
    times.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing }, audio: false });
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      setPhase('count');
      setCount(3);
    } catch {
      setError('The camera could not start. Allow camera access and try again.');
    }
  };

  useEffect(() => {
    if (phase !== 'count') return;
    const timer = window.setTimeout(() => {
      if (count <= 1) setPhase('go');
      else setCount(count - 1);
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [phase, count]);

  useEffect(() => {
    if (phase !== 'go') return;
    let stop = false;
    let raf = 0;
    const started = performance.now();
    const run = async () => {
      const { FilesetResolver, PoseLandmarker } = await import('@mediapipe/tasks-vision');
      const vision = await FilesetResolver.forVisionTasks(POSE_WASM_URL);
      const landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: POSE_LITE_MODEL_URL, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numPoses: 1,
      });
      const tick = () => {
        if (stop) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (video && canvas && video.readyState >= 2) {
          const found = landmarker.detectForVideo(video, performance.now());
          const pose = (found.landmarks?.[0] ?? []) as PosePoint[];
          if (pose.length) {
            frames.current.push(pose);
            times.current.push((performance.now() - started) / 1000);
            draw(canvas, video, pose);
            const live = liveFill(drill, frames.current, times.current);
            setFill(live.fill);
            setCue(live.cue);
          }
        }
        if (performance.now() - started >= drill.seconds * 1000) {
          finish();
          return;
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    const finish = () => {
      stop = true;
      cancelAnimationFrame(raf);
      const summary = summarise(drill, frames.current, times.current);
      frames.current = [];
      times.current = [];
      videoRef.current?.srcObject && (videoRef.current.srcObject as MediaStream).getTracks().forEach((track) => track.stop());
      setPhase('done');
      setResult(summary.line);
      void saveDrillResult({ drillKey: drill.key, score: summary.score, detail: summary.detail, baseline }).then(() => router.refresh());
    };
    void run().catch(() => setError('Movement tracking could not start on this device.'));
    return () => { stop = true; cancelAnimationFrame(raf); };
  }, [phase, drill, baseline, router]);

  return (
    <section className="space-y-3 rounded-2xl border border-white/10 bg-neutral-950 p-4 text-neutral-100">
      <h2 className="text-lg font-semibold">{drill.title}</h2>
      <p className="text-sm text-amber-200">{WARMUP_NOTE}</p>
      <p className="text-sm text-neutral-400">{drill.setup}</p>
      <div className="relative mx-auto aspect-[3/4] max-w-sm overflow-hidden rounded-xl bg-black">
        <video ref={videoRef} playsInline muted className="h-full w-full object-cover" style={{ transform: facing === 'user' ? 'scaleX(-1)' : undefined }} />
        <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />
        <Ring fill={fill} />
        {phase === 'count' && count > 0 && <p className="absolute inset-0 flex items-center justify-center text-6xl font-bold">{count}</p>}
      </div>
      <p className="text-sm">{cue}</p>
      {phase === 'ready' && (
        <div className="flex flex-wrap gap-2">
          <button type="button" className="rounded-full bg-sky-500 px-4 py-2 text-sm font-medium text-neutral-950" onClick={() => void start()}>Start</button>
          <button type="button" className="rounded-full border border-white/15 px-4 py-2 text-sm" onClick={() => setFacing((side) => side === 'user' ? 'environment' : 'user')}>
            {facing === 'user' ? 'Use the rear camera' : 'Use the front camera'}
          </button>
        </div>
      )}
      {result && (
        <div className="rounded-xl border border-white/10 px-3 py-2 text-sm">
          <p className="font-medium">Result</p>
          <p>{result}</p>
        </div>
      )}
      {error && <p role="alert" className="text-sm text-amber-200">{error}</p>}
    </section>
  );
}

function Ring({ fill }: { fill: number }) {
  const c = 2 * Math.PI * 28;
  return (
    <svg className="absolute right-3 top-3 h-16 w-16" viewBox="0 0 72 72" aria-label={`Progress ${Math.round(fill * 100)} percent`}>
      <circle cx="36" cy="36" r="28" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="6" />
      <circle cx="36" cy="36" r="28" fill="none" stroke="#7dd3fc" strokeWidth="6" strokeDasharray={`${c * fill} ${c}`} transform="rotate(-90 36 36)" />
    </svg>
  );
}

function draw(canvas: HTMLCanvasElement, video: HTMLVideoElement, pose: PosePoint[]) {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#7dd3fc';
  ctx.lineWidth = 3;
  for (const [a, b] of BONES) {
    const p = pose[a];
    const q = pose[b];
    if (!p || !q) continue;
    ctx.beginPath();
    ctx.moveTo(p.x * canvas.width, p.y * canvas.height);
    ctx.lineTo(q.x * canvas.width, q.y * canvas.height);
    ctx.stroke();
  }
}

function liveFill(drill: DrillDef, samples: PosePoint[][], times: number[]) {
  const summary = summarise(drill, samples, times);
  return { fill: summary.fill, cue: ringCue(summary.fill, summary.form) };
}

function summarise(drill: DrillDef, samples: PosePoint[][], times: number[]) {
  if (drill.key === 'squat' || drill.key === 'reach') {
    const reading = countSquats(squatAngles(samples));
    const done = drill.key === 'reach' ? Math.min(reading.reps, samples.length) : reading.reps;
    const fill = ringFill(done, drill.target, drill.key === 'reach' ? 1 : reading.form);
    return { fill, form: reading.form, score: Math.round(fill * 100), detail: { reps: done, deepest: Math.round(reading.deepest) }, line: `${done} reps. Score ${Math.round(fill * 100)}.` };
  }
  if (drill.key === 'balance') {
    const left = balanceHoldSeconds(samples.map((frame, i) => ({
      freeY: frame[J.lAnkle]?.y ?? 1,
      standY: frame[J.rAnkle]?.y ?? 1,
      t: times[i] ?? 0,
    })));
    const right = balanceHoldSeconds(samples.map((frame, i) => ({
      freeY: frame[J.rAnkle]?.y ?? 1,
      standY: frame[J.lAnkle]?.y ?? 1,
      t: times[i] ?? 0,
    })));
    const held = Math.min(left, right);
    const fill = ringFill(held, drill.target, held > 0 ? 1 : 0);
    return { fill, form: held > 0 ? 1 : 0, score: Math.round(fill * 100), detail: { left, right }, line: `Left ${left}s, right ${right}s. Score ${Math.round(fill * 100)}.` };
  }
  if (drill.key === 'shoulder') {
    const range = shoulderRange(samples);
    const fill = ringFill(range.range, drill.target, range.form);
    return { fill, form: range.form, score: Math.round(fill * 100), detail: { degrees: range.range }, line: `${range.range} degrees of movement. Score ${Math.round(fill * 100)}.` };
  }
  const ground = samples[0]?.[J.lAnkle]?.y ?? 1;
  const jumps = countJumps(samples.map((frame, i) => ({ ankleY: Math.min(frame[J.lAnkle]?.y ?? 1, frame[J.rAnkle]?.y ?? 1), t: times[i] ?? 0 })), ground);
  const fill = ringFill(jumps.reps, drill.target, jumps.form);
  return { fill, form: jumps.form, score: Math.round(fill * 100), detail: { reps: jumps.reps, flight: jumps.flight }, line: `${jumps.reps} bounces. Score ${Math.round(fill * 100)}.` };
}
