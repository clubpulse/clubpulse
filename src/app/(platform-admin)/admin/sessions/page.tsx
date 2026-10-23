import { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatDate, pageFromParam, pageRange, profilesById } from '@/lib/platform-admin';
import type { Highlight } from '@/lib/highlights';
import { Cell, EmptyState, ErrorNote, PageHeader, Pagination, Table } from '@/components/platform-admin/ui';

export const metadata: Metadata = { title: 'Sessions & Highlights | Admin | ClubPulse' };

type Row = Highlight & { user_id: string };

export default async function AdminSessionsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireAdmin();
  const page = pageFromParam((await searchParams).page);
  const service = createAdminClient();

  const { data, count, error } = await service
    .from('highlights')
    .select('id, user_id, session_date, video_url, clips, top_clip_url', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(...pageRange(page))
    .returns<Row[]>();
  const rows = data ?? [];
  const profiles = await profilesById(service, rows.map((row) => row.user_id));

  return (
    <>
      <PageHeader title="Sessions & Highlights" description="Highlight reels generated from Analyse sessions." />
      {error && <ErrorNote message={`Couldn’t load highlights: ${error.message}`} />}

      {!error && rows.length === 0 ? (
        <EmptyState icon="🎬" title="No highlight reels yet">Reels appear here when players stop the camera on Analyse.</EmptyState>
      ) : (
        <Table headers={['User', 'Session date', 'Clips', 'Top score', 'Top clip']}>
          {rows.map((row) => {
            const top = row.clips[0];
            return (
              <tr key={row.id}>
                <Cell className="font-medium text-white">{profiles.get(row.user_id)?.email ?? row.user_id}</Cell>
                <Cell className="whitespace-nowrap">{formatDate(row.session_date)}</Cell>
                <Cell>{row.clips.length}</Cell>
                <Cell>
                  {top ? <span className="rounded-full bg-brand-primary px-2 py-0.5 text-xs font-bold text-white">{top.score}/100</span> : '—'}
                </Cell>
                <Cell>
                  {row.top_clip_url ? (
                    <a href={row.top_clip_url} target="_blank" rel="noopener noreferrer" className="text-brand-gold hover:underline">
                      Watch{top ? ` · ${top.label}` : ''} ↗
                    </a>
                  ) : '—'}
                </Cell>
              </tr>
            );
          })}
        </Table>
      )}
      <Pagination basePath="/admin/sessions" page={page} total={count ?? 0} />
    </>
  );
}
