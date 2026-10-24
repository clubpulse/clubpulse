import { requireUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { getSponsorshipPackages, getJuniorSlots, getMySponsorships } from '@/lib/actions/sponsor';
import { AGE_GROUP_LABELS } from '@/lib/types/sponsor';
import { SponsorPackagesClient } from '@/components/sponsor/SponsorPackagesClient';

async function getClubId(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('club_members')
    .select('club_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();
  return data?.club_id ?? null;
}

async function getWalletBalance(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('creds_wallet')
    .select('flexi_balance')
    .eq('user_id', userId)
    .maybeSingle();
  return data?.flexi_balance ?? 0;
}

export default async function SponsorAKidPage() {
  const user = await requireUser();
  const clubId = await getClubId(user.id);

  if (!clubId) {
    return (
      <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', padding: '40px 0' }}>
        You&apos;re not linked to a club yet. Ask your club admin to add you.
      </p>
    );
  }

  const [packagesResult, slotsResult, mySponsorshipsResult, balance] = await Promise.all([
    getSponsorshipPackages(clubId),
    getJuniorSlots(clubId),
    getMySponsorships(clubId),
    getWalletBalance(user.id),
  ]);

  const packages = packagesResult.success ? packagesResult.data : [];
  const slots = slotsResult.success ? slotsResult.data : [];
  const mySponsorships = mySponsorshipsResult.success ? mySponsorshipsResult.data : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div>
        <h1 style={{
          fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '26px',
          color: '#fff', margin: '0 0 8px', letterSpacing: '-0.3px',
        }}>
          💝 Sponsor a Kid
        </h1>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)', margin: '0 0 4px', lineHeight: 1.6 }}>
          Your Scores help young players access cricket — covering membership, kit, and coaching.
          Every contribution is fulfilled by your club admin.
        </p>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>
          Your balance: <strong style={{ color: '#fff' }}>{balance.toLocaleString()} Scores</strong>
        </p>
      </div>

      {/* Sponsorship packages + my sponsorships (client, handles post-sponsor refresh) */}
      <section>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '17px', color: '#fff', margin: '0 0 14px' }}>
          Available packages
        </h2>
        <SponsorPackagesClient
          initialPackages={packages}
          initialSponsorships={mySponsorships}
          juniorSlots={slots}
          walletBalance={balance}
          clubId={clubId}
        />
      </section>

      {/* Anonymous junior slots — static info panel */}
      {slots.length > 0 && (
        <section>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '17px', color: '#fff', margin: '0 0 4px' }}>
            Young players awaiting support
          </h2>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: '0 0 14px' }}>
            Labels only — no personal details are shared to protect privacy.
          </p>
          <div style={{ display: 'grid', gap: '10px', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
            {slots.map(slot => (
              <div
                key={slot.id}
                style={{
                  background: '#0f0f0f', border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '12px', padding: '14px',
                }}
              >
                <p style={{ fontWeight: 600, fontSize: '14px', color: '#fff', margin: '0 0 4px' }}>
                  {slot.anonymous_label}
                </p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: '0 0 6px' }}>
                  {AGE_GROUP_LABELS[slot.age_group]}
                </p>
                {slot.about && (
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: 0, fontStyle: 'italic' }}>
                    {slot.about}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
