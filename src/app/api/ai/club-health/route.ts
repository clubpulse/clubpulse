// GET /api/ai/club-health → { score: number, grade: string, pillars: Pillar[], summary: string }
// Club-admin only. Returns an AI-generated health score for the club.

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { getUserRoles } from '@/lib/auth/admin';
import { createClient } from '@/lib/supabase/server';
import { fail, unauthorized } from '@/lib/utils/http';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

interface Pillar {
  name: string;
  score: number;    // 0-100
  label: string;   // e.g. "Strong", "Needs attention"
  detail: string;
}

interface ClubHealth {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  pillars: Pillar[];
  summary: string;
  generatedAt: string;
}

function scoreToGrade(score: number): ClubHealth['grade'] {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

export async function GET(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();

  const roles = await getUserRoles(user.id);
  if (!roles.includes('admin') && !roles.includes('club_admin')) {
    return fail('Admin access required', 403);
  }

  const supabase = await createClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: activeMembers },
    { count: totalMembers },
    { count: volunteerSessions },
    { count: scorecardSubmissions },
    { data: recentTransactions },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).not('sport', 'is', null),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('volunteer_sessions').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo),
    supabase.from('wallet_transactions').select('*', { count: 'exact', head: true })
      .eq('category', 'performance').gte('occurred_at', thirtyDaysAgo),
    supabase.from('wallet_transactions').select('amount')
      .gte('occurred_at', thirtyDaysAgo).gt('amount', 0).limit(200),
  ]);

  const engagementRate = totalMembers ? Math.round(((activeMembers ?? 0) / totalMembers) * 100) : 0;
  const totalScoresEarned = recentTransactions?.reduce((s, t) => s + t.amount, 0) ?? 0;
  const avgScoresPerMember = totalMembers ? Math.round(totalScoresEarned / totalMembers) : 0;

  const prompt = `You are a sports club analyst for ClubPulse. Generate a health score for this grassroots cricket club.

Club stats (last 30 days):
- Total members: ${totalMembers ?? 0}
- Active members (have a sport set): ${activeMembers ?? 0}
- Engagement rate: ${engagementRate}%
- Volunteer sessions logged: ${volunteerSessions ?? 0}
- Performance scorecards submitted: ${scorecardSubmissions ?? 0}
- Total Scores earned by members: ${totalScoresEarned}
- Average Scores per member: ${avgScoresPerMember}

Return JSON with this exact shape:
{
  "score": 72,
  "pillars": [
    { "name": "Member engagement", "score": 65, "label": "Improving", "detail": "one specific sentence" },
    { "name": "Volunteer activity", "score": 80, "label": "Strong", "detail": "one specific sentence" },
    { "name": "Performance tracking", "score": 70, "label": "Good", "detail": "one specific sentence" },
    { "name": "Scores economy", "score": 75, "label": "Healthy", "detail": "one specific sentence" }
  ],
  "summary": "2-3 sentence overall assessment with one concrete recommendation"
}

Scoring guide:
- 85-100: Excellent / Thriving
- 70-84: Good / Strong
- 55-69: Average / Improving
- 40-54: Below average / Needs attention
- 0-39: Poor / Critical

Be honest and specific to the numbers. Each pillar score should reflect the actual data.`;

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 700,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON');

    const parsed = JSON.parse(jsonMatch[0]) as Omit<ClubHealth, 'grade' | 'generatedAt'>;
    return NextResponse.json({
      ...parsed,
      grade: scoreToGrade(parsed.score),
      generatedAt: new Date().toISOString(),
    });
  } catch {
    // Compute a simple fallback score
    const fallbackScore = Math.round(
      (engagementRate * 0.4) +
      (Math.min(100, (volunteerSessions ?? 0) * 10) * 0.2) +
      (Math.min(100, (scorecardSubmissions ?? 0) * 5) * 0.2) +
      (Math.min(100, avgScoresPerMember) * 0.2)
    );

    return NextResponse.json({
      score: fallbackScore,
      grade: scoreToGrade(fallbackScore),
      pillars: [
        { name: 'Member engagement', score: engagementRate, label: engagementRate >= 70 ? 'Strong' : 'Needs attention', detail: `${activeMembers ?? 0} of ${totalMembers ?? 0} members have completed their profile.` },
        { name: 'Volunteer activity', score: Math.min(100, (volunteerSessions ?? 0) * 10), label: (volunteerSessions ?? 0) >= 5 ? 'Active' : 'Low', detail: `${volunteerSessions ?? 0} volunteer sessions logged this month.` },
        { name: 'Performance tracking', score: Math.min(100, (scorecardSubmissions ?? 0) * 5), label: (scorecardSubmissions ?? 0) >= 10 ? 'Good' : 'Growing', detail: `${scorecardSubmissions ?? 0} scorecards submitted this month.` },
        { name: 'Scores economy', score: Math.min(100, avgScoresPerMember), label: avgScoresPerMember >= 50 ? 'Healthy' : 'Early stage', detail: `Members average ${avgScoresPerMember} Scores earned this month.` },
      ],
      summary: `Your club has ${totalMembers ?? 0} members with ${engagementRate}% actively engaged. Focus on encouraging more performance logging and volunteer sign-ups to improve the health score.`,
      generatedAt: new Date().toISOString(),
    });
  }
}
