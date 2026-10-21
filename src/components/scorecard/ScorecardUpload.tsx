'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

interface ParsedResult {
  batting?: {
    runs: number; balls: number; fours?: number; sixes?: number;
    strikeRate?: number; howOut?: string;
  };
  bowling?: {
    overs: number; maidens?: number; runs: number; wickets: number; economy?: number;
  };
  opposition?: string;
  matchDate?: string;
  rawText: string;
  scoresAwarded: number;
}

export function ScorecardUpload() {
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<ParsedResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please upload an image file (JPEG, PNG or WebP)');
      setState('error');
      return;
    }

    setPreview(URL.createObjectURL(file));
    setState('loading');
    setResult(null);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('/api/ai/scorecard-parse', { method: 'POST', body: formData });
      const body = await res.json();
      if (!res.ok) {
        setErrorMsg(body.error ?? 'Could not parse scorecard');
        setState('error');
        return;
      }
      setResult(body);
      setState('success');
      router.refresh();
    } catch {
      setErrorMsg('Upload failed — please try again');
      setState('error');
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Drop zone */}
      <div
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => state !== 'loading' && inputRef.current?.click()}
        style={{
          border: `2px dashed ${state === 'error' ? 'rgba(239,68,68,0.4)' : 'rgba(201,165,76,0.25)'}`,
          borderRadius: '14px',
          padding: '28px',
          textAlign: 'center',
          cursor: state === 'loading' ? 'default' : 'pointer',
          background: preview ? 'transparent' : 'rgba(255,255,255,0.02)',
          transition: 'border-color 0.2s',
          position: 'relative', overflow: 'hidden',
        }}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Scorecard preview" style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain', borderRadius: '8px' }} />
        ) : (
          <>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📸</div>
            <p style={{ fontSize: '14px', fontWeight: 500, color: '#fff', margin: '0 0 4px' }}>
              Upload your scorecard
            </p>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
              Drag & drop or tap to select · JPEG, PNG, WebP
            </p>
          </>
        )}

        {state === 'loading' && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: 'rgba(8,8,8,0.85)', borderRadius: '12px',
          }}>
            <div style={{
              width: '28px', height: '28px', border: '3px solid rgba(255,255,255,0.1)',
              borderTopColor: '#c9a54c', borderRadius: '50%',
              animation: 'spin 0.8s linear infinite', marginBottom: '10px',
            }} />
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', margin: 0 }}>Parsing scorecard…</p>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />

      {/* Error */}
      {state === 'error' && (
        <div style={{
          marginTop: '12px', padding: '12px', borderRadius: '10px',
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          fontSize: '13px', color: '#f87171',
        }}>
          {errorMsg}
          <button
            type="button"
            onClick={() => { setState('idle'); setPreview(null); }}
            style={{ marginLeft: '8px', color: '#c9a54c', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px' }}
          >
            Try again
          </button>
        </div>
      )}

      {/* Success result */}
      {state === 'success' && result && (
        <div style={{
          marginTop: '16px',
          background: 'rgba(52,211,153,0.06)',
          border: '1px solid rgba(52,211,153,0.2)',
          borderRadius: '12px',
          padding: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '14px', color: '#34d399', margin: 0 }}>
              ✓ Scorecard parsed
            </p>
            <span style={{
              fontSize: '13px', fontWeight: 700, color: '#c9a54c',
              background: 'rgba(201,165,76,0.1)', border: '1px solid rgba(201,165,76,0.25)',
              borderRadius: '8px', padding: '3px 10px',
            }}>
              +{result.scoresAwarded} Scores
            </span>
          </div>

          {result.opposition && (
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: '0 0 10px' }}>
              vs {result.opposition}{result.matchDate ? ` · ${new Date(result.matchDate).toLocaleDateString('en-GB')}` : ''}
            </p>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: result.batting && result.bowling ? '1fr 1fr' : '1fr', gap: '10px' }}>
            {result.batting && (
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px' }}>
                <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'rgba(255,255,255,0.3)', margin: '0 0 6px' }}>Batting</p>
                <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '24px', color: '#fff', margin: '0 0 2px' }}>
                  {result.batting.runs}
                  <span style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.4)', marginLeft: '4px' }}>
                    ({result.batting.balls}b)
                  </span>
                </p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
                  {result.batting.fours ? `${result.batting.fours}×4` : ''}{result.batting.sixes ? ` ${result.batting.sixes}×6` : ''}
                  {result.batting.howOut ? ` · ${result.batting.howOut}` : ''}
                </p>
              </div>
            )}
            {result.bowling && (
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px' }}>
                <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'rgba(255,255,255,0.3)', margin: '0 0 6px' }}>Bowling</p>
                <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '24px', color: '#fff', margin: '0 0 2px' }}>
                  {result.bowling.wickets}/{result.bowling.runs}
                  <span style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.4)', marginLeft: '4px' }}>
                    ({result.bowling.overs}ov)
                  </span>
                </p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
                  {result.bowling.economy ? `Econ: ${result.bowling.economy}` : ''}
                  {result.bowling.maidens ? ` · ${result.bowling.maidens}M` : ''}
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => { setState('idle'); setPreview(null); setResult(null); }}
            style={{
              marginTop: '12px', fontSize: '12px', color: 'rgba(255,255,255,0.35)',
              background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline',
            }}
          >
            Upload another scorecard
          </button>
        </div>
      )}
    </div>
  );
}
