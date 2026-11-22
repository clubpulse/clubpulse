import { LESSONS, TRACKS } from '@/lib/academy/content';

// A tiny in-memory stand-in for the database
type Row = { lesson_id: string; best_score: number; passed: boolean; first_passed_at: string | null };
let progress: Row[] = [];
const rpc = jest.fn(async () => ({ error: null }));
const awardScores = jest.fn(async () => ({ ok: true, amount: 10 }));

jest.mock('@/lib/scores/context', () => ({
  awardScores: (...a: unknown[]) => awardScores(...(a as [])),
  getPrimaryClubId: async () => 'club-1',
}));
jest.mock('@/lib/ai/client', () => ({ MODEL_FAST: 'x', extractText: () => '', getAnthropic: () => ({}), parseJsonObject: () => null }));
jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    rpc,
    from: (table: string) => {
      const q: Record<string, unknown> = {};
      q.select = () => q;
      q.eq = () => q;
      q.maybeSingle = async () => ({ data: null });
      q.then = (res: (v: unknown) => unknown) => res({ data: table === 'academy_progress' ? progress : [], error: null });
      q.upsert = async (row: Row & { lesson_id: string }) => {
        progress = progress.filter((p) => p.lesson_id !== row.lesson_id).concat([{ lesson_id: row.lesson_id, best_score: row.best_score, passed: row.passed, first_passed_at: row.first_passed_at ?? null }]);
        return { error: null };
      };
      return q;
    },
  }),
}));

import { getAcademyLesson, submitLesson } from '@/lib/academy/service';

const right = (id: string) => LESSONS.find((l) => l.id === id)!.quiz.map((q) => q.answer);
const wrong = (id: string) => LESSONS.find((l) => l.id === id)!.quiz.map((q) => ((q.answer + 1) % 3));
const passAll = (ids: string[]) => { progress = ids.map((id) => ({ lesson_id: id, best_score: 3, passed: true, first_passed_at: '2026-11-01T00:00:00Z' })); };

beforeEach(() => { progress = []; rpc.mockClear(); awardScores.mockClear(); });

describe('submitLesson', () => {
  it('pays Scores once for a first pass and not again', async () => {
    const id = LESSONS[0].id;
    const first = await submitLesson('u', id, right(id));
    expect(first).toMatchObject({ ok: true, passed: true, firstPass: true, amount: 10 });
    expect(awardScores).toHaveBeenCalledWith('u', 'club-1', 'academy_lesson', id);
    awardScores.mockClear();
    const again = await submitLesson('u', id, right(id));
    expect(again).toMatchObject({ ok: true, passed: true, firstPass: false, amount: 0 });
    expect(awardScores).not.toHaveBeenCalled();
  });

  it('pays nothing and awards nothing for a fail', async () => {
    const id = LESSONS[0].id;
    const r = await submitLesson('u', id, wrong(id));
    expect(r).toMatchObject({ ok: true, passed: false, firstPass: false });
    expect(awardScores).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('awards the track badge once, when the last lesson in the track is first passed', async () => {
    const lessons = LESSONS.filter((l) => l.track === 'skills');
    passAll(lessons.slice(0, 4).map((l) => l.id));
    const last = lessons[4].id;
    const r = await submitLesson('u', last, right(last));
    expect(r).toMatchObject({ ok: true, trackDone: 'Cricket skills', badges: ['academy-skills'] });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('award_badge', expect.objectContaining({ p_user_id: 'u', p_badge_slug: 'academy-skills', p_club_id: 'club-1' }));
    rpc.mockClear();
    const again = await submitLesson('u', last, right(last));
    expect(again).toMatchObject({ firstPass: false, badges: [] });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('does not award a track badge for a lesson that does not finish the track', async () => {
    const id = LESSONS[0].id;
    expect(await submitLesson('u', id, right(id))).toMatchObject({ badges: [] });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('also awards the graduate badge when the last track is finished', async () => {
    const others = LESSONS.filter((l) => l.track !== 'beyond').map((l) => l.id);
    const beyond = LESSONS.filter((l) => l.track === 'beyond');
    passAll([...others, ...beyond.slice(0, 4).map((l) => l.id)]);
    const last = beyond[4].id;
    const r = await submitLesson('u', last, right(last));
    expect(r).toMatchObject({ ok: true, badges: ['academy-beyond', 'academy-graduate'] });
    expect(rpc).toHaveBeenCalledTimes(2);
  });

  it('refuses an unknown lesson', async () => {
    expect(await submitLesson('u', 'nope', [0, 0, 0])).toMatchObject({ ok: false, status: 404 });
  });
});

describe('getAcademyLesson', () => {
  it('never includes the answers or the explanations', async () => {
    const lesson = await getAcademyLesson('u', LESSONS[0].id);
    const text = JSON.stringify(lesson);
    expect(text).not.toContain('"answer"');
    expect(text).not.toContain('"why"');
    expect(lesson!.questions).toHaveLength(3);
  });
});

describe('track badges exist for every track', () => {
  it('has a migration slug for each track and the graduate badge', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sql = require('fs').readFileSync(require('path').join(__dirname, '../../supabase/migrations/20261122000006_academy_certificates.sql'), 'utf8') as string;
    for (const t of TRACKS) expect(sql).toContain(`'academy-${t.key}'`);
    expect(sql).toContain("'academy-graduate'");
    expect(sql).toContain('ON CONFLICT (slug) DO NOTHING');
  });
});
