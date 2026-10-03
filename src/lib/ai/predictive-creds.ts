import { createAdminClient } from '@/lib/supabase/admin';
import { MODEL_FAST, extractText, getAnthropic, parseJsonObject } from '@/lib/ai/client';

export const CREDS_TIERS = [500, 1000, 1500, 2500] as const;

// sport_configs has no fixture list. Until it does, a config can carry
// earning_rules.season.remaining_fixtures; otherwise we assume this many.
const DEFAULT_REMAINING_FIXTURES = 10;

export type PredictiveCreds = {
  forecast:       number;        // projected season total
  currentPace:    number;        // Creds per week over the last 28 days
  nextTier:       number | null; // next of 500 / 1000 / 1500 / 2500 above current total
  sessionsNeeded: number | null; // sessions at the average rate to reach it
  message:        string;
};

const sum = (rows: { creds_earned: number }[] | null) =>
  (rows ?? []).reduce((total, row) => total + (row.creds_earned ?? 0), 0);

// userId must be verified by the caller. Reads use the service role, scoped by user_id.
export async function predictSeasonCreds(userId: string): Promise<PredictiveCreds> {
  const admin = createAdminClient();
  const seasonStart = `${new Date().getUTCFullYear()}-01-01`;
  const since = Date.now() - 28 * 86_400_000;
  const sinceIso = new Date(since).toISOString();
  const sinceDate = sinceIso.slice(0, 10);

  const [perfs, steps, configs] = await Promise.all([
    admin.from('performances').select('creds_earned, performed_at').eq('user_id', userId).gte('performed_at', seasonStart),
    admin.from('steps_log').select('creds_earned, log_date').eq('user_id', userId).gte('log_date', seasonStart),
    admin.from('sport_configs').select('earning_rules').eq('is_active', true),
  ]);

  const performanceCreds = sum(perfs.data);
  const stepCreds = sum(steps.data);
  const current = performanceCreds + stepCreds;
  const sessions = perfs.data?.length ?? 0;
  const avgPerSession = sessions > 0 ? performanceCreds / sessions : 0;

  const recentPerf = sum((perfs.data ?? []).filter((p) => p.performed_at >= sinceIso));
  const recentSteps = sum((steps.data ?? []).filter((s) => s.log_date >= sinceDate));
  const currentPace = Math.round((recentPerf + recentSteps) / 4);
  const stepsPerWeek = recentSteps / 4;

  const remainingFixtures =
    (configs.data ?? [])
      .map((c) => Number((c.earning_rules as { season?: { remaining_fixtures?: unknown } } | null)?.season?.remaining_fixtures))
      .find((n) => Number.isFinite(n) && n >= 0) ?? DEFAULT_REMAINING_FIXTURES;

  const baseline = Math.round(current + avgPerSession * remainingFixtures + stepsPerWeek * remainingFixtures);
  const nextTier = CREDS_TIERS.find((tier) => tier > current) ?? null;
  const sessionsNeeded = nextTier && avgPerSession > 0 ? Math.ceil((nextTier - current) / avgPerSession) : null;

  const fallbackMessage = nextTier
    ? `You're on track for about ${baseline} Creds this season. ${nextTier - current} more gets you to the ${nextTier} tier.`
    : `You're past every Creds tier this season. Keep stacking.`;

  let forecast = baseline;
  let message = fallbackMessage;

  try {
    const response = await getAnthropic().messages.create({
      model: MODEL_FAST,
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `You forecast a grassroots cricketer's season Creds total. Use only these numbers.

Creds earned so far this season: ${current} (${performanceCreds} from ${sessions} sessions, ${stepCreds} from steps)
Average per session: ${avgPerSession.toFixed(1)}
Pace over the last 28 days: ${currentPace} Creds per week
Fixtures remaining: ${remainingFixtures}
Baseline projection: ${baseline}
Next tier: ${nextTier ?? 'none left'}${sessionsNeeded ? ` (about ${sessionsNeeded} more sessions at their average)` : ''}

Return JSON only: {"forecast": <integer season total, not below ${current}>, "message": "<one or two encouraging sentences, specific to these numbers, British English>"}`,
      }],
    });

    const parsed = parseJsonObject<{ forecast?: unknown; message?: unknown }>(extractText(response));
    if (parsed) {
      const f = Number(parsed.forecast);
      // Keep the model on a leash: it may adjust the projection, not invent a wildly different one
      if (Number.isFinite(f) && f >= current && f <= baseline * 1.5 + 50) forecast = Math.round(f);
      if (typeof parsed.message === 'string' && parsed.message.trim()) message = parsed.message.trim().slice(0, 400);
    }
  } catch {
    // AI unavailable: the numeric forecast and fallback message are still useful
  }

  return { forecast, currentPace, nextTier, sessionsNeeded, message };
}
