'use client';

import { Glyph } from '@/components/icons/Glyph';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { checkIn, claimChallenge } from '@/lib/actions/scores-engine';
import { CHECKIN_LADDER, type ChallengeKey, type PlaySummary } from '@/lib/types/scores-engine';
import { formatScores, formatDate } from '@/lib/utils/format';
import { AgeConfirm } from './AgeConfirm';
import { card, cardTitle, muted, pill, row, twoCol } from './ui';

function Meter({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '4px', transition: 'width 0.5s' }} />
    </div>
  );
}

export function PlayPanel({ summary }: { summary: PlaySummary }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const { checkin, challenges, clubGoal, league, weekly, recent } = summary;

  const capLeft = weekly.cap === null ? null : Math.max(0, weekly.cap - weekly.used);
  const claimedCount = challenges.list.filter((c) => c.claimed).length;
  // The day shown as "today" on the ladder: the one just claimed, or the one about to be claimed
  const ladderDay = checkin.doneToday ? checkin.lastDay : checkin.nextDay;

  function run(key: string, fn: () => Promise<void>) {
    setBusyKey(key);
    start(async () => {
      await fn();
      setBusyKey(null);
      router.refresh();
    });
  }

  const doCheckIn = () => run('checkin', async () => {
    const res = await checkIn();
    if (!res.success) { toast.error(res.error); return; }
    if (res.data.gotCard) toast.success('Day 7! A free scratch card is waiting for you.');
    else if (res.data.amount > 0) toast.success(`Checked in: +${res.data.amount} Scores${res.data.capped ? ' (weekly limit reached)' : ''}`);
    else toast.message('Checked in. Your streak carries on, but you have reached this week\'s Scores limit.');
  });

  const doClaim = (key: ChallengeKey) => run(key, async () => {
    const res = await claimChallenge(key);
    if (!res.success) { toast.error(res.error); return; }
    toast.success(res.data.fullHouse > 0
      ? `+${res.data.amount} Scores, and a full house bonus of +${res.data.fullHouse}!`
      : `+${res.data.amount} Scores${res.data.capped ? ' (weekly limit reached)' : ''}`);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Balance and weekly limit */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: weekly.cap === null ? 0 : '12px' }}>
          <div>
            <p style={cardTitle}>Your balance</p>
            <p style={{ margin: 0, fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '34px', color: '#EFC84A', lineHeight: 1 }}>
              {formatScores(summary.balance)} <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>Scores</span>
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Link href="/games" style={pill('blue')}>🎮 Games</Link>
            <Link href="/scratch-cards" style={pill('gold')}>🎟️ Scratch cards</Link>
          </div>
        </div>
        {weekly.cap !== null && (
          <>
            <Meter value={weekly.used} max={weekly.cap} color="#60A5FA" />
            <p style={{ ...muted, fontSize: '11px', marginTop: '6px' }}>
              {capLeft === 0
                ? 'You have reached this week\'s limit for check-ins, challenges and games. It resets on Monday.'
                : `${formatScores(weekly.used)} of ${formatScores(weekly.cap)} Scores earned this week from check-ins, challenges and games`}
            </p>
          </>
        )}
      </div>

      {!summary.isAdult && <AgeConfirm isJunior={summary.isJunior} />}

      <div style={twoCol}>
        {/* Daily check-in */}
        {checkin.enabled && (
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '12px' }}>
              <div style={{ minWidth: 0 }}>
                <p style={cardTitle}>Daily check-in</p>
                <p style={muted}>Check in every day. Miss a day and the ladder starts again.</p>
              </div>
              <button
                type="button"
                onClick={doCheckIn}
                disabled={checkin.doneToday || pending}
                style={pill(checkin.doneToday ? 'green' : 'gold', checkin.doneToday)}
              >
                {checkin.doneToday ? '✓ Checked in' : busyKey === 'checkin' ? 'Checking in…' : 'Check in'}
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px' }}>
              {CHECKIN_LADDER.map((mult, i) => {
                const day = i + 1;
                const done = day < ladderDay || (day === ladderDay && checkin.doneToday);
                const current = day === ladderDay && !checkin.doneToday;
                const isCard = day === 7 && checkin.day7Card;
                return (
                  <div key={day} style={{
                    textAlign: 'center', padding: '8px 2px', borderRadius: '8px', minWidth: 0,
                    background: done ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.04)',
                    border: `1px ${isCard && !done ? 'dashed' : 'solid'} ${done ? 'rgba(34,197,94,0.35)' : current ? '#EFC84A' : 'rgba(255,255,255,0.08)'}`,
                  }}>
                    <span style={{ display: 'block', fontSize: '9px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap' }}>Day {day}</span>
                    <span style={{ display: 'block', marginTop: '3px', fontSize: '13px', fontWeight: 800, color: done ? '#22C55E' : current ? '#EFC84A' : 'rgba(255,255,255,0.55)' }}>
                      {isCard ? '🎁' : `+${checkin.base * mult}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Club goal */}
        {clubGoal && (
          <div style={card}>
            <p style={cardTitle}>Club goal this month</p>
            <p style={{ ...muted, marginBottom: '12px' }}>
              Earn <strong style={{ color: '#fff' }}>{formatScores(clubGoal.goal)} Scores</strong> together
              {clubGoal.reward ? <> and the club unlocks: <strong style={{ color: '#fff' }}>{clubGoal.reward}</strong></> : null}.
            </p>
            <Meter value={clubGoal.total} max={clubGoal.goal} color="#22C55E" />
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginTop: '6px', fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
              <span><strong style={{ color: '#fff' }}>{formatScores(clubGoal.total)}</strong> of {formatScores(clubGoal.goal)}</span>
              <span>{clubGoal.contributors} {clubGoal.contributors === 1 ? 'member' : 'members'} contributing</span>
            </div>
            <p style={{ ...muted, marginTop: '10px' }}>
              {clubGoal.total >= clubGoal.goal ? 'Goal reached. ' : ''}Your share: <strong style={{ color: '#EFC84A' }}>{formatScores(clubGoal.mine)}</strong> Scores
            </p>
          </div>
        )}
      </div>

      <div style={twoCol}>
        {/* Weekly challenges */}
        {challenges.enabled && (
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '6px' }}>
              <div style={{ minWidth: 0 }}>
                <p style={cardTitle}>This week&apos;s challenges</p>
                <p style={muted}>
                  +{challenges.reward} each{challenges.fullHouseReward > 0 ? `, and +${challenges.fullHouseReward} for all five` : ''}. Resets Monday.
                </p>
              </div>
              <span style={{ ...pill(claimedCount === challenges.list.length ? 'green' : 'grey', true) }}>{claimedCount}/{challenges.list.length}</span>
            </div>
            {challenges.list.map((c, i) => (
              <div key={c.key} style={{ ...row, borderBottom: i === challenges.list.length - 1 ? 'none' : row.borderBottom }}>
                <span aria-hidden style={{ fontSize: '20px', lineHeight: 1 }}><Glyph e={c.icon} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: c.claimed ? 'rgba(255,255,255,0.45)' : '#fff', textDecoration: c.claimed ? 'line-through' : 'none' }}>{c.title}</p>
                  <p style={{ ...muted, fontSize: '11px' }}>{c.detail}</p>
                </div>
                {c.claimed ? (
                  <span style={pill('green', true)}>✓ Claimed</span>
                ) : c.done ? (
                  <button type="button" onClick={() => doClaim(c.key)} disabled={pending} style={pill('gold')}>
                    {busyKey === c.key ? 'Claiming…' : `Claim +${challenges.reward}`}
                  </button>
                ) : (
                  <Link href={c.href} style={pill('blue')}>Do it →</Link>
                )}
              </div>
            ))}
            {challenges.fullHouseClaimed && (
              <p style={{ ...muted, marginTop: '10px', color: '#22C55E' }}>🏁 Full house. All five challenges done this week.</p>
            )}
          </div>
        )}

        {/* Weekly league */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '10px', marginBottom: '8px' }}>
            <p style={{ ...cardTitle, margin: 0 }}>Club league this week</p>
            <p style={{ ...muted, fontSize: '11px' }}>Resets Monday</p>
          </div>
          {league.map((r, i) => (
            <div key={`${r.rank}-${i}`} style={{
              display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 8px', borderRadius: '8px', fontSize: '13px',
              background: r.isMe ? 'rgba(37,99,235,0.16)' : 'transparent', color: r.isMe ? '#fff' : 'rgba(255,255,255,0.6)',
            }}>
              <span style={{ width: '22px', fontWeight: 700, color: r.rank <= 3 ? '#EFC84A' : 'rgba(255,255,255,0.35)' }}>{r.rank}</span>
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
              <strong style={{ color: '#fff' }}>{formatScores(r.total)}</strong>
            </div>
          ))}
          <p style={{ ...muted, fontSize: '11px', marginTop: '10px' }}>Every Score you earn this week counts, on and off the pitch.</p>
        </div>
      </div>

      {/* Recent earnings */}
      <div style={card}>
        <p style={cardTitle}>Recent earnings</p>
        {recent.length === 0 ? (
          <p style={muted}>Nothing yet. Check in or claim a challenge to get started.</p>
        ) : recent.map((e, i) => (
          <div key={e.id} style={{ ...row, borderBottom: i === recent.length - 1 ? 'none' : row.borderBottom }}>
            <span style={{ flex: 1, minWidth: 0, fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>{e.label}</span>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>{formatDate(e.created_at)}</span>
            <strong style={{ color: '#22C55E', fontSize: '13px' }}>+{formatScores(e.amount)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
