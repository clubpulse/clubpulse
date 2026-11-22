// Every screen the app's menu and pillar tiles point at must exist, and every new Wellness, Academy
// and Community screen must be registered in the app's stack.
import * as fs from 'fs';
import * as path from 'path';

const expo = path.join(__dirname, '../../expo');
const read = (p: string) => fs.readFileSync(path.join(expo, p), 'utf8');
const routes = [...read('lib/menu.ts').matchAll(/route: '([^']+)'/g), ...read('lib/pillars.ts').matchAll(/route: '([^']+)'/g)].map((m) => m[1]);

/** Does expo-router have a screen for this path? Groups like (tabs) are invisible in a URL, and [x] files take any value. */
const resolves = (dir: string, segments: string[]): boolean => {
  if (segments.length === 0) return fs.existsSync(path.join(dir, 'index.tsx'));
  const [head, ...rest] = segments;
  const entries = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
  for (const e of entries) {
    const full = path.join(dir, e);
    const isDir = fs.statSync(full).isDirectory();
    const name = e.replace(/\.tsx$/, '');
    const matches = name === head || /^\[.+\]$/.test(name);
    if (!isDir && e.endsWith('.tsx') && rest.length === 0 && matches) return true;
    if (isDir && matches && resolves(full, rest)) return true;
    if (isDir && /^\(.+\)$/.test(e) && resolves(full, segments)) return true; // a group
  }
  return false;
};
const exists = (route: string) => resolves(path.join(expo, 'app'), route.split('?')[0].split('/').filter(Boolean));

describe('Expo routes', () => {
  it('finds the routes it is meant to check', () => expect(routes.length).toBeGreaterThan(40));
  it('has a screen for every in-app route in the menu and the pillar tiles', () => {
    const missing = routes.filter((r) => r.startsWith('/') && !r.startsWith('/web') && !r.includes('[') && !exists(r));
    expect(missing).toEqual([]);
  });
  it('registers the new screens in the stack', () => {
    const layout = read('app/_layout.tsx');
    for (const name of ['warmup/readiness', 'warmup/recovery', 'warmup/sharing', 'academy-certificate', 'community/sessions']) expect(layout).toContain(`name="${name}"`);
  });
  it('does not switch any Expo flag on in the build profiles', () => {
    expect(read('eas.json')).not.toMatch(/EXPO_PUBLIC_(COMMUNITY|STORE|VOLUNTEERS|DEALS)_ENABLED/);
  });
});
