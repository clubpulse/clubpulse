import { NextResponse } from 'next/server';

// Maps a service-layer error message to an HTTP status
export function statusForError(error: string): number {
  if (/not authenticated/i.test(error)) return 401;
  if (/access to this club|only platform admins|forbidden/i.test(error)) return 403;
  if (/not found/i.test(error)) return 404;
  return 400;
}

export function fail(error: string, status = statusForError(error)) {
  return NextResponse.json({ error }, { status });
}

export const unauthorized = () => NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}
