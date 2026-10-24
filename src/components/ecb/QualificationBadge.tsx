import type { MemberQualification } from '@/lib/types/ecb-courses';
import { CATEGORY_CONFIG } from '@/lib/types/ecb-courses';

function expiryLabel(expiresDate?: string): { label: string; style: string } | null {
  if (!expiresDate) return null;
  const today = new Date();
  const exp = new Date(expiresDate);
  const daysLeft = Math.ceil((exp.getTime() - today.getTime()) / 86400000);
  if (daysLeft < 0) return { label: 'Expired', style: 'bg-red-900/40 text-red-300' };
  if (daysLeft <= 90) return { label: `Expires ${exp.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`, style: 'bg-amber-900/40 text-amber-300' };
  return { label: `Expires ${exp.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`, style: 'bg-white/5 text-white/40' };
}

export function QualificationBadge({ qual }: { qual: MemberQualification }) {
  const course = qual.course;
  const cat = course ? CATEGORY_CONFIG[course.category] : null;
  const expiry = expiryLabel(qual.expires_date);

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 12,
      padding: '12px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {cat && <span style={{ fontSize: 16 }}>{cat.emoji}</span>}
        <span style={{ fontWeight: 600, fontSize: 14, color: '#fff', flex: 1 }}>{course?.name ?? 'Unknown course'}</span>
        {qual.is_verified && (
          <span title="Verified by club admin" style={{ fontSize: 16 }}>✅</span>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
          Completed {new Date(qual.completed_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>

        {expiry && (
          <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 20 }} className={expiry.style}>
            {expiry.label}
          </span>
        )}

        {qual.creds_awarded > 0 && (
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: 20,
            background: 'rgba(155,28,28,0.3)',
            color: '#f87171',
          }}>
            +{qual.creds_awarded} Scores
          </span>
        )}
      </div>

      {qual.certificate_number && (
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
          Cert # {qual.certificate_number}
        </span>
      )}
    </div>
  );
}
