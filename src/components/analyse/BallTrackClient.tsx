'use client';

import { Glyph } from '@/components/icons/Glyph';
/**
 * BallTrackClient
 * ---------------
 * Pick a bowling video → track the ball on this device (lib/analysis/ball-track) →
 * show results in two sub-tabs:
 *   • Video Overlay — original video with ball circle + trail drawn on canvas
 *   • Pitch Map     — top-down pitch view with trajectory & bounce point
 *
 * Sits as a second tab inside the Analyse page alongside AnalyseClient.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/Button';
import { BALL_COLOURS, trackBallInVideo, type BallColour, type BallPosition as TrackedBall, type TrackResult } from '@/lib/analysis/ball-track';

// PitchMap uses canvas — load client-side only
const PitchMap = dynamic(() => import('@/components/analysis/PitchMap'), { ssr: false });

// ── Types (mirror the Python output) ─────────────────────────────────────────

type BallPosition = TrackedBall;

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_MB    = 300;
const ACCEPTED  = 'video/mp4,video/quicktime,video/x-msvideo,video/webm';

const GOLD    = '#EFC84A';

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
      <div style={{ fontSize: '32px', marginBottom: '10px' }}><Glyph e="🎥" /></div>
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
      rafRef.current = requestAnimationFrame(draw);
      const ctx = canvas.getContext('2d');
      const { videoWidth: vw, videoHeight: vh } = video;
      if (!ctx || !vw || !vh) return;

      if (canvas.width !== vw) canvas.width = vw;
      if (canvas.height !== vh) canvas.height = vh;
      ctx.clearRect(0, 0, vw, vh);

      // Canvas pixels per screen pixel: a phone video is shown much smaller than it was filmed,
      // so lines and text are scaled up to stay readable
      const k = canvas.clientWidth && canvas.clientHeight ? Math.max(1, vw / canvas.clientWidth, vh / canvas.clientHeight) : 1;

      // Before the clip is played, show the whole tracked path so the result is visible straight away
      const notStarted = video.paused && video.currentTime === 0;
      const currentFrame = notStarted ? Number.MAX_SAFE_INTEGER : Math.round(video.currentTime * fps);
      const positions = [...frameMap.current.values()].filter((p) => p.frame <= currentFrame);

      // Path so far
      if (positions.length > 1) {
        ctx.beginPath();
        positions.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.strokeStyle = 'rgba(239,200,74,0.85)';
        ctx.lineWidth = 2.5 * k;
        ctx.lineJoin = 'round';
        ctx.stroke();
      }
      // Recent sightings as fading dots
      positions.slice(notStarted ? 0 : -TRAIL_FRAMES).forEach((p, i, list) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3 * k, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(239,200,74,${notStarted ? 0.7 : (i + 1) / list.length})`;
        ctx.fill();
      });

      // The ball in this frame
      const cur = notStarted ? undefined : frameMap.current.get(currentFrame);
      if (cur) {
        ctx.beginPath();
        ctx.arc(cur.x, cur.y, cur.radius + 5 * k, 0, Math.PI * 2);
        ctx.strokeStyle = '#EFC84A';
        ctx.lineWidth = 3 * k;
        ctx.stroke();
      }

      // Bounce, once the ball has got there
      if (bounceFrame !== null && currentFrame >= bounceFrame) {
        const pos = frameMap.current.get(bounceFrame)
          ?? [...frameMap.current.values()].reduce<BallPosition | null>((best, p) =>
            !best || Math.abs(p.frame - bounceFrame) < Math.abs(best.frame - bounceFrame) ? p : best, null);
        if (pos) {
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, pos.radius + 10 * k, 0, Math.PI * 2);
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 3 * k;
          ctx.stroke();

          ctx.font = `bold ${13 * k}px Inter,sans-serif`;
          ctx.textAlign = 'center';
          const labelY = pos.y + pos.radius + 26 * k;
          const labelWidth = ctx.measureText('BOUNCE').width;
          ctx.fillStyle = 'rgba(0,0,0,0.65)';
          ctx.fillRect(pos.x - labelWidth / 2 - 5 * k, labelY - 13 * k, labelWidth + 10 * k, 18 * k);
          ctx.fillStyle = '#ef4444';
          ctx.fillText('BOUNCE', pos.x, labelY);
        }
      }
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
        style={{ display: 'block', width: '100%', maxHeight: '70vh', background: '#000' }}
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
          objectFit:     'contain', // sits over the picture itself, including for upright phone videos
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

  const calNote = 'Speed is a rough estimate. It is closest when filmed side-on with the whole pitch in the picture.';

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

// ── AI Coaching card ──────────────────────────────────────────────────────────

function CoachingCard({ paragraph, loading }: { paragraph: string | null; loading: boolean }) {
  if (!loading && !paragraph) return null;
  return (
    <div style={{
      marginTop:    '16px',
      background:   'linear-gradient(135deg, rgba(37,99,235,0.08) 0%, rgba(239,200,74,0.06) 100%)',
      border:       '1px solid rgba(37,99,235,0.2)',
      borderRadius: '14px',
      padding:      '20px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <span style={{ fontSize: '15px' }}><Glyph e="🧠" /></span>
        <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#60A5FA', textTransform: 'uppercase', letterSpacing: '0.8px', margin: 0 }}>
          AI Coaching Read
        </h3>
      </div>
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '14px', height: '14px', borderRadius: '50%',
            border: '2px solid rgba(96,165,250,0.25)',
            borderTopColor: '#60A5FA',
            animation: 'spin 0.8s linear infinite',
            flexShrink: 0,
          }} />
          <span style={{ fontSize: '13px', color: 'rgba(240,236,228,0.45)' }}>Generating coaching insight…</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <p style={{ fontSize: '14px', color: 'rgba(240,236,228,0.85)', lineHeight: 1.7, margin: 0 }}>
          {paragraph}
        </p>
      )}
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
  const [ball,       setBall]       = useState<BallColour>('red');
  const [resultTab,  setResultTab]  = useState<ResultTab>('video');
  const [coaching,   setCoaching]   = useState<string | null>(null);
  const [coachLoad,  setCoachLoad]  = useState(false);

  const analyse = useCallback(async (f: File) => {
    // Create an object URL so the video element can play the local file
    const url = URL.createObjectURL(f);
    setFile(f);
    setVideoSrc(url);
    setStatus('uploading');
    setResult(null);
    setCoaching(null);
    setErrMsg(null);
    setProgress('Reading video…');

    try {
      // Runs on this device; the video is not uploaded
      const data = await trackBallInVideo(f, {
        ball,
        onProgress: (done) => setProgress(`Finding the ball… ${Math.round(done * 100)}%`),
      });

      setResult(data);
      setStatus('done');
      setResultTab('video');   // default to video overlay on new result

      // Fire coaching + save in parallel, non-blocking — results appear as they land
      setCoachLoad(true);

      // Generate coaching read server-side (Anthropic key stays server-side)
      const coachRes = await fetch('/api/analysis/coaching-read', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          speed_kph:    data.speed_kph,
          swing_px:     data.swing_px,
          bounce_frame: data.bounce_frame,
          detections:   data.ball_positions.length,
          frames:       data.frames_processed,
          white_ball:   ball === 'white',
          ball_colour:  ball,
        }),
      }).catch(() => null);

      let paragraph: string | undefined;
      if (coachRes?.ok) {
        const coachData = await coachRes.json() as { paragraph?: string };
        paragraph = coachData.paragraph;
        if (paragraph) setCoaching(paragraph);
      }

      setCoachLoad(false);

      // Save to Supabase (best-effort — never surfaces errors to user)
      fetch('/api/analysis/save-result', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          analysis_type:      'ball',
          result_json:        data,
          coaching_paragraph: paragraph ?? null,
        }),
      }).catch(() => {/* silent — history is a nice-to-have */});
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      setErrMsg(message.startsWith('No ball detected')
        ? `We couldn't find a moving ${ball} ball in that video. Film from side-on in good light, keep the phone still, and check the ball colour above.`
        : message || 'Analysis failed. Try again.');
      setStatus('error');
      setCoachLoad(false);
    }
  }, [ball]);

  const reset = () => {
    if (videoSrc) URL.revokeObjectURL(videoSrc);
    setFile(null);
    setVideoSrc(null);
    setResult(null);
    setCoaching(null);
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
          Pick a bowling clip. ShiftUp finds the ball frame by frame, tracks its path, finds the
          bounce point and estimates speed and swing. It reads the first 10 seconds, on this device:
          the video is not uploaded. Keep the phone still and film from side-on for the best result.
        </p>
      </div>

      {/* Ball colour toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '13px', color: 'rgba(240,236,228,0.55)' }}>Ball colour</span>
        <div
          role="radiogroup"
          aria-label="Ball colour"
          style={{ display: 'inline-flex', flexWrap: 'wrap', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', padding: '3px', gap: '2px' }}
        >
          {BALL_COLOURS.map(({ value, label, swatch }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={ball === value}
              onClick={() => setBall(value)}
              disabled={uploading}
              style={{
                display:      'inline-flex',
                alignItems:   'center',
                gap:          '6px',
                padding:      '6px 12px',
                borderRadius: '8px',
                border:       'none',
                fontSize:     '13px',
                fontWeight:   600,
                cursor:       uploading ? 'not-allowed' : 'pointer',
                background:   ball === value ? 'rgba(255,255,255,0.14)' : 'transparent',
                color:        ball === value ? '#fff' : 'rgba(240,236,228,0.5)',
                transition:   'all 0.15s',
              }}
            >
              <span aria-hidden style={{ width: 10, height: 10, borderRadius: 999, background: swatch, display: 'inline-block' }} />
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

              {/* AI Coaching Read */}
              <CoachingCard paragraph={coaching} loading={coachLoad} />
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

                {/* AI Coaching Read */}
                <CoachingCard paragraph={coaching} loading={coachLoad} />
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
