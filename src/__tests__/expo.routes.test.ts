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
    for (const name of ['warmup/readiness', 'warmup/recovery', 'warmup/sharing', 'academy-certificate', 'community/sessions', 'community/approvals']) expect(layout).toContain(`name="${name}"`);
  });
  it('does not switch any Expo flag on in the build profiles', () => {
    expect(read('eas.json')).not.toMatch(/EXPO_PUBLIC_(COMMUNITY|STORE|VOLUNTEERS|DEALS)_ENABLED/);
  });
});

describe('Expo parent approvals', () => {
  const approvals = read('app/community/approvals.tsx');
  it('has a screen that calls the approvals API and answers with an explicit yes or no', () => {
    expect(approvals).toContain("'/api/community/approvals'");
    expect(approvals).toContain('approve }'); // the body carries the boolean, never a default
    expect(approvals).toContain('Alert.alert'); // each answer is confirmed first
    expect(approvals).toContain('Approve');
    expect(approvals).toContain('Decline');
  });
  it('is in the Community menu for parents only', () => {
    const pillars = read('lib/pillars.ts');
    expect(pillars).toMatch(/key: 'approvals'[^\n]*route: '\/community\/approvals', for: \['parent'\], strict: true/);
  });
  it('is where a parent’s approval notification leads', () => {
    expect(read('app/community/notifications.tsx')).toContain("n.kind === 'parent_approval_needed' ? '/community/approvals'");
  });
  it('tells a parent what happened after they answer', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { approvalMessage } = require('../../expo/lib/community') as typeof import('../../expo/lib/community');
    expect(approvalMessage('opened')).toMatch(/can now message/);
    expect(approvalMessage('waiting')).toMatch(/Waiting for the other/);
    expect(approvalMessage('declined')).toMatch(/closed/);
  });
  it('is at build 12 in the app config, without switching any flag on', () => {
    const cfg = JSON.parse(read('app.json')).expo;
    expect(cfg.ios.buildNumber).toBe('12');
    expect(cfg.android.versionCode).toBe(12);
    expect(cfg.version).toBe('1.0.0');
    expect(read('eas.json')).not.toMatch(/EXPO_PUBLIC_(COMMUNITY|STORE|VOLUNTEERS|DEALS)_ENABLED/);
  });
});
