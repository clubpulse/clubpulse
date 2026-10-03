import { Badge } from '@/components/ui/Badge';
import { formatScores, formatDate } from '@/lib/utils/format';
import type { VolunteerSessionWithName } from '@/lib/types/volunteer';

const yesNo = (value: boolean) => (value ? <Badge tone="green">Yes</Badge> : <Badge>No</Badge>);

export function VolunteerSessionsTable({ sessions }: { sessions: VolunteerSessionWithName[] }) {
  if (sessions.length === 0) return <p className="text-sm text-neutral-500">No volunteer sessions yet.</p>;

  return (
    <div className="overflow-x-auto rounded-2xl border border-neutral-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-neutral-950 text-xs uppercase text-neutral-500">
          <tr>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Volunteer</th>
            <th className="px-4 py-3 font-medium">Role</th>
            <th className="px-4 py-3 font-medium">GPS</th>
            <th className="px-4 py-3 font-medium">Club</th>
            <th className="px-4 py-3 text-right font-medium">Scores</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-900">
          {sessions.map((s) => (
            <tr key={s.id}>
              <td className="whitespace-nowrap px-4 py-3 text-neutral-400">{formatDate(s.session_date)}</td>
              <td className="px-4 py-3 text-white">{s.volunteer_name ?? 'Volunteer'}</td>
              <td className="px-4 py-3 capitalize text-neutral-300">{s.role.replace(/_/g, ' ')}</td>
              <td className="px-4 py-3">{yesNo(s.gps_confirmed)}</td>
              <td className="px-4 py-3">{yesNo(s.club_confirmed)}</td>
              <td className="px-4 py-3 text-right tabular-nums text-white">{formatScores(s.creds_awarded)}</td>
              <td className="px-4 py-3"><Badge tone={s.status === 'approved' ? 'green' : s.status === 'rejected' ? 'red' : 'neutral'}>{s.status}</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
