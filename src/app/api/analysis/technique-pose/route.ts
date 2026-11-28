import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { technique3dEnabled } from '@/lib/technique3d/flag';
import { parseTechniquePose } from '@/lib/technique3d/payload';

export const dynamic = 'force-dynamic';

/** The signed-in player's own 3D estimate. The flag hides the route. No other account is accepted. */
export async function GET() {
  if (!technique3dEnabled()) return NextResponse.json({ error: 'Not available' }, { status: 404 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const { data, error } = await supabase.from('technique_pose_frames')
    .select('id, mode, hand, key_event, key_event_frame, times, frames, analysis_id, quality, coverage, source_fps, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return NextResponse.json({ error: 'Could not load the 3D estimate.' }, { status: 500 });
  return NextResponse.json({ pose: data ?? null });
}

export async function POST(req: Request) {
  if (!technique3dEnabled()) return NextResponse.json({ error: 'Not available' }, { status: 404 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'The 3D estimate could not be read.' }, { status: 400 });
  }
  const parsed = parseTechniquePose(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const pose = parsed.value;
  const { data, error } = await supabase.from('technique_pose_frames').insert({
    user_id: user.id,
    analysis_id: pose.analysisId,
    mode: pose.mode,
    hand: pose.hand,
    key_event: pose.keyEvent,
    key_event_frame: pose.keyEventFrame,
    times: pose.times,
    frames: pose.frames,
    quality: pose.quality ?? null,
    coverage: pose.coverage ?? null,
    source_fps: pose.sourceFps ?? null,
  }).select('id').single();
  if (error) return NextResponse.json({ error: 'Could not save the 3D estimate.' }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
