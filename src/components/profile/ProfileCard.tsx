import Link from 'next/link';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { formatCreds } from '@/lib/utils/format';
import type { CredsWallet } from '@/lib/types/creds';
import type { UserProfile } from '@/lib/types/user';

export function ProfileCard({
  profile,
  wallet,
  roles,
}: {
  profile: UserProfile;
  wallet: CredsWallet | null;
  roles: string[];
}) {
  return (
    <Card>
      <div className="flex items-center gap-4">
        <Avatar name={profile.full_name} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold text-white">{profile.full_name}</h1>
          <p className="truncate text-sm text-neutral-400">{profile.email}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {roles.map((role) => (
              <Badge key={role} tone="gold">{role.replace(/_/g, ' ')}</Badge>
            ))}
            {!profile.is_active && <Badge tone="red">inactive</Badge>}
          </div>
        </div>
        <Link
          href="/profile/edit"
          className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Edit
        </Link>
      </div>

      <dl className="mt-6 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-xl bg-neutral-900/60 p-3">
          <dt className="text-xs text-neutral-500">Lifetime earned</dt>
          <dd className="mt-1 text-lg font-semibold tabular-nums text-white">{formatCreds(wallet?.lifetime_earned ?? 0)}</dd>
        </div>
        <div className="rounded-xl bg-neutral-900/60 p-3">
          <dt className="text-xs text-neutral-500">Sport</dt>
          <dd className="mt-1 text-lg font-semibold capitalize text-white">{profile.primary_sport}</dd>
        </div>
        <div className="rounded-xl bg-neutral-900/60 p-3">
          <dt className="text-xs text-neutral-500">Display name</dt>
          <dd className="mt-1 truncate text-lg font-semibold text-white">{profile.display_name}</dd>
        </div>
      </dl>
    </Card>
  );
}
