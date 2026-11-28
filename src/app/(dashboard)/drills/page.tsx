import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth/server';
import { cameraDrillsEnabled } from '@/lib/camera-drills/flag';
import { loadDrillSummary } from '@/lib/actions/camera-drills';
import { WARMUP_NOTE } from '@/lib/camera-drills/ring';
import { DrillRunner } from '@/components/drills/DrillRunner';
import { RolePicker } from '@/components/drills/RolePicker';
import { baselineTests, DRILLS, optionalDrills } from '@/lib/camera-drills/plan';

export const dynamic = 'force-dynamic';

export default async function DrillsPage({ searchParams }: { searchParams: Promise<{ test?: string; daily?: string }> }) {
  if (!cameraDrillsEnabled()) redirect('/dashboard');
  const user = await requireUser();
  const summary = await loadDrillSummary(user.id);
  if (!summary) redirect('/dashboard');
  const query = await searchParams;
  const tests = baselineTests(summary.junior);
  const daily = DRILLS.find((drill) => drill.key === summary.today?.key) ?? null;
  const active = query.daily === '1'
    ? (daily && !(summary.junior && daily.adultOnly) ? daily : null)
    : [...tests, ...optionalDrills()].find((drill) => drill.key === query.test) ?? null;
  const dailyHistory = summary.history.filter((row) => row.key === summary.today?.key);

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 text-neutral-100">
      <h1 className="text-2xl font-semibold">Movement checks</h1>
      <p className="text-sm text-amber-200">{WARMUP_NOTE}</p>
      <p className="text-sm text-neutral-400">
        The camera stays on this phone. Nothing is uploaded. This is optional and does not block analysis or anything else.
      </p>
      <RolePicker role={summary.role} />
      {summary.baseline && Object.keys(summary.baseline).length > 0 && (
        <section>
          <h2 className="text-lg font-semibold">Baseline</h2>
          <ul className="mt-2 grid grid-cols-2 gap-2 text-sm">
            {Object.entries(summary.baseline).map(([key, score]) => <li key={key} className="rounded-xl border border-white/10 px-3 py-2">{key}: {score}</li>)}
          </ul>
        </section>
      )}
      <section>
        <h2 className="text-lg font-semibold">Starting checks</h2>
        <ul className="mt-2 space-y-2 text-sm">
          {tests.map((drill) => (
            <li key={drill.key}><Link className="text-sky-400" href={`/drills?test=${drill.key}`}>{drill.title}</Link></li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="text-lg font-semibold">Holds</h2>
        <ul className="mt-2 space-y-2 text-sm">
          {optionalDrills().map((drill) => (
            <li key={drill.key}><Link className="text-sky-400" href={`/drills?test=${drill.key}`}>{drill.title}</Link></li>
          ))}
        </ul>
      </section>
      {summary.today && (
        <section>
          <h2 className="text-lg font-semibold">Today</h2>
          <p className="text-sm text-neutral-400">{summary.streakText}</p>
          <Link className="text-sm text-sky-400" href="/drills?daily=1">{summary.today.title} · {summary.today.seconds}s</Link>
          <History history={dailyHistory} baseline={summary.baseline[summary.today.key] ?? null} />
        </section>
      )}
      {active && <DrillRunner drill={active} baseline={query.daily !== '1' && !active.optional} />}
    </div>
  );
}

function History({ history, baseline }: { history: Array<{ day: string; score: number }>; baseline: number | null }) {
  if (history.length === 0) return null;
  return (
    <div className="mt-3 space-y-1" aria-label="History against the starting point">
      {baseline !== null && <p className="text-xs text-neutral-500">Starting point {baseline}</p>}
      {history.slice(-8).map((row) => (
        <div key={row.day} className="flex items-center gap-2 text-xs">
          <span className="w-20">{row.day.slice(5)}</span>
          <span className="h-2 rounded bg-sky-400" style={{ width: `${row.score}%` }} />
          <span>{row.score}</span>
        </div>
      ))}
    </div>
  );
}
