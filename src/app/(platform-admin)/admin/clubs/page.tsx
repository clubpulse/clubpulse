import { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatDate } from '@/lib/platform-admin';
import { Cell, EmptyState, ErrorNote, PageHeader, Table } from '@/components/platform-admin/ui';
import { addClubAdmin, createClub, removeClubAdmin } from './actions';

export const metadata: Metadata = { title: 'Clubs | Admin | ShiftUp' };

const input = 'rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white placeholder:text-neutral-500';
const button = 'whitespace-nowrap rounded-lg border border-neutral-700 px-3 py-2 text-xs font-medium text-white hover:bg-neutral-800';

export default async function AdminClubsPage({ searchParams }: { searchParams: Promise<{ done?: string; error?: string }> }) {
  await requireAdmin();
  const { done, error: failed } = await searchParams;
  const service = createAdminClient();

  const [clubs, members] = await Promise.all([
    service.from('clubs').select('id, name, created_at').order('name'),
    service.from('club_members').select('club_id, user_id, role, is_active'),
  ]);

  const rows = members.data ?? [];
  const adminIds = [...new Set(rows.filter((m) => m.role === 'club_admin' && m.is_active !== false).map((m) => m.user_id as string))];
  // Emails live with the sign-in system, so look each admin up
  const emails = new Map<string, string>();
  await Promise.all(adminIds.map(async (id) => {
    const { data } = await service.auth.admin.getUserById(id);
    emails.set(id, data.user?.email ?? 'Unknown');
  }));

  return (
    <>
      <PageHeader title="Clubs" description="Add a club, and choose who runs it. A club admin sees the club tools; they see the player side only if they also play." />
      {done && <p role="status" className="mb-4 rounded-lg border border-emerald-700/50 bg-emerald-900/20 px-4 py-3 text-sm text-emerald-300">{done}</p>}
      {failed && <ErrorNote message={failed} />}
      {(clubs.error || members.error) && <ErrorNote message={`Couldn't load clubs: ${(clubs.error ?? members.error)!.message}`} />}

      <form action={createClub} className="mb-6 flex flex-wrap items-center gap-3">
        <input name="name" required minLength={2} maxLength={80} placeholder="New club name" aria-label="New club name" className={`${input} w-72`} />
        <button type="submit" className={button}>Add club</button>
      </form>

      {(clubs.data ?? []).length === 0 ? (
        <EmptyState icon="🏟️" title="No clubs yet">Add the first one above.</EmptyState>
      ) : (
        <Table headers={['Club', 'Members', 'Admins', 'Add an admin']}>
          {(clubs.data ?? []).map((club) => {
            const mine = rows.filter((m) => m.club_id === club.id);
            const active = mine.filter((m) => m.is_active !== false).length;
            const admins = mine.filter((m) => m.role === 'club_admin' && m.is_active !== false);
            return (
              <tr key={club.id as string}>
                <Cell>
                  <span className="font-medium text-white">{club.name as string}</span>
                  <span className="block text-xs text-neutral-500">Added {formatDate(club.created_at as string)}</span>
                </Cell>
                <Cell>{active}</Cell>
                <Cell>
                  {admins.length === 0 ? (
                    <span className="text-xs text-amber-400">No admin yet</span>
                  ) : (
                    <ul className="space-y-1.5">
                      {admins.map((a) => (
                        <li key={a.user_id as string} className="flex items-center gap-2">
                          <span className="text-neutral-200">{emails.get(a.user_id as string) ?? '…'}</span>
                          <form action={removeClubAdmin}>
                            <input type="hidden" name="clubId" value={club.id as string} />
                            <input type="hidden" name="userId" value={a.user_id as string} />
                            <button type="submit" className="text-xs text-red-400 hover:text-red-300">Remove</button>
                          </form>
                        </li>
                      ))}
                    </ul>
                  )}
                </Cell>
                <Cell>
                  <form action={addClubAdmin} className="flex items-center gap-2">
                    <input type="hidden" name="clubId" value={club.id as string} />
                    <input name="email" type="email" required placeholder="Email they signed up with" aria-label={`Admin email for ${club.name as string}`} className={`${input} w-60`} />
                    <button type="submit" className={button}>Make admin</button>
                  </form>
                </Cell>
              </tr>
            );
          })}
        </Table>
      )}
    </>
  );
}
