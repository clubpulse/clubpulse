import { requireClubAdminPage } from '@/lib/auth/admin-page';
import { getSafeguardingDashboard, listChildren, listIncidents, listDbsChecks } from '@/lib/admin/parent-service';
import ChildrenList from '@/components/club/ChildrenList';
import IncidentList from '@/components/club/IncidentList';
import DbsCheckList from '@/components/club/DbsCheckList';
import DobConfirmList from '@/components/club/DobConfirmList';
import { DobCorrectionForm } from '@/components/club/DobCorrectionForm';
import { ageVerificationEnabled } from '@/lib/age-verification/flag';
import { listOpenSquadFlags, type OpenFlag } from '@/lib/age-verification/flags';
import { SquadFlagList } from '@/components/club/SquadFlagList';
import { listDobToConfirm } from '@/lib/admin/dob-confirmation';
import { h1, card, muted } from '@/components/play/ui';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Safeguarding' };

export default async function SafeguardingPage() {
  const { user, clubId, ctx } = await requireClubAdminPage();

  const [dashboard, children, incidents, dbsChecks, dobs, flags] = await Promise.all([
    getSafeguardingDashboard(clubId),
    listChildren(clubId),
    listIncidents(clubId),
    listDbsChecks(clubId),
    listDobToConfirm(ctx.adminClubIds, 200, user.id),
    ageVerificationEnabled() ? listOpenSquadFlags(user.id, clubId) : Promise.resolve({ items: [] as OpenFlag[], error: undefined as string | undefined }),
  ]);

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={h1}>Safeguarding & Junior Welfare</h1>

      {/* Dashboard tiles */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
        gap: '0.75rem',
        marginBottom: '1.5rem',
      }}>
        <Tile label="Children Registered" value={dashboard.children_registered} />
        <Tile label="Consent Coverage" value={`${dashboard.consent_coverage}%`}
          color={dashboard.consent_coverage < 80 ? '#ff5252' : '#00C853'} />
        <Tile label="Open Incidents" value={dashboard.open_incidents}
          color={dashboard.open_incidents > 0 ? '#EFC84A' : undefined} />
        <Tile label="Critical" value={dashboard.critical_incidents}
          color={dashboard.critical_incidents > 0 ? '#ff5252' : undefined} />
        <Tile label="Pending Verifications" value={dashboard.pending_verifications}
          color={dashboard.pending_verifications > 0 ? '#EFC84A' : undefined} />
        <Tile label="DBS Expiring (30d)" value={dashboard.expiring_dbs}
          color={dashboard.expiring_dbs > 0 ? '#ff5252' : undefined} />
      </div>

      {/* Dates of birth waiting for a club admin to confirm them */}
      <div style={{ marginBottom: '2rem' }}>
        <DobConfirmList items={dobs.items} confirmed={dobs.confirmed} error={dobs.error} askMethod={ageVerificationEnabled()} />
        {ageVerificationEnabled() && <div style={{ marginTop: '1.5rem' }}><DobCorrectionForm clubId={clubId} /></div>}
        {ageVerificationEnabled() && <div style={{ marginTop: '1.5rem' }}><SquadFlagList clubId={clubId} items={flags.items} error={flags.error} /></div>}
      </div>

      {/* Children registry */}
      <ChildrenList initialChildren={children} />

      {/* Safeguarding incidents */}
      <div style={{ marginTop: '2rem' }}>
        <IncidentList initialIncidents={incidents} />
      </div>

      {/* DBS checks */}
      <div style={{ marginTop: '2rem' }}>
        <DbsCheckList checks={dbsChecks} />
      </div>
    </div>
  );
}

function Tile({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={card}>
      <div style={{ ...muted, fontSize: '0.75rem', marginBottom: '0.25rem' }}>{label}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: color ?? '#fff' }}>{value}</div>
    </div>
  );
}
