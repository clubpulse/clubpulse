import { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { displayName, formatDateTime, pageFromParam, pageRange, profilesById } from '@/lib/platform-admin';
import { Cell, EmptyState, ErrorNote, PageHeader, Pagination, Table } from '@/components/platform-admin/ui';

export const metadata: Metadata = { title: 'Marketplace | Admin | ClubPulse' };

type Click = { id: string; user_id: string | null; product_name: string | null; retailer: string | null; url: string | null; clicked_at: string };

export default async function AdminMarketplacePage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireAdmin();
  const page = pageFromParam((await searchParams).page);
  const service = createAdminClient();

  const { data, count, error } = await service
    .from('affiliate_clicks')
    .select('id, user_id, product_name, retailer, url, clicked_at', { count: 'exact' })
    .order('clicked_at', { ascending: false })
    .range(...pageRange(page))
    .returns<Click[]>();
  const clicks = data ?? [];
  const profiles = await profilesById(service, clicks.map((click) => click.user_id));

  return (
    <>
      <PageHeader title="Marketplace" description="Affiliate link clicks, newest first." />
      {error && <ErrorNote message={`Couldn’t load clicks: ${error.message}`} />}

      {!error && clicks.length === 0 ? (
        <EmptyState icon="🛍️" title="No clicks yet">Clicks on affiliate links in the marketplace will show up here.</EmptyState>
      ) : (
        <Table headers={['Product', 'Retailer', 'User', 'Clicked']}>
          {clicks.map((click) => (
            <tr key={click.id}>
              <Cell className="font-medium text-white">
                {click.url ? (
                  <a href={click.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{click.product_name ?? click.url}</a>
                ) : click.product_name ?? '—'}
              </Cell>
              <Cell>{click.retailer ?? '—'}</Cell>
              <Cell>{click.user_id ? displayName(profiles.get(click.user_id)) : 'Signed out'}</Cell>
              <Cell className="whitespace-nowrap">{formatDateTime(click.clicked_at)}</Cell>
            </tr>
          ))}
        </Table>
      )}
      <Pagination basePath="/admin/marketplace" page={page} total={count ?? 0} />
    </>
  );
}
