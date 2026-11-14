'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { CoachingInsight } from '@/lib/types/coaching-insights';

const SHOWN = 3;

const TYPE_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  strength:   { label: 'Strength',   color: '#EFC84A', bg: 'rgba(239,200,74,0.12)' },
  focus_area: { label: 'Focus area', color: '#f87171', bg: 'rgba(29,78,216,0.22)' },
  trend:      { label: 'Trend',      color: '#7dd3fc', bg: 'rgba(56,189,248,0.12)' },
  technique:  { label: 'Technique',  color: '#c4b5fd', bg: 'rgba(167,139,250,0.14)' },
};
const FALLBACK_STYLE = { label: 'Insight', color: 'rgba(255,255,255,0.7)', bg: 'rgba(255,255,255,0.08)' };

export function CoachingInsightsCard({ playerId, initialInsights }: { playerId: string; initialInsights: CoachingInsight[] }) {
  const [insights, setInsights] = useState(initialInsights);
  const [saving, setSaving] = useState<string | null>(null);

  // New insights arrive live once a completed match has been processed (RLS limits this to the player's own rows)
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`coaching_insights:${playerId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'coaching_insights', filter: `player_id=eq.${playerId}` },
        (payload) => {
          const insight = payload.new as CoachingInsight;
          setInsights((prev) =>
            prev.some((i) => i.id === insight.id)
              ? prev
              : [insight, ...prev].sort((a, b) => b.generated_at.localeCompare(a.generated_at)).slice(0, SHOWN),
          );
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [playerId]);

  async function acknowledge(id: string) {
    setSaving(id);
    const res = await fetch('/api/ai/insights', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setSaving(null);
    if (res.ok) setInsights((prev) => prev.map((i) => (i.id === id ? { ...i, acknowledged: true } : i)));
  }

  return (
    <section
      aria-labelledby="coaching-insights-heading"
      style={{ background: '#04091A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '20px', fontFamily: "var(--font-inter), 'Inter', sans-serif" }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '14px' }}>
        <h2
          id="coaching-insights-heading"
          style={{ fontFamily: "var(--font-syne), 'Syne', sans-serif", fontWeight: 800, fontSize: '17px', color: '#fff', margin: 0, letterSpacing: '-0.2px' }}
        >
          Coaching insights
        </h2>
        <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#EFC84A' }}>AI coach</span>
      </div>

      {insights.length === 0 ? (
        <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.6, color: 'rgba(255,255,255,0.5)' }}>
          Your first coaching insights will appear after your next match
        </p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {insights.map((insight) => {
            const type = TYPE_STYLES[insight.insight_type] ?? FALLBACK_STYLE;
            return (
              <li
                key={insight.id}
                style={{
                  borderRadius: '12px', padding: '14px', background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${insight.acknowledged ? 'rgba(255,255,255,0.05)' : 'rgba(37,99,235,0.40)'}`,
                  opacity: insight.acknowledged ? 0.65 : 1, transition: 'opacity 0.2s',
                }}
              >
                <span style={{ display: 'inline-block', fontSize: '11px', fontWeight: 600, padding: '2px 9px', borderRadius: '999px', color: type.color, background: type.bg }}>
                  {type.label}
                </span>
                <p style={{ margin: '10px 0 6px', fontSize: '14px', lineHeight: 1.55, color: '#fff' }}>{insight.finding}</p>
                <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.55, color: 'rgba(255,255,255,0.6)' }}>
                  <span style={{ color: '#EFC84A', fontWeight: 600 }}>Try: </span>{insight.recommendation}
                </p>
                <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                  {insight.acknowledged ? (
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>✓ Noted</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => acknowledge(insight.id)}
                      disabled={saving === insight.id}
                      style={{
                        fontSize: '12px', fontWeight: 600, padding: '6px 14px', borderRadius: '8px', border: 'none',
                        background: '#2563EB', color: '#fff', cursor: 'pointer', opacity: saving === insight.id ? 0.6 : 1,
                      }}
                    >
                      Got it
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
