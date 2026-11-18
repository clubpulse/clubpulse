// Shared by the app sign-in handoff (/auth/app-session) and the page shell.

/** Set when pages are being shown inside the phone app's web view. */
export const APP_VIEW_COOKIE = 'cp_app';

// Pages the phone app is allowed to open in its web view. Anything else falls back to the first.
const APP_PATHS = [
  '/analyse',
  '/highlights',
  '/highlights/sessions',
  '/coaching-history',
  '/development',
  '/player-report',
  '/log-performance',
  '/coaching',
  '/qualifications',
];

/** The page to land on: an allowed path with its query string, never another site. */
export function safeAppPath(next: string | null | undefined): string {
  const fallback = APP_PATHS[0];
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return fallback;
  const [path, query] = next.split('#')[0].split('?');
  if (!APP_PATHS.includes(path)) return fallback;
  return query ? `${path}?${query}` : path;
}

/**
 * True when the request could have come from another website. The app's web view sends no
 * Origin (or "null") on its first request; a form on someone else's site always sends theirs.
 * Without this check another site could sign a visitor's browser in to an account it controls.
 */
export function isCrossSite(origin: string | null, fetchSite: string | null, ownOrigin: string): boolean {
  if (fetchSite === 'cross-site') return true;
  if (!origin || origin === 'null') return false;
  return origin !== ownOrigin;
}
