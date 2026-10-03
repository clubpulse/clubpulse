// ─────────────────────────────────────────────
// Creds: Sporting Soul — Claude API Integration
// ─────────────────────────────────────────────

import { getAnthropic } from '@/lib/ai/client';
import type { PerformanceWithSport } from '@/lib/types/sport';

export type SportingSoulResult = {
  headline:      string;
  narrative:     string;
  achievement:   string;
  rewardTrigger: string;
  model:         string;
};

function buildSeasonContext(performances: PerformanceWithSport[], athleteName: string): string {
  if (performances.length === 0) {
    return 'This athlete is new to Creds — no season data yet.';
  }

  const bySport = performances.reduce((acc, p) => {
    const sport = p.sport.display_name;
    acc[sport] = acc[sport] ?? [];
    acc[sport].push(p);
    return acc;
  }, {} as Record<string, PerformanceWithSport[]>);

  const sections: string[] = [];

  for (const [sport, perfs] of Object.entries(bySport)) {
    const totalCreds  = perfs.reduce((s, p) => s + p.creds_earned, 0);
    const matches     = perfs.filter(p => p.category === 'participation').length;
    const volunteered = perfs.filter(p => p.category === 'volunteering').length;

    const allStats: Record<string, number> = {};
    perfs
      .filter(p => p.category === 'performance')
      .forEach(p => {
        for (const [key, val] of Object.entries(p.data as Record<string, number>)) {
          allStats[key] = (allStats[key] ?? 0) + val;
        }
      });

    const statsStr = Object.entries(allStats)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => `${v} ${k}${v > 1 ? 's' : ''}`)
      .join(', ');

    sections.push(`
${sport}:
- ${matches} matches played, ${volunteered} volunteering sessions
- Performance stats: ${statsStr || 'no performance stats yet'}
- Total Creds earned: ${totalCreds}
    `.trim());
  }

  return sections.join('\n\n');
}

export async function generateSportingSoul(
  athleteName: string,
  performances: PerformanceWithSport[],
  options?: { season?: string; sport?: string }
): Promise<SportingSoulResult> {
  const seasonContext = buildSeasonContext(performances, athleteName);
  const season        = options?.season ?? new Date().getFullYear().toString();

  const message = await getAnthropic().messages.create({
    model:      'claude-opus-4-5',
    max_tokens:  1024,
    system: `You are the Creds Sporting Soul engine. You read grassroots athletes' season data and write heartfelt, personal sports narratives that make ordinary club players feel like heroes.

Your tone is warm, human, and specific — not generic. You find the story in the numbers. A scorer who turned up for 14 matches isn't just a statistic; they're the backbone of their club.

You celebrate all contributions equally: the player who scored a century AND the groundskeeper who marked out the pitch for every match.

Always end with a reward trigger — a specific Creds milestone reward that reflects the athlete's identity.`,
    messages: [{
      role:    'user',
      content: `Write a Sporting Soul for ${athleteName}'s ${season} season.

Season data:
${seasonContext}

Return a JSON object with exactly these keys:
{
  "headline": "3-5 word evocative title for their season",
  "narrative": "2-3 paragraphs. Personal, specific, emotional. Reference their actual stats. Make them feel seen.",
  "achievement": "Their single most impressive feat this season in one sentence",
  "rewardTrigger": "A specific Creds reward that fits their identity (e.g. 'Exclusive Castore batting gloves, unlocked for scoring 500+ runs')"
}

JSON only, no markdown fences.`,
    }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';

  let parsed: Omit<SportingSoulResult, 'model'>;
  try {
    parsed = JSON.parse(text.trim());
  } catch {
    parsed = {
      headline:      `${athleteName}'s ${season} Season`,
      narrative:     text,
      achievement:   'A season to remember',
      rewardTrigger: '50 Creds bonus reward',
    };
  }

  return { ...parsed, model: message.model };
}

export async function predictNextReward(
  recentPerformances: PerformanceWithSport[],
  currentCredsBalance: number
): Promise<string> {
  if (recentPerformances.length === 0) {
    return 'Earn your first 10 Creds to unlock the marketplace.';
  }

  const recentStr = recentPerformances.slice(0, 5)
    .map(p => `${p.sport.display_name} ${p.category}: ${JSON.stringify(p.data)} (${p.creds_earned} Creds)`)
    .join('\n');

  const message = await getAnthropic().messages.create({
    model:      'claude-haiku-4-5',
    max_tokens:  200,
    messages: [{
      role:    'user',
      content: `Based on this athlete's recent activity and ${currentCredsBalance} Creds balance, suggest ONE specific reward in one sentence. Be specific to their sport and level.

Recent activity:
${recentStr}

One sentence only.`,
    }],
  });

  return message.content[0].type === 'text' ? message.content[0].text.trim() : '';
}
