import Link from 'next/link';

const GOLD = '#c9a54c';
const CRIMSON = '#9b1c1c';

const FEATURES = [
  { icon: '🎯', text: 'Bowling & batting analysis' },
  { icon: '📷', text: 'Works on any phone or laptop camera' },
  { icon: '🦴', text: '33-point body tracking' },
  { icon: '📊', text: 'Instant score with personalised tips' },
];

const SAMPLE_SCORE = 87;

// Static sample result: a gold progress ring around the score
function ScoreRing() {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="relative mx-auto aspect-square w-56 max-w-full sm:w-64">
      <div className="absolute inset-6 rounded-full blur-3xl" style={{ background: 'rgba(155,28,28,0.35)' }} aria-hidden />
      <svg viewBox="0 0 180 180" className="relative h-full w-full -rotate-90" aria-hidden>
        <circle cx="90" cy="90" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" />
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke={GOLD}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - SAMPLE_SCORE / 100)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center" role="img"
        aria-label={`Example technique score: ${SAMPLE_SCORE} out of 100`}>
        <span className="text-6xl font-bold leading-none tracking-tight" style={{ color: GOLD }}>{SAMPLE_SCORE}</span>
        <span className="mt-2 text-xs font-medium uppercase tracking-widest text-neutral-500">out of 100</span>
      </div>
    </div>
  );
}

export function AnalyseLanding() {
  return (
    <div className="min-h-screen bg-[#0B0B0B] text-white" style={{ fontFamily: "'Inter', sans-serif" }}>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6">
        <Link href="/" className="flex items-center gap-2.5 no-underline">
          <span className="grid h-9 w-9 place-items-center rounded-lg text-base font-extrabold text-white"
            style={{ background: CRIMSON }}>C</span>
          <span className="text-lg font-bold text-white">ClubPulse</span>
        </Link>
        <Link href="/auth/sign-in?redirectTo=/analyse" className="text-sm font-medium text-neutral-400 hover:text-white">
          Sign in
        </Link>
      </header>

      <main className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-8 md:grid-cols-[1.2fr_1fr] md:pt-16">
        <div>
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider"
            style={{ borderColor: 'rgba(155,28,28,0.35)', background: 'rgba(155,28,28,0.12)', color: GOLD }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: CRIMSON }} aria-hidden />
            New · ClubPulse Analyse
          </span>

          <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
            AI Cricket <span style={{ color: GOLD }}>Motion Analysis</span>
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-neutral-400 sm:text-lg">
            Get instant feedback on your bowling action and batting technique. Our AI tracks 33 body landmarks in
            real time, scores your technique out of 100, and tells you exactly what to fix.
          </p>

          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <li key={feature.text}
                className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-[#111] px-4 py-3 text-sm text-neutral-200">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-base"
                  style={{ background: 'rgba(155,28,28,0.15)' }} aria-hidden>{feature.icon}</span>
                {feature.text}
              </li>
            ))}
          </ul>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/auth/sign-up"
              className="inline-flex items-center rounded-xl px-7 py-3.5 text-[15px] font-semibold text-white transition hover:brightness-110"
              style={{ background: CRIMSON }}>
              Sign up free
            </Link>
            <Link href="/auth/sign-in?redirectTo=/analyse"
              className="inline-flex items-center rounded-xl border border-white/15 px-7 py-3.5 text-[15px] font-medium text-neutral-200 transition hover:bg-white/5">
              Sign in
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border border-white/[0.07] bg-[#0f0f0f] p-8">
          <ScoreRing />
          <p className="mt-6 text-center text-sm font-semibold" style={{ color: GOLD }}>Bowling action</p>
          <p className="mt-1 text-center text-xs text-neutral-500">Example result</p>
        </div>
      </main>
    </div>
  );
}
