import { readFileSync } from 'fs';
import { join } from 'path';

const root = join(__dirname, '../..');
const configSource = readFileSync(join(root, 'next.config.ts'), 'utf8');
const analyseSource = readFileSync(join(root, 'src/components/analyse/AnalyseClient.tsx'), 'utf8');

/** Host sources MediaPipe actually requests from a FilesetResolver base URL. useModule is false. */
const WASM_SCRIPTS = ['vision_wasm_internal.js', 'vision_wasm_nosimd_internal.js'];
const WASM_BINARIES = ['vision_wasm_internal.wasm', 'vision_wasm_nosimd_internal.wasm'];

type Directive = 'script-src' | 'connect-src';

function contentSecurityPolicy(source: string): string {
  const start = source.indexOf('const csp = [');
  const end = source.indexOf('].join', start);
  if (start < 0 || end < 0) throw new Error('csp array not found in next.config.ts');
  const directives = [...source.slice(start, end).matchAll(/"([^"]*)"/g)].map((match) => match[1]);
  if (directives.length === 0) throw new Error('csp directives not found in next.config.ts');
  return directives.join('; ');
}

function directiveSources(csp: string, name: string): string[] {
  const part = csp.split(';').map((item) => item.trim()).find((item) => item === name || item.startsWith(`${name} `));
  if (!part) throw new Error(`missing ${name}`);
  return part.split(/\s+/).slice(1);
}

/** CSP3 host-source match, enough to tell a real allowlist entry from `https:` or `*`. */
function sourceAllows(source: string, urlString: string): boolean {
  if (source === '*') return true;
  if (source.startsWith("'")) return false;
  const url = new URL(urlString);
  if (/^[a-z][a-z0-9+.-]*:$/i.test(source)) return url.protocol === source.toLowerCase();

  const schemeSplit = source.split('://');
  if (schemeSplit.length !== 2) return false;
  const [scheme, rest] = schemeSplit;
  if (url.protocol !== `${scheme.toLowerCase()}:`) return false;

  const slash = rest.indexOf('/');
  const hostPort = slash === -1 ? rest : rest.slice(0, slash);
  const path = slash === -1 ? '' : rest.slice(slash);
  const colon = hostPort.lastIndexOf(':');
  const host = (colon === -1 ? hostPort : hostPort.slice(0, colon)).toLowerCase();
  const port = colon === -1 ? '' : hostPort.slice(colon + 1);
  if (port) {
    if (url.port !== port) return false;
  } else if (url.port !== '') return false;

  const hostname = url.hostname.toLowerCase();
  if (host.startsWith('*.')) {
    const suffix = host.slice(2);
    if (hostname === suffix || !hostname.endsWith(`.${suffix}`)) return false;
  } else if (hostname !== host) return false;

  if (path === '') return true;
  if (path.endsWith('/')) return url.pathname.startsWith(path);
  return url.pathname === path;
}

function allowingSource(sources: string[], url: string): string | undefined {
  return sources.find((source) => sourceAllows(source, url));
}

function externalUrlConstants(source: string): { name: string; url: string }[] {
  return [...source.matchAll(/const\s+([A-Z][A-Z0-9_]*)\s*=\s*(?:\r?\n\s*)?(['"`])(https?:\/\/[^'"`]+)\2/g)]
    .map((match) => ({ name: match[1], url: match[3] }));
}

/** Requests FilesetResolver.forVisionTasks and modelAssetPath make for one constant. */
function requestsFor(name: string, url: string, source: string): { directive: Directive; url: string }[] {
  const needs: { directive: Directive; url: string }[] = [];
  const base = url.replace(/\/$/, '');
  if (new RegExp(`forVisionTasks\\(\\s*${name}\\s*\\)`).test(source)) {
    for (const file of WASM_SCRIPTS) needs.push({ directive: 'script-src', url: `${base}/${file}` });
    for (const file of WASM_BINARIES) needs.push({ directive: 'connect-src', url: `${base}/${file}` });
  }
  if (new RegExp(`modelAssetPath:\\s*${name}\\b`).test(source)) {
    needs.push({ directive: 'connect-src', url });
  }
  return needs;
}

describe('report-only CSP and /analyse MediaPipe URLs', () => {
  it('matches host sources the way a browser would', () => {
    const script = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.0/wasm/vision_wasm_internal.js';
    expect(sourceAllows('https://cdn.jsdelivr.net', script)).toBe(true);
    expect(sourceAllows('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.0/wasm/', script)).toBe(true);
    expect(sourceAllows('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.0/wasm', script)).toBe(false);
    expect(sourceAllows('https://storage.googleapis.com', 'https://storage.googleapis.com/mediapipe-models/x.task')).toBe(true);
    expect(sourceAllows('https://cdn.jsdelivr.net', 'https://storage.googleapis.com/x')).toBe(false);
    expect(sourceAllows('https:', script)).toBe(true);
    expect(sourceAllows("'self'", script)).toBe(false);
    expect(sourceAllows('*', script)).toBe(true);
    expect(sourceAllows('https://*.supabase.co', 'https://abc.supabase.co/rest/v1/x')).toBe(true);
    expect(sourceAllows('https://*.supabase.co', 'https://supabase.co/rest/v1/x')).toBe(false);
  });

  it('allows every external URL constant AnalyseClient actually requests', () => {
    const csp = contentSecurityPolicy(configSource);
    const constants = externalUrlConstants(analyseSource);
    expect(constants.length).toBeGreaterThan(0);

    const covered: string[] = [];
    for (const constant of constants) {
      const needs = requestsFor(constant.name, constant.url, analyseSource);
      if (needs.length === 0) {
        throw new Error(`${constant.name} (${constant.url}) is an external URL with no CSP request mapping`);
      }
      for (const need of needs) {
        const source = allowingSource(directiveSources(csp, need.directive), need.url);
        expect({ url: need.url, directive: need.directive, source }).toEqual({
          url: need.url,
          directive: need.directive,
          source: expect.stringContaining(new URL(need.url).hostname),
        });
        covered.push(`${need.directive} ${need.url}`);
      }
      if (/^https:\/\/storage\.googleapis\.com\//.test(constant.url)) {
        expect(allowingSource(directiveSources(csp, 'script-src'), constant.url)).toBeUndefined();
      }
    }

    expect(covered).toEqual(expect.arrayContaining([
      expect.stringContaining('script-src https://cdn.jsdelivr.net/'),
      expect.stringContaining('connect-src https://cdn.jsdelivr.net/'),
      expect.stringContaining('connect-src https://storage.googleapis.com/'),
    ]));
  });

  it('keeps the policy report-only', () => {
    expect(configSource).toMatch(/key:\s*'Content-Security-Policy-Report-Only',\s*value:\s*csp/);
    expect(configSource).not.toMatch(/['"]Content-Security-Policy['"]/);
  });
});
