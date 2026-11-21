// GET /api/analysis/history?mode=batting|bowling&view=side|front&shot=drive
// → { results: SavedAnalysis[] }  the caller's last few saved analyses of the same kind, newest first.
// Used to compare a new analysis with the one before it.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sameKind, type SavedAnalysis } from '@/lib/analysis/compare';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const q = req.nextUrl.searchParams;
  const want = { mode: q.get('mode') ?? 'batting', view: q.get('view') ?? 'side', shotType: q.get('shot') || null };

  const { data, error } = await supabase
    .from('analysis_results').select('id, created_at, result_json')
    .eq('user_id', user.id).eq('analysis_type', 'pose')
    .order('created_at', { ascending: false }).limit(60);
  if (error) return NextResponse.json({ results: [] });

  const results: SavedAnalysis[] = [];
  for (const row of data ?? []) {
    const r = row.result_json as Partial<SavedAnalysis> | null;
    if (!r || typeof r.mode !== 'string' || typeof r.overall !== 'number' || !Array.isArray(r.metrics)) continue;
    const saved: SavedAnalysis = { mode: r.mode, view: r.view, shotType: r.shotType ?? null, overall: r.overall, metrics: r.metrics, createdAt: row.created_at as string };
    if (sameKind(want, saved)) results.push(saved);
    if (results.length === 5) break;
  }
  return NextResponse.json({ results });
}
