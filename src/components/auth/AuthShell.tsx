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
      background: '#080808',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      fontFamily: "'Inter', sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Inter:wght@300;400;500;600&display=swap');
        .auth-card { width: 100%; max-width: 400px; }
        .auth-logo-mark {
          width: 36px; height: 36px; background: #9b1c1c;
          border-radius: 8px; display: flex; align-items: center;
          justify-content: center; font-family: 'Syne', sans-serif;
          font-weight: 800; font-size: 18px; color: #fff;
        }
        .auth-logo-name {
          font-family: 'Syne', sans-serif; font-weight: 700;
          font-size: 20px; color: #fff; letter-spacing: -0.3px;
        }
        .auth-title {
          font-family: 'Syne', sans-serif; font-weight: 700;
          font-size: 22px; color: #fff; margin: 0;
        }
        .auth-subtitle { font-size: 14px; color: rgba(255,255,255,0.45); margin: 6px 0 0; }
        .auth-box {
          background: #0f0f0f;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px; padding: 28px;
        }
        .auth-footer { font-size: 13px; color: rgba(255,255,255,0.35); text-align: center; margin-top: 20px; }
        .auth-footer a { color: #c9a54c; text-decoration: none; }
        .auth-footer a:hover { text-decoration: underline; }
      `}</style>
      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', textDecoration: 'none', marginBottom: '20px' }}>
            <span className="auth-logo-mark">C</span>
            <span className="auth-logo-name">ClubPulse</span>
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
