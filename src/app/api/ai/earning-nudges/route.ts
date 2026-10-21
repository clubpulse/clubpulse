// POST /api/ai/earning-nudges → { nudges: Nudge[] }
// Returns personalised opportunities to earn more Scores based on member profile.

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { createClient } from '@/lib/supabase/server';
import { fail, unauthorized } from '@/lib/utils/http';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

interface Nudge {
  id: string;
  emoji: string;
  title: string;
  description: string;
  scoresPotential: number;
  href?: string;
  cta?: string;
}

export async function POST(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();

  const supabase = await createClient();

  // Check what they've done recently to avoid nudging things they already do
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentTx } = await supabase
    .from('wallet_transactions')
    .select('category, title')
    .eq('user_id', user.id)
    .gte('occurred_at', sevenDaysAgo)
    .limit(20);

  const recentCategories = new Set(recentTx?.map((t) => t.category) ?? []);
  const hasLogged = recentCategories.has('performance');
  const hasVolunteered = recentCategories.has('volunteer');
  const hasShopped = recentCategories.has('marketplace');

  const { data: profile } = await supabase
    .from('profiles')
    .select('sport, display_name')
    .eq('user_id', user.id)
    .single();

  const sport = profile?.sport ?? 'cricket';

  const prompt = `You are a ClubPulse rewards coach. Generate personalised Scores-earning nudges for a ${sport} player.

What they've done in the last 7 days:
- Logged performance: ${hasLogged}
- Volunteered: ${hasVolunteered}
- Used marketplace: ${hasShopped}

Generate 2-3 nudges for things they HAVEN'T done recently. Return JSON:
{
  "nudges": [
    {
      "id": "unique_snake_case_id",
      "emoji": "single emoji",
      "title": "short action title (under 6 words)",
      "description": "why this earns Scores and how (under 25 words)",
      "scoresPotential": 50,
      "href": "/companion",
      "cta": "Get started"
    }
  ]
}

Available earning paths and typical Scores:
- Log a performance session: 25-100 Scores (href: /companion)
- Volunteer for club event: 50-150 Scores (href: /admin/club/volunteers)
- Refer a friend to ClubPulse: 200 Scores (href: /profile)
- Sync daily steps: 5-20 Scores/day (href: /profile)
- Complete onboarding: 50 Scores (href: /profile/edit)

Only suggest paths they haven't used recently. Keep it motivating and specific.`;

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON');

    const parsed = JSON.parse(jsonMatch[0]) as { nudges: Nudge[] };
    return NextResponse.json({ nudges: parsed.nudges.slice(0, 3) });
  } catch {
    // Sensible fallbacks
    const fallbacks: Nudge[] = [];

    if (!hasLogged) {
      fallbacks.push({
        id: 'log_performance',
        emoji: '🏏',
        title: 'Log today\'s session',
        description: `Record your ${sport} performance and earn up to 100 Scores instantly.`,
        scoresPotential: 100,
        href: '/companion',
        cta: 'Log with Coach',
      });
    }

    if (!hasVolunteered) {
      fallbacks.push({
        id: 'volunteer',
        emoji: '🙋',
        title: 'Volunteer at your club',
        description: 'Help out at a club event or training session and earn 50–150 Scores.',
        scoresPotential: 100,
        href: '/admin/club/volunteers',
        cta: 'See opportunities',
      });
    }

    fallbacks.push({
      id: 'refer_friend',
      emoji: '👥',
      title: 'Refer a teammate',
      description: 'Invite a friend to ClubPulse and earn 200 Scores when they join.',
      scoresPotential: 200,
      href: '/profile',
      cta: 'Share invite link',
    });

    return NextResponse.json({ nudges: fallbacks.slice(0, 3) });
  }
}
