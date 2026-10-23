import { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatDate, isMissingTable } from '@/lib/platform-admin';
import { Cell, ErrorNote, PageHeader, Table } from '@/components/platform-admin/ui';

export const metadata: Metadata = { title: 'Challenges | Admin | ClubPulse' };

const PLANNED = [
  'Weekly club and national challenges, e.g. “fastest 10 deliveries” or “most steps this week”',
  'Leaderboards per club, age group and sport',
  'Bonus points and badges for winners, paid from the rewards wallet',
  'Entry verified through Analyse sessions and highlight reels',
];

// No challenges table exists yet; once one does, its rows are listed here instead of the placeholder
export default async function AdminChallengesPage() {
  await requireAdmin();
  const { data, error } = await createAdminClient().from('challenges').select('*').limit(50);
  const missing = isMissingTable(error);
  const rows = (data ?? []) as Record<string, unknown>[];

  if (!missing && !error && rows.length > 0) {
    return (
      <>
        <PageHeader title="Challenges" />
        <Table headers={['Name', 'Starts', 'Ends']}>
          {rows.map((row, i) => (
            <tr key={String(row.id ?? i)}>
              <Cell className="font-medium text-white">{String(row.name ?? row.title ?? row.id ?? '—')}</Cell>
              <Cell>{formatDate(row.starts_at as string | undefined)}</Cell>
              <Cell>{formatDate(row.ends_at as string | undefined)}</Cell>
            </tr>
          ))}
        </Table>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Challenges" />
      {error && !missing && <ErrorNote message={`Couldn’t load challenges: ${error.message}`} />}
      <div className="max-w-2xl rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
        <span className="inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-gold"
          style={{ borderColor: 'rgba(155,28,28,0.35)', background: 'rgba(155,28,28,0.12)' }}>
          Coming soon
        </span>
        <h2 className="mt-4 text-xl font-semibold text-white">Challenges launching Q1 2027</h2>
        <p className="mt-2 text-sm text-neutral-400">Planned for the first release:</p>
        <ul className="mt-4 space-y-2.5">
          {PLANNED.map((item) => (
            <li key={item} className="flex gap-3 text-sm text-neutral-300">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-primary" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
