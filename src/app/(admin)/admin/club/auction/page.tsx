import { requireClubAdminPage } from '@/lib/auth/admin-page';
import { createClient } from '@/lib/supabase/server';
import { AdminAuctionClient } from './AdminAuctionClient';

export default async function AdminAuctionPage() {
  const { clubId } = await requireClubAdminPage();
  const supabase = await createClient();

  const [auctionsRes, membersRes] = await Promise.all([
    supabase
      .from('auctions')
      .select('*')
      .eq('club_id', clubId)
      .order('created_at', { ascending: false }),
    supabase
      .from('club_members')
      .select('user_id')
      .eq('club_id', clubId),
  ]);

  const auctions = auctionsRes.data ?? [];
  const auctionIds = auctions.map((a) => a.id);

  const lotsRes = auctionIds.length > 0
    ? await supabase
        .from('auction_lots')
        .select('*')
        .in('auction_id', auctionIds)
        .order('current_bid', { ascending: false })
    : { data: [] };

  return (
    <AdminAuctionClient
      clubId={clubId}
      auctions={auctions}
      lots={lotsRes.data ?? []}
      members={membersRes.data ?? []}
    />
  );
}
