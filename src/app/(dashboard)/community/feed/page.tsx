import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth/server';
import { communityOpen, getFeed } from '@/lib/community/service';
import { SCOPES, type Scope } from '@/lib/community/rules';
import { ClosedNotice } from '@/components/community/ui';
import { Feed } from '@/components/community/Feed';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Community feed' };

export default async function FeedPage({ searchParams }: { searchParams: Promise<{ scope?: string }> }) {
  const user = await requireUser();
  if (!communityOpen()) return <ClosedNotice />;
  const sp = (await searchParams).scope;
  const scope: Scope = (SCOPES as readonly string[]).includes(sp ?? '') ? (sp as Scope) : 'club';
  const r = await getFeed(user.id, scope);
  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: 16 }}>
      <h1>Community</h1>
      {r.success ? <Feed posts={r.data.posts} scope={r.data.scope} canFilter={r.data.canFilter} /> : <p>{r.error}</p>}
    </div>
  );
}
