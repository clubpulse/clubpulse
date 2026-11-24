'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createMatchFees, createTrainingSession, markAttendance, markFeePaid } from '@/lib/actions/attendance';
import type { AttendanceAdminData } from '@/lib/types/attendance';
import { formatDate, formatGBP } from '@/lib/utils/format';
import { card, cardTitle, input, muted, pill, row } from '@/components/play/ui';

const today = () => new Date().toISOString().slice(0, 10);

export function AttendancePanel({ clubId, data }: { clubId: string; data: AttendanceAdminData }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(today());
  const [openSession, setOpenSession] = useState<string | null>(data.sessions[0]?.id ?? null);

  const [feeDesc, setFeeDesc] = useState('');
  const [feePounds, setFeePounds] = useState('');
  const [feeDue, setFeeDue] = useState(today());
  const [feePlayers, setFeePlayers] = useState<string[]>([]);

  const act = (fn: () => Promise<void>) => start(async () => { await fn(); router.refresh(); });

  const addSession = () => act(async () => {
    const res = await createTrainingSession(clubId, { date, title });
    if (!res.success) { toast.error(res.error); return; }
    setTitle(''); setOpenSession(res.data.id);
    toast.success('Session created');
  });

  const mark = (sessionId: string, playerId: string, name: string) => act(async () => {
    const res = await markAttendance(clubId, sessionId, playerId);
    if (!res.success) { toast.error(res.error); return; }
    toast.success(res.data.amount > 0 ? `${name} marked present: +${res.data.amount} Scores` : `${name} marked present`);
  });

  const addFees = () => act(async () => {
    const pence = Math.round(Number(feePounds) * 100);
    const res = await createMatchFees(clubId, { description: feeDesc, amountPence: pence, dueDate: feeDue, playerIds: feePlayers });
    if (!res.success) { toast.error(res.error); return; }
    setFeeDesc(''); setFeePounds(''); setFeePlayers([]);
    toast.success(`${res.data.created} ${res.data.created === 1 ? 'fee' : 'fees'} created`);
  });

  const pay = (feeId: string, name: string) => act(async () => {
    const res = await markFeePaid(clubId, feeId);
    if (!res.success) { toast.error(res.error); return; }
    toast.success(res.data.onTime
      ? `${name} paid on time${res.data.amount > 0 ? `: +${res.data.amount} Scores` : ''}`
      : `${name} marked paid (after the due date, so no on-time reward)`);
  });

  const session = data.sessions.find((s) => s.id === openSession) ?? null;
  const unpaid = data.fees.filter((f) => !f.paid_at);
  const paid = data.fees.filter((f) => f.paid_at).slice(0, 10);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Training */}
      <div style={card}>
        <p style={cardTitle}>Training attendance</p>
        <p style={{ ...muted, marginBottom: '12px' }}>
          {data.rewards.trainingOn ? `Each player marked present earns +${data.rewards.training} Scores, once per session.` : 'The training reward is switched off, so marking attendance pays nothing.'}
        </p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
          <input aria-label="Session name" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} placeholder="Tuesday nets" style={{ ...input, flex: '1 1 160px' }} />
          <input aria-label="Session date" type="date" value={date} onChange={(e) => setDate(e.target.value)} style={input} />
          <button type="button" onClick={addSession} disabled={pending || !title.trim()} style={pill(title.trim() ? 'gold' : 'grey', !title.trim())}>Add session</button>
        </div>
        {data.sessions.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
            {data.sessions.map((s) => (
              <button key={s.id} type="button" onClick={() => setOpenSession(s.id)} aria-pressed={s.id === openSession} style={pill(s.id === openSession ? 'blue' : 'grey')}>
                {s.title} · {formatDate(s.session_date)} · {s.attendee_ids.length}
              </button>
            ))}
          </div>
        )}
        {session ? data.members.map((m) => {
          const present = session.attendee_ids.includes(m.user_id);
          return (
            <div key={m.user_id} style={row}>
              <span style={{ flex: 1, minWidth: 0, fontSize: '13px', color: '#fff' }}>{m.name}</span>
              {present
                ? <span style={pill('green', true)}>✓ Present</span>
                : <button type="button" onClick={() => mark(session.id, m.user_id, m.name)} disabled={pending} style={pill('gold')}>Mark present</button>}
            </div>
          );
        }) : <p style={muted}>Add a session to start marking attendance.</p>}
      </div>

      {/* Match fees */}
      <div style={card}>
        <p style={cardTitle}>Match fees</p>
        <p style={{ ...muted, marginBottom: '12px' }}>
          {data.rewards.feeOn ? `A fee marked paid on or before its due date earns the player +${data.rewards.fee} Scores.` : 'The on-time reward is switched off, so paying on time earns nothing.'}
          {' '}This records who has paid; it does not take payments.
        </p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
          <input aria-label="Fee description" value={feeDesc} maxLength={80} onChange={(e) => setFeeDesc(e.target.value)} placeholder="Match fee vs Fairwick" style={{ ...input, flex: '1 1 180px' }} />
          <input aria-label="Amount in pounds" inputMode="decimal" value={feePounds} onChange={(e) => setFeePounds(e.target.value)} placeholder="£" style={{ ...input, width: '70px' }} />
          <input aria-label="Due date" type="date" value={feeDue} onChange={(e) => setFeeDue(e.target.value)} style={input} />
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
          {data.members.map((m) => {
            const on = feePlayers.includes(m.user_id);
            return (
              <button key={m.user_id} type="button" aria-pressed={on} style={pill(on ? 'blue' : 'grey')}
                onClick={() => setFeePlayers((p) => (on ? p.filter((id) => id !== m.user_id) : [...p, m.user_id]))}>
                {on ? '✓ ' : ''}{m.name}
              </button>
            );
          })}
        </div>
        <button type="button" onClick={addFees} disabled={pending || !feeDesc.trim() || !feePounds || feePlayers.length === 0}
          style={pill(feeDesc.trim() && feePounds && feePlayers.length ? 'gold' : 'grey')}>
          Create {feePlayers.length || ''} {feePlayers.length === 1 ? 'fee' : 'fees'}
        </button>

        {unpaid.length > 0 && <p style={{ ...cardTitle, marginTop: '18px' }}>Waiting to be paid</p>}
        {unpaid.map((f) => (
          <div key={f.id} style={{ ...row, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 180px', minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#fff' }}>{f.player_name} · {formatGBP(f.amount_pence)}</p>
              <p style={{ ...muted, fontSize: '11px' }}>{f.description} · due {formatDate(f.due_date)}</p>
            </div>
            <button type="button" onClick={() => pay(f.id, f.player_name)} disabled={pending} style={pill('gold')}>Mark paid</button>
          </div>
        ))}
        {paid.length > 0 && <p style={{ ...cardTitle, marginTop: '18px' }}>Recently paid</p>}
        {paid.map((f) => (
          <div key={f.id} style={row}>
            <span style={{ flex: 1, minWidth: 0, fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>{f.player_name} · {f.description} · {formatGBP(f.amount_pence)}</span>
            <span style={pill('green', true)}>✓ Paid</span>
          </div>
        ))}
      </div>
    </div>
  );
}
