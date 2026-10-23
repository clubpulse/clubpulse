'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/admin', label: 'Dashboard', icon: '📊' },
  { href: '/admin/users', label: 'Users', icon: '👥' },
  { href: '/admin/sessions', label: 'Sessions & Highlights', icon: '🎬' },
  { href: '/admin/rewards', label: 'Rewards', icon: '🪙' },
  { href: '/admin/marketplace', label: 'Marketplace', icon: '🛍️' },
  { href: '/admin/challenges', label: 'Challenges', icon: '🏆' },
];

// Client only for the active-link highlight
export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin" className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
      {LINKS.map((link) => {
        const active = link.href === '/admin' ? pathname === '/admin' : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={`flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
              active ? 'bg-[rgba(155,28,28,0.18)] text-white' : 'text-neutral-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <span aria-hidden>{link.icon}</span>
            <span className="whitespace-nowrap">{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
