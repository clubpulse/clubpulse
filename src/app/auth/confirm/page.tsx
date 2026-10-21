import Link from 'next/link';

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <div className="confirm-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Inter:wght@300;400;500;600&display=swap');

        .confirm-root {
          min-height: 100vh;
          background: #080808;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
          font-family: 'Inter', sans-serif;
          position: relative;
          overflow: hidden;
        }

        .confirm-root::before {
          content: '';
          position: fixed;
          top: -160px;
          left: 50%;
          transform: translateX(-50%);
          width: 700px;
          height: 500px;
          background: radial-gradient(ellipse, rgba(155,28,28,0.14) 0%, transparent 68%);
          pointer-events: none;
        }

        .confirm-root::after {
          content: '';
          position: fixed;
          bottom: -160px;
          left: 50%;
          transform: translateX(-50%);
          width: 600px;
          height: 400px;
          background: radial-gradient(ellipse, rgba(201,165,76,0.07) 0%, transparent 68%);
          pointer-events: none;
        }

        .confirm-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 420px;
          background: #0f0f0f;
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 20px;
          padding: 44px 40px 40px;
          box-shadow: 0 24px 80px rgba(0,0,0,0.6);
          text-align: center;
        }

        .logo-wrap {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          margin-bottom: 32px;
        }

        .logo-mark {
          width: 36px;
          height: 36px;
          background: #9b1c1c;
          border-radius: 8px;
          display: grid;
          place-items: center;
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          font-size: 16px;
          color: #fff;
        }

        .logo-name {
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: 18px;
          color: #f0ece4;
          letter-spacing: -0.01em;
        }

        .envelope-wrap {
          width: 72px;
          height: 72px;
          background: rgba(201,165,76,0.10);
          border: 1px solid rgba(201,165,76,0.22);
          border-radius: 18px;
          display: grid;
          place-items: center;
          margin: 0 auto 24px;
        }

        .confirm-title {
          font-family: 'Syne', sans-serif;
          font-size: 26px;
          font-weight: 800;
          color: #f0ece4;
          letter-spacing: -0.02em;
          margin-bottom: 12px;
          line-height: 1.1;
        }

        .confirm-sub {
          font-size: 14.5px;
          color: rgba(240,236,228,0.55);
          line-height: 1.65;
          margin-bottom: 28px;
        }

        .email-highlight {
          display: inline-block;
          background: rgba(201,165,76,0.12);
          border: 1px solid rgba(201,165,76,0.2);
          border-radius: 6px;
          padding: 2px 8px;
          color: #c9a54c;
          font-weight: 600;
          font-size: 13.5px;
          word-break: break-all;
          margin: 4px 0;
        }

        .divider {
          height: 1px;
          background: rgba(255,255,255,0.07);
          margin: 24px 0;
        }

        .steps-list {
          list-style: none;
          text-align: left;
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 28px;
        }

        .step-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          font-size: 13.5px;
          color: rgba(240,236,228,0.6);
          line-height: 1.5;
        }

        .step-num {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          display: grid;
          place-items: center;
          font-size: 11px;
          font-weight: 600;
          color: #c9a54c;
          flex-shrink: 0;
          margin-top: 1px;
        }

        .confirm-back {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: rgba(240,236,228,0.4);
          text-decoration: none;
          transition: color 0.15s;
          margin-top: 28px;
        }

        .confirm-back:hover { color: rgba(240,236,228,0.7); }

        .spam-note {
          font-size: 12.5px;
          color: rgba(240,236,228,0.28);
          line-height: 1.5;
          margin-top: 12px;
        }

        @media (max-width: 480px) {
          .confirm-card { padding: 36px 24px 32px; }
          .confirm-title { font-size: 22px; }
        }
      `}</style>

      <div className="confirm-card">
        {/* Logo */}
        <Link href="/" className="logo-wrap">
          <div className="logo-mark">C</div>
          <span className="logo-name">ClubPulse</span>
        </Link>

        {/* Envelope icon */}
        <div className="envelope-wrap">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path d="M4 10C4 8.9 4.9 8 6 8H26C27.1 8 28 8.9 28 10V22C28 23.1 27.1 24 26 24H6C4.9 24 4 23.1 4 22V10Z"
              stroke="#c9a54c" strokeWidth="1.5" fill="none"/>
            <path d="M4 10L16 17L28 10" stroke="#c9a54c" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>

        <h1 className="confirm-title">Check your inbox</h1>

        <p className="confirm-sub">
          We&apos;ve sent a confirmation link
          {email ? (
            <> to<br /><span className="email-highlight">{email}</span></>
          ) : (
            ' to your email address'
          )}.
        </p>

        <ul className="steps-list">
          <li className="step-item">
            <span className="step-num">1</span>
            <span>Open the email from <strong style={{color: 'rgba(240,236,228,0.8)'}}>ClubPulse</strong></span>
          </li>
          <li className="step-item">
            <span className="step-num">2</span>
            <span>Click the <strong style={{color: 'rgba(240,236,228,0.8)'}}>Confirm your account</strong> button</span>
          </li>
          <li className="step-item">
            <span className="step-num">3</span>
            <span>You&apos;ll be taken straight to your dashboard to start earning Scores</span>
          </li>
        </ul>

        <div className="divider" />

        <p className="spam-note">
          Nothing in your inbox? Check your <strong>spam or junk folder</strong>.
          Still nothing?{' '}
          <Link href="/auth/sign-up" style={{color: '#c9a54c', textDecoration: 'none'}}>
            Sign up again
          </Link>{' '}
          with the same email to get a fresh link.
        </p>
      </div>

      <Link href="/auth/sign-in" className="confirm-back">
        ← Back to sign in
      </Link>
    </div>
  );
}
