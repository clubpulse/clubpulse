'use client';

import { useState, useTransition } from 'react';
import { BENEFIT_TYPE_CONFIG, AGE_GROUP_LABELS } from '@/lib/types/sponsor';
import type { SponsorshipPackage, JuniorSlot } from '@/lib/types/sponsor';
import { createSponsorship } from '@/lib/actions/sponsor';

interface PackageCardProps {
  pkg: SponsorshipPackage;
  juniorSlots: JuniorSlot[];
  walletBalance: number;
  onSuccess: () => void;
}

export function PackageCard({ pkg, juniorSlots, walletBalance, onSuccess }: PackageCardProps) {
  const [juniorSlotId, setJuniorSlotId] = useState<string>('');
  const [message, setMessage] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const config = BENEFIT_TYPE_CONFIG[pkg.benefit_type];
  const slotsLeft = pkg.slots_available != null ? pkg.slots_available - pkg.slots_filled : null;
  const canAfford = walletBalance >= pkg.scores_cost;
  const isSoldOut = slotsLeft !== null && slotsLeft <= 0;

  function handleSponsor() {
    setError(null);
    startTransition(async () => {
      const result = await createSponsorship(
        pkg.id,
        juniorSlotId || undefined,
        message || undefined
      );
      if (!result.success) {
        setError(result.error);
        return;
      }
      setExpanded(false);
      setMessage('');
      setJuniorSlotId('');
      onSuccess();
    });
  }

  return (
    <div style={{
      background: '#0f0f0f',
      border: `1px solid ${isSoldOut ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)'}`,
      borderRadius: '16px',
      padding: '20px',
      opacity: isSoldOut ? 0.5 : 1,
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '28px' }} aria-hidden>{config.emoji}</span>
          <div>
            <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.7px', color: 'rgba(255,255,255,0.35)', margin: '0 0 2px' }}>
              {config.label}
            </p>
            <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '16px', color: '#fff', margin: 0 }}>
              {pkg.title}
            </h3>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '20px', color: '#fff', margin: 0 }}>
            {pkg.scores_cost.toLocaleString()}
          </p>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>Scores</p>
        </div>
      </div>

      {/* Description */}
      {pkg.description && (
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', margin: 0, lineHeight: 1.5 }}>
          {pkg.description}
        </p>
      )}

      {/* Slots remaining */}
      {slotsLeft !== null && (
        <p style={{
          fontSize: '12px',
          color: slotsLeft === 0 ? '#f87171' : slotsLeft <= 3 ? '#fbbf24' : 'rgba(255,255,255,0.4)',
          margin: 0,
        }}>
          {slotsLeft === 0 ? 'All slots filled' : `${slotsLeft} slot${slotsLeft === 1 ? '' : 's'} remaining`}
        </p>
      )}

      {/* Action */}
      {!isSoldOut && (
        <>
          {!expanded ? (
            <button
              onClick={() => setExpanded(true)}
              disabled={!canAfford}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '10px',
                border: 'none',
                background: canAfford ? 'rgba(155,28,28,0.85)' : 'rgba(255,255,255,0.06)',
                color: canAfford ? '#fff' : 'rgba(255,255,255,0.3)',
                fontFamily: "'Inter', sans-serif",
                fontWeight: 600,
                fontSize: '13px',
                cursor: canAfford ? 'pointer' : 'not-allowed',
              }}
            >
              {canAfford ? 'Sponsor Now' : `Need ${(pkg.scores_cost - walletBalance).toLocaleString()} more Scores`}
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Junior selector */}
              {juniorSlots.length > 0 && (
                <div>
                  <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '4px' }}>
                    Sponsor a specific junior (optional)
                  </label>
                  <select
                    value={juniorSlotId}
                    onChange={e => setJuniorSlotId(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#1a1a1a',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#fff',
                      padding: '8px 10px',
                      fontSize: '13px',
                    }}
                  >
                    <option value="">Any junior in need</option>
                    {juniorSlots.map(slot => (
                      <option key={slot.id} value={slot.id}>
                        {slot.anonymous_label} · {AGE_GROUP_LABELS[slot.age_group]}
                      </option>
                    ))}
                  </select>
                  {juniorSlotId && juniorSlots.find(s => s.id === juniorSlotId)?.about && (
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: '4px 0 0', fontStyle: 'italic' }}>
                      {juniorSlots.find(s => s.id === juniorSlotId)?.about}
                    </p>
                  )}
                </div>
              )}

              {/* Encouragement message */}
              <div>
                <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '4px' }}>
                  Message of encouragement (optional)
                </label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Keep swinging hard and enjoy every game!"
                  rows={2}
                  maxLength={280}
                  style={{
                    width: '100%',
                    background: '#1a1a1a',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    padding: '8px 10px',
                    fontSize: '13px',
                    resize: 'vertical',
                    fontFamily: "'Inter', sans-serif",
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {error && (
                <p style={{ fontSize: '13px', color: '#f87171', margin: 0 }}>{error}</p>
              )}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => { setExpanded(false); setError(null); }}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'transparent',
                    color: 'rgba(255,255,255,0.5)',
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 500,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSponsor}
                  disabled={isPending}
                  style={{
                    flex: 2,
                    padding: '10px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'rgba(155,28,28,0.85)',
                    color: '#fff',
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: isPending ? 'not-allowed' : 'pointer',
                    opacity: isPending ? 0.6 : 1,
                  }}
                >
                  {isPending ? 'Confirming…' : `Confirm — ${pkg.scores_cost.toLocaleString()} Scores`}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
