'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import { buyAndRevealScratchCard, revealExistingCard } from '@/lib/actions/scratch-cards';
import type { ScratchCardConfig, ScratchCard } from '@/lib/actions/scratch-cards';

type Prize = {
  type: string;
  label: string;
  scores_amount?: number;
  reward_id?: string;
  club_reward?: string;
};

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
  const pendingCardId = useRef<string | null>(
    unscratched.length > 0 ? unscratched[0].id : null
  );
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

    // If there's a free unscratched card, use it; otherwise buy + reveal
    if (pendingCardId.current) {
      const cardId = pendingCardId.current;
      startTransition(async () => {
        const res = await revealExistingCard(cardId);
        if (!res.success) { setError(res.error ?? 'Something went wrong'); setPhase('idle'); return; }
        // Wait for scratch animation
        await new Promise(r => setTimeout(r, 400));
        setPrize(res.data.prize);
        pendingCardId.current = null;
      });
    } else {
      startTransition(async () => {
        const res = await buyAndRevealScratchCard(clubId);
        if (!res.success) { setError(res.error ?? 'Something went wrong'); setPhase('idle'); return; }
        await new Promise(r => setTimeout(r, 400));
        setPrize(res.data.prize);
      });
    }
  }

  function reset() {
    setPhase('idle');
    setPrize(null);
    setError('');
    revealedRef.current = false;
    setScratchProgress(0);
  }

  const hasFreeCard = unscratched.length > 0 && pendingCardId.current;
  const canAfford = walletBalance >= config.cost_scores;

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
            <p style={{ margin: 0, fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '16px', color: '#fff' }}>
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
                margin: 0, fontFamily: "'Syne', sans-serif", fontWeight: 800,
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
                  Your voucher will arrive shortly
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
              <p style={{ margin: 0, fontSize: '32px' }}>🎰</p>
              <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
                {hasFreeCard ? 'You have a free scratch card!' : `${config.cost_scores.toLocaleString()} Scores`}
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
          disabled={isPending || (!hasFreeCard && !canAfford)}
          style={{
            background: hasFreeCard ? '#16a34a' : canAfford ? '#2563EB' : 'rgba(255,255,255,0.1)',
            border: 'none', borderRadius: '12px',
            padding: '14px 32px',
            fontSize: '14px', fontWeight: 700, color: '#fff',
            cursor: hasFreeCard || canAfford ? 'pointer' : 'not-allowed',
            fontFamily: "'Syne', sans-serif",
          }}
        >
          {hasFreeCard
            ? '🎉 Scratch your free card!'
            : canAfford
              ? `Scratch for ${config.cost_scores.toLocaleString()} Scores`
              : `Need ${config.cost_scores.toLocaleString()} Scores`}
        </button>
      )}

      {phase === 'scratching' && scratchProgress < 50 && (
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
          Scratch to reveal your prize…
        </p>
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
          Scratch another
        </button>
      )}

      {/* Balance display */}
      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)', margin: 0 }}>
        Your balance: {walletBalance.toLocaleString()} Scores
        {config.milestone_scores && (
          <> · Free card every {config.milestone_scores.toLocaleString()} Scores earned</>
        )}
      </p>
    </div>
  );
}
