import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth/server';
import { isPlatformAdmin } from '@/lib/auth/admin';
import { getGiftCardQueue } from '@/lib/actions/gift-card-orders';
import { GiftCardQueue } from '@/components/gift-card-orders/GiftCardQueue';
import { h1, muted } from '@/components/play/ui';

// ShiftUp staff only: the gift card account belongs to ShiftUp, not to a club.
export default async function GiftCardOrdersPage() {
  const user = await requireUser();
  if (!isPlatformAdmin(user.id)) redirect('/admin/club');

  const result = await getGiftCardQueue();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: "'Inter', sans-serif" }}>
      <div>
        <h1 style={{ ...h1, fontSize: '22px', marginBottom: '2px' }}>🎁 Gift card orders</h1>
        <p style={muted}>Gift cards players have redeemed or won that still need ordering in the Tango portal</p>
      </div>
      {result.success
        ? <GiftCardQueue orders={result.data.orders} apiConfigured={result.data.apiConfigured} />
        : <p style={{ fontSize: '14px', color: '#f87171', margin: 0 }}>{result.error}</p>}
    </div>
  );
}
