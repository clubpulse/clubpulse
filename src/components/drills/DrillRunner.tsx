'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { POSE_LITE_MODEL_URL, POSE_WASM_URL } from '@/lib/analysis/pose-runtime';
import { saveDrillResult } from '@/lib/actions/camera-drills';
import type { PosePoint } from '@/lib/camera-drills/pose';
import { WARMUP_NOTE } from '@/lib/camera-drills/ring';
import { projectPoint, strokeSizes, visibleBones, type OverlayView } from '@/lib/camera-drills/overlay';
import { VISIBILITY_MIN } from '@/lib/camera-drills/one-euro';
import { DrillTracker, type Readout } from '@/lib/camera-drills/session';
import type { DrillDef } from '@/lib/camera-drills/plan';

export function DrillRunner({ drill, baseline }: { drill: DrillDef; baseline: boolean }) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tracker = useRef<DrillTracker | null>(null);
  const facingRef = useRef<'user' | 'environment'>('user');
  const [phase, setPhase] = useState<'ready' | 'count' | 'go' | 'done'>('ready');
  const [facing, setFacing] = useState<'user' | 'environment'>('user');
  const [count, setCount] = useState(3);
  const [readout, setReadout] = useState<Readout | null>(null);
  const [cue, setCue] = useState(WARMUP_NOTE);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => () => {
    videoRef.current?.srcObject && (videoRef.current.srcObject as MediaStream).getTracks().forEach((track) => track.stop());
  }, []);

  const start = async () => {
    setError(null);
    tracker.current?.clear();
    tracker.current = new DrillTracker(drill);
    facingRef.current = facing;
    setReadout(tracker.current.readout());
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
          // MediaPipe names the confidence `visibility`. The drill code reads it as `v`.
          const pose = ((found.landmarks?.[0] ?? []) as Array<{ x: number; y: number; visibility?: number }>).map((p) => ({ x: p.x, y: p.y, v: p.visibility }));
          if (pose.length && tracker.current) {
            const next = tracker.current.push(pose, (performance.now() - started) / 1000);
            draw(canvas, video, next.pose, facingRef.current === 'user');
            setReadout(next.readout);
            setCue(next.readout.cue);
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
      const summary = tracker.current?.result() ?? { score: 0, detail: {}, line: 'No movement was seen.' };
      // The poses are dropped here. Only the score and the few numbers in `detail` are saved. No video leaves the phone.
      tracker.current?.clear();
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
        <Ring fill={readout?.fill ?? 0} label={readout ? String(readout.mode === 'hold' ? Math.floor(readout.count) : readout.count) : '0'} />
        <p
          aria-live="polite"
          className="absolute inset-x-0 bottom-3 mx-auto w-fit rounded-full bg-black/70 px-4 py-1 text-3xl font-bold tabular-nums text-sky-200"
        >
          {readout?.big ?? ''}
        </p>
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

function Ring({ fill, label }: { fill: number; label: string }) {
  const c = 2 * Math.PI * 28;
  return (
    <svg className="absolute right-3 top-3 h-20 w-20" viewBox="0 0 72 72" role="img" aria-label={`${label} counted, ${Math.round(fill * 100)} percent of the goal`}>
      <circle cx="36" cy="36" r="28" fill="rgba(0,0,0,0.55)" stroke="rgba(255,255,255,0.25)" strokeWidth="7" />
      <circle cx="36" cy="36" r="28" fill="none" stroke="#7dd3fc" strokeWidth="7" strokeLinecap="round" strokeDasharray={`${c * fill} ${c}`} transform="rotate(-90 36 36)" />
      <text x="36" y="44" textAnchor="middle" fontSize="24" fontWeight="700" fill="#fff">{label}</text>
    </svg>
  );
}

/**
 * Draws on a canvas sized to the box in real device pixels, using the same cover-and-mirror maths as the video,
 * so the skeleton sits on the body. Joints below the visibility line are left out. A dark halo under each line
 * keeps it readable against clothes and floors.
 */
function draw(canvas: HTMLCanvasElement, video: HTMLVideoElement, pose: Array<PosePoint & { visible?: boolean }>, mirrored: boolean) {
  const box = { width: canvas.clientWidth, height: canvas.clientHeight };
  const ratio = window.devicePixelRatio || 1;
  const pixelW = Math.round(box.width * ratio);
  const pixelH = Math.round(box.height * ratio);
  if (canvas.width !== pixelW || canvas.height !== pixelH) {
    canvas.width = pixelW;
    canvas.height = pixelH;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, box.width, box.height);
  const view: OverlayView = { video: { width: video.videoWidth, height: video.videoHeight }, box, mirrored };
  const size = strokeSizes(box);
  const bones = visibleBones(pose, VISIBILITY_MIN);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [color, width] of [['rgba(0,0,0,0.75)', size.halo], ['#7dd3fc', size.line]] as const) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    for (const [a, b] of bones) {
      const p = projectPoint(pose[a], view);
      const q = projectPoint(pose[b], view);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(q.x, q.y);
      ctx.stroke();
    }
  }
  const joints = new Set(bones.flat());
  for (const index of joints) {
    const p = projectPoint(pose[index], view);
    ctx.beginPath();
    ctx.arc(p.x, p.y, size.dot, 0, Math.PI * 2);
    ctx.fillStyle = '#fde047';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.stroke();
  }
}
