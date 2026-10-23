import { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { PAGE_SIZE, displayName, formatDate, formatDateTime, pageFromParam, profilesById } from '@/lib/platform-admin';
import { Avatar } from '@/components/ui/Avatar';
import { Cell, ErrorNote, PageHeader, Pagination, Table } from '@/components/platform-admin/ui';
import { promoteToAdmin } from './actions';

export const metadata: Metadata = { title: 'Users | Admin | ClubPulse' };

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const me = await requireAdmin();
  const page = pageFromParam((await searchParams).page);
  const service = createAdminClient();

  // auth.users holds email and sign-in times; profiles holds name and role
  const { data, error } = await service.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
  const users = data?.users ?? [];
  const total = data && 'total' in data ? data.total : users.length;

  const profiles = await profilesById(service, users.map((u) => u.id));

  return (
    <>
      <PageHeader title="Users" description="Everyone with a ClubPulse account." />
      {error && <ErrorNote message={`Couldn’t load users: ${error.message}`} />}

      <Table headers={['User', 'Email', 'Role', 'Joined', 'Last sign-in', '']}>
        {users.map((user) => {
          const name = displayName(profiles.get(user.id), user.email ?? 'Unknown user');
          const role = profiles.get(user.id)?.role ?? 'user';
          return (
            <tr key={user.id}>
              <Cell>
                <div className="flex items-center gap-3">
                  <Avatar name={name} size="sm" />
                  <span className="font-medium text-white">{name}</span>
                </div>
              </Cell>
              <Cell>{user.email ?? '—'}</Cell>
              <Cell>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  role === 'admin' ? 'bg-brand-primary text-white' : 'bg-neutral-800 text-neutral-300'
                }`}>{role}</span>
              </Cell>
              <Cell className="whitespace-nowrap">{formatDate(user.created_at)}</Cell>
              <Cell className="whitespace-nowrap">{formatDateTime(user.last_sign_in_at)}</Cell>
              <Cell className="text-right">
                {role !== 'admin' && user.id !== me.id && (
                  <form action={promoteToAdmin}>
                    <input type="hidden" name="userId" value={user.id} />
                    <button type="submit" className="whitespace-nowrap rounded-lg border border-neutral-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800">
                      Make admin
                    </button>
                  </form>
                )}
              </Cell>
            </tr>
          );
        })}
      </Table>
      <Pagination basePath="/admin/users" page={page} total={total} />
    </>
  );
}
