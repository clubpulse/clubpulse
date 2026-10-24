import { requireUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { getMyCheckins, getThisWeeksCheckin } from '@/lib/actions/wellbeing';
import { CheckinForm } from '@/components/wellbeing/CheckinForm';
import { MyWellbeingChart } from '@/components/wellbeing/MyWellbeingChart';

export const metadata = { title: 'Wellbeing · ClubPulse' };

async function getClubId(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('club_members')
    .select('club_id')
    .eq('user_id', userId)
    .limit(1)
    .single();
  return data?.club_id ?? null;
}

export default async function WellbeingPage() {
  const user = await requireUser();
  const clubId = await getClubId(user.id);

  if (!clubId) {
    return (
      <p style={{ fontSize: '13px', color: '#f87171', fontFamily: "'Inter', sans-serif" }}>
        You are not a member of any club.
      </p>
    );
  }

  const [thisWeekResult, historyResult] = await Promise.all([
    getThisWeeksCheckin(clubId),
    getMyCheckins(clubId, 8),
  ]);

  const thisWeek = thisWeekResult.success ? thisWeekResult.data : null;
  const history = historyResult.success ? historyResult.data : [];

  return (
    <div style={{ maxWidth: '600px', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 800,
          fontSize: '24px',
          color: '#fff',
          margin: '0 0 6px',
          letterSpacing: '-0.3px',
        }}>
          🧡 Wellbeing Check-in
        </h1>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
          A private weekly check-in — only you see your responses. Your coach sees only anonymous group averages.
        </p>
      </div>

      {/* This week's check-in */}
      <div style={{
        background: '#0f0f0f',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '24px',
      }}>
        <h2 style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 700,
          fontSize: '16px',
          color: '#fff',
          margin: '0 0 16px',
        }}>
          This week
        </h2>

        {thisWeek ? (
          <div style={{
            background: 'rgba(16,185,129,0.08)',
            border: '1px solid rgba(16,185,129,0.2)',
            borderRadius: '12px',
            padding: '16px 18px',
          }}>
            <p style={{ margin: '0 0 6px', fontWeight: 600, color: '#10b981', fontSize: '14px' }}>
              ✓ Checked in — thank you
            </p>
            <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
              Physical: {thisWeek.physical_rating}/5 · Mental: {thisWeek.mental_rating}/5
            </p>
          </div>
        ) : (
          <CheckinForm clubId={clubId} />
        )}
      </div>

      {/* History */}
      <div style={{
        background: '#0f0f0f',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '20px',
      }}>
        <h2 style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 700,
          fontSize: '16px',
          color: '#fff',
          margin: '0 0 16px',
        }}>
          My last 8 weeks
        </h2>
        <MyWellbeingChart checkins={history} weeks={8} />
      </div>

      {/* Privacy note */}
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: '12px',
        padding: '14px 16px',
        display: 'flex',
        gap: '10px',
        alignItems: 'flex-start',
      }}>
        <span style={{ fontSize: '16px', flexShrink: 0 }}>🔒</span>
        <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
          <strong style={{ color: 'rgba(255,255,255,0.5)' }}>Your privacy is protected.</strong>{' '}
          Only you see your responses. Your coach sees only group averages (e.g. &ldquo;6 players rated physical below 3 this week&rdquo;) — never your individual rating, never your name.
        </p>
      </div>
    </div>
  );
}
