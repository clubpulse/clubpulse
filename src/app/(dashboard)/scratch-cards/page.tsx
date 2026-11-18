import { requireUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { fetchWallet } from '@/lib/profile/service';
import { getScratchCardConfig, getMyUnscratched, getMyScratchedCards } from '@/lib/actions/scratch-cards';
import { getPrimaryClubId, isAdultPlayer } from '@/lib/scores/context';
import { totalBalance } from '@/lib/types/scores';
import { formatScores, formatDate } from '@/lib/utils/format';
import { ScratchCardPlayer } from '@/components/scratch-cards/ScratchCardPlayer';
import { AgeConfirm } from '@/components/play/AgeConfirm';
import { card, cardTitle, h1, muted, row, twoCol } from '@/components/play/ui';

const PRIZE_ICON: Record<string, string> = { scores: '🏅', gift_card: '🎁', club_reward: '🏆', try_again: '😅' };

export default async function ScratchCardsPage() {
  const user = await requireUser();
  const clubId = await getPrimaryClubId(user.id);

  if (!clubId) {
    return <p style={{ fontSize: '14px', color: '#f87171', fontFamily: "'Inter', sans-serif" }}>You need to be a club member to use scratch cards.</p>;
  }

  const supabase = await createClient();
  const [configRes, wallet, unscratchedRes, scratchedRes, adult, member, prizes] = await Promise.all([
    getScratchCardConfig(clubId),
    fetchWallet(supabase, user.id),
    getMyUnscratched(clubId),
    getMyScratchedCards(clubId),
    isAdultPlayer(user.id, clubId),
    createAdminClient().from('club_members').select('is_junior').eq('user_id', user.id).eq('club_id', clubId).maybeSingle(),
    supabase.from('scratch_card_prizes').select('label, prize_type').eq('club_id', clubId).eq('is_active', true).order('weight', { ascending: false }),
  ]);

  const config = configRes.success ? configRes.data : null;
  const balance = totalBalance(wallet.success ? wallet.data : null);
  const unscratched = unscratchedRes.success ? unscratchedRes.data : [];
  const scratched = scratchedRes.success ? scratchedRes.data : [];
  const pool = (prizes.data ?? []).filter((p) => p.prize_type !== 'try_again');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: "'Inter', sans-serif" }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '4px' }}>
          <h1 style={h1}>🎟️ Scratch Cards</h1>
          <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
            Balance: <span style={{ fontWeight: 700, color: '#EFC84A' }}>{formatScores(balance)} Scores</span>
          </p>
        </div>
        <p style={muted}>Scratch the silver panel with your finger or mouse to find your prize</p>
      </div>

      {!config || !config.is_active ? (
        <div style={card}><p style={muted}>Your club has not switched scratch cards on yet.</p></div>
      ) : !adult ? (
        <AgeConfirm isJunior={!!member.data?.is_junior} />
      ) : (
        <div style={twoCol}>
          <div style={card}>
            {/* key: remount with a fresh queue whenever the set of free cards changes */}
            <ScratchCardPlayer
              key={unscratched.map((c) => c.id).join(',')}
              clubId={clubId}
              config={config}
              unscratched={unscratched}
              walletBalance={balance}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
            <div style={card}>
              <p style={cardTitle}>Your cards</p>
              <div style={{ ...row, borderBottom: 'none' }}><span style={{ flex: 1, fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Cards ready to open</span><strong style={{ color: '#EFC84A' }}>{unscratched.length}</strong></div>
              <p style={{ ...muted, marginTop: '8px' }}>Scratch cards are earned, never bought. Keep a seven-day check-in streak, or be awarded one by your club.</p>
              {config.milestone_scores ? (
                <p style={{ ...muted, marginTop: '8px' }}>You also get a card every {formatScores(config.milestone_scores)} Scores you earn.</p>
              ) : null}
            </div>

            {pool.length > 0 && (
              <div style={card}>
                <p style={cardTitle}>In the prize pool</p>
                {pool.map((p, i) => (
                  <div key={i} style={{ ...row, borderBottom: i === pool.length - 1 ? 'none' : row.borderBottom }}>
                    <span aria-hidden>{PRIZE_ICON[p.prize_type as string] ?? '🎉'}</span>
                    <span style={{ flex: 1, fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>{p.label as string}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {scratched.length > 0 && (
        <div style={card}>
          <p style={cardTitle}>Your prizes</p>
          {scratched.map((c, i) => {
            const prize = (c.prize_snapshot ?? {}) as { type?: string; label?: string };
            const waiting = c.fulfilment_status === 'pending' || c.fulfilment_status === 'failed';
            return (
              <div key={c.id} style={{ ...row, alignItems: 'flex-start', borderBottom: i === scratched.length - 1 ? 'none' : row.borderBottom }}>
                <span aria-hidden>{PRIZE_ICON[prize.type ?? ''] ?? '🎉'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#fff' }}>{prize.label ?? 'Prize'}</p>
                  <p style={{ ...muted, fontSize: '11px' }}>{c.scratched_at ? formatDate(c.scratched_at) : ''}</p>
                  {c.voucher_token && (
                    <p style={{ margin: '6px 0 0', fontFamily: 'monospace', fontSize: '13px', color: '#fff', wordBreak: 'break-all', userSelect: 'all' }}>{c.voucher_token}</p>
                  )}
                  {c.voucher_token && c.voucher_instructions && <p style={{ ...muted, fontSize: '11px', marginTop: '2px' }}>{c.voucher_instructions}</p>}
                </div>
                {waiting && (
                  <span style={{ fontSize: '11px', color: '#EFC84A', whiteSpace: 'nowrap' }}>
                    {prize.type === 'club_reward' ? 'Claim at the club' : 'Being issued'}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
