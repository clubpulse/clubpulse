'use client';

import { Glyph } from '@/components/icons/Glyph';
import { useState, useRef, useEffect, useTransition } from 'react';
import { revealExistingCard } from '@/lib/actions/scratch-cards';
import type { ScratchCardConfig, ScratchCard, ScratchPrize } from '@/lib/actions/scratch-cards';

type Prize = ScratchPrize;

type Props = {
  clubId: string;
  config: ScratchCardConfig;
  unscratched: ScratchCard[];
  walletBalance: number;
};

const PRIZE_EMOJI: Record<string, string> = {
  scores:      '🏅',
  gift_card:   '🎁',
  club_reward: '🏆',
  try_again:   '😅',
};

const PRIZE_COLOR: Record<string, string> = {
  scores:      '#2563EB',
  gift_card:   '#7c3aed',
  club_reward: '#d97706',
  try_again:   'rgba(255,255,255,0.3)',
};

export function ScratchCardPlayer({ clubId, config, unscratched, walletBalance }: Props) {
  const [phase, setPhase] = useState<'idle' | 'scratching' | 'revealed'>('idle');
  const [prize, setPrize] = useState<Prize | null>(null);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const [scratchProgress, setScratchProgress] = useState(0); // 0–100
  const [isScratching, setIsScratching] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Free cards waiting to be scratched, oldest first. Each one is used before any card is bought.
  const freeQueue = useRef<string[]>(unscratched.map((c) => c.id));
  const [freeLeft, setFreeLeft] = useState(unscratched.length);
  const revealedRef = useRef(false);

  // Draw the scratch foil
  useEffect(() => {
    if (phase !== 'scratching') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fill with silver foil gradient
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, '#b0b8c8');
    grad.addColorStop(0.5, '#d8dde6');
    grad.addColorStop(1, '#9aa3b0');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // "SCRATCH HERE" text
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.font = 'bold 14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SCRATCH HERE', canvas.width / 2, canvas.height / 2 + 5);
  }, [phase]);

  function handleScratch(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    if (revealedRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 28, 0, Math.PI * 2);
    ctx.fill();

    // Calculate scratch progress
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    let cleared = 0;
    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] === 0) cleared++;
    }
    const pct = Math.round((cleared / (canvas.width * canvas.height)) * 100);
    setScratchProgress(pct);

    // Auto-reveal at 50% scratched
    if (pct >= 50 && !revealedRef.current) {
      revealedRef.current = true;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setPhase('revealed');
    }
  }

  function startScratch() {
    setError('');
    setPhase('scratching');
    revealedRef.current = false;
    setScratchProgress(0);

    // Cards are earned, never bought: there is only ever an earned card to open
    if (freeQueue.current.length === 0) { setPhase('idle'); return; }
    const cardId = freeQueue.current[0];
    startTransition(async () => {
      const res = await revealExistingCard(cardId);
      if (!res.success) { setError(res.error ?? 'Something went wrong'); setPhase('idle'); return; }
      // Wait for scratch animation
      await new Promise(r => setTimeout(r, 400));
      setPrize(res.data.prize);
      freeQueue.current = freeQueue.current.slice(1);
      setFreeLeft(freeQueue.current.length);
    });
  }

  function reset() {
    setPhase('idle');
    setPrize(null);
    setError('');
    revealedRef.current = false;
    setScratchProgress(0);
  }

  const hasFreeCard = freeLeft > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', padding: '8px 0' }}>

      {/* Card container */}
      <div style={{
        width: '300px',
        borderRadius: '20px',
        overflow: 'hidden',
        border: '2px solid rgba(255,255,255,0.1)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        position: 'relative',
      }}>
        {/* Card header */}
        <div style={{
          background: 'linear-gradient(135deg, #1a2a4a 0%, #0d1a35 100%)',
          padding: '16px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <p style={{ margin: 0, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(255,255,255,0.4)' }}>
              ClubPulse
            </p>
            <p style={{ margin: 0, fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '16px', color: '#fff' }}>
              Scratch Card
            </p>
          </div>
          {hasFreeCard && (
            <span style={{
              background: '#16a34a', borderRadius: '20px', padding: '3px 10px',
              fontSize: '10px', fontWeight: 700, color: '#fff', textTransform: 'uppercase',
            }}>
              FREE
            </span>
          )}
        </div>

        {/* Scratch area */}
        <div style={{
          background: 'linear-gradient(135deg, #0f1f3d 0%, #07102B 100%)',
          height: '160px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative',
        }}>
          {/* Prize content (shown beneath foil) */}
          {prize ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '8px' }}>{PRIZE_EMOJI[prize.type] ?? '🎉'}</div>
              <p style={{
                margin: 0, fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800,
                fontSize: '18px', color: PRIZE_COLOR[prize.type] ?? '#fff',
              }}>
                {prize.label}
              </p>
              {prize.type === 'scores' && prize.scores_amount && (
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                  Added to your Scores balance
                </p>
              )}
              {prize.type === 'gift_card' && (
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                  {prize.voucher?.token ? 'Your voucher code is below' : 'We are issuing your voucher. It will appear in your prizes.'}
                </p>
              )}
              {prize.type === 'club_reward' && (
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                  Claim at the club
                </p>
              )}
            </div>
          ) : phase === 'idle' ? (
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '32px' }}><Glyph e="🎰" /></p>
              <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
                {hasFreeCard ? 'You have a card to open!' : 'No cards to open yet'}
              </p>
            </div>
          ) : (
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>Revealing…</p>
          )}

          {/* Scratch foil canvas */}
          {phase === 'scratching' && (
            <canvas
              ref={canvasRef}
              width={300}
              height={160}
              onMouseMove={e => { if (isScratching) handleScratch(e); }}
              onMouseDown={() => setIsScratching(true)}
              onMouseUp={() => setIsScratching(false)}
              onMouseLeave={() => setIsScratching(false)}
              onTouchMove={handleScratch}
              style={{
                position: 'absolute', inset: 0,
                cursor: 'crosshair', touchAction: 'none',
              }}
            />
          )}
        </div>

        {/* Progress bar */}
        {phase === 'scratching' && scratchProgress < 50 && (
          <div style={{ height: '3px', background: 'rgba(255,255,255,0.1)' }}>
            <div style={{
              height: '100%', width: `${scratchProgress * 2}%`,
              background: '#2563EB', transition: 'width 0.1s',
            }} />
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <p style={{ fontSize: '13px', color: '#f87171', margin: 0, textAlign: 'center' }}>{error}</p>
      )}

      {/* CTA */}
      {phase === 'idle' && (
        <button
          onClick={startScratch}
          disabled={isPending || !hasFreeCard}
          style={{
            background: hasFreeCard ? '#16a34a' : 'rgba(255,255,255,0.1)',
            border: 'none', borderRadius: '12px',
            padding: '14px 32px',
            fontSize: '14px', fontWeight: 700, color: '#fff',
            cursor: hasFreeCard ? 'pointer' : 'not-allowed',
            fontFamily: "'Bricolage Grotesque', sans-serif",
          }}
        >
          {hasFreeCard ? '🎉 Scratch your card' : 'Earn a card to scratch'}
        </button>
      )}

      {phase === 'scratching' && scratchProgress < 50 && (
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
          Scratch to reveal your prize…
        </p>
      )}

      {phase === 'revealed' && prize?.voucher?.token && (
        <div style={{
          width: '300px', boxSizing: 'border-box', padding: '12px 14px', borderRadius: '12px',
          background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.35)', textAlign: 'center',
        }}>
          <p style={{ margin: 0, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(255,255,255,0.45)' }}>Voucher code</p>
          <p style={{ margin: '4px 0 0', fontFamily: 'monospace', fontSize: '15px', fontWeight: 700, color: '#fff', wordBreak: 'break-all', userSelect: 'all' }}>
            {prize.voucher.token}
          </p>
          {prize.voucher.instructions && (
            <p style={{ margin: '6px 0 0', fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>{prize.voucher.instructions}</p>
          )}
        </div>
      )}

      {phase === 'revealed' && prize && (
        <button
          onClick={reset}
          style={{
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '10px', padding: '10px 24px',
            fontSize: '13px', color: 'rgba(255,255,255,0.7)', cursor: 'pointer',
          }}
        >
          {hasFreeCard ? 'Scratch another' : 'Done'}
        </button>
      )}

      {/* Balance display */}
      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)', margin: 0 }}>
        Your balance: {walletBalance.toLocaleString()} Scores
        {config.milestone_scores && (
          <> · A card for every {config.milestone_scores.toLocaleString()} Scores earned</>
        )}
      </p>
    </div>
  );
}
