'use client';

import type { FinanceMonthSummary } from '@/lib/types/finance';

interface Props {
  summaries: FinanceMonthSummary[]
}

function shortMonth(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
}

export function FinanceChart({ summaries }: Props) {
  const months = [...summaries].reverse().slice(-6);

  if (months.length === 0) {
    return (
      <div style={{
        background: '#0f0f0f',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '14px',
        padding: '24px',
        textAlign: 'center',
        color: 'rgba(255,255,255,0.3)',
        fontSize: '13px',
      }}>
        No data yet — entries will appear here once logged.
      </div>
    );
  }

  const maxPence = Math.max(...months.flatMap(m => [m.total_income_pence, m.total_expense_pence]), 1);
  const chartH = 140;
  const barW = 18;
  const gap = 6;
  const groupW = barW * 2 + gap + 20;
  const totalW = groupW * months.length;
  const labelH = 24;
  const viewW = Math.max(totalW, 320);

  return (
    <div style={{
      background: '#0f0f0f',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '14px',
      padding: '16px',
      overflowX: 'auto',
    }}>
      <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', fontSize: '11px' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.5)' }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: '#22c55e', display: 'inline-block' }} />
          Income
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.5)' }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: '#ef4444', display: 'inline-block' }} />
          Expenses
        </span>
      </div>
      <svg
        width={viewW}
        height={chartH + labelH + 20}
        style={{ display: 'block', minWidth: '100%' }}
        viewBox={`0 0 ${viewW} ${chartH + labelH + 20}`}
        preserveAspectRatio="xMinYMin meet"
      >
        {[0.25, 0.5, 0.75, 1].map(frac => (
          <line key={frac} x1={0} y1={chartH - chartH * frac} x2={viewW} y2={chartH - chartH * frac}
            stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
        ))}
        {months.map((m, i) => {
          const x = i * groupW + 4;
          const incH = Math.round((m.total_income_pence / maxPence) * chartH);
          const expH = Math.round((m.total_expense_pence / maxPence) * chartH);
          return (
            <g key={m.month}>
              <rect x={x} y={chartH - incH} width={barW} height={incH} rx={3} fill="#22c55e" fillOpacity={0.85}>
                <title>Income: £{(m.total_income_pence / 100).toFixed(2)}</title>
              </rect>
              <rect x={x + barW + gap} y={chartH - expH} width={barW} height={expH} rx={3} fill="#ef4444" fillOpacity={0.8}>
                <title>Expenses: £{(m.total_expense_pence / 100).toFixed(2)}</title>
              </rect>
              <text x={x + barW + gap / 2} y={chartH + labelH} textAnchor="middle" fontSize={10} fill="rgba(255,255,255,0.35)">
                {shortMonth(m.month)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
