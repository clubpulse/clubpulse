import { CODE_LENGTH, newJoinCode, normaliseJoinCode, parseShiftInput } from '@/lib/mobile/club-admin-logic';

describe('join codes', () => {
  it('makes codes of the right length without look-alike characters', () => {
    for (let i = 0; i < 200; i++) {
      const code = newJoinCode();
      expect(code).toHaveLength(CODE_LENGTH);
      expect(code).toMatch(/^[A-Z2-9]+$/);
      expect(code).not.toMatch(/[01OILS5]/);
    }
    // Stays in range at the very top of the random number
    expect(newJoinCode(() => 0.999999999)).toHaveLength(CODE_LENGTH);
    expect(newJoinCode(() => 0)).toBe('AAAAAA');
  });

  it('tidies what people type', () => {
    expect(normaliseJoinCode(' ab3-k9z ')).toBe('AB3K9Z');
    expect(normaliseJoinCode('abc def')).toBe('ABCDEF');
    // Codes made in the database can contain 0 and 1
    expect(normaliseJoinCode('0a1b2c')).toBe('0A1B2C');
  });

  it('refuses anything that cannot be a code', () => {
    for (const bad of ['', 'ABC', 'ABCDEFG', 'ABC!EF', "A' OR 1", null, undefined, 123456, {}]) expect(normaliseJoinCode(bad)).toBeNull();
  });
});

describe('parseShiftInput', () => {
  const today = '2026-11-18';
  const good = { title: 'Tea duty, 1st XI', role: 'tea_duty', shift_date: '2026-11-21', start_time: '12:30', end_time: '15:00', location: ' Pavilion ', max_volunteers: 2 };

  it('accepts a good shift and tidies it', () => {
    const parsed = parseShiftInput(good, today);
    expect(parsed).toEqual({ ok: true, value: { title: 'Tea duty, 1st XI', role: 'tea_duty', shift_date: '2026-11-21', start_time: '12:30', end_time: '15:00', location: 'Pavilion', max_volunteers: 2 } });
    expect(parseShiftInput({ ...good, max_volunteers: undefined, location: '' }, today)).toMatchObject({ ok: true, value: { max_volunteers: 1 } });
    expect(parseShiftInput({ ...good, shift_date: today }, today).ok).toBe(true);
  });

  it.each([
    [{ title: 'ab' }, /title/],
    [{ role: 'boss' }, /kind of shift/],
    [{ shift_date: '21/11/2026' }, /date/],
    [{ shift_date: '2026-02-30' }, /date/],
    [{ shift_date: '2026-11-17' }, /past/],
    [{ start_time: '9:30' }, /Times/],
    [{ end_time: '25:00' }, /Times/],
    [{ start_time: '15:00', end_time: '15:00' }, /end after/],
    [{ max_volunteers: 0 }, /between 1 and 50/],
    [{ max_volunteers: 2.5 }, /between 1 and 50/],
    [{ max_volunteers: 500 }, /between 1 and 50/],
  ])('refuses %j', (change, message) => {
    const parsed = parseShiftInput({ ...good, ...change }, today);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.error).toMatch(message);
  });

  it('refuses things that are not a shift at all', () => {
    expect(parseShiftInput(null, today).ok).toBe(false);
    expect(parseShiftInput('shift', today).ok).toBe(false);
  });

  it('cuts very long text down', () => {
    const parsed = parseShiftInput({ ...good, title: 'x'.repeat(300), description: 'y'.repeat(2000) }, today);
    expect(parsed.ok && parsed.value.title.length).toBe(80);
    expect(parsed.ok && parsed.value.description?.length).toBe(500);
  });
});
