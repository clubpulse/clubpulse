import { COMMUNITY_ENABLED, STORE_ENABLED } from '../../expo/constants/features';
import { THOUGHTS, thoughtFor } from '../../expo/lib/quotes';

describe('Expo smoke', () => {
  it('keeps Community and the store off unless their build flags are set', () => {
    expect(COMMUNITY_ENABLED).toBe(process.env.EXPO_PUBLIC_COMMUNITY_ENABLED === 'true');
    expect(STORE_ENABLED).toBe(process.env.EXPO_PUBLIC_STORE_ENABLED === 'true');
  });

  it('shows one of the written thoughts for a given day', () => {
    expect(THOUGHTS).toContain(thoughtFor(new Date(2026, 0, 1)));
    expect(thoughtFor(new Date(2026, 0, 1))).toBe(thoughtFor(new Date(2026, 0, 1)));
  });
});
