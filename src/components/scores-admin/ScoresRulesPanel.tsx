'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { saveScoresRule, saveScoresSettings, setMemberJunior } from '@/lib/actions/scores-engine';
import type { ClubScoresRule, ClubScoresSettings } from '@/lib/types/scores-engine';
import type { ClubMemberLite } from '@/lib/types/attendance';
import { SCORES_PER_GBP } from '@/lib/types/scores';
import { card, cardTitle, input, muted, pill, row } from '@/components/play/ui';

const CATEGORY: Record<ClubScoresRule['category'], string> = { app: 'In the app', games: 'Games', club: 'Club life' };
const toInt = (v: string): number | null => (v.trim() === '' ? null : Number.isInteger(Number(v)) && Number(v) >= 0 ? Number(v) : NaN);

function RuleRow({ clubId, rule }: { clubId: string; rule: ClubScoresRule }) {
  const router = useRouter();
  const [amount, setAmount] = useState(String(rule.amount));
  const [enabled, setEnabled] = useState(rule.is_enabled);
  const [pending, start] = useTransition();
  const dirty = amount !== String(rule.amount) || enabled !== rule.is_enabled;

  function save() {
    const n = toInt(amount);
    if (n === null || Number.isNaN(n)) { toast.error('Enter a whole number of Scores.'); return; }
    start(async () => {
      // Saving the default value clears the override, so later changes to the default still apply
      const res = await saveScoresRule(clubId, rule.source, { amount: n === rule.default_amount ? null : n, is_enabled: enabled });
      if (!res.success) { toast.error(res.error); return; }
      toast.success(`${rule.label} saved`);
      router.refresh();
    });
  }

  return (
    <div style={{ ...row, flexWrap: 'wrap', opacity: enabled ? 1 : 0.6 }}>
      <div style={{ flex: '1 1 220px', minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#fff' }}>
          {rule.label}{!rule.counts_to_cap && <span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.4)' }}> · outside the weekly limit</span>}
        </p>
        <p style={{ ...muted, fontSize: '11px' }}>{rule.description}</p>
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> On
      </label>
      <input
        aria-label={`${rule.label} value in Scores`}
        inputMode="numeric"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        style={{ ...input, width: '72px', textAlign: 'right' }}
      />
      <button type="button" onClick={save} disabled={!dirty || pending} style={pill(dirty ? 'gold' : 'grey', !dirty)}>
        {pending ? 'Saving…' : 'Save'}
      </button>
    </div>
  );
}

export function ScoresRulesPanel({ clubId, rules, settings, members }: {
  clubId: string; rules: ClubScoresRule[]; settings: ClubScoresSettings; members: ClubMemberLite[];
}) {
  const router = useRouter();
  const [cap, setCap] = useState(settings.weekly_cap === null ? '' : String(settings.weekly_cap));
  const [goal, setGoal] = useState(settings.monthly_goal === null ? '' : String(settings.monthly_goal));
  const [reward, setReward] = useState(settings.monthly_goal_reward ?? '');
  const [pending, start] = useTransition();
  const capNum = toInt(cap);

  function saveSettings() {
    const c = toInt(cap), g = toInt(goal);
    if (Number.isNaN(c) || Number.isNaN(g)) { toast.error('Use whole numbers, or leave a box empty.'); return; }
    start(async () => {
      const res = await saveScoresSettings(clubId, { weekly_cap: c, monthly_goal: g, monthly_goal_reward: reward });
      if (!res.success) { toast.error(res.error); return; }
      toast.success('Settings saved');
      router.refresh();
    });
  }

  const toggleJunior = (m: ClubMemberLite) => start(async () => {
    const res = await setMemberJunior(clubId, m.user_id, !m.is_junior);
    if (!res.success) { toast.error(res.error); return; }
    router.refresh();
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={card}>
        <p style={cardTitle}>Limits and club goal</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', margin: '10px 0 12px' }}>
          <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
            Weekly limit per player (Scores)
            <input inputMode="numeric" value={cap} onChange={(e) => setCap(e.target.value)} placeholder="No limit" style={{ ...input, display: 'block', width: '100%', marginTop: '4px', boxSizing: 'border-box' }} />
          </label>
          <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
            Monthly club goal (Scores)
            <input inputMode="numeric" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Off" style={{ ...input, display: 'block', width: '100%', marginTop: '4px', boxSizing: 'border-box' }} />
          </label>
          <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
            What the club unlocks
            <input value={reward} maxLength={140} onChange={(e) => setReward(e.target.value)} placeholder="Free teas at the next home game" style={{ ...input, display: 'block', width: '100%', marginTop: '4px', boxSizing: 'border-box' }} />
          </label>
        </div>
        <p style={{ ...muted, marginBottom: '12px' }}>
          The weekly limit covers check-ins, challenges and games.
          {typeof capNum === 'number' && !Number.isNaN(capNum)
            ? ` At ${SCORES_PER_GBP} Scores = £1, the most one player can cost the club from these each week is £${(capNum / SCORES_PER_GBP).toFixed(2)}.`
            : ' With no limit there is no ceiling on what these can cost the club.'}
        </p>
        <button type="button" onClick={saveSettings} disabled={pending} style={pill('gold')}>{pending ? 'Saving…' : 'Save settings'}</button>
      </div>

      {(['app', 'games', 'club'] as const).map((cat) => (
        <div key={cat} style={card}>
          <p style={cardTitle}>{CATEGORY[cat]}</p>
          {rules.filter((r) => r.category === cat).map((r) => <RuleRow key={r.source} clubId={clubId} rule={r} />)}
        </div>
      ))}

      <div style={card}>
        <p style={cardTitle}>Junior members</p>
        <p style={{ ...muted, marginBottom: '8px' }}>
          Juniors cannot use the raffle, scratch cards, the auction or the Daily Spin, whatever they have confirmed about their age.
        </p>
        {members.length === 0 ? <p style={muted}>No members yet.</p> : members.map((m) => (
          <div key={m.user_id} style={row}>
            <span style={{ flex: 1, minWidth: 0, fontSize: '13px', color: '#fff' }}>{m.name}</span>
            <button type="button" onClick={() => toggleJunior(m)} disabled={pending} style={pill(m.is_junior ? 'blue' : 'grey')}>
              {m.is_junior ? 'Junior ✓' : 'Mark as junior'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
