import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth/server';
import { isPlatformAdmin } from '@/lib/auth/admin';
import { getMerchQueue } from '@/lib/actions/merch-orders';
import { MerchQueue } from '@/components/merch/MerchQueue';
import { h1, muted } from '@/components/play/ui';

// SHIFTUP staff only: these orders hold members' home addresses.
export default async function MerchandiseOrdersPage() {
  const user = await requireUser();
  if (!isPlatformAdmin(user.id)) redirect('/admin/club');

  const result = await getMerchQueue();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: "'Inter', sans-serif" }}>
      <div>
        <h1 style={{ ...h1, fontSize: '22px', marginBottom: '2px' }}>🧢 Merchandise orders</h1>
        <p style={muted}>Items members have ordered with Scores that still need ordering from the supplier or posting</p>
      </div>
      {result.success
        ? <MerchQueue orders={result.data} />
        : <p style={{ fontSize: '14px', color: '#f87171', margin: 0 }}>{result.error}</p>}
    </div>
  );
}
