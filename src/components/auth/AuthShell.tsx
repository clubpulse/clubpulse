import Link from 'next/link';
import type { ReactNode } from 'react';

export function AuthShell({ title, subtitle, children, footer }: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#04091A',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      fontFamily: "'Inter', sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700;800&family=Inter:wght@300;400;500;600&display=swap');
        .auth-card { width: 100%; max-width: 400px; }
        .auth-logo-mark {
          width: 36px; height: 36px;
          background: linear-gradient(145deg, #0F1F5C 0%, #1D4ED8 50%, #3B82F6 100%);
          border-radius: 8px; display: flex; align-items: center;
          justify-content: center;
          box-shadow: 0 0 0 1px rgba(96,165,250,0.3), 0 4px 16px rgba(37,99,235,0.55);
        }
        .auth-logo-name {
          font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800;
          font-size: 20px; letter-spacing: -0.3px;
        }
        .auth-logo-name .club { color: #fff; }
        .auth-logo-name .pulse { color: #60A5FA; }
        .auth-title {
          font-family: 'Bricolage Grotesque', sans-serif; font-weight: 700;
          font-size: 22px; color: #fff; margin: 0;
        }
        .auth-subtitle { font-size: 14px; color: rgba(255,255,255,0.45); margin: 6px 0 0; }
        .auth-box {
          background: var(--surface-1, #07102B);
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 16px; padding: 28px;
        }
        .auth-footer { font-size: 13px; color: rgba(255,255,255,0.35); text-align: center; margin-top: 20px; }
        .auth-footer a { color: #60A5FA; text-decoration: none; }
        .auth-footer a:hover { text-decoration: underline; }
      `}</style>
      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', textDecoration: 'none', marginBottom: '20px' }}>
            <span className="auth-logo-mark">
              <svg width="22" height="22" viewBox="0 0 36 36" fill="none">
                <defs>
                  <linearGradient id="authPulse" x1="0" y1="0" x2="36" y2="0" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#7F1D1D"/>
                    <stop offset="40%" stopColor="#DC2626"/>
                    <stop offset="100%" stopColor="#1D4ED8"/>
                  </linearGradient>
                </defs>
                <path d="M8 19.5 L18 9.5 L28 19.5" stroke="white" strokeWidth="3.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
<path d="M8 28.5 L18 18.5 L28 28.5" stroke="url(#authPulse)" strokeWidth="3.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            <span className="auth-logo-name"><span className="club">Shift</span><span className="pulse">Up</span></span>
          </Link>
          <h1 className="auth-title">{title}</h1>
          {subtitle && <p className="auth-subtitle">{subtitle}</p>}
        </div>
        <div className="auth-box">{children}</div>
        {footer && <div className="auth-footer">{footer}</div>}
      </div>
    </div>
  );
}
