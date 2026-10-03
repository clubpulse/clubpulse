'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const NAV_LINKS = [
  { href: '/dashboard',   label: 'Home',        icon: '🏠' },
  { href: '/marketplace', label: 'Marketplace', icon: '🛍️' },
  { href: '/companion',   label: 'Companion',   icon: '🧠' },
  { href: '/profile',     label: 'Profile',     icon: '👤' },
];

export function Sidebar({ showAdmin }: { showAdmin: boolean }) {
  const pathname = usePathname();
  const links = showAdmin ? [...NAV_LINKS, { href: '/admin/club', label: 'Club admin', icon: '🛡️' }] : NAV_LINKS;

  return (
    <nav className="hidden w-56 shrink-0 md:block" aria-label="Main">
      <ul className="sticky top-20 space-y-1">
        {links.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active ? 'bg-brand-primary/20 text-white' : 'text-neutral-400 hover:bg-neutral-900 hover:text-white'
                }`}
              >
                <span aria-hidden>{link.icon}</span>
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
