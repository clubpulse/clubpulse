import { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/server';
import { Card } from '@/components/ui/Card';
import { formatSessionDate, type Highlight } from '@/lib/highlights';

export const metadata: Metadata = { title: 'All sessions | ClubPulse' };

export default async function HighlightSessionsPage() {
  const user = await getCurrentUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from('highlights')
    .select('id, session_date, video_url, clips, top_clip_url')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(50)
    .returns<Highlight[]>();
  const sessions = data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/highlights" className="text-sm text-neutral-400 hover:text-white">← Latest highlights</Link>
        <h1 className="mt-2 text-2xl font-semibold">All sessions</h1>
      </div>

      {sessions.length === 0 ? (
        <Card>
          <p className="text-sm text-neutral-400">
            No sessions yet. <Link href="/analyse" className="text-brand-gold hover:underline">Record one on Analyse</Link>.
          </p>
        </Card>
      ) : (
        <ul className="space-y-2">
          {sessions.map((session) => {
            const best = session.clips[0];
            return (
              <li key={session.id}>
                <Link href={`/highlights?id=${session.id}`}
                  className="flex items-center justify-between gap-4 rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 transition hover:border-neutral-700">
                  <div>
                    <p className="text-sm font-medium text-white">{formatSessionDate(session.session_date)}</p>
                    <p className="text-xs text-neutral-500">
                      {session.clips.length} clip{session.clips.length === 1 ? '' : 's'}{best ? ` · ${best.label}` : ''}
                    </p>
                  </div>
                  {best && (
                    <span className="rounded-full bg-brand-primary px-2.5 py-1 text-xs font-bold text-white">{best.score}/100</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
