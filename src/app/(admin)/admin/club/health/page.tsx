import { Metadata } from 'next';
import Link from 'next/link';
import { requireClubAdminPage } from '@/lib/auth/admin-page';
import { ClubHealthScore } from '@/components/admin/ClubHealthScore';
import { Card } from '@/components/ui/Card';

export const metadata: Metadata = {
  title: 'Club Health | ClubPulse Admin',
  description: 'AI-powered club health score, smart alerts, and engagement intelligence.',
};

const alerts = [
  {
    type: 'retention',
    icon: '⚠️',
    color: '#e74c3c',
    bg: 'rgba(231,76,60,0.08)',
    border: 'rgba(231,76,60,0.18)',
    title: 'Retention risk — Dev Sharma',
    detail: 'No activity in 28 days. Last match: Coventry CC (26 Sep). Risk: churn before season end.',
    action: 'Send nudge',
  },
  {
    type: 'fee',
    icon: '💳',
    color: '#9b59b6',
    bg: 'rgba(155,89,182,0.08)',
    border: 'rgba(155,89,182,0.18)',
    title: 'Fee overdue prediction — Sam Okonkwo',
    detail: 'Model predicts non-payment within 6 days based on payment history patterns.',
    action: 'Send reminder',
  },
  {
    type: 'opportunity',
    icon: '📈',
    color: '#2ecc71',
    bg: 'rgba(46,204,113,0.06)',
    border: 'rgba(46,204,113,0.15)',
    title: 'Availability boost opportunity',
    detail: '6 members haven\'t responded to the Oxford CC fixture. Sending a push now historically increases response by 40%.',
    action: 'Send push',
  },
];

const engagementStats = [
  { label: 'Engagement rate', value: '84%', trend: '+6% vs last month', positive: true },
  { label: 'Availability response', value: '73%', trend: '+3% vs last month', positive: true },
  { label: 'Fee collection', value: '75%', trend: '−2% vs last month', positive: false },
];

export default async function ClubHealthPage() {
  await requireClubAdminPage();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '24px', color: '#fff', margin: 0, letterSpacing: '-0.3px' }}>
              Club Health &amp; Intelligence
            </h1>
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', background: 'rgba(249,115,22,0.12)', color: '#f97316', border: '1px solid rgba(249,115,22,0.25)', borderRadius: '6px', padding: '3px 8px' }}>
              Roadmap
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
            AI-generated insights · Slough CC · Updated hourly
          </p>
        </div>
        <Link href="/admin/club" style={{ padding: '10px 18px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'rgba(255,255,255,0.7)', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}>
          ← Club overview
        </Link>
      </div>

      {/* Engagement stats + health score side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '12px', alignItems: 'stretch' }}>
        {engagementStats.map((s) => (
          <div key={s.label} style={{ background: '#0f0f0f', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '18px 20px' }}>
            <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)', margin: '0 0 8px', fontWeight: 600 }}>{s.label}</p>
            <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '36px', color: '#fff', margin: '0 0 4px', letterSpacing: '-0.02em' }}>{s.value}</p>
            <p style={{ fontSize: '12px', color: s.positive ? '#2ecc71' : '#e74c3c', margin: 0, fontWeight: 600 }}>{s.trend}</p>
          </div>
        ))}
        <div style={{ minWidth: '220px' }}>
          <ClubHealthScore />
        </div>
      </div>

      {/* Smart alerts */}
      <Card title="Smart Alerts" description="AI-generated alerts requiring your attention">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {alerts.map((a) => (
            <div key={a.type} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '16px', background: a.bg, border: `1px solid ${a.border}`, borderRadius: '12px' }}>
              <span style={{ fontSize: '20px', flexShrink: 0 }}>{a.icon}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '14px', fontWeight: 600, color: a.color, marginBottom: '4px' }}>{a.title}</p>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5, margin: 0 }}>{a.detail}</p>
              </div>
              <button style={{ flexShrink: 0, padding: '8px 16px', background: a.color, border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', opacity: 0.9, whiteSpace: 'nowrap' }}>
                {a.action}
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* What drives the score */}
      <Card title="What drives your score">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          {[
            { label: 'Match attendance', weight: '30%', desc: 'Avg availability response & turnout' },
            { label: 'Fee health', weight: '25%', desc: 'On-time payment rate' },
            { label: 'Member engagement', weight: '25%', desc: 'App activity, Scores earned, AI sessions' },
            { label: 'Admin responsiveness', weight: '20%', desc: 'Avg time to approve members & confirm squads' },
          ].map((d) => (
            <div key={d.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', margin: 0 }}>{d.label}</p>
                <span style={{ fontSize: '12px', color: '#c9a54c', fontWeight: 700 }}>{d.weight}</span>
              </div>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: 0, lineHeight: 1.5 }}>{d.desc}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Roadmap notice */}
      <div style={{ background: 'rgba(249,115,22,0.05)', border: '1px solid rgba(249,115,22,0.12)', borderRadius: '12px', padding: '16px 20px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '20px', flexShrink: 0 }}>🚧</span>
        <div>
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#f97316', marginBottom: '4px' }}>Full smart alerts on the roadmap</p>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, margin: 0 }}>
            The alerts and trend data above are a preview of what&apos;s coming. The AI club health score (bottom-left) is live now — it analyses your real club data via GPT-4o. Full predictive alerts, fee risk signals, and retention nudges will be available in the next release. The current club overview is at{' '}
            <Link href="/admin/club" style={{ color: '#f97316', textDecoration: 'none' }}>admin/club</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
