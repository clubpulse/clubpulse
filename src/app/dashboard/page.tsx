import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const CREDS_PER_GBP = 50;

function formatGBP(creds: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(creds / CREDS_PER_GBP);
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: wallet } = await supabase
    .from("creds_wallets")
    .select("flexi_creds_balance, reward_creds_balance, total_creds_balance")
    .eq("user_id", user.id)
    .maybeSingle();

  const flexi = wallet?.flexi_creds_balance ?? 0;
  const reward = wallet?.reward_creds_balance ?? 0;
  const total = wallet?.total_creds_balance ?? flexi + reward;

  const displayName =
    (user.user_metadata?.first_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "there";

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-4 py-10 text-white">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Welcome, {displayName}</h1>
            <p className="text-sm text-neutral-400">{user.email}</p>
          </div>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="rounded-lg border border-neutral-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800"
            >
              Sign out
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-gradient-to-br from-brand-primary/20 to-neutral-950 p-8">
          <p className="text-sm uppercase tracking-wide text-brand-gold">
            Total Creds balance
          </p>
          <p className="mt-2 text-6xl font-bold tabular-nums">
            {total.toLocaleString()}
          </p>
          <p className="mt-1 text-lg text-neutral-400">≈ {formatGBP(total)}</p>

          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
              <p className="text-xs uppercase text-neutral-400">
                Flexi Creds
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {flexi.toLocaleString()}
              </p>
              <p className="text-xs text-neutral-500">{formatGBP(flexi)}</p>
            </div>
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
              <p className="text-xs uppercase text-neutral-400">
                Reward Creds
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {reward.toLocaleString()}
              </p>
              <p className="text-xs text-neutral-500">{formatGBP(reward)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
