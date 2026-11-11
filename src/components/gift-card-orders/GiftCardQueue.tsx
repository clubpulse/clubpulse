'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { markGiftCardSent } from '@/lib/actions/gift-card-orders';
import type { GiftCardOrder } from '@/lib/types/gift-card-orders';
import { formatDate } from '@/lib/utils/format';
import { card, cardTitle, input, muted, pill, row } from '@/components/play/ui';

const csvCell = (v: string | number | null) => {
  const s = v === null ? '' : String(v);
  // Quote everything, and neutralise cells a spreadsheet would run as a formula
  return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
};

function toCsv(orders: GiftCardOrder[]): string {
  const head = ['Recipient name', 'Recipient email', 'Reward', 'Amount (GBP)', 'Tango UTID', 'Reference'];
  const rows = orders.map((o) => [o.player_name, o.email, o.reward_title, o.amount_gbp === null ? '' : o.amount_gbp.toFixed(2), o.tango_utid, o.id]);
  return [head, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
}

function OrderRow({ order }: { order: GiftCardOrder }) {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [reference, setReference] = useState('');
  const [pending, start] = useTransition();

  const send = () => start(async () => {
    const res = await markGiftCardSent(order.kind, order.id, { code, reference });
    if (!res.success) { toast.error(res.error); return; }
    toast.success(`${order.reward_title} for ${order.player_name} marked as sent`);
    router.refresh();
  });

  return (
    <div style={{ ...row, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <div style={{ flex: '1 1 240px', minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#fff' }}>
          {order.reward_title}{order.amount_gbp !== null ? ` · £${order.amount_gbp.toFixed(2)}` : ''}
        </p>
        <p style={{ ...muted, fontSize: '12px', userSelect: 'all', wordBreak: 'break-all' }}>
          {order.player_name} · {order.email ?? 'no email on file'}
        </p>
        <p style={{ ...muted, fontSize: '11px' }}>
          {order.kind === 'scratch_card' ? 'Scratch card prize' : 'Bought with Scores'}
          {order.requested_at ? ` · ${formatDate(order.requested_at)}` : ''}
          {order.tango_utid ? ` · UTID ${order.tango_utid}` : ' · not linked to a Tango product'}
        </p>
      </div>
      <input aria-label="Tango order reference (optional)" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Tango order ref" style={{ ...input, width: '130px' }} />
      <input aria-label="Gift card code (optional)" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code (optional)" style={{ ...input, width: '130px' }} />
      <button type="button" onClick={send} disabled={pending} style={pill('gold')}>{pending ? 'Saving…' : 'Mark as sent'}</button>
    </div>
  );
}

export function GiftCardQueue({ orders, apiConfigured }: { orders: GiftCardOrder[]; apiConfigured: boolean }) {
  const [copied, setCopied] = useState(false);
  const total = orders.reduce((a, o) => a + (o.amount_gbp ?? 0), 0);

  function download() {
    const url = URL.createObjectURL(new Blob([toCsv(orders)], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = `clubpulse-gift-cards-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  async function copy() {
    try { await navigator.clipboard.writeText(toCsv(orders)); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { toast.error('Could not copy. Use Download instead.'); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={card}>
        <p style={cardTitle}>How this works</p>
        <p style={muted}>
          {apiConfigured
            ? 'The Tango API is connected, so gift cards are normally issued automatically. Anything listed here failed and needs ordering by hand.'
            : 'Tango API access is not switched on yet, so every gift card a player redeems or wins lands here. Order each one in the Tango portal, with the reward sent to the player\'s email, then mark it as sent.'}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '12px' }}>
          <span style={{ fontSize: '13px', color: '#fff' }}><strong>{orders.length}</strong> waiting · <strong>£{total.toFixed(2)}</strong> to fund</span>
          <button type="button" onClick={download} disabled={orders.length === 0} style={pill(orders.length ? 'blue' : 'grey', orders.length === 0)}>Download CSV</button>
          <button type="button" onClick={copy} disabled={orders.length === 0} style={pill(orders.length ? 'grey' : 'grey', orders.length === 0)}>{copied ? 'Copied ✓' : 'Copy CSV'}</button>
        </div>
      </div>

      <div style={card}>
        <p style={cardTitle}>Waiting to be ordered</p>
        {orders.length === 0
          ? <p style={muted}>Nothing waiting. New gift cards appear here as players redeem or win them.</p>
          : orders.map((o) => <OrderRow key={`${o.kind}-${o.id}`} order={o} />)}
      </div>
    </div>
  );
}
