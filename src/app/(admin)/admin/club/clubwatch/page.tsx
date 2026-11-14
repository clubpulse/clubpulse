import { requireClubAdminPage } from '@/lib/auth/admin-page';
import { createAdminClient } from '@/lib/supabase/admin';
import { AdminReviewClient } from '@/components/clubwatch/AdminReviewClient';

export default async function AdminClubWatchPage() {
  const { clubId } = await requireClubAdminPage();

  const admin = createAdminClient();

  // Fetch all reports for this club with category info
  const { data: rawReports } = await admin
    .from('clubwatch_reports')
    .select('id, user_id, category, note, photo_url, status, scores_awarded, review_note, created_at')
    .eq('club_id', clubId)
    .order('created_at', { ascending: false })
    .limit(200);

  const reports = rawReports ?? [];

  // Enrich with reporter names and category details
  const userIds = [...new Set(reports.map(r => r.user_id))];
  const categoryKeys = [...new Set(reports.map(r => r.category))];

  const [profilesRes, categoriesRes] = await Promise.all([
    userIds.length > 0
      ? admin.from('profiles').select('id, full_name, display_name').in('id', userIds)
      : Promise.resolve({ data: [] }),
    categoryKeys.length > 0
      ? admin.from('clubwatch_categories').select('key, label, icon, scores').in('key', categoryKeys)
      : Promise.resolve({ data: [] }),
  ]);

  const nameMap: Record<string, string> = {};
  for (const p of profilesRes.data ?? []) {
    nameMap[p.id] = p.display_name || p.full_name || 'Member';
  }

  const catMap: Record<string, { label: string; icon: string; scores: number }> = {};
  for (const c of categoriesRes.data ?? []) {
    catMap[c.key] = { label: c.label, icon: c.icon, scores: c.scores };
  }

  const enrichedReports = reports.map(r => ({
    id: r.id,
    user_id: r.user_id,
    category: r.category,
    note: r.note,
    photo_url: r.photo_url,
    status: r.status as 'pending' | 'verified' | 'rejected',
    scores_awarded: r.scores_awarded ?? 0,
    created_at: r.created_at,
    reporter_name: nameMap[r.user_id] ?? 'Member',
    category_label: catMap[r.category]?.label ?? r.category,
    category_icon: catMap[r.category]?.icon ?? '📋',
    category_scores: catMap[r.category]?.scores ?? 10,
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: "'Inter', sans-serif" }}>
      <div>
        <h1 style={{
          fontFamily: "'Syne', sans-serif", fontWeight: 800,
          fontSize: '22px', color: '#fff', margin: '0 0 2px', letterSpacing: '-0.3px',
        }}>
          📸 ClubWatch Review
        </h1>
        <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
          Review member reports, verify issues, and award Scores
        </p>
      </div>
      <AdminReviewClient reports={enrichedReports} />
    </div>
  );
}
