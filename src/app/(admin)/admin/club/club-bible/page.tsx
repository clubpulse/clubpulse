import { requireClubAdminPage } from '@/lib/auth/admin-page';
import { createClient } from '@/lib/supabase/server';
import { getClubBible } from '@/lib/actions/club-bible';
import { AddMilestoneForm } from '@/components/club-bible/AddMilestoneForm';
import { GenerateBibleButton } from '@/components/club-bible/GenerateBibleButton';
import { DeleteMilestoneButton } from '@/components/club-bible/DeleteMilestoneButton';
import { MILESTONE_CATEGORY_CONFIG } from '@/lib/types/club-bible';

async function getClubName(clubId: string): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase.from('clubs').select('name').eq('id', clubId).single();
  return data?.name ?? 'Your Club';
}

export default async function AdminClubBiblePage() {
  const { clubId } = await requireClubAdminPage();
  const [clubName, result] = await Promise.all([
    getClubName(clubId),
    getClubBible(clubId),
  ]);

  if (!result.success) {
    return (
      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '13px', color: '#f87171' }}>{result.error}</p>
    );
  }

  const { bible, milestones } = result.data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '40px', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 800,
            fontSize: '24px',
            color: '#fff',
            margin: '0 0 4px',
            letterSpacing: '-0.3px',
          }}>
            📖 Club Bible
          </h1>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
            {clubName} · AI-generated club history
            {bible?.last_generated_at && (
              <> · Last generated {new Date(bible.last_generated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</>
            )}
          </p>
        </div>
        <GenerateBibleButton clubId={clubId} generationCount={bible?.generation_count ?? 0} />
      </div>

      {/* Current narrative preview */}
      {bible?.generated_narrative && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '15px', color: '#fff', margin: 0 }}>
            Current Narrative
          </h2>
          <div style={{
            background: '#0f0f0f',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '14px',
            padding: '20px 22px',
            fontSize: '13px',
            lineHeight: '1.7',
            color: 'rgba(255,255,255,0.65)',
            whiteSpace: 'pre-wrap',
          }}>
            {bible.generated_narrative}
          </div>
        </section>
      )}

      {/* Add Milestone */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '15px', color: '#fff', margin: 0 }}>
          Add Milestone
        </h2>
        <div style={{
          background: '#0f0f0f',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '14px',
          padding: '20px',
        }}>
          <AddMilestoneForm clubId={clubId} />
        </div>
      </section>

      {/* Milestone list */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '15px', color: '#fff', margin: 0 }}>
            All Milestones
          </h2>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>{milestones.length} total</span>
        </div>

        {milestones.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>
            No milestones yet. Add the first one above.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[...milestones].sort((a, b) => b.year - a.year).map((m) => {
              const cfg = MILESTONE_CATEGORY_CONFIG[m.category];
              return (
                <div key={m.id} style={{
                  background: '#0f0f0f',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                }}>
                  <span style={{ fontSize: '18px', flexShrink: 0, marginTop: '1px' }}>{cfg.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                      <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>{m.year}</span>
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: '20px' }}>
                        {cfg.label}
                      </span>
                      {m.is_featured && <span style={{ fontSize: '10px', color: '#e2725b', fontWeight: 600 }}>Featured</span>}
                    </div>
                    <p style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: 500, color: '#fff' }}>{m.title}</p>
                    <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{m.description}</p>
                  </div>
                  <DeleteMilestoneButton milestoneId={m.id} />
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
