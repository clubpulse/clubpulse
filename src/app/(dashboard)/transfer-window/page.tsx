import { requireUser } from '@/lib/auth/server';
import { getMyTransferRequests } from '@/lib/actions/transfer';

const SEASON = new Date().getFullYear();

const statusColour: Record<string, string> = {
  pending: '#c9a54c',
  approved: '#4ade80',
  rejected: '#f87171',
  withdrawn: 'rgba(255,255,255,0.3)',
};

export default async function TransferWindowPage() {
  await requireUser();
  const result = await getMyTransferRequests();
  const requests = result.success ? result.data : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '24px', color: '#fff', margin: '0 0 2px', letterSpacing: '-0.3px' }}>
            🔄 Transfer Window
          </h1>
          <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
            Request a move between clubs — both clubs must approve
          </p>
        </div>
        <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, background: 'rgba(155,28,28,0.2)', color: '#f87171' }}>
          {SEASON} Season
        </span>
      </div>

      <section style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h2 style={{ margin: 0, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '16px', color: '#fff' }}>
          How it works
        </h2>
        <ol style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {['Your current club admin initiates a transfer request to the destination club', 'The destination club admin approves or rejects the request', 'Once approved, the transfer is confirmed for this season'].map((step, i) => (
            <li key={i} style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>{step}</li>
          ))}
        </ol>
        <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
          Contact your club admin to initiate a transfer request on your behalf.
        </p>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <h2 style={{ margin: '0 0 2px', fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '17px', color: '#fff' }}>
            My Transfer Requests
          </h2>
          <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
            {requests.length === 0 ? 'No transfer requests this season' : `${requests.length} request${requests.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {requests.map((req) => (
          <div key={req.id} style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '12px', padding: '16px 18px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap',
          }}>
            <div>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#fff' }}>
                {req.from_club?.name ?? '—'} → {req.to_club?.name ?? '—'}
              </p>
              <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
                Requested {new Date(req.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
              {req.notes && <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.45)', fontStyle: 'italic' }}>&ldquo;{req.notes}&rdquo;</p>}
            </div>
            <span style={{
              padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
              background: 'rgba(255,255,255,0.06)', color: statusColour[req.status] ?? '#fff',
              textTransform: 'capitalize',
            }}>
              {req.status}
            </span>
          </div>
        ))}
      </section>
    </div>
  );
}
