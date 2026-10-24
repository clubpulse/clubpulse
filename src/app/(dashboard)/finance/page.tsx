import { requireUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { getFinanceEntries, getFinanceSummary, getFinanceStats } from '@/lib/actions/finance';
import { FinanceChart } from '@/components/finance/FinanceChart';
import { formatPence } from '@/lib/types/finance';

async function getClubId(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('club_members')
    .select('club_id')
    .eq('user_id', userId)
    .limit(1)
    .single();
  return data?.club_id ?? null;
}

export default async function FinancePage() {
  const user = await requireUser();
  const clubId = await getClubId(user.id);

  if (!clubId) {
    return (
      <p style={{ fontSize: '13px', color: '#f87171' }}>
        You are not a member of any club.
      </p>
    );
  }

  const [statsResult, summaryResult, entriesResult] = await Promise.all([
    getFinanceStats(clubId),
    getFinanceSummary(clubId),
    getFinanceEntries(clubId, { limit: 20 }),
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
          💷 Club Finance
        </h1>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
          Running balance and recent activity
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
        </div>
        <div style={tileStyle}>
          <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'rgba(255,255,255,0.3)', margin: '0 0 8px' }}>
            Total Expenses
          </p>
          <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '28px', color: '#ef4444', margin: 0, fontVariantNumeric: 'tabular-nums' }}>
            {stats ? formatPence(stats.total_expense_pence) : '—'}
          </p>
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

      {/* Monthly chart */}
      <div>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '15px', color: '#fff', margin: '0 0 10px' }}>
          Monthly Summary
        </h2>
        <FinanceChart summaries={summaries} />
      </div>

      {/* Recent entries */}
      <div>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '15px', color: '#fff', margin: '0 0 10px' }}>
          Recent Entries
        </h2>
        <div style={{
          background: '#0f0f0f',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '14px',
          overflow: 'hidden',
        }}>
          {entries.length === 0 ? (
            <p style={{ padding: '20px', fontSize: '13px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>
              No entries yet.
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  {['Date', 'Description', 'Category', 'Amount'].map(h => (
                    <th key={h} style={{
                      padding: '10px 14px', textAlign: 'left',
                      fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.7px',
                      color: 'rgba(255,255,255,0.3)', fontWeight: 500,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, i) => (
                  <tr key={entry.id} style={{ borderBottom: i < entries.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap' }}>
                      {new Date(entry.entry_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                    </td>
                    <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.8)' }}>{entry.description}</td>
                    <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.45)' }}>{entry.category}</td>
                    <td style={{
                      padding: '10px 14px', fontVariantNumeric: 'tabular-nums', fontWeight: 600, whiteSpace: 'nowrap',
                      color: entry.entry_type === 'income' ? '#22c55e' : '#ef4444',
                    }}>
                      {entry.entry_type === 'income' ? '+' : '−'}{formatPence(entry.amount_pence)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
