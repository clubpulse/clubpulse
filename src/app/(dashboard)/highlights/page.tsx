import { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/server';
import { Card } from '@/components/ui/Card';
import { ClipCard } from '@/components/highlights/ClipCard';
import { formatSessionDate, type Highlight } from '@/lib/highlights';
import { demoHighlight, isDemoHighlight } from '@/lib/highlights-demo';

export const metadata: Metadata = { title: 'Highlights | ClubPulse', description: 'Your best clips from Analyse' };

async function loadHighlight(id: string | undefined) {
  const user = await getCurrentUser();
  const supabase = await createClient();
  let query = supabase
    .from('highlights')
    .select('id, session_date, video_url, clips, top_clip_url')
    .eq('user_id', user!.id);
  query = id ? query.eq('id', id) : query.order('created_at', { ascending: false }).limit(1);
  const { data } = await query.maybeSingle<Highlight>();
  return data;
}

// Shows the latest reel, or a specific one via ?id= (linked from the sessions list).
// ?demo=true shows the sample reel without touching the database.
export default async function HighlightsPage({ searchParams }: { searchParams: Promise<{ id?: string; demo?: string }> }) {
  const { id, demo } = await searchParams;
  const data = demo === 'true' ? demoHighlight() : await loadHighlight(id);

  if (!data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Your Highlights</h1>
        <Card>
          <div className="py-8 text-center">
            <p className="text-4xl" aria-hidden>🎬</p>
            <p className="mt-3 font-medium text-white">{id ? 'Session not found' : 'No highlights yet'}</p>
            <p className="mt-1 text-sm text-neutral-400">
              Start the camera on Analyse, play a few deliveries or shots, then stop the camera. Your best 3 clips land here.
            </p>
            <Link href="/analyse" className="mt-5 inline-flex rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-primary-light">
              Go to Analyse
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isDemoHighlight(data) && (
        <div role="status" className="rounded-xl border border-yellow-500/40 bg-yellow-400/10 px-4 py-3 text-sm text-yellow-200">
          <span className="font-semibold text-yellow-300">Demo mode</span> — showing sample data. Record a session on{' '}
          <Link href="/analyse" className="font-semibold text-yellow-300 underline underline-offset-2">/analyse</Link>{' '}
          to generate real highlights.
        </div>
      )}

      <div>
        <h1 className="text-2xl font-semibold">Your Highlights</h1>
        <p className="mt-1 text-sm text-neutral-400">Session on {formatSessionDate(data.session_date)}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.clips.map((clip) => <ClipCard key={clip.path} clip={clip} />)}
      </div>

      <Link href="/highlights/sessions" className="inline-block text-sm font-medium text-brand-gold hover:underline">
        View all sessions →
      </Link>
    </div>
  );
}
