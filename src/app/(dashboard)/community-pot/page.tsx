import { requireUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { getCommunityPot, getProposals, getMyContributions } from '@/lib/actions/community-pot';
import { PotContributeForm } from '@/components/pot/PotContributeForm';
import { ProposalCard } from '@/components/pot/ProposalCard';
import { Card } from '@/components/ui/Card';

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

export default async function CommunityPotPage() {
  const user = await requireUser();
  const clubId = await getClubId(user.id);

  if (!clubId) {
    return (
      <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', padding: '40px 0' }}>
        You&apos;re not linked to a club yet. Ask your club admin to add you.
      </p>
    );
  }

  const [potResult, proposalsResult, contributionsResult] = await Promise.all([
    getCommunityPot(clubId),
    getProposals(clubId),
    getMyContributions(clubId),
  ]);

  const pot = potResult.success ? potResult.data : { total_scores: 0, total_contributors: 0 };
  const proposals = proposalsResult.success ? proposalsResult.data : [];
  const contributions = contributionsResult.success ? contributionsResult.data : [];

  const activeProposals = proposals.filter((p) => p.status === 'voting');
  const pastProposals = proposals.filter((p) => p.status !== 'voting');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div>
        <h1 style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 800,
          fontSize: '26px',
          color: '#fff',
          margin: '0 0 4px',
          letterSpacing: '-0.3px',
        }}>
          🏺 Community Pot
        </h1>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
          Pool Scores together to fund club initiatives — voted on by members.
        </p>
      </div>

      {/* Pot balance */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(155,28,28,0.15) 0%, rgba(255,255,255,0.03) 100%)',
        border: '1px solid rgba(155,28,28,0.25)',
        borderRadius: '18px',
        padding: '28px',
        textAlign: 'center',
      }}>
        <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(255,255,255,0.35)', margin: '0 0 10px' }}>
          Scores in the pot
        </p>
        <p style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 800,
          fontSize: '52px',
          color: '#fff',
          margin: '0 0 6px',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1,
        }}>
          {pot.total_scores.toLocaleString()}
        </p>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
          {pot.total_contributors.toLocaleString()} contributor{pot.total_contributors !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Contribute form */}
      <Card title="Contribute to the Pot" description="Voluntarily add Flexi Scores to the club pool">
        <PotContributeForm clubId={clubId} />
      </Card>

      {/* Active proposals */}
      <section>
        <h2 style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 700,
          fontSize: '17px',
          color: '#fff',
          margin: '0 0 14px',
        }}>
          Active votes
        </h2>
        {activeProposals.length === 0 ? (
          <div style={{
            background: '#0f0f0f',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '14px',
            padding: '32px',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>
              No proposals open for voting right now.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {activeProposals.map((p) => (
              <ProposalCard key={p.id} proposal={p} />
            ))}
          </div>
        )}
      </section>

      {/* My contributions */}
      {contributions.length > 0 && (
        <section>
          <h2 style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 700,
            fontSize: '17px',
            color: '#fff',
            margin: '0 0 14px',
          }}>
            My contributions
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {contributions.map((c) => (
              <div
                key={c.id}
                style={{
                  background: '#0f0f0f',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <p style={{ fontWeight: 500, fontSize: '14px', color: '#fff', margin: '0 0 2px' }}>
                    Contribution to Community Pot
                  </p>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>
                    {new Date(c.contributed_at).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </p>
                </div>
                <span style={{
                  fontFamily: "'Syne', sans-serif",
                  fontWeight: 700,
                  fontSize: '15px',
                  color: '#86efac',
                }}>
                  +{c.scores_contributed.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Past proposals */}
      {pastProposals.length > 0 && (
        <section>
          <h2 style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 700,
            fontSize: '17px',
            color: '#fff',
            margin: '0 0 14px',
          }}>
            Past proposals
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {pastProposals.map((p) => (
              <ProposalCard key={p.id} proposal={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
