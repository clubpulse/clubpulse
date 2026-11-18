'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { updateMerchOrder } from '@/lib/actions/merch-orders';
import { addressLines } from '@/lib/merch/logic';
import type { MerchOrder } from '@/lib/types/merch-orders';
import { formatDate } from '@/lib/utils/format';
import { card, cardTitle, input, muted, pill, row } from '@/components/play/ui';

function OrderRow({ order }: { order: MerchOrder }) {
  const router = useRouter();
  const [reference, setReference] = useState(order.supplier_reference ?? '');
  const [pending, start] = useTransition();

  const update = (step: 'ordered' | 'sent') => start(async () => {
    const res = await updateMerchOrder(order.id, step, reference);
    if (!res.success) { toast.error(res.error); return; }
    toast.success(step === 'sent' ? `${order.item} for ${order.delivery.name} marked as posted` : 'Marked as ordered from the supplier');
    router.refresh();
  });

  return (
    <div style={{ ...row, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <div style={{ flex: '1 1 260px', minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#fff' }}>
          {order.item}{order.delivery.size ? ` · size ${order.delivery.size}` : ''}
        </p>
        <p style={{ ...muted, fontSize: '12px', userSelect: 'all', whiteSpace: 'pre-line', color: 'rgba(255,255,255,0.75)', marginTop: '4px' }}>
          {addressLines(order.delivery).join('\n')}
        </p>
        <p style={{ ...muted, fontSize: '11px', marginTop: '4px' }}>
          Account: {order.player_name} · {order.email ?? 'no email on file'} · {formatDate(order.ordered_at)}
          {order.state === 'ordered' ? ' · ordered from supplier' : ''}
        </p>
      </div>
      <input aria-label="Supplier order reference (optional)" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Supplier order ref" style={{ ...input, width: '150px' }} />
      {order.state === 'to_order' && (
        <button type="button" onClick={() => update('ordered')} disabled={pending} style={pill('blue')}>{pending ? 'Saving…' : 'Mark as ordered'}</button>
      )}
      <button type="button" onClick={() => update('sent')} disabled={pending} style={pill('gold')}>{pending ? 'Saving…' : 'Mark as posted'}</button>
    </div>
  );
}

export function MerchQueue({ orders }: { orders: MerchOrder[] }) {
  const toOrder = orders.filter((o) => o.state === 'to_order');
  const onOrder = orders.filter((o) => o.state === 'ordered');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={card}>
        <p style={cardTitle}>How this works</p>
        <p style={muted}>
          When a member orders an item with Scores, it lands here with their size and address. Place the order with the print
          supplier, posted straight to the member, and mark it as ordered. Mark it as posted once the supplier confirms dispatch.
          These are home addresses: use them only to send the order.
        </p>
      </div>
      <div style={card}>
        <p style={cardTitle}>To order from the supplier ({toOrder.length})</p>
        {toOrder.length === 0
          ? <p style={muted}>Nothing waiting. New orders appear here as members place them.</p>
          : toOrder.map((o) => <OrderRow key={o.id} order={o} />)}
      </div>
      {onOrder.length > 0 && (
        <div style={card}>
          <p style={cardTitle}>Ordered, waiting to be posted ({onOrder.length})</p>
          {onOrder.map((o) => <OrderRow key={o.id} order={o} />)}
        </div>
      )}
    </div>
  );
}
