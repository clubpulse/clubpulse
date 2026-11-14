import Link from 'next/link';
import type { ReactNode } from 'react';
import { requireAdmin } from '@/lib/auth/admin';
import { AdminNav } from '@/components/platform-admin/AdminNav';

// ClubPulse staff dashboard (profiles.role = 'admin'). Its own route group because /admin/club and
// /admin/merchant in (admin) serve club admins and merchants, who must not hit this guard.
export default async function PlatformAdminLayout({ children }: { children: ReactNode }) {
  const user = await requireAdmin();

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-white">
      <header className="sticky top-0 z-10 border-b border-neutral-800 bg-[#0B0B0B]/95 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-3 md:px-6">
          <Link href="/admin" className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-primary text-sm font-bold">C</span>
            <span className="font-semibold">Admin <span className="text-neutral-500">—</span> ClubPulse</span>
          </Link>
          <div className="ml-auto flex items-center gap-4 text-sm">
            <span className="hidden truncate text-neutral-400 sm:inline">{user.email}</span>
            <Link href="/dashboard" className="whitespace-nowrap text-neutral-500 hover:text-white">← Back to app</Link>
          </div>
        </div>
      </header>

      <div className="md:flex">
        <aside className="border-b border-neutral-800 px-4 py-3 md:sticky md:top-[57px] md:h-[calc(100vh-57px)] md:w-60 md:shrink-0 md:border-b-0 md:border-r md:px-3 md:py-6">
          <AdminNav />
        </aside>
        <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
