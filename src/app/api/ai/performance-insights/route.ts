// POST /api/ai/performance-insights → { insights: Insight[], generatedAt: string }
// Analyses a member's recent activity and returns AI-generated performance insights.

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { createClient } from '@/lib/supabase/server';
import { fail, unauthorized } from '@/lib/utils/http';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

type InsightType = 'tip' | 'warning' | 'milestone';

interface Insight {
  title: string;
  body: string;
  type: InsightType;
}

export async function POST(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();

  const supabase = await createClient();

  // Fetch recent 30 days of wallet transactions for context
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: transactions } = await supabase
    .from('wallet_transactions')
    .select('title, amount, occurred_at, category')
    .eq('user_id', user.id)
    .gte('occurred_at', thirtyDaysAgo)
    .order('occurred_at', { ascending: false })
    .limit(30);

  const { data: wallet } = await supabase
    .from('wallets')
    .select('flexi_balance, reward_balance')
    .eq('user_id', user.id)
    .single();

  const totalBalance = (wallet?.flexi_balance ?? 0) + (wallet?.reward_balance ?? 0);
  const totalEarned = transactions?.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0) ?? 0;
  const sessionCount = transactions?.filter((t) => t.category === 'performance').length ?? 0;

  const summaryText = transactions && transactions.length > 0
    ? transactions.slice(0, 15).map((t) => `${t.title}: ${t.amount > 0 ? '+' : ''}${t.amount} Scores`).join('\n')
    : 'No recent activity in the last 30 days.';

  const prompt = `You are a sports performance analyst for ClubPulse, a grassroots sports loyalty platform.

Member stats (last 30 days):
- Total Scores balance: ${totalBalance}
- Scores earned this period: ${totalEarned}
- Performance sessions logged: ${sessionCount}

Recent transactions:
${summaryText}

Generate exactly 3 concise performance insights for this member. Each insight must be specific, actionable, and relevant to their data.

Return a JSON object with this shape:
{
  "insights": [
    { "title": "short title", "body": "2-3 sentence insight with specific advice", "type": "tip" | "warning" | "milestone" }
  ]
}

Rules:
- "tip" = positive advice or opportunity
- "warning" = risk or declining trend to address
- "milestone" = achievement or goal near completion
- Be specific to their numbers, not generic
- Keep titles under 8 words
- Keep body under 50 words per insight`;

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');

    const parsed = JSON.parse(jsonMatch[0]) as { insights: Insight[] };

    return NextResponse.json({
      insights: parsed.insights.slice(0, 3),
      generatedAt: new Date().toISOString(),
    });
  } catch {
    // Fallback static insights if AI unavailable
    const fallback: Insight[] = [
      {
        title: 'Keep your streak alive',
        body: 'Logging activity daily compounds your Scores faster than sporadic bursts. Even a short training note counts.',
        type: 'tip',
      },
      {
        title: `${totalEarned} Scores earned this month`,
        body: totalEarned > 0
          ? 'You\'re building momentum. Stay consistent and you\'ll unlock the next reward tier soon.'
          : 'No Scores yet this month — log your first performance session to get started.',
        type: totalEarned > 100 ? 'milestone' : 'warning',
      },
      {
        title: 'Off-pitch actions boost totals',
        body: 'Volunteering and club social activities earn Scores without needing to play. Check your club\'s upcoming events.',
        type: 'tip',
      },
    ];
    return NextResponse.json({ insights: fallback, generatedAt: new Date().toISOString() });
  }
}
