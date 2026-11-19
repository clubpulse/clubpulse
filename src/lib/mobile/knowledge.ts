// Server-only. The three daily knowledge games for a member whose id has been verified.
// One round a day each. The answers never leave the server until the round has been played.

import { awardScores } from '@/lib/scores/context';
import { GAME_INFO, markRound, parseAnswers, publicRound, type KnowledgeGame, type Marked, type PublicQuestion } from '@/lib/games/knowledge';
import { countTowardCard, gameContext } from '@/lib/mobile/game-context';

export type KnowledgeStatus = {
  game: KnowledgeGame;
  title: string;
  blurb: string;
  /** Scores for a full round at this club; 0 if the game does not pay here. */
  maxAmount: number;
  note: string | null;
  questions: PublicQuestion[] | null;
  played: { score: number; maxScore: number; amount: number; review: Marked['review'] } | null;
};

type Failure = { ok: false; error: string; status: number };

export async function getKnowledge(userId: string, game: KnowledgeGame): Promise<KnowledgeStatus> {
  const info = GAME_INFO[game];
  const ctx = await gameContext(userId, info.rule);
  const base = {
    game, title: info.title, blurb: info.blurb,
    maxAmount: ctx.pays ? ctx.value * info.maxScore : 0,
    note: !ctx.clubId ? 'Join a club to earn Scores from this game.' : !ctx.pays ? 'This game does not earn Scores at your club. You can still play.' : null,
  };
  const { data: row } = await ctx.admin
    .from('game_plays').select('score, amount, state').eq('user_id', userId).eq('game', game).eq('play_date', ctx.today).maybeSingle();
  if (row) {
    const answers = parseAnswers(game, (row.state as { answers?: unknown } | null)?.answers) ?? [];
    const marked = markRound(game, ctx.today, answers);
    return { ...base, questions: null, played: { score: row.score as number, maxScore: info.maxScore, amount: row.amount as number, review: marked.review } };
  }
  return { ...base, questions: publicRound(game, ctx.today), played: null };
}

export async function submitKnowledge(
  userId: string,
  game: KnowledgeGame,
  raw: unknown,
): Promise<{ ok: true; score: number; maxScore: number; amount: number; capped: boolean; card: boolean; review: Marked['review'] } | Failure> {
  const info = GAME_INFO[game];
  const answers = parseAnswers(game, raw);
  if (!answers) return { ok: false, error: 'Those answers are not complete.', status: 400 };

  const ctx = await gameContext(userId, info.rule);
  const marked = markRound(game, ctx.today, answers);

  // Someone with no club can play for fun; nothing is saved, so they can play again
  if (!ctx.clubId) return { ok: true, score: marked.score, maxScore: marked.maxScore, amount: 0, capped: false, card: false, review: marked.review };

  // Claim today's round first: the unique (user, game, day) row means only one request gets through
  const { data: claimed, error } = await ctx.admin
    .from('game_plays')
    .insert({ user_id: userId, club_id: ctx.clubId, game, play_date: ctx.today, state: { answers }, score: marked.score, finished: true })
    .select('id')
    .single();
  if (error || !claimed) return { ok: false, error: "You have already played today's round. A new one starts tomorrow.", status: 409 };

  let amount = 0;
  let capped = false;
  if (ctx.pays && marked.score > 0) {
    const award = await awardScores(userId, ctx.clubId, info.rule, ctx.today, marked.score);
    if (award.ok) {
      amount = award.amount ?? 0;
      capped = !!award.capped;
    } else if (award.error === 'weekly_cap_reached') {
      capped = true;
    }
    if (amount > 0) await ctx.admin.from('game_plays').update({ amount }).eq('id', claimed.id);
  }
  // A perfect round counts toward a scratch card where the club rewards games
  const card = marked.perfect ? await countTowardCard(ctx, userId, `${game}:${ctx.today}`) : false;
  return { ok: true, score: marked.score, maxScore: marked.maxScore, amount, capped, card, review: marked.review };
}
