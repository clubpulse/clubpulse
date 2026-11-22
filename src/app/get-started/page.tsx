import type { Metadata } from 'next';
import Link from 'next/link';
import MarketingNav from '@/components/marketing/MarketingNav';
import MarketingFooter from '@/components/marketing/MarketingFooter';

export const metadata: Metadata = {
  title: 'Get started | SHIFTUP',
  description: 'From Grassroots to Greatness. Register your club with SHIFTUP, or join as a player.',
};

export default function GetStartedPage() {
  return (
    <div style={{ background: '#060A16', color: '#E2E8F0', minHeight: '100vh', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <MarketingNav />
      <main style={{ maxWidth: 880, margin: '0 auto', padding: '72px 24px 96px' }}>
        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 800, lineHeight: 1.1, margin: 0 }}>
          How would you like to start?
        </h1>
        <p style={{ marginTop: 14, color: 'rgba(226,232,240,0.7)', fontSize: 17, lineHeight: 1.6, maxWidth: 560 }}>
          Clubs and players come in through different doors. Pick the one that fits.
        </p>
        <div style={{ display: 'grid', gap: 18, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', marginTop: 36 }}>
          <Link href="/contact" style={card}>
            <span style={eyebrow}>For clubs</span>
            <strong style={title}>Register your club</strong>
            <span style={body}>Tell us about your club and we will set it up with you: availability, picking the XI, scoring, finance and safeguarding in one place.</span>
            <span style={cta}>Tell us about your club →</span>
          </Link>
          <Link href="/auth/sign-up" style={card}>
            <span style={eyebrow}>For players</span>
            <strong style={title}>Join as a player</strong>
            <span style={body}>Start on Free (£0), whether or not your club is on SHIFTUP yet. Analysis, community, wellness and the academy, with Pro, Elite and Legend when you want more.</span>
            <span style={cta}>Create your account →</span>
          </Link>
        </div>
        <p style={{ marginTop: 28, fontSize: 14, color: 'rgba(226,232,240,0.55)' }}>
          Already have an account? <Link href="/auth/sign-in" style={{ color: '#60A5FA' }}>Sign in</Link>
        </p>
      </main>
      <MarketingFooter />
    </div>
  );
}

const card: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 10, padding: 26, borderRadius: 18, textDecoration: 'none', color: 'inherit',
  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
};
const eyebrow: React.CSSProperties = { fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#60A5FA', fontWeight: 600 };
const title: React.CSSProperties = { fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 24, fontWeight: 800 };
const body: React.CSSProperties = { fontSize: 15, lineHeight: 1.6, color: 'rgba(226,232,240,0.7)' };
const cta: React.CSSProperties = { marginTop: 8, fontSize: 14, fontWeight: 600, color: '#fff' };
