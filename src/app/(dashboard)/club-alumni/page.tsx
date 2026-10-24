import { requireUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getClubLegacies } from '@/lib/actions/legacy';
import { AlumniWall } from '@/components/legacy/AlumniWall';

export default async function ClubAlumniPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: membership } = await supabase.from('club_members').select('club_id').eq('user_id', user.id).limit(1).maybeSingle();
  if (!membership) redirect('/dashboard');
  const clubId = membership.club_id as string;
  const result = await getClubLegacies(clubId);
  const legacies = result.success ? result.data : [];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, fontFamily: "'Inter', sans-serif" }}>
      <div>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 28, color: '#fff', margin: '0 0 6px', letterSpacing: '-0.5px' }}>
          🏆 Club Alumni &amp; Legends
        </h1>
        <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
          A permanent record of players who&apos;ve shaped this club. Their legacy lives on.
        </p>
      </div>
      {!result.success && <p style={{ fontSize: 13, color: '#f87171' }}>{result.error}</p>}
      <AlumniWall legacies={legacies} />
    </div>
  );
}
