// POST /api/ai/scorecard-parse  multipart/form-data { image: File }
// → { batting?: BattingLine, bowling?: BowlingLine, rawText: string, scoresAwarded: number }
// Parses a cricket scorecard photo and auto-awards Scores for the performance.

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { createClient } from '@/lib/supabase/server';
import { fail, unauthorized } from '@/lib/utils/http';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

interface BattingLine {
  runs: number;
  balls: number;
  fours?: number;
  sixes?: number;
  strikeRate?: number;
  howOut?: string;
}

interface BowlingLine {
  overs: number;
  maidens?: number;
  runs: number;
  wickets: number;
  economy?: number;
}

interface ParseResult {
  batting?: BattingLine;
  bowling?: BowlingLine;
  matchDate?: string;
  opposition?: string;
  rawText: string;
  scoresAwarded: number;
}

function calcScores(batting?: BattingLine, bowling?: BowlingLine): number {
  let total = 0;
  if (batting) {
    total += Math.floor(batting.runs * 0.5);              // 0.5 Scores per run
    total += (batting.fours ?? 0) * 2;                    // bonus per boundary
    total += (batting.sixes ?? 0) * 5;                    // bonus per six
    if (batting.runs >= 50) total += 25;                   // half-century bonus
    if (batting.runs >= 100) total += 75;                  // century bonus
  }
  if (bowling) {
    total += bowling.wickets * 20;                         // 20 Scores per wicket
    total += (bowling.maidens ?? 0) * 5;                   // 5 Scores per maiden
    if (bowling.wickets >= 5) total += 40;                 // 5-wicket haul bonus
  }
  return Math.max(10, total);                              // minimum 10 for trying
}

export async function POST(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();

  let imageData: string;
  let mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';

  try {
    const formData = await req.formData();
    const file = formData.get('image') as File | null;
    if (!file) return fail('image is required', 400);

    const bytes = await file.arrayBuffer();
    imageData = Buffer.from(bytes).toString('base64');
    const mime = file.type;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(mime)) {
      return fail('Unsupported image type — send JPEG, PNG or WebP', 400);
    }
    mediaType = mime as typeof mediaType;
  } catch {
    return fail('Could not read image', 400);
  }

  const prompt = `You are analysing a cricket scorecard image. Extract this player's individual performance stats.

Return a JSON object with this exact structure (omit fields you cannot read):
{
  "batting": {
    "runs": 42,
    "balls": 38,
    "fours": 5,
    "sixes": 1,
    "strikeRate": 110.5,
    "howOut": "caught"
  },
  "bowling": {
    "overs": 4,
    "maidens": 1,
    "runs": 22,
    "wickets": 2,
    "economy": 5.5
  },
  "matchDate": "2024-06-15",
  "opposition": "Town CC",
  "rawText": "brief summary of what you read"
}

Only include "batting" if you can see batting figures. Only include "bowling" if you can see bowling figures.
If neither are visible, return { "rawText": "Could not read performance stats from this image" }.`;

  try {
    const message = await client.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 800,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageData } },
          { type: 'text', text: prompt },
        ],
      }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON');

    const parsed = JSON.parse(jsonMatch[0]) as Omit<ParseResult, 'scoresAwarded'>;
    const scoresAwarded = calcScores(parsed.batting, parsed.bowling);

    // Award Scores if we found real stats
    if (parsed.batting || parsed.bowling) {
      const supabase = await createClient();
      await supabase.from('wallet_transactions').insert({
        user_id: user.id,
        amount: scoresAwarded,
        title: parsed.opposition
          ? `Match vs ${parsed.opposition} — scorecard`
          : 'Scorecard submission',
        category: 'performance',
        occurred_at: parsed.matchDate ?? new Date().toISOString(),
      });

      await supabase.rpc('increment_wallet_flexi', {
        p_user_id: user.id,
        p_amount: scoresAwarded,
      });
    }

    return NextResponse.json({ ...parsed, scoresAwarded });
  } catch (err) {
    console.error('[scorecard-parse]', err);
    return fail('Could not parse scorecard', 500);
  }
}
