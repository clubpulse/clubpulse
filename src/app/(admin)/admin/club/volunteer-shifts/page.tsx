import { requireClubAdminPage } from '@/lib/auth/admin-page';
import { getVolunteerAnalytics, listShifts, listVolunteers } from '@/lib/admin/volunteer-service';
import ShiftScheduler from '@/components/club/ShiftScheduler';
import VolunteerRoster from '@/components/club/VolunteerRoster';
import { h1, card, muted } from '@/components/play/ui';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Volunteer Shifts · ClubPulse' };

export default async function VolunteerShiftsPage() {
  const { clubId } = await requireClubAdminPage();

  const [analytics, shifts, volunteers] = await Promise.all([
    getVolunteerAnalytics(clubId),
    listShifts(clubId),
    listVolunteers(clubId),
  ]);

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={h1}>Volunteer Management</h1>

      {/* Analytics tiles */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
        gap: '0.75rem',
        marginBottom: '1.5rem',
      }}>
        <Tile label="Volunteers" value={analytics.total_volunteers} />
        <Tile label="Active This Month" value={analytics.active_this_month} />
        <Tile label="Hours (Month)" value={`${analytics.total_hours_this_month}h`} />
        <Tile label="Scores Awarded" value={analytics.total_scores_awarded} color="#EFC84A" />
        <Tile label="Upcoming Shifts" value={analytics.upcoming_shifts} />
        <Tile label="Unfilled Spots" value={analytics.unfilled_spots} color={analytics.unfilled_spots > 0 ? '#ff5252' : undefined} />
        <Tile label="No-Show Rate" value={`${analytics.no_show_rate}%`} color={analytics.no_show_rate > 15 ? '#ff5252' : undefined} />
      </div>

      {/* Shift scheduler */}
      <ShiftScheduler initialShifts={shifts} />

      {/* Volunteer roster */}
      <div style={{ marginTop: '2rem' }}>
        <VolunteerRoster volunteers={volunteers} />
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
