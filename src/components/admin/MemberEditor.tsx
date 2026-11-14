'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import type { ClubMemberRole, ClubMemberWithProfile } from '@/lib/types/club';

const ROLES: ClubMemberRole[] = ['player', 'coach', 'volunteer', 'parent', 'club_admin'];

export function MemberEditor({ member }: { member: ClubMemberWithProfile }) {
  const router = useRouter();
  const [role, setRole] = useState<ClubMemberRole>(member.role);
  const [active, setActive] = useState(member.is_active);
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/members/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, is_active: active }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.error ?? 'Could not update member');
        return;
      }
      toast.success('Member updated');
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="member-role" className="mb-1.5 block text-sm font-medium text-neutral-300">Club role</label>
        <select
          id="member-role"
          value={role}
          onChange={(e) => setRole(e.target.value as ClubMemberRole)}
          className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-white"
        >
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm text-neutral-300">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 accent-red-800" />
        Active member
      </label>
      <Button onClick={save} loading={loading} disabled={role === member.role && active === member.is_active}>
        Save changes
      </Button>
    </div>
  );
}
