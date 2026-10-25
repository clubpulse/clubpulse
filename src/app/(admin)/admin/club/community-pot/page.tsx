import { requireClubAdminPage } from '@/lib/auth/admin-page';
import { getCommunityPot, getProposals } from '@/lib/actions/community-pot';
import { ProposalCard } from '@/components/pot/ProposalCard';
import { AdminPotPanel } from '@/components/pot/AdminPotPanel';

export default async function AdminCommunityPotPage() {
  const { clubId } = await requireClubAdminPage();

  const [potResult, proposalsResult] = await Promise.all([
    getCommunityPot(clubId),
    getProposals(clubId),
  ]);

  const pot = potResult.success ? potResult.data : { total_scores: 0, total_contributors: 0 };
  const proposals = proposalsResult.success ? proposalsResult.data : [];

  const activeProposals = proposals.filter((p) => p.status === 'voting');
  const completedProposals = proposals.filter((p) => p.status !== 'voting');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div>
        <h1 style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 800,
          fontSize: '24px',
          color: '#fff',
          margin: '0 0 4px',
          letterSpacing: '-0.3px',
        }}>
          🏺 Community Pot — Admin
        </h1>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
          Create proposals, manage voting, and fund approved initiatives.
        </p>
      </div>

      {/* Pot overview */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '12px',
      }}>
        <div style={{
          background: '#0f0f0f',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '14px',
          padding: '20px',
        }}>
          <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'rgba(255,255,255,0.3)', margin: '0 0 8px' }}>
            Scores in pot
          </p>
          <p style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 800,
            fontSize: '36px',
            color: '#fff',
            margin: 0,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {pot.total_scores.toLocaleString()}
          </p>
        </div>
        <div style={{
          background: '#0f0f0f',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '14px',
          padding: '20px',
        }}>
          <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'rgba(255,255,255,0.3)', margin: '0 0 8px' }}>
            Contributors
          </p>
          <p style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 800,
            fontSize: '36px',
            color: '#fff',
            margin: 0,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {pot.total_contributors.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Admin panel: create proposal + fund buttons */}
      <AdminPotPanel clubId={clubId} activeProposals={activeProposals} />

      {/* Completed proposals */}
      {completedProposals.length > 0 && (
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
            {completedProposals.map((p) => (
              <ProposalCard key={p.id} proposal={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
