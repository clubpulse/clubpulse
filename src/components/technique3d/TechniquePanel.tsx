'use client';

import { useEffect, useRef, useState } from 'react';
import { FULL_MODEL_URL, WASM_URL } from '@/lib/technique3d/capture';
import { detectEvents } from '@/lib/technique3d/events';
import { COVERAGE_MIN, SLOMO_MESSAGE, analyseClip, coverageLow, logLine, type ClipReport } from '@/lib/technique3d/frames';
import { captureNativeFrames, type Detection } from '@/lib/technique3d/native-frames';
import { alignedReferenceIndex, anglesAt, frameIndexAt, rotateFrameY, yawDelta } from '@/lib/technique3d/math';
import { phaseLabel, referenceById, referencesFor } from '@/lib/technique3d/references';
import { ESTIMATE_NOTE, type AlignEvent, type TechniqueHand, type TechniqueMode, type TechniquePose } from '@/lib/technique3d/types';
import { SkeletonStage } from './SkeletonStage';

const SPEEDS = [1, 0.5, 0.25] as const;

/** Plays the clip slowly and hands each picture the player shows to `onFrame`. Resolves when the clip ends or stalls. */
function playThrough(video: HTMLVideoElement, onFrame: (mediaTime: number) => Detection | null | void): Promise<void> {
  const withCallback = video as HTMLVideoElement & {
    requestVideoFrameCallback: (cb: (now: number, meta: { mediaTime: number }) => void) => number;
  };
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      window.clearTimeout(guard);
      video.removeEventListener('ended', finish);
      video.pause();
      resolve();
    };
    const guard = window.setTimeout(finish, Math.min(180, (video.duration / 0.25) * 1.5 + 10) * 1000);
    const step = (_now: number, meta: { mediaTime: number }) => {
      if (done) return;
      onFrame(meta.mediaTime);
      withCallback.requestVideoFrameCallback(step);
    };
    video.addEventListener('ended', finish);
    video.currentTime = 0;
    video.playbackRate = 0.25;
    withCallback.requestVideoFrameCallback(step);
    video.play().catch(finish);
  });
}

export function TechniquePanel({
  clipUrl,
  mode,
  hand,
  analysisId,
}: {
  clipUrl: string;
  mode: TechniqueMode;
  hand: TechniqueHand;
  analysisId: string | null;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [pose, setPose] = useState<TechniquePose | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [report, setReport] = useState<ClipReport | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [referenceId, setReferenceId] = useState(() => referencesFor(mode)[0]?.id ?? '');
  const [layout, setLayout] = useState<'player' | 'reference' | 'side' | 'overlay'>('player');
  const [align, setAlign] = useState<AlignEvent>(() => (mode === 'bowling' ? 'back_foot_contact' : 'bat_ball_contact'));
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(1);
  const [clipAspect, setClipAspect] = useState<number | null>(null);
  const reference = referenceById(referenceId);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = speed;
    if (!playing) { video.pause(); return; }
    void video.play().catch(() => setPlaying(false));
    let frame = 0;
    const tick = () => {
      setTime(video.currentTime);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, speed, pose]);

  const playerIndex = pose ? frameIndexAt(pose.times, time) : 0;
  const playerEvent = pose ? (detectEvents(pose.frames, pose.mode, pose.hand)[align] ?? pose.keyEventFrame) : 0;
  const referenceEvent = reference?.alignEvents.find((marker) => marker.id === align)?.frame ?? reference?.keyEventFrame ?? 0;
  const playerFrameAtEvent = pose?.frames[playerEvent];
  const referenceFrameAtEvent = reference?.frames[referenceEvent];
  const yaw = playerFrameAtEvent && referenceFrameAtEvent ? yawDelta(referenceFrameAtEvent, playerFrameAtEvent) : 0;

  const shownPlayer = pose?.frames[playerIndex] ?? null;
  const referenceClip = reference ? reference.frames.map((frame) => rotateFrameY(frame, pose ? yaw : 0)) : null;
  const referenceIndex = pose && reference
    ? alignedReferenceIndex(playerIndex, playerEvent, referenceEvent, reference.frames.length)
    : reference ? frameIndexAt(reference.frames.map((_, index) => index / reference.fps), time) : null;
  const referenceFrame = reference && referenceIndex != null ? reference.frames[referenceIndex] : null;
  const shownReference = referenceFrame ? rotateFrameY(referenceFrame, pose ? yaw : 0) : null;
  const angles = shownPlayer ? anglesAt(shownPlayer, hand) : null;
  const marker = reference ? phaseLabel(reference, referenceIndex) : null;

  const scrubTo = (next: number) => {
    setPlaying(false);
    setTime(next);
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    void seekTo(video, next);
  };

  const estimate = async () => {
    const video = videoRef.current;
    if (!video) return;
    setBusy(true);
    setMessage(null);
    setPlaying(false);
    video.pause();
    video.muted = true;
    // A phone will not decode a later frame until the clip has been started once.
    try { await video.play(); } catch { /* seeking still runs if play is refused */ }
    video.pause();
    try {
      const { FilesetResolver, PoseLandmarker } = await import('@mediapipe/tasks-vision');
      const vision = await FilesetResolver.forVisionTasks(WASM_URL);
      const options = { runningMode: 'VIDEO' as const, numPoses: 1 };
      let landmarker;
      try {
        landmarker = await PoseLandmarker.createFromOptions(vision, { ...options, baseOptions: { modelAssetPath: FULL_MODEL_URL, delegate: 'GPU' } });
      } catch {
        landmarker = await PoseLandmarker.createFromOptions(vision, { ...options, baseOptions: { modelAssetPath: FULL_MODEL_URL, delegate: 'CPU' } });
      }
      await waitFor(video);
      let stamp = 0;
      const detect = (): Detection | null => {
        stamp = Math.max(stamp + 1, Math.round(video.currentTime * 1000));
        const found = landmarker.detectForVideo(video, stamp);
        const world = found.worldLandmarks?.[0];
        const image = found.landmarks?.[0];
        if (!world) return null;
        return {
          world: world.map((point) => [point.x, point.y, point.z] as [number, number, number]),
          image: image?.map((point) => [point.x, point.y, point.z] as [number, number, number]) ?? null,
          vis: (found.landmarks?.[0] ?? world).map((point) => (point as { visibility?: number }).visibility ?? 0),
        };
      };
      const hasFrameCallback = typeof (video as HTMLVideoElement & { requestVideoFrameCallback?: unknown }).requestVideoFrameCallback === 'function';
      const captured = await captureNativeFrames({
        duration: video.duration,
        // Every picture the player shows is read. What it skips (a slow phone, iOS Safari) is read afterwards by seeking.
        playPass: hasFrameCallback ? (onFrame) => playThrough(video, (mediaTime) => { stamp = Math.max(stamp + 1, Math.round(mediaTime * 1000)); return onFrame(mediaTime); }) : undefined,
        seek: (at) => seekTo(video, at),
        detect,
        onProgress: (done, total) => setProgress(Math.round((done / Math.max(1, total)) * 100)),
      });
      landmarker.close();
      video.playbackRate = 1;
      const analysed = analyseClip(captured.frames, {
        mode, hand, fps: captured.stats.fps, stride: captured.stats.stride, duration: video.duration, captured: captured.stats,
      });
      // Counts and times only. No picture or landmark is logged.
      console.info(logLine(analysed.report), analysed.report.captured);
      setReport(analysed.report);
      const frames = analysed.frames;
      if (frames.length < 8) {
        setMessage(coverageLow(analysed.report) ? SLOMO_MESSAGE : 'The full body was not clear enough for a 3D estimate. Use a clip with one person, head to ankles, in good light.');
        return;
      }
      const events = analysed.events;
      const keyEvent: AlignEvent = mode === 'bowling' ? 'release' : 'bat_ball_contact';
      if (coverageLow(analysed.report)) setMessage(SLOMO_MESSAGE);
      const round = (n: number) => Math.round(n * 1000) / 1000;
      const next: TechniquePose = {
        mode, hand, keyEvent,
        keyEventFrame: Math.round(events[keyEvent]?.frame ?? 0),
        times: analysed.times.map(round),
        frames: frames.map((frame) => frame.map((point) => point.map(round) as [number, number, number])),
        analysisId,
        quality: analysed.quality.map((q) => (q === 'measured' ? 'm' : q === 'low_confidence' ? 'l' : 'f')).join(''),
        coverage: analysed.report.coverage,
        sourceFps: Math.round(analysed.report.sourceFps * 100) / 100,
      };
      setPose(next);
      const at = next.times[next.keyEventFrame] ?? 0;
      setPlaying(false);
      setTime(at);
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = at;
      }
      const response = await fetch('/api/analysis/technique-pose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      });
      setSaved(response.ok);
      if (!response.ok) setMessage('Shown on this device. It could not be saved to your account.');
    } catch {
      setMessage('The 3D estimate could not be built on this device.');
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  return (
    <section className="mt-6 rounded-2xl border border-white/10 bg-neutral-950 p-4 text-neutral-100 max-md:px-0">
      <div className="max-md:px-4">
      <h2 className="text-lg font-semibold">3D technique view</h2>
      <p className="mt-1 text-sm text-amber-200">{ESTIMATE_NOTE}</p>
      <p className="mt-2 text-sm text-neutral-400">
        The angles are read from one camera. Drag the view to rotate it. The reference actions are drawn by SHIFTUP and are not a real player.
      </p>
      </div>
      <div className="mt-4 flex w-full min-w-0 flex-col gap-3 md:grid md:grid-cols-[minmax(0,1fr)_280px] md:items-start md:gap-4">
        <SkeletonStage
          player={(pose ? layout : 'reference') === 'reference' ? null : shownPlayer}
          reference={(pose ? layout : 'reference') === 'player' ? null : shownReference}
          playerClip={pose?.frames ?? null}
          referenceClip={referenceClip}
          playerTimes={pose?.times ?? null}
          referenceTimes={reference ? reference.frames.map((_, index) => index / reference.fps) : null}
          time={pose ? time : (reference && referenceIndex != null ? referenceIndex / reference.fps : 0)}
          layout={pose ? layout : 'reference'}
        />
        <video
          ref={videoRef}
          src={clipUrl}
          muted
          playsInline
          preload="auto"
          className="mx-auto block h-auto w-auto max-h-36 max-w-full self-center rounded-lg bg-black object-contain md:mx-0 md:h-auto md:max-h-none md:w-full md:max-w-none md:self-start md:rounded-xl"
          style={clipAspect ? { aspectRatio: String(clipAspect) } : undefined}
          onLoadedMetadata={(event) => {
            const video = event.currentTarget;
            setDuration(video.duration || 1);
            if (video.videoWidth > 0 && video.videoHeight > 0) setClipAspect(video.videoWidth / video.videoHeight);
          }}
          onTimeUpdate={(event) => { if (playing) setTime(event.currentTarget.currentTime); }}
          onEnded={() => setPlaying(false)}
        />
      </div>
      <div className="max-md:px-4">
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="rounded-full bg-sky-500 px-3 py-1 text-sm font-medium text-neutral-950" onClick={() => void estimate()} disabled={busy}>
          {busy ? 'Building the 3D estimate…' : 'Build 3D estimate'}
        </button>
        <button type="button" className="rounded-full border border-white/15 px-3 py-1 text-sm" onClick={() => setPlaying((on) => !on)}>{playing ? 'Pause' : 'Play'}</button>
        {SPEEDS.map((value) => (
          <button key={value} type="button" className="rounded-full border border-white/15 px-3 py-1 text-sm" aria-pressed={speed === value} onClick={() => setSpeed(value)}>
            {value === 1 ? 'Normal' : `${value}×`}
          </button>
        ))}
      </div>
      <label className="mt-3 block text-sm text-neutral-400">
        Scrub
        <input className="mt-1 w-full" type="range" min={0} max={duration} step={0.01} value={Math.min(time, duration)}
          aria-label="Scrub the clip and the skeleton"
          onInput={(event) => { void scrubTo(Number(event.currentTarget.value)); }}
          onChange={(event) => { void scrubTo(Number(event.currentTarget.value)); }} />
      </label>
      {angles && (
        <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
          <Angle label="Front elbow" value={angles.frontElbow} />
          <Angle label="Front knee" value={angles.frontKnee} />
          <Angle label="Shoulder-hip separation" value={angles.shoulderHip} />
        </dl>
      )}
      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <label>Reference
          <select className="ml-2 rounded bg-neutral-900 px-2 py-1" value={referenceId} onChange={(event) => setReferenceId(event.target.value)}>
            {referencesFor(mode).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
          </select>
        </label>
        <label>View
          <select className="ml-2 rounded bg-neutral-900 px-2 py-1" value={layout} onChange={(event) => setLayout(event.target.value as typeof layout)}>
            <option value="player">Your action</option>
            <option value="reference">Reference</option>
            <option value="side">Side by side</option>
            <option value="overlay">Overlay</option>
          </select>
        </label>
        <label>Align on
          <select className="ml-2 rounded bg-neutral-900 px-2 py-1" value={align} onChange={(event) => setAlign(event.target.value as AlignEvent)}>
            {(mode === 'bowling' ? [['back_foot_contact', 'Back-foot contact'], ['release', 'Release']] : [['bat_ball_contact', 'Bat-ball contact'], ['front_foot_contact', 'Front-foot contact']])
              .map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
      </div>
      {reference && <p className="mt-2 text-sm text-neutral-400">{reference.summary}</p>}
      <p className="mt-1 text-sm text-neutral-300">{marker ? `Phase: ${marker}` : 'Phase markers sit on the reference action.'}</p>
      {saved && <p className="mt-2 text-sm text-neutral-400">Saved to your account only.</p>}
      {busy && progress != null && <p className="mt-2 text-sm text-neutral-300" aria-live="polite">Reading frames… {progress}%</p>}
      {report && !busy && (
        <div className="mt-3 max-md:px-4" data-testid="coverage-meter">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-neutral-300">Action captured</span>
            <span className={coverageLow(report) ? 'font-semibold text-amber-200' : 'font-semibold text-emerald-300'}>{Math.round(report.coverage * 100)}%</span>
          </div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-white/10" role="meter" aria-label="Share of the action the model saw" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(report.coverage * 100)}>
            <div className={`h-full ${coverageLow(report) ? 'bg-amber-300' : 'bg-emerald-400'}`} style={{ width: `${Math.round(report.coverage * 100)}%` }} />
          </div>
          <p className="mt-1 text-xs text-neutral-400">
            Needs {Math.round(COVERAGE_MIN * 100)}% or more. {report.framesFilled > 0 ? `${report.framesFilled} short gap frame${report.framesFilled === 1 ? '' : 's'} filled in between measured frames; they are estimates and are not counted.` : 'No frames were filled in.'}
          </p>
        </div>
      )}
      {message && <p className="mt-2 text-sm text-amber-200" role="alert">{message}</p>}
      </div>
    </section>
  );
}

function Angle({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-xl border border-white/10 px-3 py-2">
      <dt className="text-neutral-400">{label}</dt>
      <dd className="text-base font-medium">{value == null ? '—' : `${Math.round(value)}°`}</dd>
    </div>
  );
}

function waitFor(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= 1 && Number.isFinite(video.duration)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error('unreadable'));
  });
}

function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  const limit = Number.isFinite(video.duration) ? video.duration : time;
  const target = Math.min(Math.max(time, 0), limit);
  if (Math.abs(video.currentTime - target) < 0.02 && video.readyState >= 2) {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      video.removeEventListener('seeked', finish);
      // Phones paint the new frame a moment after seeked.
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    };
    const timer = window.setTimeout(finish, 700);
    video.addEventListener('seeked', finish);
    video.currentTime = target;
  });
}
