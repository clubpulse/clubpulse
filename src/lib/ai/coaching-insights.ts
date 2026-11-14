import Anthropic from '@anthropic-ai/sdk';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getAnthropic, parseJsonObject } from '@/lib/ai/client';
import { createAdminClient } from '@/lib/supabase/admin';

// Tier 1 coaching insights: when a Match Day scorecard is completed, each player's batting and
// bowling lines are copied into player_innings / player_bowling, then Claude compares the match
// with their last 10 innings and spells and writes three insights per player. Server-only.

const MODEL = 'claude-opus-5-5';
const HISTORY_LIMIT = 10;
const INSIGHTS_PER_PLAYER = 3;
// Players are processed a few at a time so a full XI doesn't burst the rate limit
const CONCURRENCY = 3;

export const INSIGHT_TYPES = ['strength', 'focus_area', 'trend', 'technique'] as const;
export type InsightType = (typeof INSIGHT_TYPES)[number];

type Innings = { match_id: string; runs: number; balls: number; dismissal_type: string | null; batting_position: number | null; phase: string | null; is_not_out: boolean; created_at: string };
type Spell = { match_id: string; overs: number; runs_conceded: number; wickets: number; economy: number | null; conditions: string | null; created_at: string };
type GeneratedInsight = { insight_type: InsightType; finding: string; recommendation: string };

const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    insights: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          insight_type: { type: 'string', enum: [...INSIGHT_TYPES] },
          finding: { type: 'string' },
          recommendation: { type: 'string' },
        },
        required: ['insight_type', 'finding', 'recommendation'],
        additionalProperties: false,
      },
    },
  },
  required: ['insights'],
  additionalProperties: false,
};

// DRAFT PROMPT: placeholder until the agreed coaching prompt is supplied. Keep the output contract
// (exactly three insights matching OUTPUT_SCHEMA) when replacing it.
function buildPrompt(input: {
  opposition: string;
  matchDate: string;
  thisInnings: Innings | null;
  thisSpell: Spell | null;
  recentInnings: Innings[];
  recentSpells: Spell[];
}): { system: string; user: string } {
  const system = [
    'You are an experienced cricket coach working with amateur club players at a grassroots club.',
    `Write exactly ${INSIGHTS_PER_PLAYER} coaching insights for one player, grounded only in the numbers provided.`,
    'Each insight has a short "finding" (what the data shows, citing the figures) and a "recommendation"',
    '(one concrete thing to work on at the next training session). Be specific, encouraging and plain-spoken;',
    'no generic advice, no invented stats. If there is little history, say what to watch for over the next few games.',
    `insight_type must be one of: ${INSIGHT_TYPES.join(', ')}.`,
  ].join(' ');

  const user = JSON.stringify(
    {
      match: { opposition: input.opposition, date: input.matchDate },
      this_match: { batting: input.thisInnings, bowling: input.thisSpell },
      last_innings: input.recentInnings,
      last_spells: input.recentSpells,
    },
    null,
    2,
  );
  return { system, user };
}

function isNotOut(howOut: string | null) {
  return !!howOut && /not out|retired/i.test(howOut);
}

// Copies the completed scorecard's per-player lines into the coaching tables (idempotent)
async function syncMatchLines(admin: SupabaseClient, matchId: string): Promise<string[]> {
  const { data: scores, error } = await admin
    .from('match_player_scores')
    .select('user_id, runs, balls_faced, how_out, batting_position, overs_bowled, runs_conceded, wickets')
    .eq('scorecard_id', matchId);
  if (error) throw new Error(`Couldn't load player scores: ${error.message}`);

  const rows = scores ?? [];
  const innings = rows
    .filter((s) => s.how_out !== 'did not bat' && ((s.balls_faced ?? 0) > 0 || (s.runs ?? 0) > 0 || s.how_out))
    .map((s) => ({
      player_id: s.user_id,
      match_id: matchId,
      runs: s.runs ?? 0,
      balls: s.balls_faced ?? 0,
      dismissal_type: s.how_out,
      batting_position: s.batting_position,
      is_not_out: isNotOut(s.how_out),
    }));
  const spells = rows
    .filter((s) => Number(s.overs_bowled ?? 0) > 0)
    .map((s) => ({
      player_id: s.user_id,
      match_id: matchId,
      overs: s.overs_bowled,
      runs_conceded: s.runs_conceded ?? 0,
      wickets: s.wickets ?? 0,
    }));

  if (innings.length) {
    const { error: e } = await admin.from('player_innings').upsert(innings, { onConflict: 'player_id,match_id' });
    if (e) throw new Error(`Couldn't save innings: ${e.message}`);
  }
  if (spells.length) {
    const { error: e } = await admin.from('player_bowling').upsert(spells, { onConflict: 'player_id,match_id' });
    if (e) throw new Error(`Couldn't save bowling: ${e.message}`);
  }
  return [...new Set([...innings.map((i) => i.player_id), ...spells.map((s) => s.player_id)])];
}

async function askClaude(prompt: { system: string; user: string }): Promise<GeneratedInsight[]> {
  let message: Anthropic.Beta.BetaMessage;
  try {
    message = await getAnthropic().beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      // On a safety decline the API re-runs the request on Anthropic's recommended fallback model
      fallbacks: 'default',
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: OUTPUT_SCHEMA } },
      system: prompt.system,
      messages: [{ role: 'user', content: prompt.user }],
    });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) throw new Error('Anthropic rate limit reached; try again shortly');
    if (err instanceof Anthropic.APIError) throw new Error(`Anthropic API error ${err.status}: ${err.message}`);
    throw err;
  }

  if (message.stop_reason === 'refusal') throw new Error('The model declined to generate insights');
  if (message.stop_reason === 'max_tokens') throw new Error('The insight response was cut off');

  const text = message.content
    .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');
  const parsed = parseJsonObject<{ insights?: GeneratedInsight[] }>(text);
  const insights = (parsed?.insights ?? []).filter(
    (i) => (INSIGHT_TYPES as readonly string[]).includes(i.insight_type) && i.finding?.trim() && i.recommendation?.trim(),
  );
  if (insights.length < INSIGHTS_PER_PLAYER) throw new Error('The model returned fewer than three usable insights');
  return insights.slice(0, INSIGHTS_PER_PLAYER);
}

async function generateForPlayer(
  admin: SupabaseClient,
  match: { id: string; opposition: string; match_date: string },
  playerId: string,
): Promise<boolean> {
  // Re-running a match never duplicates a player's insights
  const { count } = await admin
    .from('coaching_insights')
    .select('id', { count: 'exact', head: true })
    .eq('match_id', match.id)
    .eq('player_id', playerId);
  if (count) return false;

  const [inningsRes, spellsRes] = await Promise.all([
    admin.from('player_innings')
      .select('match_id, runs, balls, dismissal_type, batting_position, phase, is_not_out, created_at')
      .eq('player_id', playerId).order('created_at', { ascending: false }).limit(HISTORY_LIMIT + 1),
    admin.from('player_bowling')
      .select('match_id, overs, runs_conceded, wickets, economy, conditions, created_at')
      .eq('player_id', playerId).order('created_at', { ascending: false }).limit(HISTORY_LIMIT + 1),
  ]);
  const allInnings = (inningsRes.data ?? []) as Innings[];
  const allSpells = (spellsRes.data ?? []) as Spell[];

  const insights = await askClaude(buildPrompt({
    opposition: match.opposition,
    matchDate: match.match_date,
    thisInnings: allInnings.find((i) => i.match_id === match.id) ?? null,
    thisSpell: allSpells.find((s) => s.match_id === match.id) ?? null,
    recentInnings: allInnings.filter((i) => i.match_id !== match.id).slice(0, HISTORY_LIMIT),
    recentSpells: allSpells.filter((s) => s.match_id !== match.id).slice(0, HISTORY_LIMIT),
  }));

  const { error } = await admin.from('coaching_insights').insert(
    insights.map((i) => ({ player_id: playerId, match_id: match.id, tier: 1, ...i })),
  );
  if (error) throw new Error(`Couldn't save insights: ${error.message}`);
  return true;
}

// Returns how many players got new insights; failures for one player don't stop the others
export async function generateCoachingInsights(matchId: string): Promise<{ players_processed: number; errors: string[] }> {
  const admin = createAdminClient();
  const { data: match, error } = await admin
    .from('match_scorecards')
    .select('id, opposition, match_date, status')
    .eq('id', matchId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!match) throw new Error('Match not found');
  if (match.status !== 'completed') throw new Error('Insights are generated once the match is completed');

  const players = await syncMatchLines(admin, matchId);
  let processed = 0;
  const errors: string[] = [];

  for (let i = 0; i < players.length; i += CONCURRENCY) {
    const batch = players.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(batch.map((playerId) => generateForPlayer(admin, match, playerId)));
    results.forEach((r, j) => {
      if (r.status === 'fulfilled') processed += r.value ? 1 : 0;
      else errors.push(`${batch[j]}: ${r.reason instanceof Error ? r.reason.message : String(r.reason)}`);
    });
  }

  if (errors.length) console.error(`[coaching-insights] match ${matchId}:`, errors);
  return { players_processed: processed, errors };
}
