import { requireUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { getClubBible } from '@/lib/actions/club-bible';
import { MilestoneTimeline } from '@/components/club-bible/MilestoneTimeline';

async function getUserClub(userId: string): Promise<{ clubId: string; clubName: string } | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('club_members')
    .select('club_id, clubs(name)')
    .eq('user_id', userId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const clubs = data.clubs as unknown as { name: string } | null;
  return { clubId: data.club_id, clubName: clubs?.name ?? 'Your Club' };
}

export default async function ClubBiblePage() {
  const user = await requireUser();
  const club = await getUserClub(user.id);

  if (!club) {
    return (
      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '14px', color: 'rgba(255,255,255,0.4)', padding: '32px 0' }}>
        You are not a member of any club yet.
      </p>
    );
  }

  const result = await getClubBible(club.clubId);
  if (!result.success) {
    return (
      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '14px', color: '#f87171', padding: '32px 0' }}>
        {result.error}
      </p>
    );
  }

  const { bible, milestones } = result.data;
  const featured = milestones.filter((m) => m.is_featured);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '40px', fontFamily: "'Inter', sans-serif", maxWidth: '720px' }}>
      {/* Header */}
      <div>
        <h1 style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 800,
          fontSize: '28px',
          color: '#fff',
          margin: '0 0 4px',
          letterSpacing: '-0.5px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <span aria-hidden>📖</span> The Club Bible
        </h1>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
          {club.clubName} · The official club history
        </p>
      </div>

      {/* AI-generated narrative — printed document style */}
      {bible?.generated_narrative ? (
        <div style={{
          background: '#f9f6f0',
          borderRadius: '16px',
          padding: '36px 40px',
          boxShadow: '0 4px 32px rgba(0,0,0,0.5)',
          position: 'relative',
        }}>
          {/* Decorative top border */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: '40px',
            right: '40px',
            height: '3px',
            background: 'linear-gradient(90deg, #9b1c1c, #c0392b, #9b1c1c)',
            borderRadius: '0 0 3px 3px',
          }} />

          <p style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 800,
            fontSize: '13px',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            color: '#9b1c1c',
            margin: '0 0 20px',
            textAlign: 'center',
          }}>
            {club.clubName}
          </p>

          <div style={{
            fontFamily: "'Georgia', 'Times New Roman', serif",
            fontSize: '15px',
            lineHeight: '1.8',
            color: '#1a1a1a',
            textAlign: 'justify',
            whiteSpace: 'pre-wrap',
          }}>
            {bible.generated_narrative}
          </div>

          {bible.last_generated_at && (
            <p style={{
              marginTop: '24px',
              fontSize: '11px',
              color: '#999',
              textAlign: 'right',
              fontFamily: "'Inter', sans-serif",
              fontStyle: 'italic',
            }}>
              Last updated {new Date(bible.last_generated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
        </div>
      ) : (
        <div style={{
          background: 'rgba(155,28,28,0.06)',
          border: '1px dashed rgba(155,28,28,0.3)',
          borderRadius: '14px',
          padding: '32px',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '28px', margin: '0 0 8px' }}>📖</p>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', margin: '0 0 4px' }}>
            Your Club Bible hasn&apos;t been written yet.
          </p>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)', margin: 0 }}>
            Ask your club admin to add milestones and generate the narrative.
          </p>
        </div>
      )}

      {/* Featured milestones pinned at top */}
      {featured.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h2 style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 700,
            fontSize: '16px',
            color: '#fff',
            margin: 0,
          }}>
            Featured Milestones
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {featured.map((m) => (
              <div key={m.id} style={{
                background: 'rgba(155,28,28,0.08)',
                border: '1px solid rgba(155,28,28,0.25)',
                borderRadius: '12px',
                padding: '14px 16px',
              }}>
                <p style={{ margin: '0 0 4px', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                  {m.year}
                </p>
                <p style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 600, color: '#fff' }}>{m.title}</p>
                <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{m.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Full timeline */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h2 style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 700,
          fontSize: '16px',
          color: '#fff',
          margin: 0,
        }}>
          Club Timeline
        </h2>
        <MilestoneTimeline milestones={milestones} />
      </section>
    </div>
  );
}
