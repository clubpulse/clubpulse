import { validateReadiness, readinessSummary } from '@/lib/wellness/readiness';
import { MATCH_DAY_CHECKLISTS, ALL_CHECKLIST_ITEM_IDS } from '@/lib/wellness/content';

describe('readiness check-in', () => {
  const ok = { sleep: 4, mood: 3, soreness: 5, stress: 2 };

  it('accepts four 1 to 5 scores and an optional note', () => {
    const r = validateReadiness({ ...ok, notes: '  sore hamstring  ' });
    expect(r).toEqual({ ok: true, value: { ...ok, notes: 'sore hamstring' } });
    expect(validateReadiness(ok)).toEqual({ ok: true, value: { ...ok, notes: null } });
  });

  it('rejects missing, out-of-range and fractional scores', () => {
    expect(validateReadiness(null).ok).toBe(false);
    expect(validateReadiness({ ...ok, sleep: 0 }).ok).toBe(false);
    expect(validateReadiness({ ...ok, mood: 6 }).ok).toBe(false);
    expect(validateReadiness({ ...ok, stress: 2.5 }).ok).toBe(false);
    expect(validateReadiness({ sleep: 3, mood: 3, soreness: 3 }).ok).toBe(false);
    expect(validateReadiness({ ...ok, sleep: '4' }).ok).toBe(false);
  });

  it('rejects a very long note', () => {
    expect(validateReadiness({ ...ok, notes: 'x'.repeat(501) }).ok).toBe(false);
  });

  it('summarises without clinical language', () => {
    expect(readinessSummary({ sleep: 5, mood: 5, soreness: 4, stress: 4 })).toMatch(/ready/);
    expect(readinessSummary({ sleep: 1, mood: 2, soreness: 1, stress: 2 })).toMatch(/captain or coach/);
  });
});

describe('match-day checklists', () => {
  it('has stable, unique item ids', () => {
    const ids = MATCH_DAY_CHECKLISTS.flatMap((c) => c.items.map((i) => i.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(ALL_CHECKLIST_ITEM_IDS.size).toBe(ids.length);
    expect(ids).toContain('night-before:0');
  });
});
