'use client';

import { useState, useTransition } from 'react';
import { deleteFinanceEntry } from '@/lib/actions/finance';
import { formatPence, type FinanceEntry, type EntryType } from '@/lib/types/finance';

interface Props {
  entries: FinanceEntry[]
}

type Filter = 'all' | EntryType;

export function AdminFinanceTable({ entries }: Props) {
  const [filter, setFilter] = useState<Filter>('all');
  const [monthFilter, setMonthFilter] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = entries.filter(e => {
    if (filter !== 'all' && e.entry_type !== filter) return false;
    if (monthFilter && e.entry_date.slice(0, 7) !== monthFilter) return false;
    return true;
  });

  function handleDelete(id: string) {
    if (!confirm('Delete this entry? This cannot be undone.')) return;
    setDeletingId(id);
    startTransition(async () => {
      await deleteFinanceEntry(id);
      setDeletingId(null);
    });
  }

  const pillStyle = (active: boolean) => ({
    padding: '6px 14px',
    borderRadius: '8px',
    border: active ? '1.5px solid rgba(255,255,255,0.3)' : '1.5px solid rgba(255,255,255,0.08)',
    background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
    color: active ? '#fff' : 'rgba(255,255,255,0.4)',
    fontSize: '12px',
    fontWeight: 500,
    fontFamily: "'Inter', sans-serif",
    cursor: 'pointer',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Filters */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        {(['all', 'income', 'expense'] as Filter[]).map(f => (
          <button key={f} style={pillStyle(filter === f)} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : f === 'income' ? '+ Income' : '− Expenses'}
          </button>
        ))}
        <input
          type="month"
          value={monthFilter}
          onChange={e => setMonthFilter(e.target.value)}
          style={{
            marginLeft: 'auto',
            background: '#0f0f0f',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            padding: '6px 10px',
            color: monthFilter ? '#fff' : 'rgba(255,255,255,0.35)',
            fontSize: '12px',
            fontFamily: "'Inter', sans-serif",
          }}
        />
        {monthFilter && (
          <button style={{ ...pillStyle(false), fontSize: '11px' }} onClick={() => setMonthFilter('')}>
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{
        background: '#0f0f0f',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '14px',
        overflow: 'hidden',
      }}>
        {filtered.length === 0 ? (
          <p style={{ padding: '20px', fontSize: '13px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>
            No entries match the current filter.
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                {['Date', 'Type', 'Category', 'Description', 'Amount', ''].map(h => (
                  <th key={h} style={{
                    padding: '10px 14px', textAlign: 'left',
                    fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.7px',
                    color: 'rgba(255,255,255,0.3)', fontWeight: 500,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry, i) => (
                <tr
                  key={entry.id}
                  style={{
                    borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    opacity: deletingId === entry.id ? 0.4 : 1,
                    transition: 'opacity 0.15s',
                  }}
                >
                  <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap' }}>
                    {new Date(entry.entry_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: '6px',
                      fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px',
                      background: entry.entry_type === 'income' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                      color: entry.entry_type === 'income' ? '#22c55e' : '#ef4444',
                    }}>
                      {entry.entry_type}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.45)' }}>{entry.category}</td>
                  <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.8)' }}>{entry.description}</td>
                  <td style={{
                    padding: '10px 14px', fontVariantNumeric: 'tabular-nums', fontWeight: 600, whiteSpace: 'nowrap',
                    color: entry.entry_type === 'income' ? '#22c55e' : '#ef4444',
                  }}>
                    {entry.entry_type === 'income' ? '+' : '−'}{formatPence(entry.amount_pence)}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      disabled={isPending}
                      style={{
                        background: 'transparent',
                        border: '1px solid rgba(239,68,68,0.3)',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '11px',
                        color: '#ef4444',
                        cursor: isPending ? 'not-allowed' : 'pointer',
                        fontFamily: "'Inter', sans-serif",
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', margin: 0 }}>
        {filtered.length} of {entries.length} entries
      </p>
    </div>
  );
}
