'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { resendGuardianConsent } from '@/lib/actions/guardian-consent';

const fieldStyle = { padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.25)', background: 'transparent', color: 'inherit' };

/** Shown on the dashboard while an under-13 is waiting for a guardian email confirmation. */
export function GuardianConsentPrompt({ initialEmail }: { initialEmail: string }) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();

  return (
    <section aria-label="Parent or guardian confirmation" style={{ margin: '0 0 16px', padding: 16, borderRadius: 12, border: '1px solid rgba(96,165,250,0.4)', background: 'rgba(96,165,250,0.1)', display: 'grid', gap: 10 }}>
      <h2 style={{ margin: 0, fontSize: 18 }}>A parent or guardian needs to confirm</h2>
      <p style={{ margin: 0, opacity: 0.85 }}>Under 13s need a parent or guardian to confirm by email before this account can be used. Enter their email and we will send a link. Nothing is confirmed until they press the button on that page.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          setSent(false);
          start(async () => {
            const r = await resendGuardianConsent(email);
            if (!r.success) setError(r.error);
            else {
              setSent(true);
              router.refresh();
            }
          });
        }}
        style={{ display: 'grid', gap: 12, maxWidth: 360 }}
      >
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Parent or guardian email</span>
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
            style={fieldStyle} />
        </label>
        {error ? <p role="alert" style={{ color: '#f87171', margin: 0 }}>{error}</p> : null}
        {sent ? <p role="status" style={{ margin: 0 }}>We have emailed them a confirmation link.</p> : null}
        <button type="submit" disabled={pending || !email.trim()} style={{ padding: '10px 14px', borderRadius: 8, border: 0, background: '#60a5fa', color: '#0a0a0a', fontWeight: 600 }}>
          {pending ? 'Sending…' : 'Send confirmation'}
        </button>
      </form>
    </section>
  );
}
