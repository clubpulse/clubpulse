import { isCrossSite, safeAppPath } from '@/lib/auth/app-view';

describe('safeAppPath', () => {
  it('keeps allowed pages and their query', () => {
    expect(safeAppPath('/analyse')).toBe('/analyse');
    expect(safeAppPath('/highlights?id=abc')).toBe('/highlights?id=abc');
    expect(safeAppPath('/coaching?tab=bookings#top')).toBe('/coaching?tab=bookings');
  });

  it('falls back for anything else', () => {
    for (const bad of [null, undefined, '', 'https://evil.example', '//evil.example', '/\\evil.example', '/admin', '/analyse/../admin', 'analyse']) {
      expect(safeAppPath(bad)).toBe('/analyse');
    }
  });
});

describe('isCrossSite', () => {
  const own = 'https://clubpulse.co';

  it('lets the app web view and our own pages through', () => {
    expect(isCrossSite(null, null, own)).toBe(false);
    expect(isCrossSite('null', 'none', own)).toBe(false);
    expect(isCrossSite(own, 'same-origin', own)).toBe(false);
  });

  it('refuses other websites', () => {
    expect(isCrossSite('https://evil.example', null, own)).toBe(true);
    expect(isCrossSite(null, 'cross-site', own)).toBe(true);
    expect(isCrossSite('https://clubpulse.co.evil.example', 'same-site', own)).toBe(true);
  });
});
