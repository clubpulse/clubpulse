import Link from 'next/link';
import type { ReactNode } from 'react';

export function AuthShell({ title, subtitle, children, footer }: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0B0B0B] px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-primary font-bold text-white">C</span>
            <span className="text-2xl font-bold text-white">Creds</span>
          </Link>
          <h1 className="mt-6 text-xl font-semibold text-white">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-neutral-400">{subtitle}</p>}
        </div>
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-8 shadow-xl">{children}</div>
        {footer && <p className="mt-6 text-center text-sm text-neutral-400">{footer}</p>}
      </div>
    </div>
  );
}
