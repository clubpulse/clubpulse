import { checkXI, myXIState, MAX_XI } from '@/lib/xi-selection/logic';
import type { AvailabilityStatus } from '@/lib/types/availability';

const ids = (n: number) => Array.from({ length: n }, (_, i) => `p${i + 1}`);
const status = (m: Record<string, AvailabilityStatus>) => (id: string) => m[id];

describe('checkXI', () => {
  it('accepts a full side with no warnings', () => {
    const r = checkXI({ players: ids(11), twelfthMan: 'p12', statusOf: status({}) });
    expect(r.ok).toBe(true);
    expect(r.warnings).toEqual([]);
  });

  it('refuses more than 11', () => {
    const r = checkXI({ players: ids(12), twelfthMan: null, statusOf: status({}) });
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toContain(String(MAX_XI));
  });

  it('refuses duplicates and a twelfth man already in the XI', () => {
    expect(checkXI({ players: ['a', 'a'], twelfthMan: null, statusOf: status({}) }).ok).toBe(false);
    expect(checkXI({ players: ids(11), twelfthMan: 'p3', statusOf: status({}) }).ok).toBe(false);
  });

  it('only warns when fewer than 11 are named', () => {
    const r = checkXI({ players: ids(9), twelfthMan: null, statusOf: status({}) });
    expect(r.ok).toBe(true);
    expect(r.warnings[0]).toContain('9');
  });

  it('only warns when someone unavailable is picked', () => {
    const r = checkXI({ players: ids(11), twelfthMan: null, statusOf: status({ p4: 'unavailable' }), nameOf: (id) => `Player ${id}` });
    expect(r.ok).toBe(true);
    expect(r.warnings.join(' ')).toContain('Player p4');
  });
});

describe('myXIState', () => {
  const sel = { selected_players: ['a', 'b'], twelfth_man: 'c' };
  it('reports in, twelfth, out and pending', () => {
    expect(myXIState(sel, 'a')).toBe('in');
    expect(myXIState(sel, 'c')).toBe('twelfth');
    expect(myXIState(sel, 'z')).toBe('out');
    expect(myXIState(null, 'a')).toBe('pending');
  });
});
