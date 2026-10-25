import { requireUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { getClubCharities, getMyDonations, getCharitySettings } from '@/lib/actions/charity';
import { CharityCard } from '@/components/charity/CharityCard';
import { DonationHistory } from '@/components/charity/DonationHistory';

async function getClubId(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.from('club_members').select('club_id').eq('user_id', userId).limit(1).maybeSingle();
  return data?.club_id ?? null;
}

export default async function CharityPage() {
  const user = await requireUser();
  const clubId = await getClubId(user.id);
  if (!clubId) return <p style={{ fontSize: '14px', color: '#f87171', fontFamily: "'Inter', sans-serif" }}>You need to be a club member to view charity donations.</p>;

  const [charitiesResult, donationsResult, settingsResult] = await Promise.all([
    getClubCharities(clubId),
    getMyDonations(clubId),
    getCharitySettings(clubId),
  ]);

  const charities = charitiesResult.success ? charitiesResult.data : [];
  const donations = donationsResult.success ? donationsResult.data : [];
  const settings = settingsResult.success ? settingsResult.data : { scores_per_pound: 1000, is_enabled: true };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', fontFamily: "'Inter', sans-serif" }}>
      <div>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '24px', color: '#fff', margin: '0 0 4px', letterSpacing: '-0.3px' }}>❤️ Club Charity</h1>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>Donate your Scores to causes your club supports · {settings.scores_per_pound.toLocaleString()} Scores = £1</p>
      </div>
      <section>
        <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: '0 0 14px' }}>Supported Charities</h2>
        {charities.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' }}>Your club hasn&apos;t added any charities yet. Ask your admin to configure them.</p>
        ) : (
          <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            {charities.map(charity => <CharityCard key={charity.id} charity={charity} settings={settings} />)}
          </div>
        )}
      </section>
      <section>
        <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: '0 0 14px' }}>My Donations</h2>
        <DonationHistory donations={donations} scoresPerPound={settings.scores_per_pound} />
      </section>
    </div>
  );
}
