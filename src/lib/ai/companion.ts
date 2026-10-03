import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { MODEL_CHAT, extractText, getAnthropic } from '@/lib/ai/client';
import { getRecentActivity, getStreakInfo } from '@/lib/activity/service';
import { fetchWallet } from '@/lib/profile/service';
import { isUuid } from '@/lib/utils/validate';
import { MAX_MESSAGE_LENGTH } from '@/lib/ai/companion-limits';

export type ChatMessage = { role: 'user' | 'assistant'; content: string; at: string };

export type CompanionResult =
  | { success: true; data: { reply: string; conversationId: string } }
  | { success: false; error: string; status: 400 | 404 | 502 };

const HISTORY_SENT_TO_MODEL = 20;   // messages
const HISTORY_STORED = 100;         // messages

const SYSTEM_PROMPT = `You are the ClubPulse Coach: a warm, practical personal cricket coach inside the ClubPulse app for British grassroots players.

How you work:
- Ground every answer in the player's stats below. If something isn't in the data, say you don't know it. Never invent scores, wickets or fixtures.
- Give specific, doable advice (technique cues, training drills, match-day routines, fitness) and keep it short: a few sentences or a tight list.
- You know how ClubPulse works: 50 Scores = £1, you earn Scores for runs, wickets, training, volunteering and steps, and streaks earn bonuses.
- Be encouraging without being fluffy. Use British English.
- You are not a doctor. For injuries or pain, suggest seeing a physio or GP.
- Stay on cricket, fitness and using ClubPulse. Politely steer anything else back.`;

// userId must be verified by the caller. Everything is read and written scoped to that user.
export async function chatWithCompanion(
  userId: string,
  message: string,
  conversationId?: string
): Promise<CompanionResult> {
  const text = typeof message === 'string' ? message.trim() : '';
  if (!text) return { success: false, error: 'Message is empty', status: 400 };
  if (text.length > MAX_MESSAGE_LENGTH) {
    return { success: false, error: `Message is too long (max ${MAX_MESSAGE_LENGTH} characters)`, status: 400 };
  }
  if (conversationId !== undefined && !isUuid(conversationId)) {
    return { success: false, error: 'Conversation not found', status: 404 };
  }

  const admin = createAdminClient();

  let history: ChatMessage[] = [];
  if (conversationId) {
    const { data } = await admin
      .from('ai_conversations')
      .select('messages')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .maybeSingle();
    if (!data) return { success: false, error: 'Conversation not found', status: 404 };
    history = Array.isArray(data.messages) ? (data.messages as ChatMessage[]) : [];
  }

  const db = admin as SupabaseClient;
  const [recent, wallet, streak] = await Promise.all([
    getRecentActivity(db, userId, 8),
    fetchWallet(db, userId),
    getStreakInfo(db, userId),
  ]);
  const context = {
    recentActivity: recent.map((r) => ({ what: r.title, scores: r.amount, when: r.occurred_at.slice(0, 10) })),
    wallet: wallet.success && wallet.data
      ? { flexi: wallet.data.flexi_balance, reward: wallet.data.reward_balance, lifetimeEarned: wallet.data.lifetime_earned }
      : null,
    streakDays: streak.streakDay,
  };

  // The API needs strictly alternating turns starting with the user
  const sent = history.slice(-HISTORY_SENT_TO_MODEL);
  while (sent.length > 0 && sent[0].role !== 'user') sent.shift();

  let reply: string;
  try {
    const response = await getAnthropic().messages.create({
      model: MODEL_CHAT,
      max_tokens: 700,
      system: `${SYSTEM_PROMPT}\n\nThe player's current stats (JSON):\n${JSON.stringify(context)}`,
      messages: [
        ...sent.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content: text },
      ],
    });
    reply = extractText(response);
  } catch {
    return { success: false, error: 'The coach is unavailable right now. Try again in a moment.', status: 502 };
  }
  if (!reply) return { success: false, error: 'The coach had nothing to say. Try rephrasing.', status: 502 };

  const now = new Date().toISOString();
  const messages = [
    ...history,
    { role: 'user' as const, content: text, at: now },
    { role: 'assistant' as const, content: reply, at: now },
  ].slice(-HISTORY_STORED);

  if (conversationId) {
    const { error } = await admin
      .from('ai_conversations')
      .update({ messages, context_snapshot: context })
      .eq('id', conversationId)
      .eq('user_id', userId);
    if (error) return { success: false, error: 'Could not save the conversation', status: 502 };
    return { success: true, data: { reply, conversationId } };
  }

  const { data: created, error } = await admin
    .from('ai_conversations')
    .insert({ user_id: userId, messages, context_snapshot: context })
    .select('id')
    .single();
  if (error || !created) return { success: false, error: 'Could not save the conversation', status: 502 };
  return { success: true, data: { reply, conversationId: created.id } };
}
