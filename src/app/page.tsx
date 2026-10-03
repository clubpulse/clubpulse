import Link from "next/link";

const STATS = [
  { label: "50 Creds = £1" },
  { label: "Cricket tracked" },
  { label: "Fitness rewarded" },
  { label: "Real cash for coaches" },
];

const STEPS = [
  {
    title: "Earn Creds",
    description:
      "Score runs, take wickets, show up to training, or volunteer your time — every contribution earns Creds.",
  },
  {
    title: "Stack your wallet",
    description:
      "Flexi Creds and Reward Creds build up in your wallet automatically as you play and help out.",
  },
  {
    title: "Redeem rewards",
    description:
      "Cash out, unlock gear, or put Creds toward real rewards. 50 Creds is always worth £1.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0B0B0B] text-white">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-primary font-bold">
            C
          </div>
          <span className="text-lg font-semibold">Creds</span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/auth/sign-in"
            className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-300 transition hover:text-white"
          >
            Sign in
          </Link>
          <Link
            href="/auth/sign-up"
            className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-primary-light"
          >
            Get started
          </Link>
        </div>
      </nav>

      <section className="mx-auto max-w-4xl px-6 pb-20 pt-16 text-center sm:pt-24">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          Stack your Creds.
          <br />
          Own your game.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-neutral-400">
          Earn Creds for every run scored, wicket taken, training session and
          volunteer shift. Redeem for real rewards.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/auth/sign-up"
            className="w-full rounded-lg bg-brand-primary px-6 py-3 text-center font-medium text-white transition hover:bg-brand-primary-light sm:w-auto"
          >
            Start earning Creds
          </Link>
          <Link
            href="/auth/sign-in"
            className="w-full rounded-lg border border-neutral-700 px-6 py-3 text-center font-medium text-white transition hover:bg-neutral-900 sm:w-auto"
          >
            Sign in
          </Link>
        </div>
      </section>

      <section className="border-y border-neutral-800 bg-neutral-950/60">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-6 py-10 sm:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-sm font-medium text-brand-gold sm:text-base">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
          How it works
        </h2>

        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <div
              key={step.title}
              className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6"
            >
              <div className="mb-4 flex h-8 w-8 items-center justify-center rounded-full bg-brand-primary/20 text-sm font-semibold text-brand-gold">
                {index + 1}
              </div>
              <h3 className="text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm text-neutral-400">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
