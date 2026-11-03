'use client';

/**
 * BallTrackClient
 * ---------------
 * Upload a bowling video → call /api/analysis/ball-track →
 * show results in two sub-tabs:
 *   • Video Overlay — original video with ball circle + trail drawn on canvas
 *   • Pitch Map     — top-down pitch view with trajectory & bounce point
 *
 * Sits as a second tab inside the Analyse page alongside AnalyseClient.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/Button';

// PitchMap uses canvas — load client-side only
const PitchMap = dynamic(() => import('@/components/analysis/PitchMap'), { ssr: false });

// ── Types (mirror the Python output) ─────────────────────────────────────────

interface BallPosition {
  frame:      number;
  x:          number;
  y:          number;
  radius:     number;
  confidence: number;
}

interface TrajectoryPoint { x: number; y: number }
interface Resolution      { w: number; h: number }
interface PitchCoord      { px: number; py: number }

interface TrackResult {
  frames_processed: number;
  fps:              number;
  resolution:       Resolution;
  ball_positions:   BallPosition[];
  trajectory:       TrajectoryPoint[];
  bounce_frame:     number | null;
  bounce_point:     { x: number; y: number } | null;
  speed_kph:        number | null;
  swing_px:         number;
  pitch_map:        PitchCoord | null;
  calibration?: {
    valid:      boolean;
    px_per_m:   number | null;
    method:     string;
    confidence: number;
  } | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_MB    = 100;
const MAX_BYTES = MAX_MB * 1024 * 1024;
const ACCEPTED  = 'video/mp4,video/quicktime,video/x-msvideo,video/webm';

const GOLD    = '#EFC84A';
const CRIMSON = '#1D4ED8';

// Trail length: how many past positions to draw fading behind the ball
const TRAIL_FRAMES = 10;

// ── Drag-and-drop upload zone ─────────────────────────────────────────────────

interface DropZoneProps {
  onFile:   (f: File) => void;
  disabled: boolean;
}

function DropZone({ onFile, disabled }: DropZoneProps) {
  const inputRef        = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const handle = (file: File | undefined) => {
    if (!file || disabled) return;
    onFile(file);
  };

  return (
    <div
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        handle(e.dataTransfer.files[0]);
      }}
      style={{
        border:       `2px dashed ${over ? GOLD : 'rgba(255,255,255,0.12)'}`,
        borderRadius: '14px',
        padding:      '40px 24px',
        textAlign:    'center',
        cursor:       disabled ? 'not-allowed' : 'pointer',
        background:   over ? 'rgba(239,200,74,0.06)' : 'rgba(255,255,255,0.02)',
        transition:   'border-color 0.15s, background 0.15s',
        opacity:      disabled ? 0.5 : 1,
      }}
    >
      <div style={{ fontSize: '32px', marginBottom: '10px' }}>🎥</div>
      <p style={{ fontSize: '15px', fontWeight: 600, color: '#f0ece4', marginBottom: '6px' }}>
        Drop a bowling video here
      </p>
      <p style={{ fontSize: '12px', color: 'rgba(240,236,228,0.45)', lineHeight: 1.5 }}>
        MP4 · MOV · AVI · WebM &nbsp;·&nbsp; max {MAX_MB} MB<br />
        Side-on camera angle gives the best results
      </p>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        style={{ display: 'none' }}
        onChange={(e) => handle(e.target.files?.[0])}
      />
    </div>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ label }: { label: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '32px 0' }}>
      <div style={{
        display:      'inline-block',
        width:        '40px',
        height:       '40px',
        border:       `3px solid rgba(239,200,74,0.2)`,
        borderTop:    `3px solid ${GOLD}`,
        borderRadius: '50%',
        animation:    'spin 0.8s linear infinite',
        marginBottom: '14px',
      }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <p style={{ fontSize: '13px', color: 'rgba(240,236,228,0.55)' }}>{label}</p>
    </div>
  );
}

// ── Video overlay — plays back the original clip with ball circle + trail ─────

interface VideoOverlayProps {
  videoSrc:      string;          // object URL of the uploaded file
  ballPositions: BallPosition[];
  fps:           number;
  bounceFrame:   number | null;
}

function VideoOverlay({ videoSrc, ballPositions, fps, bounceFrame }: VideoOverlayProps) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);

  // Build a frame → detection map for O(1) lookup
  const frameMap = useRef<Map<number, BallPosition>>(new Map());
  useEffect(() => {
    const m = new Map<number, BallPosition>();
    for (const pos of ballPositions) m.set(pos.frame, pos);
    frameMap.current = m;
  }, [ballPositions]);

  // Draw overlay on every animation frame while video is playing
  useEffect(() => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const draw = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx || video.paused || video.ended) { rafRef.current = requestAnimationFrame(draw); return; }

      // Match canvas size to rendered video size
      const { videoWidth: vw, videoHeight: vh } = video;
      if (!vw || !vh) { rafRef.current = requestAnimationFrame(draw); return; }

      canvas.width  = vw;
      canvas.height = vh;

      ctx.clearRect(0, 0, vw, vh);

      // Current frame index
      const currentFrame = Math.round(video.currentTime * fps);

      // Draw fading trail (past TRAIL_FRAMES positions)
      for (let i = TRAIL_FRAMES; i >= 1; i--) {
        const pos = frameMap.current.get(currentFrame - i);
        if (!pos) continue;
        const alpha = (TRAIL_FRAMES - i + 1) / (TRAIL_FRAMES + 1);
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, pos.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(239,200,74,${alpha * 0.6})`;
        ctx.lineWidth   = 2;
        ctx.stroke();
        // Small filled dot
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(239,200,74,${alpha * 0.5})`;
        ctx.fill();
      }

      // Current frame detection
      const cur = frameMap.current.get(currentFrame);
      if (cur) {
        // Outer ring
        ctx.beginPath();
        ctx.arc(cur.x, cur.y, cur.radius + 4, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(239,200,74,0.9)';
        ctx.lineWidth   = 2.5;
        ctx.stroke();

        // Inner fill (semi-transparent)
        ctx.beginPath();
        ctx.arc(cur.x, cur.y, cur.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(239,200,74,0.15)';
        ctx.fill();

        // Confidence label
        const pct = Math.round(cur.confidence * 100);
        ctx.font      = `bold ${Math.max(11, cur.radius)}px Inter,sans-serif`;
        ctx.fillStyle = 'rgba(239,200,74,0.9)';
        ctx.textAlign = 'center';
        ctx.fillText(`${pct}%`, cur.x, cur.y - cur.radius - 6);
      }

      // Bounce frame indicator
      if (bounceFrame !== null && currentFrame === bounceFrame) {
        const pos = frameMap.current.get(bounceFrame);
        if (pos) {
          // Red ring pulse on bounce frame
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, pos.radius + 12, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(239,68,68,0.9)';
          ctx.lineWidth   = 3;
          ctx.stroke();

          ctx.font      = 'bold 14px Inter,sans-serif';
          ctx.fillStyle = '#ef4444';
          ctx.textAlign = 'center';
          ctx.fillText('BOUNCE', pos.x, pos.y + pos.radius + 22);
        }
      }

      // Frame counter HUD
      ctx.font      = '12px DM Mono,monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.textAlign = 'left';
      ctx.fillText(`frame ${currentFrame}`, 12, 20);

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [fps, bounceFrame]);

  return (
    <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', background: '#000', border: '1px solid rgba(255,255,255,0.07)' }}>
      <video
        ref={videoRef}
        src={videoSrc}
        controls
        playsInline
        style={{ display: 'block', width: '100%', maxHeight: '480px' }}
      />
      {/* Canvas sits exactly over the video */}
      <canvas
        ref={canvasRef}
        style={{
          position:      'absolute',
          top:           0,
          left:          0,
          width:         '100%',
          height:        '100%',
          pointerEvents: 'none',   // clicks pass through to video controls
        }}
        aria-hidden
      />
      {/* Legend */}
      <div style={{
        position:   'absolute',
        top:        '10px',
        right:      '10px',
        background: 'rgba(0,0,0,0.6)',
        borderRadius: '8px',
        padding:    '6px 10px',
        fontSize:   '11px',
        color:      'rgba(240,236,228,0.7)',
        lineHeight: 1.6,
        backdropFilter: 'blur(4px)',
      }}>
        <span style={{ color: GOLD }}>●</span> Ball detected<br />
        <span style={{ color: '#ef4444' }}>●</span> Bounce point
      </div>
    </div>
  );
}

// ── Delivery summary card ─────────────────────────────────────────────────────

function DeliverySummary({ result }: { result: TrackResult }) {
  const detections = result.ball_positions.length;
  const coverage   = result.frames_processed > 0
    ? Math.round((detections / result.frames_processed) * 100)
    : 0;

  const swingDir = Math.abs(result.swing_px) < 5
    ? 'Straight'
    : result.swing_px > 0 ? 'Away swing' : 'In-swing';

  const calNote = result.calibration?.valid
    ? `Speed calibrated (${result.calibration.method}, ${(result.calibration.confidence * 100).toFixed(0)}% conf)`
    : 'Speed estimated (uncalibrated — side-on angle improves accuracy)';

  const rows: [string, string][] = [
    ['Speed',      result.speed_kph != null ? `${result.speed_kph} kph` : '—'],
    ['Shape',      swingDir],
    ['Swing',      Math.abs(result.swing_px) < 5 ? '—' : `${Math.abs(result.swing_px).toFixed(0)} px lateral`],
    ['Bounce',     result.bounce_frame != null ? `Frame ${result.bounce_frame}` : 'Not detected'],
    ['Detections', `${detections} / ${result.frames_processed} frames (${coverage}%)`],
    ['Resolution', `${result.resolution.w} × ${result.resolution.h} @ ${result.fps} fps`],
  ];

  return (
    <div style={{
      background:   'rgba(255,255,255,0.03)',
      border:       '1px solid rgba(255,255,255,0.07)',
      borderRadius: '14px',
      padding:      '20px',
    }}>
      <h3 style={{ fontSize: '13px', fontWeight: 700, color: GOLD, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '16px' }}>
        Delivery Analysis
      </h3>
      <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt style={{ fontSize: '11px', color: 'rgba(240,236,228,0.4)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '3px' }}>
              {label}
            </dt>
            <dd style={{ fontSize: '15px', fontWeight: 600, color: '#f0ece4', margin: 0 }}>
              {value}
            </dd>
          </div>
        ))}
      </dl>
      <p style={{ fontSize: '11px', color: 'rgba(240,236,228,0.3)', marginTop: '16px', lineHeight: 1.5 }}>
        {calNote}
      </p>
    </div>
  );
}

// ── Results sub-tab switcher ──────────────────────────────────────────────────

type ResultTab = 'video' | 'pitchmap';

function ResultTabs({ active, onChange }: { active: ResultTab; onChange: (t: ResultTab) => void }) {
  const tabs: [ResultTab, string][] = [
    ['video',    '▶ Video Overlay'],
    ['pitchmap', '🏏 Pitch Map'],
  ];
  return (
    <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '3px', width: 'fit-content', marginBottom: '16px' }}>
      {tabs.map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          style={{
            padding:      '6px 16px',
            borderRadius: '7px',
            border:       'none',
            fontFamily:   'inherit',
            fontSize:     '13px',
            fontWeight:   600,
            cursor:       'pointer',
            transition:   'all 0.15s',
            background:   active === key ? 'rgba(255,255,255,0.08)' : 'transparent',
            color:        active === key ? '#f0ece4' : 'rgba(240,236,228,0.45)',
            boxShadow:    active === key ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function BallTrackClient() {
  const [file,       setFile]       = useState<File | null>(null);
  const [videoSrc,   setVideoSrc]   = useState<string | null>(null);
  const [status,     setStatus]     = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const [progress,   setProgress]   = useState('');
  const [result,     setResult]     = useState<TrackResult | null>(null);
  const [errMsg,     setErrMsg]     = useState<string | null>(null);
  const [whiteBall,  setWhiteBall]  = useState(false);
  const [resultTab,  setResultTab]  = useState<ResultTab>('video');

  const analyse = useCallback(async (f: File) => {
    // Create an object URL so the video element can play the local file
    const url = URL.createObjectURL(f);
    setFile(f);
    setVideoSrc(url);
    setStatus('uploading');
    setResult(null);
    setErrMsg(null);
    setProgress('Uploading video…');

    const form = new FormData();
    form.append('video',      f);
    form.append('white_ball', String(whiteBall));

    try {
      setProgress('Detecting ball…');
      const res  = await fetch('/api/analysis/ball-track', { method: 'POST', body: form });
      const data = await res.json() as TrackResult & { error?: string };

      if (!res.ok || data.error) {
        throw new Error(data.error ?? `Server error ${res.status}`);
      }

      setResult(data);
      setStatus('done');
      setResultTab('video');   // default to video overlay on new result
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Analysis failed — try again');
      setStatus('error');
    }
  }, [whiteBall]);

  const reset = () => {
    if (videoSrc) URL.revokeObjectURL(videoSrc);
    setFile(null);
    setVideoSrc(null);
    setResult(null);
    setErrMsg(null);
    setStatus('idle');
    setProgress('');
  };

  // Clean up object URL when component unmounts
  useEffect(() => {
    return () => { if (videoSrc) URL.revokeObjectURL(videoSrc); };
  }, [videoSrc]);

  const uploading = status === 'uploading';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Header */}
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#f0ece4', marginBottom: '6px' }}>
          Ball Tracking
        </h2>
        <p style={{ fontSize: '13px', color: 'rgba(240,236,228,0.5)', lineHeight: 1.6 }}>
          Upload a bowling clip. ClubPulse detects the ball frame-by-frame, tracks its
          trajectory, finds the bounce point and estimates speed and swing — all server-side.
        </p>
      </div>

      {/* Ball colour toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '13px', color: 'rgba(240,236,228,0.55)' }}>Ball colour</span>
        <div
          role="radiogroup"
          aria-label="Ball colour"
          style={{ display: 'inline-flex', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', padding: '3px', gap: '2px' }}
        >
          {([['Red', false], ['White', true]] as [string, boolean][]).map(([label, val]) => (
            <button
              key={label}
              type="button"
              onClick={() => setWhiteBall(val)}
              disabled={uploading}
              style={{
                padding:      '6px 16px',
                borderRadius: '8px',
                border:       'none',
                fontSize:     '13px',
                fontWeight:   600,
                cursor:       uploading ? 'not-allowed' : 'pointer',
                background:   whiteBall === val ? (val ? '#f0ece4' : CRIMSON) : 'transparent',
                color:        whiteBall === val ? (val ? '#04091A' : '#fff') : 'rgba(240,236,228,0.5)',
                transition:   'all 0.15s',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Upload zone — only shown when idle or error */}
      {(status === 'idle' || status === 'error') && (
        <DropZone onFile={analyse} disabled={uploading} />
      )}

      {/* Progress */}
      {uploading && <ProgressBar label={progress} />}

      {/* Error */}
      {status === 'error' && errMsg && (
        <div style={{
          background:   'rgba(185,28,28,0.12)',
          border:       '1px solid rgba(185,28,28,0.3)',
          borderRadius: '10px',
          padding:      '14px 16px',
          fontSize:     '13px',
          color:        '#fca5a5',
        }}>
          {errMsg}
        </div>
      )}

      {/* Results */}
      {status === 'done' && result && videoSrc && (
        <>
          {/* File info + re-analyse */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', color: 'rgba(240,236,228,0.45)' }}>
              📹 {file?.name} &nbsp;·&nbsp; {result.frames_processed} frames
            </span>
            <Button variant="secondary" onClick={reset}>
              Analyse another clip
            </Button>
          </div>

          {/* Sub-tab switcher */}
          <ResultTabs active={resultTab} onChange={setResultTab} />

          {/* ── Video Overlay tab ── */}
          {resultTab === 'video' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <VideoOverlay
                videoSrc={videoSrc}
                ballPositions={result.ball_positions}
                fps={result.fps}
                bounceFrame={result.bounce_frame}
              />
              <DeliverySummary result={result} />
            </div>
          )}

          {/* ── Pitch Map tab ── */}
          {resultTab === 'pitchmap' && (
            <div style={{
              display:             'grid',
              gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.5fr)',
              gap:                 '20px',
              alignItems:          'start',
            }}
              className="ball-track-grid"
            >
              {/* Pitch map */}
              <div>
                <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(240,236,228,0.35)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px' }}>
                  Pitch Map
                </p>
                <PitchMap
                  pitchMap={result.pitch_map}
                  trajectory={result.trajectory}
                  resolution={result.resolution}
                  speedKph={result.speed_kph}
                  swingPx={result.swing_px}
                  bounceFrame={result.bounce_frame}
                />
              </div>

              {/* Delivery summary */}
              <div>
                <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(240,236,228,0.35)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px' }}>
                  Delivery Stats
                </p>
                <DeliverySummary result={result} />

                {/* No ball detected warning */}
                {result.ball_positions.length === 0 && (
                  <div style={{
                    marginTop:    '16px',
                    background:   'rgba(249,115,22,0.1)',
                    border:       '1px solid rgba(249,115,22,0.25)',
                    borderRadius: '10px',
                    padding:      '12px 16px',
                    fontSize:     '13px',
                    color:        '#fdba74',
                  }}>
                    No ball detected. Tips: film side-on, ensure the ball is clearly visible, use good lighting,
                    and switch to White ball mode for T20 / indoor.
                  </div>
                )}
              </div>
            </div>
          )}

          <style>{`
            @media (max-width: 700px) {
              .ball-track-grid { grid-template-columns: 1fr !important; }
            }
          `}</style>
        </>
      )}

    </div>
  );
}
