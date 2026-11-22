import type { ReactNode } from 'react';
import { requireUser } from '@/lib/auth/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { communityOpen, getViewer } from '@/lib/community/service';
import { DobForm } from '@/components/community/DobForm';

// The Community is closed to anyone whose age is not known, and to under-18s with no verified parent. The service
// layer refuses them as well; this is what they see instead of an empty screen.
export default async function CommunityLayout({ children }: { children: ReactNode }) {
  if (!communityOpen()) return <>{children}</>;
  const user = await requireUser();
  const viewer = await getViewer(createAdminClient(), user.id);
  if (!viewer.hold) return <>{children}</>;

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: 16, display: 'grid', gap: 12 }}>
      <h1 style={{ margin: 0 }}>{viewer.status === 'needs_dob' ? 'One thing before you start' : 'Almost there'}</h1>
      <p style={{ margin: 0 }}>{viewer.hold}</p>
      {viewer.status === 'needs_dob' && (
        <>
          <p style={{ margin: 0, opacity: 0.8 }}>Under-18s have extra protections, so we need to know. It is saved once and kept private.</p>
          <DobForm />
        </>
      )}
    </div>
  );
}
