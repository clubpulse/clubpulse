/**
 * POST /api/admin/nl-query
 *
 * Accepts a plain-English question from a club admin and answers it using
 * the club's data from Supabase. Claude is given the schema and a snapshot
 * of relevant data, then asked to answer in plain English.
 *
 * Security:
 *   - Caller must be authenticated and have admin/coach role in the club
 *   - Anthropic API key never reaches the client
 *   - No raw SQL is generated or executed — Claude answers from provided data
 *
 * Body: { question: string; clubId: string }
 * Response: { answer: string; dataUsed: string[] }
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MAX_QUESTION_LENGTH = 500;

export async function POST(req: NextRequest) {
  try {
    // ── Auth ────────────────────────────────────────────────────────────────
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

    const body = await req.json() as { question?: string; clubId?: string };
    const { question, clubId } = body;

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }
    if (question.length > MAX_QUESTION_LENGTH) {
      return NextResponse.json({ error: `Question too long (max ${MAX_QUESTION_LENGTH} chars)` }, { status: 400 });
    }
    if (!clubId) {
      return NextResponse.json({ error: 'clubId is required' }, { status: 400 });
    }

    // ── Verify admin role ───────────────────────────────────────────────────
    const admin = createAdminClient();
    const { data: membership } = await admin
      .from('club_members')
      .select('role')
      .eq('club_id', clubId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (!membership || !['admin', 'club_admin', 'coach'].includes(membership.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // ── Gather club data snapshot ────────────────────────────────────────────
    const dataUsed: string[] = [];

    // Members
    const { data: members } = await admin
      .from('club_members')
      .select('user_id, role, joined_at, is_active')
      .eq('club_id', clubId);
    if (members?.length) dataUsed.push('club_members');

    // Match performances
    const { data: performances } = await admin
      .from('match_performances')
      .select('user_id, match_date, opponent, runs_scored, balls_faced, overs_bowled, runs_conceded, wickets_taken, catches, dismissal_type')
      .eq('club_id', clubId)
      .order('match_date', { ascending: false })
      .limit(100);
    if (performances?.length) dataUsed.push('match_performances');

    // Fixtures
    const { data: fixtures } = await admin
      .from('fixtures')
      .select('opponent, match_date, venue, format, result')
      .eq('club_id', clubId)
      .order('match_date', { ascending: false })
      .limit(30);
    if (fixtures?.length) dataUsed.push('fixtures');

    // Form ratings
    const { data: formRatings } = await admin
      .from('form_ratings')
      .select('user_id, rating, trend, matches_played, last_5_scores, last_5_wickets')
      .eq('club_id', clubId);
    if (formRatings?.length) dataUsed.push('form_ratings');

    // Availability
    const { data: availability } = await admin
      .from('fixture_availability')
      .select('fixture_id, user_id, status')
      .limit(200);
    if (availability?.length) dataUsed.push('fixture_availability');

    // User profiles (display names)
    const userIds = [...new Set([
      ...(members ?? []).map(m => m.user_id),
    ])];
    let profiles: Array<{ id: string; full_name?: string; email?: string }> = [];
    if (userIds.length > 0) {
      const { data: p } = await admin
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds.slice(0, 50));
      profiles = (p ?? []) as typeof profiles;
      if (profiles.length) dataUsed.push('profiles');
    }

    // Build a name lookup
    const nameMap: Record<string, string> = {};
    for (const p of profiles) {
      nameMap[p.id] = p.full_name ?? `Player ${p.id.slice(0, 6)}`;
    }

    // Enrich performances with names
    const namedPerformances = (performances ?? []).map(p => ({
      ...p,
      player: nameMap[p.user_id] ?? `Player ${p.user_id.slice(0, 6)}`,
    }));

    const namedFormRatings = (formRatings ?? []).map(f => ({
      ...f,
      player: nameMap[f.user_id] ?? `Player ${f.user_id.slice(0, 6)}`,
    }));

    // ── Build Claude prompt ──────────────────────────────────────────────────
    const dataContext = JSON.stringify({
      members: (members ?? []).map(m => ({
        player: nameMap[m.user_id] ?? `Player ${m.user_id.slice(0, 6)}`,
        role: m.role,
        joined: m.joined_at?.slice(0, 10),
        active: m.is_active,
      })),
      recentMatches: namedPerformances.slice(0, 50),
      fixtures: fixtures ?? [],
      formRatings: namedFormRatings,
    }, null, 2);

    const systemPrompt = `You are ClubPulse Analytics — an intelligent data assistant for grassroots cricket clubs.
You have been given a JSON snapshot of the club's data. Answer the admin's question in clear, direct, plain English.

Rules:
- Answer ONLY from the data provided. Never invent stats.
- If the data doesn't contain enough information, say so clearly and explain what data would be needed.
- For player comparisons, use names from the data.
- Keep answers concise — 2-5 sentences max unless a list is genuinely needed.
- For lists (e.g. top batters), show max 5 entries.
- Use cricket terminology naturally (batting average, economy rate, etc.).
- Today's date: ${new Date().toISOString().slice(0, 10)}`;

    const userPrompt = `Club data snapshot:\n${dataContext}\n\nAdmin question: ${question.trim()}`;

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const answer = (message.content[0] as { type: string; text: string }).text.trim();

    return NextResponse.json({ answer, dataUsed });
  } catch (err) {
    console.error('[nl-query]', err);
    return NextResponse.json({ error: 'Failed to process query' }, { status: 500 });
  }
}
