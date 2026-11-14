'use client';

import { useState, useTransition } from 'react';
import {
  upsertScratchCardConfig,
  upsertScratchCardPrize,
  deleteScratchCardPrize,
} from '@/lib/actions/scratch-cards';
import type { ScratchCardConfig, ScratchCardPrize, ScratchCard } from '@/lib/actions/scratch-cards';

const PRIZE_TYPE_LABELS: Record<string, string> = {
  scores:      '🏅 Scores',
  gift_card:   '🎁 Gift Card',
  club_reward: '🏆 Club Reward',
  try_again:   '🔁 Try Again',
};

const PRIZE_TYPE_COLOR: Record<string, string> = {
  scores:      '#2563EB',
  gift_card:   '#7c3aed',
  club_reward: '#d97706',
  try_again:   'rgba(255,255,255,0.3)',
};

type Props = {
  clubId: string;
  config: ScratchCardConfig | null;
  prizes: ScratchCardPrize[];
  recentCards: ScratchCard[];
};

export function AdminScratchCardsPanel({ clubId, config, prizes: initialPrizes, recentCards }: Props) {
  const [prizes, setPrizes] = useState(initialPrizes);
  const [costScores, setCostScores] = useState(config?.cost_scores ?? 500);
  const [milestone, setMilestone] = useState(config?.milestone_scores?.toString() ?? '');
  const [isActive, setIsActive] = useState(config?.is_active ?? false);
  const [configSaved, setConfigSaved] = useState(false);
  const [configError, setConfigError] = useState('');
  const [isPending, startTransition] = useTransition();

  // New prize form state
  const [newPrize, setNewPrize] = useState<Partial<ScratchCardPrize>>({
    prize_type: 'scores',
    weight: 10,
    is_active: true,
    scores_amount: 500,
    weekly_cap: null,
  });
  const [prizeError, setPrizeError] = useState('');

  function saveConfig() {
    setConfigError('');
    startTransition(async () => {
      const res = await upsertScratchCardConfig(clubId, {
        cost_scores: costScores,
        milestone_scores: milestone ? parseInt(milestone) : null,
        is_active: isActive,
      });
      if (res.success) setConfigSaved(true);
      else setConfigError(res.error ?? 'Failed to save');
    });
  }

  function addPrize() {
    if (!newPrize.label?.trim()) { setPrizeError('Label is required'); return; }
    if (newPrize.prize_type === 'scores' && !newPrize.scores_amount) { setPrizeError('Enter Scores amount'); return; }
    if (newPrize.prize_type === 'club_reward' && !newPrize.club_reward_desc?.trim()) { setPrizeError('Enter club reward description'); return; }
    setPrizeError('');
    startTransition(async () => {
      const res = await upsertScratchCardPrize(clubId, newPrize as Omit<ScratchCardPrize, 'club_id'>);
      if (res.success) {
        setPrizes(p => [...p, res.data]);
        setNewPrize({ prize_type: 'scores', weight: 10, is_active: true, scores_amount: 500, weekly_cap: null });
      } else {
        setPrizeError(res.error ?? 'Failed to add prize');
      }
    });
  }

  function removePrize(prizeId: string) {
    startTransition(async () => {
      const res = await deleteScratchCardPrize(clubId, prizeId);
      if (res.success) setPrizes(p => p.filter(x => x.id !== prizeId));
    });
  }

  const totalWeight = prizes.filter(p => p.is_active).reduce((n, p) => n + p.weight, 0);

  const scratched = recentCards.filter(c => c.status === 'scratched').length;
  const unscratched = recentCards.filter(c => c.status === 'unscratched').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        {[
          { label: 'Total issued', value: recentCards.length },
          { label: 'Scratched', value: scratched },
          { label: 'Unscratched', value: unscratched },
        ].map(s => (
          <div key={s.label} style={{
            background: '#07102B', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '12px', padding: '16px',
          }}>
            <p style={{ margin: '0 0 6px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'rgba(255,255,255,0.3)' }}>
              {s.label}
            </p>
            <p style={{ margin: 0, fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '28px', color: '#fff' }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Config */}
      <div style={{
        background: '#07102B', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '14px', padding: '20px',
      }}>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '14px', color: '#fff', margin: '0 0 16px' }}>
          Settings
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '6px' }}>
              Cost per scratch card (Scores)
            </label>
            <input
              type="number" value={costScores} min={100} step={100}
              onChange={e => setCostScores(Number(e.target.value))}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '6px' }}>
              Free card every N Scores earned (optional)
            </label>
            <input
              type="number" value={milestone} placeholder="e.g. 1000"
              onChange={e => setMilestone(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
            <input
              type="checkbox" checked={isActive}
              onChange={e => setIsActive(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: '#2563EB' }}
            />
            Scratch cards enabled for players
          </label>
        </div>
        {configError && <p style={{ fontSize: '12px', color: '#f87171', margin: '0 0 12px' }}>{configError}</p>}
        {configSaved && <p style={{ fontSize: '12px', color: '#4ade80', margin: '0 0 12px' }}>Saved ✓</p>}
        <button onClick={saveConfig} disabled={isPending} style={btnStyle('#2563EB')}>
          {isPending ? 'Saving…' : 'Save settings'}
        </button>
      </div>

      {/* Prize pool */}
      <div style={{
        background: '#07102B', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '14px', padding: '20px',
      }}>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '14px', color: '#fff', margin: '0 0 4px' }}>
          Prize Pool
        </h2>
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', margin: '0 0 16px' }}>
          Prizes are selected by weighted random draw. Higher weight = more likely.
        </p>

        {prizes.length === 0 && (
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', marginBottom: '16px' }}>
            No prizes configured yet — add your first prize below.
          </p>
        )}

        {prizes.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
            {prizes.map(p => {
              const pct = totalWeight > 0 ? Math.round((p.weight / totalWeight) * 100) : 0;
              return (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '12px',
                  border: `1px solid ${p.is_active ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)'}`,
                  opacity: p.is_active ? 1 : 0.5,
                }}>
                  <span style={{
                    fontSize: '11px', fontWeight: 700,
                    color: PRIZE_TYPE_COLOR[p.prize_type],
                    minWidth: '90px',
                  }}>
                    {PRIZE_TYPE_LABELS[p.prize_type]}
                  </span>
                  <span style={{ fontSize: '13px', color: '#fff', flex: 1 }}>{p.label}</span>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', minWidth: '60px', textAlign: 'right' }}>
                    wt {p.weight} · {pct}%
                  </span>
                  {p.weekly_cap != null && (
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>
                      cap {p.weekly_cap}/wk
                    </span>
                  )}
                  <button
                    onClick={() => removePrize(p.id)}
                    style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '14px', padding: '0 4px' }}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Add prize form */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.07)',
          paddingTop: '16px',
          display: 'flex', flexDirection: 'column', gap: '12px',
        }}>
          <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'rgba(255,255,255,0.25)', margin: 0 }}>
            Add prize
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Prize type</label>
              <select
                value={newPrize.prize_type}
                onChange={e => setNewPrize(p => ({ ...p, prize_type: e.target.value as ScratchCardPrize['prize_type'] }))}
                style={inputStyle}
              >
                <option value="scores">🏅 Scores</option>
                <option value="gift_card">🎁 Gift Card (Runa)</option>
                <option value="club_reward">🏆 Club Reward</option>
                <option value="try_again">🔁 Try Again</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Label (shown to player)</label>
              <input
                type="text" value={newPrize.label ?? ''}
                placeholder={newPrize.prize_type === 'scores' ? 'e.g. 500 Scores' : newPrize.prize_type === 'try_again' ? 'Better luck next time!' : 'Prize name'}
                onChange={e => setNewPrize(p => ({ ...p, label: e.target.value }))}
                style={inputStyle}
              />
            </div>
            {newPrize.prize_type === 'scores' && (
              <div>
                <label style={labelStyle}>Scores to award</label>
                <input
                  type="number" value={newPrize.scores_amount ?? ''} min={50} step={50}
                  onChange={e => setNewPrize(p => ({ ...p, scores_amount: Number(e.target.value) }))}
                  style={inputStyle}
                />
              </div>
            )}
            {newPrize.prize_type === 'club_reward' && (
              <div>
                <label style={labelStyle}>Reward description</label>
                <input
                  type="text" value={newPrize.club_reward_desc ?? ''}
                  placeholder="e.g. Free match fee"
                  onChange={e => setNewPrize(p => ({ ...p, club_reward_desc: e.target.value }))}
                  style={inputStyle}
                />
              </div>
            )}
            <div>
              <label style={labelStyle}>Weight (higher = more likely)</label>
              <input
                type="number" value={newPrize.weight ?? 10} min={1} max={100}
                onChange={e => setNewPrize(p => ({ ...p, weight: Number(e.target.value) }))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Weekly cap (leave blank = unlimited)</label>
              <input
                type="number" value={newPrize.weekly_cap ?? ''} min={1}
                placeholder="Unlimited"
                onChange={e => setNewPrize(p => ({ ...p, weekly_cap: e.target.value ? Number(e.target.value) : null }))}
                style={inputStyle}
              />
            </div>
          </div>
          {prizeError && <p style={{ fontSize: '12px', color: '#f87171', margin: 0 }}>{prizeError}</p>}
          <button onClick={addPrize} disabled={isPending} style={btnStyle('#7c3aed')}>
            {isPending ? 'Adding…' : '+ Add prize'}
          </button>
        </div>
      </div>

      {/* Recent activity */}
      {recentCards.length > 0 && (
        <div style={{
          background: '#07102B', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '14px', padding: '20px',
        }}>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '14px', color: '#fff', margin: '0 0 16px' }}>
            Recent Cards (last 200)
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {recentCards.slice(0, 20).map(c => (
              <div key={c.id} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                fontSize: '12px', color: 'rgba(255,255,255,0.5)',
                borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '6px',
              }}>
                <span style={{ color: c.status === 'scratched' ? '#4ade80' : '#facc15' }}>
                  {c.status === 'scratched' ? '✓' : '⏳'}
                </span>
                <span style={{ flex: 1, fontFamily: 'monospace', fontSize: '10px', color: 'rgba(255,255,255,0.2)' }}>
                  {c.id.slice(0, 8)}
                </span>
                <span>{c.source}</span>
                {c.status === 'scratched' && c.prize_snapshot && (
                  <span style={{ color: 'rgba(255,255,255,0.7)' }}>
                    {(c.prize_snapshot as { label?: string }).label ?? '—'}
                  </span>
                )}
                <span>{new Date(c.created_at).toLocaleDateString('en-GB')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px', padding: '9px 12px',
  fontSize: '13px', color: '#fff',
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  fontSize: '11px', color: 'rgba(255,255,255,0.4)',
  display: 'block', marginBottom: '6px',
};

function btnStyle(bg: string): React.CSSProperties {
  return {
    background: bg, border: 'none', borderRadius: '8px',
    padding: '10px 20px', fontSize: '13px', fontWeight: 600,
    color: '#fff', cursor: 'pointer', alignSelf: 'flex-start',
  };
}
