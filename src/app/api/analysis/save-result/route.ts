/**
 * POST /api/analysis/save-result
 *
 * Saves a completed analysis (ball or pose) to Supabase, keyed by the
 * authenticated user's ID so history is per-player.
 *
 * Body (JSON):
 *   {
 *     analysis_type:    'ball' | 'pose'
 *     result_json:      object   (TrackResult or MetricResult[])
 *     coaching_paragraph?: string
 *   }
 *
 * Response 200:
 *   { id: string }   (the new row's UUID)
 *
 * Table: analysis_results
 *   id                uuid PK  default gen_random_uuid()
 *   user_id           uuid FK → auth.users(id)
 *   created_at        timestamptz default now()
 *   analysis_type     text  ('ball' | 'pose')
 *   result_json       jsonb
 *   coaching_paragraph text | null
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient }             from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    const body = await req.json();
    const { analysis_type, result_json, coaching_paragraph } = body as {
      analysis_type:      'ball' | 'pose';
      result_json:        object;
      coaching_paragraph?: string;
    };

    if (!analysis_type || !result_json) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('analysis_results')
      .insert({
        user_id:            user.id,
        analysis_type,
        result_json,
        coaching_paragraph: coaching_paragraph ?? null,
      })
      .select('id')
      .single();

    if (error) {
      // If the table doesn't exist yet, return a graceful error — no crash
      console.error('[save-result]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ id: data.id });
  } catch (err) {
    console.error('[save-result]', err);
    return NextResponse.json({ error: 'Failed to save result' }, { status: 500 });
  }
}
