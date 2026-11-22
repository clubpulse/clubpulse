import { Glyph } from '@/components/icons/Glyph';
// The page a shared badge links to. It is public and says what the badge is for. It names nobody:
// the link is the same for everyone who earns the badge, so nothing about a member is in it.

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BADGE_DEFS, GROUPS, badgeDef } from '@/lib/mobile/badges-logic';

type Props = { params: Promise<{ key: string }> };

export function generateStaticParams() {
  return BADGE_DEFS.map((b) => ({ key: b.key }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const def = badgeDef((await params).key);
  if (!def) return {};
  const title = `${def.title} badge | SHIFTUP`;
  const description = `${def.how} A SHIFTUP badge for grassroots cricketers.`;
  return {
    title,
    description,
    openGraph: { title, description, url: `https://shiftup.club/badge/${def.key}`, siteName: 'SHIFTUP', type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function BadgePage({ params }: Props) {
  const def = badgeDef((await params).key);
  if (!def) notFound();
  const group = GROUPS.find((g) => g.key === def.group)!;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#04091A] px-6 py-16 text-center text-white">
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#EFC84A]">SHIFTUP badge · {group.title}</p>
      <div className="mt-8 flex h-40 w-40 items-center justify-center rounded-full border-4 border-[#EFC84A] bg-[#EFC84A]/10 text-7xl" aria-hidden>
        <Glyph e={def.icon} />
      </div>
      <h1 className="mt-8 text-4xl font-extrabold">{def.title}</h1>
      <p className="mt-3 max-w-md text-lg text-white/75">{def.how}</p>
      <p className="mt-10 max-w-md text-sm text-white/55">
        SHIFTUP is the app for grassroots cricket clubs: technique, mindset, learning and club life in one place.
      </p>
      <Link href="/" className="mt-6 rounded-full bg-[#EFC84A] px-6 py-3 text-sm font-bold text-[#04091A]">
        See SHIFTUP
      </Link>
    </main>
  );
}
