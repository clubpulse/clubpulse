import { requireClubAdminPage } from '@/lib/auth/admin-page';
import { getFinanceEntries, getFinanceSummary, getFinanceStats } from '@/lib/actions/finance';
import { FinanceChart } from '@/components/finance/FinanceChart';
import { AddEntryForm } from '@/components/finance/AddEntryForm';
import { AdminFinanceTable } from './AdminFinanceTable';
import { formatPence } from '@/lib/types/finance';

export default async function FinanceAdminPage() {
  const { clubId } = await requireClubAdminPage();

  const [statsResult, summaryResult, entriesResult] = await Promise.all([
    getFinanceStats(clubId),
    getFinanceSummary(clubId),
    getFinanceEntries(clubId, { limit: 100 }),
  ]);

  const stats = statsResult.success ? statsResult.data : null;
  const summaries = summaryResult.success ? summaryResult.data : [];
  const entries = entriesResult.success ? entriesResult.data : [];
  const netPositive = (stats?.net_pence ?? 0) >= 0;

  const tileStyle = {
    background: '#0f0f0f',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '14px',
    padding: '16px',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: "'Inter', sans-serif" }}>
      <div>
        <h1 style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 800, fontSize: '24px',
          color: '#fff', margin: '0 0 4px', letterSpacing: '-0.3px',
        }}>
          💷 Finance
        </h1>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
          Club income &amp; expenses · Admin
        </p>
      </div>

      {/* Stat tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        <div style={tileStyle}>
          <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'rgba(255,255,255,0.3)', margin: '0 0 8px' }}>
            Total Income
          </p>
          <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '28px', color: '#22c55e', margin: 0, fontVariantNumeric: 'tabular-nums' }}>
            {stats ? formatPence(stats.total_income_pence) : '—'}
          </p>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', margin: '4px 0 0' }}>{stats?.income_count ?? 0} entries</p>
        </div>
        <div style={tileStyle}>
          <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'rgba(255,255,255,0.3)', margin: '0 0 8px' }}>
            Total Expenses
          </p>
          <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '28px', color: '#ef4444', margin: 0, fontVariantNumeric: 'tabular-nums' }}>
            {stats ? formatPence(stats.total_expense_pence) : '—'}
          </p>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', margin: '4px 0 0' }}>{stats?.expense_count ?? 0} entries</p>
        </div>
        <div style={tileStyle}>
          <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'rgba(255,255,255,0.3)', margin: '0 0 8px' }}>
            Net Balance
          </p>
          <p style={{
            fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '28px',
            color: netPositive ? '#22c55e' : '#ef4444',
            margin: 0, fontVariantNumeric: 'tabular-nums',
          }}>
            {stats ? formatPence(stats.net_pence) : '—'}
          </p>
        </div>
      </div>

      {/* Chart + Add form */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '16px', alignItems: 'start' }}>
        <div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '15px', color: '#fff', margin: '0 0 10px' }}>
            Monthly Summary
          </h2>
          <FinanceChart summaries={summaries} />
        </div>
        <AddEntryForm clubId={clubId} />
      </div>

      {/* Full ledger */}
      <div>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '15px', color: '#fff', margin: '0 0 10px' }}>
          All Entries
        </h2>
        <AdminFinanceTable entries={entries} />
      </div>
    </div>
  );
}
