import Link from 'next/link';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { formatScores } from '@/lib/utils/format';

export function Navbar({ name, balance }: { name: string; balance: number }) {
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-800 bg-[#0B0B0B]/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-primary text-sm font-bold text-white">C</span>
          <span className="font-semibold text-white">ClubPulse</span>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-full border border-brand-gold/40 bg-brand-gold/10 px-3 py-1 text-sm font-semibold text-brand-gold"
            title="Your Scores balance"
          >
            {formatScores(balance)} Scores
          </Link>
          <Link href="/profile" aria-label="Your profile">
            <Avatar name={name} size="sm" />
          </Link>
          <form action="/auth/signout" method="post">
            <Button type="submit" variant="ghost" size="sm">Sign out</Button>
          </form>
        </div>
      </div>
    </header>
  );
}
