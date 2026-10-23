import Link from 'next/link';
import type { ReactNode } from 'react';
import { PAGE_SIZE } from '@/lib/platform-admin';

export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold text-white">{title}</h1>
      {description && <p className="mt-1 text-sm text-neutral-400">{description}</p>}
    </div>
  );
}

export function StatCard({ label, value, hint, accent = 'gold' }: {
  label: string; value: number | string; hint?: string; accent?: 'gold' | 'crimson';
}) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight" style={{ color: accent === 'gold' ? '#c9a54c' : '#e05252' }}>
        {typeof value === 'number' ? value.toLocaleString('en-GB') : value}
      </p>
      {hint && <p className="mt-1 text-xs text-neutral-500">{hint}</p>}
    </div>
  );
}

export function Table({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-neutral-800 bg-neutral-950">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-neutral-800 text-xs uppercase tracking-wide text-neutral-500">
          <tr>{headers.map((header) => <th key={header} scope="col" className="px-4 py-3 font-semibold">{header}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-neutral-900">{children}</tbody>
      </table>
    </div>
  );
}

export function Cell({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <td className={`px-4 py-3 text-neutral-300 ${className}`}>{children}</td>;
}

export function EmptyState({ icon, title, children }: { icon: string; title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-950 px-6 py-12 text-center">
      <p className="text-4xl" aria-hidden>{icon}</p>
      <p className="mt-3 font-medium text-white">{title}</p>
      {children && <div className="mx-auto mt-1 max-w-md text-sm text-neutral-400">{children}</div>}
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <p role="alert" className="mb-4 rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">{message}</p>
  );
}

// Prev/next links driven by ?page= (1-based)
export function Pagination({ basePath, page, total }: { basePath: string; page: number; total: number }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (pages <= 1) return null;
  const href = (target: number) => `${basePath}?page=${target}`;
  const linkClass = 'rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-white hover:bg-neutral-800';

  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-between text-sm text-neutral-400">
      <span>Page {page} of {pages} · {total.toLocaleString('en-GB')} total</span>
      <div className="flex gap-2">
        {page > 1 && <Link href={href(page - 1)} className={linkClass}>← Previous</Link>}
        {page < pages && <Link href={href(page + 1)} className={linkClass}>Next →</Link>}
      </div>
    </nav>
  );
}
