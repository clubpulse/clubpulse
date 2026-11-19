import {
  MIN_BOWLERS, SEASON_MATCHES, SQUAD_SIZE, TEAM_SIZE, createSeason, isOver, place, playMatch, replaySeason, selectionError, suggestXI, table,
  type Plan, type Season,
} from '@/lib/games/manager';

function playAll(seed: number, plan: Plan = 'balanced', choose: (s: Season) => number[] = suggestXI) {
  let s = createSeason(seed);
  const sels: Array<{ xi: number[]; plan: Plan }> = [];
  while (!isOver(s)) {
    const sel = { xi: choose(s), plan };
    expect(selectionError(s, sel)).toBeNull();
    sels.push(sel);
    s = playMatch(s, sel);
  }
  return { season: s, sels };
}

describe('Season Manager', () => {
  it('builds a squad that can field a legal team', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const s = createSeason(seed);
      expect(s.squad).toHaveLength(SQUAD_SIZE);
      expect(new Set(s.squad.map((p) => p.name)).size).toBe(SQUAD_SIZE);
      expect(s.fixtures).toHaveLength(SEASON_MATCHES);
      expect(s.rivals).toHaveLength(7);
      expect(selectionError(s, { xi: suggestXI(s), plan: 'balanced' })).toBeNull();
    }
  });

  it('is the same season for the same seed and choices', () => {
    const a = playAll(77);
    const b = playAll(77);
    expect(a.season).toEqual(b.season);
    expect(replaySeason(77, a.sels)).toEqual(a.season);
    expect(playAll(78).season.reports).not.toEqual(a.season.reports);
  });

  it('refuses teams that break the rules', () => {
    const s = createSeason(5);
    const xi = suggestXI(s);
    expect(selectionError(s, { xi: xi.slice(0, 10), plan: 'balanced' })).toMatch(/exactly 11/);
    expect(selectionError(s, { xi: [...xi.slice(0, 10), xi[0]], plan: 'balanced' })).toMatch(/twice/);
    expect(selectionError(s, { xi: [...xi.slice(0, 10), 99], plan: 'balanced' })).toMatch(/not in your squad/);
    expect(selectionError(s, { xi, plan: 'reckless' })).toMatch(/game plan/);
    const noKeeper = s.squad.filter((p) => p.role !== 'keep').slice(0, TEAM_SIZE).map((p) => p.id);
    expect(selectionError(s, { xi: noKeeper, plan: 'balanced' })).toMatch(/wicket-keeper/);
    const fewBowlers = [...s.squad.filter((p) => p.role === 'bat' || p.role === 'keep'), ...s.squad.filter((p) => p.role === 'all'), ...s.squad.filter((p) => p.role === 'bowl')].slice(0, TEAM_SIZE).map((p) => p.id);
    expect(s.squad.filter((p) => fewBowlers.includes(p.id) && (p.role === 'bowl' || p.role === 'all')).length).toBeLessThan(MIN_BOWLERS);
    expect(selectionError(s, { xi: fewBowlers, plan: 'balanced' })).toMatch(/bowlers/);
    expect(selectionError(s, null)).toBeTruthy();
  });

  it('tires players who play and rests those who do not', () => {
    const s = createSeason(9);
    const xi = suggestXI(s);
    const after = playMatch(s, { xi, plan: 'balanced' });
    for (const p of after.squad) {
      if (xi.includes(p.id)) expect(p.fatigue).toBeGreaterThan(0);
      else expect(p.fatigue).toBe(0);
      expect(p.form).toBeGreaterThanOrEqual(-2);
      expect(p.form).toBeLessThanOrEqual(2);
    }
  });

  it('rewards rotating the squad over flogging the same eleven', () => {
    let rotate = 0, same = 0;
    for (let seed = 1; seed <= 200; seed++) {
      rotate += playAll(seed).season.reports.filter((m) => m.won).length;
      const first = suggestXI(createSeason(seed));
      same += playAll(seed, 'balanced', () => first).season.reports.filter((m) => m.won).length;
    }
    expect(rotate).toBeGreaterThan(same);
  });

  it('is winnable but not a walkover', () => {
    let wins = 0, titles = 0;
    const seasons = 300;
    for (let seed = 1; seed <= seasons; seed++) {
      const { season } = playAll(seed);
      wins += season.reports.filter((m) => m.won).length;
      if (place(season) === 1) titles++;
    }
    const rate = wins / (seasons * SEASON_MATCHES);
    expect(rate).toBeGreaterThan(0.4);
    expect(rate).toBeLessThan(0.75);
    expect(titles / seasons).toBeGreaterThan(0.05);
    expect(titles / seasons).toBeLessThan(0.6);
  });

  it('keeps a table of eight with you in it', () => {
    const { season } = playAll(3);
    const t = table(season);
    expect(t).toHaveLength(8);
    expect(t.filter((r) => r.you)).toHaveLength(1);
    expect(t.every((r) => r.played === SEASON_MATCHES)).toBe(true);
    for (let i = 1; i < t.length; i++) expect(t[i - 1].points).toBeGreaterThanOrEqual(t[i].points);
  });

  it('will not replay a season with a bad selection in it, or one that runs too long', () => {
    const { sels } = playAll(11);
    expect(replaySeason(11, [...sels, sels[0]])).toBeNull();
    expect(replaySeason(11, [{ xi: [1, 2, 3], plan: 'balanced' }])).toBeNull();
  });
});
