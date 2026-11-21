import { average, cleanRoutine, lastDays, series, soundsSerious, trendLine, validateRecovery, type ReadinessDay } from '@/lib/wellness/trend';
import { SECTIONS, itemById } from '@/lib/wellness/skills';
import { ALL_CHECKLIST_ITEM_IDS } from '@/lib/wellness/content';
import * as fs from 'fs';
import * as path from 'path';

const day = (date: string, v: number): ReadinessDay => ({ date, sleep: v, mood: v, soreness: v, stress: v });

describe('lastDays and series', () => {
  it('lists days oldest first, ending on the given day', () => {
    expect(lastDays('2026-11-21', 3)).toEqual(['2026-11-19', '2026-11-20', '2026-11-21']);
    expect(lastDays('2026-03-01', 2)).toEqual(['2026-02-28', '2026-03-01']);
  });
  it('leaves gaps as null', () => {
    const days = lastDays('2026-11-21', 3);
    expect(series([day('2026-11-19', 4), day('2026-11-21', 2)], 'mood', days)).toEqual([4, null, 2]);
  });
  it('averages to one decimal, or null with no rows', () => {
    expect(average([day('a', 4), day('b', 3), day('c', 3)], 'sleep')).toBe(3.3);
    expect(average([], 'sleep')).toBeNull();
  });
});

describe('trendLine', () => {
  const today = '2026-11-28';
  it('does not guess from too little data', () => {
    expect(trendLine([day('2026-11-28', 4)], today)).toMatch(/few more days/);
  });
  it('says so when the last week is better, worse or the same', () => {
    const mk = (recent: number, earlier: number) => [
      ...['2026-11-22', '2026-11-24', '2026-11-26'].map((d) => day(d, recent)),
      ...['2026-11-05', '2026-11-08', '2026-11-12'].map((d) => day(d, earlier)),
    ];
    expect(trendLine(mk(5, 3), today)).toMatch(/better/);
    expect(trendLine(mk(2, 4), today)).toMatch(/harder/);
    expect(trendLine(mk(3, 3), today)).toMatch(/much like/);
  });
});

describe('validateRecovery', () => {
  it('needs something to save', () => expect(validateRecovery({}).ok).toBe(false));
  it('accepts a score, an activity or a note', () => {
    expect(validateRecovery({ soreness: 2 }).ok).toBe(true);
    expect(validateRecovery({ activity: ' walk ' })).toEqual({ ok: true, value: { soreness: null, activity: 'walk', notes: null } });
  });
  it('rejects bad scores and long text', () => {
    expect(validateRecovery({ soreness: 6 }).ok).toBe(false);
    expect(validateRecovery({ soreness: 2.5 }).ok).toBe(false);
    expect(validateRecovery({ notes: 'x'.repeat(501) }).ok).toBe(false);
  });
  it('nudges towards a professional for serious-sounding words, and not for ordinary soreness', () => {
    expect(soundsSerious('sharp pain in my knee')).toBe(true);
    expect(soundsSerious("can't put weight on it")).toBe(true);
    expect(soundsSerious('legs a bit stiff after the game')).toBe(false);
  });
});

describe('cleanRoutine', () => {
  it('keeps only known items, once each, in order', () => {
    const known = new Set(['a', 'b', 'c']);
    expect(cleanRoutine(['c', 'x', 'a', 'c', 5], known)).toEqual(['c', 'a']);
    expect(cleanRoutine('nope', known)).toEqual([]);
  });
  it('accepts the real checklist ids', () => {
    const id = [...ALL_CHECKLIST_ITEM_IDS][0];
    expect(cleanRoutine([id], ALL_CHECKLIST_ITEM_IDS)).toEqual([id]);
  });
});

describe('skills content', () => {
  it('has unique ids and a lookup for every item', () => {
    const ids = SECTIONS.flatMap((s) => s.items.map((i) => i.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(itemById(id)).toBeDefined();
  });
  it('covers breathing, focus and pressure', () => {
    const ids = SECTIONS.flatMap((s) => s.items.map((i) => i.id));
    expect(ids).toEqual(expect.arrayContaining(['box-breathing', 'count-breaths', 'pressure', 'pressure-over', 'week-6']));
  });
  it('does not point at app-only routes', () => {
    for (const s of SECTIONS) for (const i of s.items) if (i.kind === 'week' && i.daily.route) expect(i.daily.route.startsWith('/wellness')).toBe(true);
  });
});

describe('Wellness migration: consent is enforced in the database', () => {
  const sql = fs.readFileSync(path.join(__dirname, '../../supabase/migrations/20261122000005_wellness_full.sql'), 'utf8');
  it('turns on RLS for every new table', () => {
    for (const t of ['wellness_routines', 'wellness_recovery', 'wellness_share_consent']) expect(sql).toMatch(new RegExp(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`));
  });
  it('gives coaches no table policy, only the function', () => {
    expect(sql).not.toMatch(/FOR SELECT TO authenticated\s+USING \(EXISTS/);
    expect(sql).toMatch(/auth\.uid\(\) = user_id/);
  });
  it('the coach function checks role, consent and adulthood, and never selects notes', () => {
    const fn = sql.slice(sql.indexOf('CREATE OR REPLACE FUNCTION get_consented_readiness'));
    expect(fn).toMatch(/cm\.role IN \('club_admin','coach'\)/);
    expect(fn).toMatch(/share_readiness = TRUE/);
    expect(fn).toMatch(/is_junior/);
    expect(fn).toMatch(/HAVING COUNT\(\*\) >= 2/);
    expect(fn).not.toMatch(/notes/);
  });
});
