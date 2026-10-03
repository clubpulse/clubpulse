import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { requireUser } from '@/lib/auth/server';
import { getAdminContext } from '@/lib/auth/admin';

// Guard: club admins (club_members.role = 'admin'), merchants, and platform admins may enter.
// Each page then checks the specific right it needs.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const ctx = await getAdminContext(user.id);
  const isClubAdmin = ctx.adminClubIds.length > 0;

  if (!isClubAdmin && !ctx.isMerchant && !ctx.isPlatformAdmin) redirect('/dashboard');

  const links = [
    ...(isClubAdmin
      ? [
          { href: '/admin/club', label: 'Overview' },
          { href: '/admin/club/members', label: 'Members' },
          { href: '/admin/club/volunteers', label: 'Volunteers' },
          { href: '/admin/club/multipliers', label: 'Multipliers' },
          { href: '/admin/club/sport-configs', label: 'Earning rules' },
        ]
      : []),
    ...(ctx.isMerchant || ctx.isPlatformAdmin ? [{ href: '/admin/merchant', label: 'Merchant insights' }] : []),
  ];

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-white">
      <header className="border-b border-neutral-800">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-primary text-sm font-bold">C</span>
            <span className="font-semibold">Admin</span>
          </Link>
          <nav className="flex flex-wrap gap-4 text-sm text-neutral-400" aria-label="Admin">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-white">{link.label}</Link>
            ))}
          </nav>
          <Link href="/dashboard" className="ml-auto text-sm text-neutral-500 hover:text-white">← Back to app</Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
