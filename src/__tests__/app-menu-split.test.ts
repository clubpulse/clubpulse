import { menuFor, playsCricket } from '../../expo/lib/menu';

const viewer = (roles: Parameters<typeof menuFor>[0]['roles']) => ({ roles, junior: false, switches: { store: false, deals: false, cards: false } });
const keys = (roles: Parameters<typeof menuFor>[0]['roles']) => menuFor(viewer(roles)).flatMap((g) => g.links.map((l) => l.key));

describe('app menu: club side and player side apart', () => {
  it('gives a club admin who is not a player none of the player menu', () => {
    expect(playsCricket(['club_admin'])).toBe(false);
    expect(keys(['club_admin'])).toEqual([]);
  });

  it('gives an admin who also plays the player menu', () => {
    expect(playsCricket(['club_admin', 'player'])).toBe(true);
    expect(keys(['club_admin', 'player'])).toContain('rewards');
    expect(keys(['club_admin', 'player'])).toContain('analyse');
  });

  it('still gives players, coaches and people with no role a menu', () => {
    expect(keys(['player'])).toContain('rewards');
    expect(keys(['coach'])).toContain('form');
    expect(keys([])).toContain('rewards');
  });

  it('keeps coach-only tools from players', () => {
    expect(keys(['player'])).not.toContain('form');
  });
});
