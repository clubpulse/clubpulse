/**
 * POST /api/fixtures/opposition-intel
 *
 * Fetches recent PlayCricket results for an opposition club/team and uses
 * Claude to generate a captain's pre-match briefing card.
 *
 * PlayCricket API docs: https://play-cricket.ecb.co.uk
 * - GET http://play-cricket.com/api/v2/result_summary.json
 *   params: api_token, site_id (opposition's PlayCricket site ID), season
 *
 * Security: Anthropic API key never reaches the client.
 *           PlayCricket API token kept server-side.
 *
 * Body: { opponent: string; opponentSiteId?: string; fixtureId?: string; venue?: string; matchDate?: string }
 * Response: { briefing: { ... } }
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const PLAYCRICKET_TOKEN = process.env.PLAYCRICKET_API_TOKEN ?? '';

const CURRENT_SEASON = new Date().getFullYear().toString();

type PlayCricketInnings = {
  team_batting_id: string | number;
  innings_number: number;
  runs: number;
  wickets: number;
  overs: string;
};

type PlayCricketMatch = {
  id: number;
  match_date: string;
  home_team_name: string;
  away_team_name: string;
  home_club_name: string;
  away_club_name: string;
  result_description: string;
  result: string;
  home_team_id: string | number;
  away_team_id: string | number;
  ground_name: string;
  innings: PlayCricketInnings[];
  competition_name: string;
};

async function fetchPlayCricketResults(siteId: string): Promise<PlayCricketMatch[]> {
  if (!siteId || !PLAYCRICKET_TOKEN) return [];

  try {
    const url = new URL('http://play-cricket.com/api/v2/result_summary.json');
    url.searchParams.set('api_token', PLAYCRICKET_TOKEN);
    url.searchParams.set('site_id', siteId);
    url.searchParams.set('season', CURRENT_SEASON);

    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return [];
    const data = await res.json() as { result_summary?: PlayCricketMatch[] };
    return (data.result_summary ?? []).slice(0, 10); // last 10 results
  } catch {
    return [];
  }
}

function summariseResults(matches: PlayCricketMatch[], opponentName: string) {
  const wins = matches.filter(m =>
    (m.result_description ?? '').toLowerCase().includes('won') &&
    (m.home_club_name?.toLowerCase().includes(opponentName.toLowerCase()) || m.away_club_name?.toLowerCase().includes(opponentName.toLowerCase()))
  );

  return matches.map(m => ({
    date: m.match_date,
    competition: m.competition_name,
    homeTeam: m.home_team_name,
    awayTeam: m.away_team_name,
    result: m.result_description || m.result,
    venue: m.ground_name,
    innings: (m.innings ?? []).map(i => ({
      innings: i.innings_number,
      runs: i.runs,
      wickets: i.wickets,
      overs: i.overs,
    })),
  }));
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

    const body = await req.json() as {
      opponent?: string;
      opponentSiteId?: string;
      venue?: string;
      matchDate?: string;
      fixtureId?: string;
    };

    const { opponent, opponentSiteId, venue, matchDate } = body;

    if (!opponent) {
      return NextResponse.json({ error: 'opponent name is required' }, { status: 400 });
    }

    // ── Fetch PlayCricket data if site ID provided ────────────────────────────
    let playCricketData: ReturnType<typeof summariseResults> = [];
    if (opponentSiteId) {
      const rawMatches = await fetchPlayCricketResults(opponentSiteId);
      playCricketData = summariseResults(rawMatches, opponent);
    }

    const hasRealData = playCricketData.length > 0;

    // ── Build Claude prompt ──────────────────────────────────────────────────
    const dataSection = hasRealData
      ? `Recent PlayCricket results for ${opponent}:\n${JSON.stringify(playCricketData, null, 2)}`
      : `No PlayCricket data available for ${opponent}. Generate a general tactical briefing based on the opponent name and any context provided.`;

    const contextSection = [
      venue ? `Venue: ${venue}` : null,
      matchDate ? `Match date: ${matchDate}` : null,
    ].filter(Boolean).join('\n');

    const prompt = `You are ClubPulse's opposition intelligence analyst for grassroots cricket. Generate a concise captain's pre-match briefing for an upcoming fixture.

Opponent: ${opponent}
${contextSection}

${dataSection}

Return ONLY valid JSON (no markdown, no explanation) matching exactly this structure:
{
  "headline": "One punchy sentence summarising the main threat or opportunity",
  "recentForm": "2-3 sentences on their recent form — wins, losses, run rates, any patterns",
  "keyThreats": ["threat 1", "threat 2", "threat 3"],
  "opportunities": ["opportunity 1", "opportunity 2"],
  "tacticalTips": ["tip 1", "tip 2", "tip 3"],
  "targetScore": "Suggested first innings target or chase target range based on their recent innings scores, or null if insufficient data",
  "confidence": "high|medium|low"
}

confidence should be: high if 5+ real matches available, medium if 1-4, low if no real data.
Keep all fields concise — this is a briefing, not an essay. Use cricket terminology naturally.`;

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    });

    const rawText = (message.content[0] as { type: string; text: string }).text.trim();

    let briefing: Record<string, unknown>;
    try {
      const cleaned = rawText.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();
      briefing = JSON.parse(cleaned) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI briefing' }, { status: 500 });
    }

    return NextResponse.json({
      briefing,
      opponent,
      matchDate,
      venue,
      dataSource: hasRealData ? 'playcricket' : 'ai-general',
      matchesAnalysed: playCricketData.length,
    });
  } catch (err) {
    console.error('[opposition-intel]', err);
    return NextResponse.json({ error: 'Failed to generate opposition briefing' }, { status: 500 });
  }
}
