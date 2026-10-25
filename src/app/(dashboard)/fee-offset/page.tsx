import { requireUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { getMyFeeOffsetStatus } from '@/lib/actions/fee-offsets';
import { FeeOffsetCalculator } from '@/components/fee-offset/FeeOffsetCalculator';

function formatPounds(pence: number) {
  return `£${(pence / 100).toFixed(2)}`;
}

function statusBadge(status: string) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    pending: { bg: 'rgba(251,191,36,0.12)', color: '#fbbf24', label: 'Pending approval' },
    approved: { bg: 'rgba(34,197,94,0.12)', color: '#4ade80', label: 'Approved' },
    rejected: { bg: 'rgba(248,113,113,0.12)', color: '#f87171', label: 'Rejected' },
  };
  const s = map[status] ?? map.pending;
  return (
    <span style={{
      display: 'inline-block',
      background: s.bg,
      color: s.color,
      borderRadius: '6px',
      padding: '2px 10px',
      fontSize: '12px',
      fontWeight: 600,
    }}>
      {s.label}
    </span>
  );
}

export default async function FeeOffsetPage() {
  const user = await requireUser();
  const supabase = await createClient();

  // Get the user's first club membership
  const { data: membership } = await supabase
    .from('club_members')
    .select('club_id, clubs(name)')
    .eq('user_id', user.id)
    .limit(1)
    .single();

  if (!membership) {
    return (
      <div style={{ fontFamily: "'Inter', sans-serif", color: 'rgba(255,255,255,0.45)', fontSize: '14px' }}>
        You need to be a club member to use fee offsets.
      </div>
    );
  }

  const clubId = membership.club_id;
  const clubName = (membership.clubs as { name: string } | null)?.name ?? 'Your club';

  const statusRes = await getMyFeeOffsetStatus(clubId);

  const card = (children: React.ReactNode, style?: React.CSSProperties) => (
    <div style={{
      background: '#0f0f0f',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '16px',
      padding: '24px',
      ...style,
    }}>
      {children}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '24px', color: '#fff', margin: '0 0 4px', letterSpacing: '-0.3px' }}>
          💰 Club Fee Offset
        </h1>
        <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>
          Use your Scores to reduce your membership fee · {clubName}
        </p>
      </div>

      {!statusRes.success ? (
        card(
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <p style={{ fontSize: '32px', margin: '0 0 12px' }}>🔒</p>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)', margin: 0 }}>
              Fee offset hasn&apos;t been set up for your club yet. Ask your admin to configure it.
            </p>
          </div>
        )
      ) : (
        <>
          {/* Summary tiles */}
          {(() => {
            const { settings, myBalance, maxScoresAllowed, maxPoundsOffset, myApplication } = statusRes.data;
            const annualFee = formatPounds(settings.annual_fee_pence);
            const season = new Date().getFullYear();

            return (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  {[
                    { label: 'Annual fee', value: annualFee, icon: '🏏' },
                    { label: 'Your balance', value: `${myBalance.toLocaleString()} Scores`, icon: '💎' },
                    { label: 'Max offset', value: `${maxPoundsOffset.toFixed(2) === '0.00' ? formatPounds(0) : `£${maxPoundsOffset.toFixed(2)}`} (${settings.max_offset_percent}%)`, icon: '📉' },
                  ].map((tile) => (
                    <div key={tile.label} style={{
                      background: '#0f0f0f',
                      border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: '14px',
                      padding: '16px',
                    }}>
                      <p style={{ margin: '0 0 4px', fontSize: '18px' }}>{tile.icon}</p>
                      <p style={{ margin: '0 0 2px', fontSize: '18px', fontWeight: 700, color: '#fff', fontFamily: "'Syne', sans-serif" }}>
                        {tile.value}
                      </p>
                      <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {tile.label}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Rate info */}
                {card(
                  <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.55)' }}>
                    Conversion rate: <strong style={{ color: '#c9a54c' }}>{settings.scores_per_pound.toLocaleString()} Scores = £1.00 off</strong>
                    {' '}— max offset is {settings.max_offset_percent}% of your {annualFee} fee
                    {' '}({formatPounds(Math.floor(settings.annual_fee_pence * settings.max_offset_percent / 100))}).
                    You can apply up to <strong style={{ color: '#fff' }}>{maxScoresAllowed.toLocaleString()} Scores</strong>.
                  </p>
                )}

                {/* Already applied */}
                {myApplication ? (
                  card(
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '16px', color: '#fff', margin: 0 }}>
                          {season} Application
                        </h2>
                        {statusBadge(myApplication.status)}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <p style={{ margin: '0 0 2px', fontSize: '11px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Scores spent</p>
                          <p style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#c9a54c', fontFamily: "'Syne', sans-serif" }}>
                            {myApplication.scores_applied.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p style={{ margin: '0 0 2px', fontSize: '11px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fee discount</p>
                          <p style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#4ade80', fontFamily: "'Syne', sans-serif" }}>
                            {formatPounds(myApplication.pence_offset)}
                          </p>
                        </div>
                      </div>
                      {myApplication.admin_notes && (
                        <p style={{ margin: '12px 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.45)', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
                          Admin note: {myApplication.admin_notes}
                        </p>
                      )}
                    </div>
                  )
                ) : settings.is_active ? (
                  card(
                    <div>
                      <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '16px', color: '#fff', margin: '0 0 20px' }}>
                        Apply offset for {season}
                      </h2>
                      <FeeOffsetCalculator summary={statusRes.data} clubId={clubId} />
                    </div>
                  )
                ) : (
                  card(
                    <p style={{ margin: 0, fontSize: '14px', color: 'rgba(255,255,255,0.45)' }}>
                      Fee offset is currently paused by your club admin.
                    </p>
                  )
                )}
              </>
            );
          })()}
        </>
      )}
    </div>
  );
}
