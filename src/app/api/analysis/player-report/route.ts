/**
 * POST /api/analysis/player-report
 *
 * Generates a structured AI player report for a given user based on their
 * last N match performances. Called server-side after a match is completed,
 * or on-demand from the player's report page.
 *
 * Security: Anthropic API key never reaches the client.
 *
 * Body: { userId?: string }  — omit to use the authenticated user's own data
 * Response: {
 *   report: {
 *     summary: string
 *     battingAnalysis: string
 *     bowlingAnalysis: string
 *     keyStrengths: string[]
 *     focusAreas: string[]
 *     nextMatchTarget: string
 *     formRating: 'excellent' | 'good' | 'average' | 'poor'
 *     trend: 'rising' | 'steady' | 'falling'
 *   }
 *   matchesAnalysed: number
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

    const body = await req.json() as { userId?: string };
    // Only allow fetching own report (or admin fetching any player's)
    const targetUserId = body.userId ?? user.id;

    const admin = createAdminClient();

    // If requesting another player's report, verify admin role
    if (targetUserId !== user.id) {
      const { data: membership } = await admin
        .from('club_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();
      if (!membership || !['admin', 'club_admin', 'coach'].includes(membership.role)) {
        return NextResponse.json({ error: 'Admin access required to view other players\' reports' }, { status: 403 });
      }
    }

    // ── Fetch last 10 match performances ────────────────────────────────────
    const { data: performances } = await admin
      .from('match_performances')
      .select('match_date, opponent, runs_scored, balls_faced, overs_bowled, runs_conceded, wickets_taken, catches, run_outs, dismissal_type')
      .eq('user_id', targetUserId)
      .order('match_date', { ascending: false })
      .limit(10);

    if (!performances || performances.length === 0) {
      return NextResponse.json({ error: 'No match data found. Play some matches first.' }, { status: 404 });
    }

    // ── Fetch form rating if available ───────────────────────────────────────
    const { data: formRating } = await admin
      .from('form_ratings')
      .select('rating, trend, matches_played')
      .eq('user_id', targetUserId)
      .maybeSingle();

    // ── Compute aggregates ──────────────────────────────────────────────────
    const innings = performances.filter(p => p.balls_faced > 0 || p.runs_scored > 0);
    const bowlingInnings = performances.filter(p => Number(p.overs_bowled) > 0);

    const totalRuns = innings.reduce((s, p) => s + p.runs_scored, 0);
    const totalBalls = innings.reduce((s, p) => s + p.balls_faced, 0);
    const totalWickets = bowlingInnings.reduce((s, p) => s + p.wickets_taken, 0);
    const totalRunsConceded = bowlingInnings.reduce((s, p) => s + p.runs_conceded, 0);
    const totalOvers = bowlingInnings.reduce((s, p) => s + Number(p.overs_bowled), 0);

    const battingAverage = innings.length > 0 ? (totalRuns / Math.max(1, innings.filter(p => p.dismissal_type !== 'not_out').length)).toFixed(1) : 'N/A';
    const strikeRate = totalBalls > 0 ? ((totalRuns / totalBalls) * 100).toFixed(1) : 'N/A';
    const economy = totalOvers > 0 ? (totalRunsConceded / totalOvers).toFixed(2) : 'N/A';
    const bowlingAverage = totalWickets > 0 ? (totalRunsConceded / totalWickets).toFixed(1) : 'N/A';

    const stats = {
      matchesAnalysed: performances.length,
      batting: innings.length > 0 ? {
        innings: innings.length,
        totalRuns,
        average: battingAverage,
        strikeRate,
        highScore: Math.max(...innings.map(p => p.runs_scored)),
        recentScores: innings.slice(0, 5).map(p => p.runs_scored),
        dismissalTypes: innings.map(p => p.dismissal_type).filter(Boolean),
      } : null,
      bowling: bowlingInnings.length > 0 ? {
        innings: bowlingInnings.length,
        totalWickets,
        average: bowlingAverage,
        economy,
        recentWickets: bowlingInnings.slice(0, 5).map(p => p.wickets_taken),
      } : null,
      fielding: {
        catches: performances.reduce((s, p) => s + (p.catches ?? 0), 0),
        runOuts: performances.reduce((s, p) => s + (p.run_outs ?? 0), 0),
      },
      formRating: formRating?.rating ?? null,
      formTrend: formRating?.trend ?? 'steady',
      recentOpponents: performances.slice(0, 5).map(p => ({ opponent: p.opponent, date: p.match_date })),
    };

    // ── Build Claude prompt ──────────────────────────────────────────────────
    const prompt = `You are ClubPulse's AI coaching analyst. Based on a grassroots cricket player's last ${performances.length} matches, generate a structured player performance report.

Player statistics:
${JSON.stringify(stats, null, 2)}

Return ONLY valid JSON matching exactly this structure (no markdown, no explanation):
{
  "summary": "2-3 sentence overall assessment of this player's recent form and contribution",
  "battingAnalysis": "2-3 sentences on batting performance, trends, strengths and areas to improve. Omit if no batting data.",
  "bowlingAnalysis": "2-3 sentences on bowling performance, economy, wicket-taking ability. Omit if no bowling data.",
  "keyStrengths": ["strength 1", "strength 2", "strength 3"],
  "focusAreas": ["area to improve 1", "area to improve 2"],
  "nextMatchTarget": "One specific, achievable target for their next match",
  "formRating": "excellent|good|average|poor",
  "trend": "rising|steady|falling"
}

Base formRating on: excellent=averaging 40+ or economy<5, good=averaging 25-40, average=15-25, poor=below 15.
Base trend on the direction of their last 3 vs previous 3 matches.`;

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    });

    const rawText = (message.content[0] as { type: string; text: string }).text.trim();

    let report: Record<string, unknown>;
    try {
      // Strip any markdown code fences if present
      const cleaned = rawText.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();
      report = JSON.parse(cleaned) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI report' }, { status: 500 });
    }

    return NextResponse.json({ report, matchesAnalysed: performances.length, stats });
  } catch (err) {
    console.error('[player-report]', err);
    return NextResponse.json({ error: 'Failed to generate player report' }, { status: 500 });
  }
}
