import type { ReactNode } from 'react';
import Link from 'next/link';

export type LegalSection = { heading: string; body: ReactNode };

// Shared layout for the privacy policy and terms. Plain and readable on a phone: these pages
// are opened from inside the app as well as on the website.
export function LegalPage({ title, updated, intro, sections }: { title: string; updated: string; intro: ReactNode; sections: LegalSection[] }) {
  return (
    <div className="min-h-screen bg-[#04091A] text-neutral-200">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 py-6">
        <Link href="/" className="text-lg font-bold text-white no-underline">
          SHIFT<span style={{ color: '#60A5FA' }}>UP</span>
        </Link>
        <nav className="flex gap-5 text-sm text-neutral-400">
          <Link href="/privacy" className="hover:text-white">Privacy</Link>
          <Link href="/terms" className="hover:text-white">Terms</Link>
          <Link href="/refunds" className="hover:text-white">Refunds</Link>
        </nav>
      </header>
      <main className="mx-auto max-w-3xl px-5 pb-20">
        <h1 className="text-3xl font-bold text-white">{title}</h1>
        <p className="mt-2 text-sm text-neutral-500">Last updated {updated}</p>
        <div className="mt-6 space-y-3 text-[15px] leading-relaxed">{intro}</div>
        {sections.map((section, i) => (
          <section key={section.heading} className="mt-9">
            <h2 className="text-xl font-semibold text-white">{i + 1}. {section.heading}</h2>
            <div className="mt-3 space-y-3 text-[15px] leading-relaxed [&_a]:text-sky-400 [&_a]:underline [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">
              {section.body}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}

export const CONTACT_EMAIL = 'hello@shiftup.club';
