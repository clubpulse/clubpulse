// Server-only. Academy progress, marking, Scores and personal plans.

import { createAdminClient } from '@/lib/supabase/admin';
import { MODEL_FAST, extractText, getAnthropic, parseJsonObject } from '@/lib/ai/client';
import { awardScores, getPrimaryClubId } from '@/lib/scores/context';
import { LESSONS, TRACKS, getLesson } from '@/lib/academy/content';
import { shownName } from '@/lib/community/rules';
import {
  PLAN_LIMIT_PER_WEEK, badgesEarned, buildOverview, cleanPlan, libraryPlan, mark, publicLesson, trackComplete,
  GRADUATE, type CertificateKey, type Overview, type Plan, type PlanRequest, type Progress,
} from '@/lib/academy/logic';

type Admin = ReturnType<typeof createAdminClient>;
type Failure = { ok: false; error: string; status: number };
const RULE_LESSON = 'academy_lesson';
const RULE_TRACK = 'academy_track';

export type StoredPlan = Plan & { focus: string; createdAt: string; fromCoachAi: boolean };
export type AcademyResponse = Overview & {
  /** Set when the database change for the Academy has not been applied yet. */
  unavailable: string | null;
  /** Scores for passing a lesson for the first time, and for finishing a track. 0 when the person has no club. */
  scores: { lesson: number; track: number };
  plan: StoredPlan | null;
  plansLeftThisWeek: number;
};

async function loadProgress(admin: Admin, userId: string): Promise<{ progress: Progress[]; missing: boolean }> {
  const { data, error } = await admin.from('academy_progress').select('lesson_id, best_score, passed').eq('user_id', userId);
  return {
    progress: (data ?? []).map((r) => ({ lessonId: r.lesson_id as string, bestScore: r.best_score as number, passed: r.passed as boolean })),
    missing: !!error,
  };
}

async function ruleValues(admin: Admin, clubId: string | null): Promise<{ lesson: number; track: number }> {
  if (!clubId) return { lesson: 0, track: 0 };
  const sources = [RULE_LESSON, RULE_TRACK];
  const [{ data: rules }, { data: overrides }] = await Promise.all([
    admin.from('scores_rules').select('source, default_amount').in('source', sources),
    admin.from('club_scores_rules').select('source, amount, is_enabled').eq('club_id', clubId).in('source', sources),
  ]);
  const value = (source: string) => {
    const rule = (rules ?? []).find((r) => r.source === source);
    const override = (overrides ?? []).find((o) => o.source === source);
    if (!rule || (override && !override.is_enabled)) return 0;
    return (override?.amount as number | null | undefined) ?? (rule.default_amount as number);
  };
  return { lesson: value(RULE_LESSON), track: value(RULE_TRACK) };
}

const weekAgo = () => new Date(Date.now() - 7 * 86_400_000).toISOString();

async function loadPlans(admin: Admin, userId: string): Promise<{ latest: StoredPlan | null; usedThisWeek: number }> {
  const [{ data: latest }, { count }] = await Promise.all([
    admin.from('academy_plans').select('focus, plan, source, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    admin.from('academy_plans').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', weekAgo()),
  ]);
  const plan = latest?.plan as Plan | undefined;
  return {
    latest: latest && plan ? { ...plan, focus: latest.focus as string, createdAt: latest.created_at as string, fromCoachAi: latest.source === 'ai' } : null,
    usedThisWeek: count ?? 0,
  };
}

export async function getAcademy(userId: string): Promise<AcademyResponse> {
  const admin = createAdminClient();
  const [{ progress, missing }, clubId] = await Promise.all([loadProgress(admin, userId), getPrimaryClubId(userId)]);
  const [scores, plans] = await Promise.all([ruleValues(admin, clubId), loadPlans(admin, userId)]);
  return {
    ...buildOverview(progress),
    unavailable: missing ? 'The Academy is not switched on yet. You can read the lessons, but progress will not be saved.' : null,
    scores,
    plan: plans.latest,
    plansLeftThisWeek: Math.max(0, PLAN_LIMIT_PER_WEEK - plans.usedThisWeek),
  };
}

export async function getAcademyLesson(userId: string, lessonId: string) {
  const lesson = getLesson(lessonId);
  if (!lesson) return null;
  const { data } = await createAdminClient()
    .from('academy_progress')
    .select('best_score, passed')
    .eq('user_id', userId)
    .eq('lesson_id', lessonId)
    .maybeSingle();
  return { ...publicLesson(lesson), passed: (data?.passed as boolean | undefined) ?? false, bestScore: (data?.best_score as number | undefined) ?? null };
}

export async function submitLesson(userId: string, lessonId: string, answers: number[]) {
  const lesson = getLesson(lessonId);
  if (!lesson) return { ok: false, error: 'Lesson not found.', status: 404 } as Failure;

  const admin = createAdminClient();
  const marked = mark(lesson, answers);
  const { progress, missing } = await loadProgress(admin, userId);
  const before = progress.find((p) => p.lessonId === lessonId);
  const firstPass = marked.passed && !before?.passed;

  if (!missing) {
    const { error } = await admin.from('academy_progress').upsert(
      {
        user_id: userId,
        lesson_id: lessonId,
        best_score: Math.max(marked.score, before?.bestScore ?? 0),
        passed: marked.passed || !!before?.passed,
        ...(firstPass ? { first_passed_at: new Date().toISOString() } : {}),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,lesson_id' },
    );
    if (error) return { ok: false, error: 'Could not save your result. Please try again.', status: 500 } as Failure;
  }

  // Scores are paid once per lesson, ever: award_scores refuses a repeat of the same reference
  let amount = 0;
  let trackBonus = 0;
  let trackDone: string | null = null;
  const badges: string[] = [];
  if (firstPass && !missing) {
    const clubId = await getPrimaryClubId(userId);
    if (clubId) {
      const award = await awardScores(userId, clubId, RULE_LESSON, lessonId);
      if (award.ok) amount = award.amount ?? 0;
      const passedIds = new Set([...progress.filter((p) => p.passed).map((p) => p.lessonId), lessonId]);
      if (trackComplete(lesson.track, passedIds)) {
        trackDone = TRACKS.find((t) => t.key === lesson.track)!.title;
        const bonus = await awardScores(userId, clubId, RULE_TRACK, lesson.track);
        if (bonus.ok) trackBonus = bonus.amount ?? 0;
      }
      // Badges on the first finish of a track, and of all four. Only a first pass of the
      // lesson that completes them gets here, and award_badge ignores a repeat in the same season.
      const before = new Set(progress.filter((p) => p.passed).map((p) => p.lessonId));
      for (const slug of badgesEarned(lesson.track, before, lessonId)) {
        const why = slug === 'academy-graduate' ? 'Finished all four Academy tracks' : `Finished the ${TRACKS.find((t) => t.key === lesson.track)!.title} track`;
        const { error: badgeError } = await admin.rpc('award_badge', { p_user_id: userId, p_badge_slug: slug, p_club_id: clubId, p_reason: why });
        if (!badgeError) badges.push(slug);
      }
    }
  }
  return { ok: true as const, ...marked, firstPass, amount, trackBonus, trackDone, badges };
}

// ── Personal plan ────────────────────────────────────────────────────────────

const PLAN_SYSTEM = `You are the SHIFTUP Coach, writing a one-week cricket practice plan for a grassroots player in Britain. The player could be any age from 10 upwards.

Rules:
- Use plain, friendly British English a 12-year-old can follow. No jargon without a quick explanation.
- Every activity must be safe to do alone or with one partner, with a soft or tennis ball unless they are in a supervised net. Never suggest hard-ball practice without pads, a helmet and an adult or coach present.
- Give exact things to do: how many balls or minutes, what to aim at, what to count.
- Fit each session into the minutes given, including a short warm-up.
- You are not a doctor. Do not diagnose or treat injuries or pain; say to see a physio or GP.
- Do not give weight-loss, supplement or diet-restriction advice.
- Stay on cricket and general fitness for cricket. If the player's request is about something else, plan around basic all-round cricket skills instead.
- Where an Academy lesson from the list fits a session, put its id in lessonId. Otherwise use null. Prefer lessons the player has not passed yet.

Reply with JSON only, in exactly this shape:
{"summary": "one or two sentences on what the week is for", "days": [{"title": "short title", "activity": "what to do, 2 to 4 sentences", "lessonId": "an id from the list, or null"}]}`;

async function coachAiPlan(request: PlanRequest, passedIds: ReadonlySet<string>): Promise<Plan | null> {
  const catalogue = LESSONS.map((l) => ({ id: l.id, title: l.title, passed: passedIds.has(l.id) }));
  try {
    const response = await getAnthropic().messages.create({
      model: MODEL_FAST,
      max_tokens: 1400,
      system: `${PLAN_SYSTEM}\n\nAcademy lessons (JSON):\n${JSON.stringify(catalogue)}`,
      messages: [
        {
          role: 'user',
          content: JSON.stringify({
            whatIWantToImprove: request.focus,
            iAmA: request.role === 'new' ? 'someone new to cricket' : request.role,
            sessionsThisWeek: request.sessions,
            minutesPerSession: request.minutes,
          }),
        },
      ],
    });
    return cleanPlan(parseJsonObject<unknown>(extractText(response)), request);
  } catch {
    return null;
  }
}

export async function createPlan(userId: string, request: PlanRequest): Promise<{ ok: true; plan: StoredPlan; plansLeftThisWeek: number } | Failure> {
  const admin = createAdminClient();
  const [{ progress }, plans] = await Promise.all([loadProgress(admin, userId), loadPlans(admin, userId)]);
  if (plans.usedThisWeek >= PLAN_LIMIT_PER_WEEK) {
    return { ok: false, error: `You can make ${PLAN_LIMIT_PER_WEEK} plans a week. Give this one a go first.`, status: 429 };
  }

  const passedIds = new Set(progress.filter((p) => p.passed).map((p) => p.lessonId));
  const fromAi = await coachAiPlan(request, passedIds);
  const plan = fromAi ?? libraryPlan(request, passedIds);

  const { data, error } = await admin
    .from('academy_plans')
    .insert({ user_id: userId, focus: request.focus, role: request.role, sessions: request.sessions, minutes: request.minutes, plan, source: fromAi ? 'ai' : 'library' })
    .select('created_at')
    .single();
  if (error || !data) return { ok: false, error: 'Could not save your plan. Please try again.', status: 500 };

  return {
    ok: true,
    plan: { ...plan, focus: request.focus, createdAt: data.created_at as string, fromCoachAi: !!fromAi },
    plansLeftThisWeek: PLAN_LIMIT_PER_WEEK - plans.usedThisWeek - 1,
  };
}

// ── Certificates ─────────────────────────────────────────────────────────────

export type Certificate = { name: string; title: string; completedOn: string; graduate: boolean };

/** A certificate only for someone who has passed every lesson it covers. Null otherwise. */
export async function getCertificate(userId: string, key: CertificateKey): Promise<Certificate | null> {
  const admin = createAdminClient();
  const { data: rows, error } = await admin.from('academy_progress').select('lesson_id, passed, first_passed_at').eq('user_id', userId).eq('passed', true);
  if (error) return null;
  const passed = new Map((rows ?? []).map((r) => [r.lesson_id as string, r.first_passed_at as string | null]));
  const ids = new Set(passed.keys());
  const covered = key === GRADUATE ? LESSONS : LESSONS.filter((l) => l.track === key);
  if (!covered.every((l) => ids.has(l.id))) return null;
  const dates = covered.map((l) => passed.get(l.id)).filter((d): d is string => !!d).sort();
  const [{ data: profile }, { data: member }] = await Promise.all([
    admin.from('profiles').select('full_name, display_name').eq('id', userId).maybeSingle(),
    admin.from('club_members').select('is_junior').eq('user_id', userId).eq('is_active', true),
  ]);
  const junior = (member ?? []).length > 0 && (member ?? []).every((m) => m.is_junior === true);
  return {
    name: shownName((profile?.display_name as string | null) || (profile?.full_name as string | null), junior),
    title: key === GRADUATE ? 'SHIFTUP Academy Graduate' : TRACKS.find((t) => t.key === key)!.title,
    completedOn: dates[dates.length - 1] ?? new Date().toISOString(),
    graduate: key === GRADUATE,
  };
}
