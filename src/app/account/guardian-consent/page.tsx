import type { ReactNode } from 'react';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Confirm a SHIFTUP account',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

const COPY = {
  invalid: 'This confirmation link is not valid.',
  used: 'This confirmation link has already been used or has expired.',
  unavailable: 'Guardian confirmation is not available yet. Please try again in a moment.',
} as const;

type Code = keyof typeof COPY;

const pageStyle = {
  minHeight: '100vh',
  display: 'grid',
  placeItems: 'center',
  background: '#04091A',
  fontFamily: "'Inter', sans-serif",
  padding: 24,
} as const;

const cardStyle = {
  width: '100%',
  maxWidth: 440,
  display: 'grid',
  gap: 16,
  color: '#fff',
} as const;

/**
 * Public page from the guardian email. Rendering it confirms nothing: the parent has to press the button,
 * which POSTs the token. The token stays in the form body, not in a request that a scanner issues on its own.
 */
export default async function GuardianConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; done?: string; error?: string }>;
}) {
  const { token = '', done, error } = await searchParams;
  const code: Code | null = error && error in COPY ? error as Code : null;
  const validToken = /^[a-f0-9]{64}$/.test(token);

  let body: ReactNode;
  if (done === '1') {
    body = (
      <>
        <h1 style={{ margin: 0, fontSize: 26 }}>Account confirmed</h1>
        <p style={{ margin: 0, color: 'rgba(255,255,255,0.75)' }}>Thank you. You can close this page.</p>
      </>
    );
  } else if (!validToken || code === 'invalid' || code === 'used') {
    body = (
      <>
        <h1 style={{ margin: 0, fontSize: 26 }}>Confirmation link</h1>
        <p role="alert" style={{ margin: 0, color: '#f87171' }}>{COPY[code === 'used' ? 'used' : 'invalid']}</p>
      </>
    );
  } else {
    body = (
      <>
        <h1 style={{ margin: 0, fontSize: 26 }}>Confirm a SHIFTUP account</h1>
        <p style={{ margin: 0, color: 'rgba(255,255,255,0.75)' }}>
          Someone under 13 has asked you to confirm their account. Opening this page does not confirm it.
          Press the button only if you are their parent or guardian and you agree.
        </p>
        {code === 'unavailable' ? <p role="alert" style={{ margin: 0, color: '#f87171' }}>{COPY.unavailable}</p> : null}
        <form action="/api/account/guardian-consent" method="post">
          <input type="hidden" name="token" value={token} />
          <button type="submit" style={{ padding: '12px 16px', borderRadius: 8, border: 0, background: '#60a5fa', color: '#0a0a0a', fontWeight: 600, cursor: 'pointer' }}>
            Confirm this account
          </button>
        </form>
      </>
    );
  }

  return (
    <main style={pageStyle}>
      <section style={cardStyle} aria-label="Guardian confirmation">{body}</section>
    </main>
  );
}
