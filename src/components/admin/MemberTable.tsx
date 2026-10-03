import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils/format';
import type { ClubMemberWithProfile } from '@/lib/types/club';

export function MemberTable({ members }: { members: ClubMemberWithProfile[] }) {
  if (members.length === 0) return <p className="text-sm text-neutral-500">No members yet.</p>;

  return (
    <div className="overflow-x-auto rounded-2xl border border-neutral-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-neutral-950 text-xs uppercase text-neutral-500">
          <tr>
            <th className="px-4 py-3 font-medium">Member</th>
            <th className="px-4 py-3 font-medium">Role</th>
            <th className="px-4 py-3 font-medium">Joined</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-900">
          {members.map((m) => (
            <tr key={m.id} className="hover:bg-neutral-950">
              <td className="px-4 py-3">
                <Link href={`/admin/club/members/${m.id}`} className="font-medium text-white hover:text-brand-gold">
                  {m.full_name ?? m.display_name ?? 'Unnamed member'}
                </Link>
              </td>
              <td className="px-4 py-3"><Badge tone={m.role === 'admin' ? 'gold' : 'neutral'}>{m.role}</Badge></td>
              <td className="px-4 py-3 text-neutral-400">{formatDate(m.joined_at)}</td>
              <td className="px-4 py-3">{m.is_active ? <Badge tone="green">Active</Badge> : <Badge tone="red">Inactive</Badge>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
