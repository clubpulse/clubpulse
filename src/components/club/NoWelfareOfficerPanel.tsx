import type { FallbackFlags } from '@/lib/age-verification/flags';
import { cardTitle, muted } from '@/components/play/ui';
import { PLAYER_DOB_HOLD } from '@/lib/age-verification/rules';

/**
 * Shown only to a club with no welfare officer. It is read only: nobody at the club may close a squad flag, so alerts
 * go to the safeguarding lead. The rows carry no date of birth.
 */
export function NoWelfareOfficerPanel({ data }: { data: FallbackFlags }) {
  return (
    <section aria-label="Squad flags without a welfare officer">
      <h3 style={cardTitle}>Squad flags (no welfare officer)</h3>
      <p style={muted}>
        This club has no welfare officer, so safeguarding alerts go to {data.alertTo}. Add a welfare officer to review and close flags.
        Until then each player sees: {PLAYER_DOB_HOLD}
      </p>
      {data.error && <p role="alert">{data.error}</p>}
      {!data.error && data.items.length === 0 && <p style={muted}>No open flags.</p>}
      <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 8 }}>
        {data.items.map((flag) => (
          <li key={flag.id}>
            {flag.ageGroup} · {flag.reason === 'mismatch' ? 'Age band does not match' : 'Date of birth is not confirmed'} · {flag.createdAt.slice(0, 10)}
          </li>
        ))}
      </ul>
      {data.purges.length > 0 && (
        <>
          <h4 style={cardTitle}>Deleted under-13 accounts</h4>
          <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 6 }}>
            {data.purges.map((row) => (
              <li key={row.id}>
                {row.purgedAt.slice(0, 10)} · reference {row.id} · {row.alertSent ? 'alert sent' : 'alert not sent yet, it will be retried'}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
