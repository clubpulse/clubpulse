'use client';

import { useState, useTransition, useRef } from 'react';
import { addFinanceEntry } from '@/lib/actions/finance';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, type EntryType } from '@/lib/types/finance';

interface Props {
  clubId: string
}

export function AddEntryForm({ clubId }: Props) {
  const [entryType, setEntryType] = useState<EntryType>('income');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const categories = entryType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const today = new Date().toISOString().split('T')[0];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const fd = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await addFinanceEntry({
        club_id: clubId,
        entry_type: entryType,
        category: fd.get('category') as string,
        description: fd.get('description') as string,
        amount_pounds: fd.get('amount') as string,
        entry_date: fd.get('entry_date') as string,
      });
      if (result.success) {
        setSuccess(true);
        formRef.current?.reset();
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(result.error);
      }
    });
  }

  const pillStyle = (active: boolean, color: string) => ({
    flex: 1,
    padding: '10px 0',
    borderRadius: '10px',
    border: active ? `1.5px solid ${color}` : '1.5px solid rgba(255,255,255,0.1)',
    background: active ? `${color}18` : 'transparent',
    color: active ? color : 'rgba(255,255,255,0.4)',
    fontFamily: "'Inter', sans-serif",
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s',
    textAlign: 'center' as const,
  });

  const inputStyle = {
    width: '100%',
    background: '#0f0f0f',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    padding: '10px 12px',
    color: '#fff',
    fontSize: '14px',
    fontFamily: "'Inter', sans-serif",
    outline: 'none',
    boxSizing: 'border-box' as const,
  };

  return (
    <div style={{
      background: '#111',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '16px',
      padding: '20px',
    }}>
      <h2 style={{
        fontFamily: "'Syne', sans-serif",
        fontWeight: 700,
        fontSize: '16px',
        color: '#fff',
        margin: '0 0 16px',
      }}>
        Add Entry
      </h2>

      <form ref={formRef} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Income / Expense toggle */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" style={pillStyle(entryType === 'income', '#22c55e')} onClick={() => setEntryType('income')}>
            + Income
          </button>
          <button type="button" style={pillStyle(entryType === 'expense', '#ef4444')} onClick={() => setEntryType('expense')}>
            − Expense
          </button>
        </div>

        {/* Category */}
        <select name="category" required style={{ ...inputStyle, appearance: 'none' as const }}>
          <option value="">Select category…</option>
          {categories.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {/* Description */}
        <input
          name="description"
          type="text"
          placeholder="Description"
          required
          maxLength={200}
          style={inputStyle}
        />

        {/* Amount */}
        <div style={{ position: 'relative' }}>
          <span style={{
            position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
            color: 'rgba(255,255,255,0.4)', fontSize: '14px', pointerEvents: 'none',
          }}>£</span>
          <input
            name="amount"
            type="number"
            placeholder="0.00"
            step="0.01"
            min="0.01"
            required
            style={{ ...inputStyle, paddingLeft: '24px' }}
          />
        </div>

        {/* Date */}
        <input
          name="entry_date"
          type="date"
          defaultValue={today}
          required
          style={inputStyle}
        />

        {error && (
          <p style={{ margin: 0, fontSize: '12px', color: '#f87171' }}>{error}</p>
        )}
        {success && (
          <p style={{ margin: 0, fontSize: '12px', color: '#4ade80' }}>Entry added successfully.</p>
        )}

        <button
          type="submit"
          disabled={isPending}
          style={{
            background: entryType === 'income' ? '#22c55e' : '#ef4444',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            padding: '11px',
            fontSize: '14px',
            fontWeight: 600,
            fontFamily: "'Inter', sans-serif",
            cursor: isPending ? 'not-allowed' : 'pointer',
            opacity: isPending ? 0.6 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          {isPending ? 'Saving…' : `Add ${entryType === 'income' ? 'Income' : 'Expense'}`}
        </button>
      </form>
    </div>
  );
}
