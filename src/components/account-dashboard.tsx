"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  CircleAlert,
  Coins,
  Copy,
  ExternalLink,
  KeyRound,
  Loader2,
  LogOut,
  Plus,
  ShieldCheck,
  Trash2,
  Zap,
} from "lucide-react";
import { DomainTag, GradeBadge, cx } from "@/components/ui-bits";

type KeyRow = {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

type TxRow = {
  id: string;
  type: string;
  amountCredits: number;
  description: string;
  createdAt: string;
};

type RunRow = {
  id: string;
  name: string;
  domain: string;
  source: string;
  bestDhs: number | null;
  bestGrade: string | null;
  createdAt: string;
};

type Package = {
  id: string;
  name: string;
  amountCents: number;
  baseCredits: number;
  bonusCredits: number;
  bonusPct: number;
  popular: boolean;
};

const TX_META: Record<string, { label: string; cls: string }> = {
  signup_bonus: { label: "Bonus", cls: "text-mint" },
  topup: { label: "Top-up", cls: "text-ind" },
  charge: { label: "Charge", cls: "text-mut" },
  refund: { label: "Refund", cls: "text-amber" },
};

export default function AccountDashboard({
  user,
  pricing,
  packages,
  stripeEnabled,
  monthlyStats,
  initialKeys,
  initialTransactions,
  recentRuns,
}: {
  user: { name: string; email: string; balance: number };
  pricing: {
    webRunCost: number;
    apiRunCost: number;
    creditsPerUsd: number;
    signupBonus: number;
  };
  packages: Package[];
  stripeEnabled: boolean;
  monthlyStats: { calls: number; creditsSpent: number };
  initialKeys: KeyRow[];
  initialTransactions: TxRow[];
  recentRuns: RunRow[];
}) {
  const router = useRouter();
  const [keys, setKeys] = useState(initialKeys);
  const [name, setName] = useState("Production");
  const [busy, setBusy] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toppingUp, setToppingUp] = useState<string | null>(null);
  const [topupNote, setTopupNote] = useState<string | null>(null);

  const usd = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const balanceUsd = usd((user.balance / pricing.creditsPerUsd) * 100);

  async function topUp(pkg: Package) {
    setToppingUp(pkg.id);
    setError(null);
    setTopupNote(null);
    try {
      const res = await fetch("/api/billing/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: pkg.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Top-up failed.");
        return;
      }
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl as string;
        return;
      }
      setTopupNote(
        `Added ${pkg.baseCredits + pkg.bonusCredits} credits${pkg.bonusCredits > 0 ? ` (incl. ${pkg.bonusCredits} bonus)` : ""}.`,
      );
      router.refresh();
    } catch {
      setError("Network error during top-up.");
    } finally {
      setToppingUp(null);
    }
  }

  async function createKey() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/account/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Unable to create key."); return; }
      setSecret(data.key.value);
      setKeys((prev) => [
        {
          id: data.key.id,
          name: data.key.name,
          prefix: data.key.prefix,
          createdAt: data.key.createdAt,
          lastUsedAt: null,
          revokedAt: null,
        },
        ...prev,
      ]);
      setName("Production");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    if (!window.confirm("Revoke this API key? Integrations using it will stop immediately.")) return;
    const res = await fetch(`/api/account/keys/${id}`, { method: "DELETE" });
    if (res.ok) {
      setKeys((prev) => prev.map((k) => k.id === id ? { ...k, revokedAt: new Date().toISOString() } : k));
    }
  }

  async function copySecret() {
    if (!secret) return;
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.26em] text-ind">developer account · pay-as-you-go</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Welcome, {user.name}</h1>
          <p className="mt-1.5 text-[13px] text-mut">{user.email}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/developers" className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-mut hover:border-linelt hover:text-ink">
            API docs <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          <button onClick={logout} className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-mut hover:border-rose/30 hover:text-rose">
            Sign out <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ── wallet ── */}
      <section className="panel overflow-hidden rounded-2xl">
        <div className="grid gap-6 p-6 md:grid-cols-[260px_1fr] md:p-7">
          <div className="flex flex-col justify-between rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 p-5 text-white">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-indigo-200">wallet balance</p>
              <p className="mt-2 text-4xl font-bold tracking-tight">{user.balance.toLocaleString()}</p>
              <p className="mt-1 font-mono text-[11px] text-indigo-200">credits ≈ {balanceUsd}</p>
            </div>
            <div className="mt-5 space-y-1 font-mono text-[9.5px] text-indigo-100/90">
              <p>web run — {pricing.webRunCost} cr</p>
              <p>api run — {pricing.apiRunCost} cr</p>
              <p>1 credit = $0.01</p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold tracking-tight">Add credits</h2>
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-dim">credits never expire · no subscription</p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {packages.map((pkg) => (
                <button
                  key={pkg.id}
                  onClick={() => topUp(pkg)}
                  disabled={toppingUp !== null}
                  className={cx(
                    "relative rounded-xl border p-3.5 text-left transition-all disabled:opacity-60",
                    pkg.popular
                      ? "border-ind bg-ind/[0.05] hover:shadow-glow"
                      : "border-line bg-white hover:border-ind/40",
                  )}
                >
                  {pkg.popular && (
                    <span className="absolute -top-2 left-3 rounded-full bg-ind px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.14em] text-white">
                      best value
                    </span>
                  )}
                  <p className="text-lg font-bold tracking-tight">{usd(pkg.amountCents)}</p>
                  <p className="mt-1 font-mono text-[10px] text-mut">
                    {(pkg.baseCredits + pkg.bonusCredits).toLocaleString()} credits
                  </p>
                  {pkg.bonusPct > 0 ? (
                    <p className="mt-1.5 inline-block rounded bg-mint/10 px-1.5 py-0.5 font-mono text-[9px] font-medium text-mint">
                      +{pkg.bonusPct}% bonus
                    </p>
                  ) : (
                    <p className="mt-1.5 font-mono text-[9px] text-dim">starter pack</p>
                  )}
                  {toppingUp === pkg.id ? (
                    <Loader2 className="absolute right-3 top-3 h-3.5 w-3.5 animate-spin text-ind" />
                  ) : (
                    <Plus className="absolute right-3 top-3 h-3.5 w-3.5 text-dim" />
                  )}
                </button>
              ))}
            </div>
            {topupNote && (
              <p className="mt-3 flex items-center gap-2 rounded-lg border border-mint/25 bg-mint/[0.06] px-3.5 py-2 text-[12px] text-mint">
                <Check className="h-3.5 w-3.5" /> {topupNote}
              </p>
            )}
            {!stripeEnabled && (
              <p className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-dim">
                <Coins className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Demo payments: top-ups credit instantly. Set STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET for live card payments.
              </p>
            )}
            {error && (
              <p className="mt-3 flex items-start gap-2 rounded-lg border border-rose/25 bg-rose/5 px-3.5 py-2 text-[12px] text-rose">
                <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}
              </p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x divide-line border-t border-line">
          {[
            ["evaluations this month", String(monthlyStats.calls)],
            ["credits spent this month", monthlyStats.creditsSpent.toLocaleString()],
            ["welcome bonus received", `${pricing.signupBonus}`],
          ].map(([label, value]) => (
            <div key={label} className="px-6 py-4">
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-dim">{label}</p>
              <p className="mt-1.5 text-xl font-semibold tracking-tight">{value}</p>
            </div>
          ))}
        </div>
      </section>

      {secret && (
        <section className="rounded-2xl border border-mint/30 bg-emerald-50 p-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-mint" />
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold tracking-tight text-emerald-950">Copy your new API key now</h2>
              <p className="mt-1 text-[12px] text-emerald-800/75">For security, it will never be shown again.</p>
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-white p-2 pl-4">
                <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-[11px] text-emerald-950">{secret}</code>
                <button onClick={copySecret} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-[11px] font-semibold text-white">
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <button onClick={() => setSecret(null)} className="mt-3 font-mono text-[9.5px] uppercase tracking-[0.16em] text-emerald-700 hover:underline">I have saved it</button>
            </div>
          </div>
        </section>
      )}

      <section className="panel overflow-hidden rounded-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-6 py-5">
          <div>
            <h2 className="font-semibold tracking-tight">API keys</h2>
            <p className="mt-1 text-[11.5px] text-mut">Keys are hashed at rest. Up to 5 active keys.</p>
          </div>
          <div className="flex gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={50} className="w-32 rounded-lg border border-line bg-white px-3 py-2 text-[12px] outline-none focus:border-ind" placeholder="Key name" />
            <button disabled={busy || name.trim().length < 2} onClick={createKey} className="inline-flex items-center gap-2 rounded-lg bg-ind px-4 py-2 text-[11.5px] font-semibold text-white hover:bg-indigo-600 disabled:opacity-50">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Create key
            </button>
          </div>
        </div>
        <div className="divide-y divide-line">
          {keys.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <KeyRound className="mx-auto h-6 w-6 text-dim" />
              <p className="mt-3 text-[13px] font-medium">No keys yet</p>
              <p className="mt-1 text-[11.5px] text-mut">Create one to call `/api/v1/evaluate`.</p>
            </div>
          ) : keys.map((key) => (
            <div key={key.id} className={cx("flex flex-wrap items-center gap-4 px-6 py-4", key.revokedAt && "opacity-50")}>
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-50 text-ind"><KeyRound className="h-4 w-4" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold">{key.name}</p>
                <p className="mt-0.5 font-mono text-[10px] text-dim">{key.prefix}</p>
              </div>
              <div className="hidden text-right font-mono text-[9.5px] text-dim sm:block">
                <p>{key.lastUsedAt ? `used ${new Date(key.lastUsedAt).toLocaleDateString()}` : "never used"}</p>
                <p>{key.revokedAt ? "revoked" : `created ${new Date(key.createdAt).toLocaleDateString()}`}</p>
              </div>
              {!key.revokedAt && (
                <button onClick={() => revoke(key.id)} className="rounded-lg p-2 text-dim hover:bg-rose/5 hover:text-rose" aria-label={`Revoke ${key.name}`}><Trash2 className="h-3.5 w-3.5" /></button>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="grid items-start gap-4 lg:grid-cols-2">
        <div className="panel overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between border-b border-line px-6 py-5">
            <div>
              <h2 className="font-semibold tracking-tight">Wallet activity</h2>
              <p className="mt-1 text-[11.5px] text-mut">Top-ups, charges, and refunds.</p>
            </div>
            <Zap className="h-4 w-4 text-dim" />
          </div>
          <div className="scroll-thin max-h-96 divide-y divide-line overflow-y-auto">
            {initialTransactions.length === 0 ? (
              <div className="px-6 py-10 text-center text-[12.5px] text-mut">No activity yet.</div>
            ) : initialTransactions.map((tx) => {
              const meta = TX_META[tx.type] ?? { label: tx.type, cls: "text-mut" };
              return (
                <div key={tx.id} className="flex items-center gap-4 px-6 py-3.5">
                  <span className={cx(
                    "grid h-7 w-7 shrink-0 place-items-center rounded-lg",
                    tx.amountCredits >= 0 ? "bg-mint/10 text-mint" : "bg-slate-100 text-mut",
                  )}>
                    {tx.amountCredits >= 0 ? <ArrowDownLeft className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-medium">{tx.description}</p>
                    <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-dim">
                      {meta.label} · {new Date(tx.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <p className={cx("font-mono text-[12px] font-medium", tx.amountCredits >= 0 ? "text-mint" : "text-mut")}>
                    {tx.amountCredits >= 0 ? "+" : ""}{tx.amountCredits}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="panel overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between border-b border-line px-6 py-5">
            <div>
              <h2 className="font-semibold tracking-tight">Recent evaluations</h2>
              <p className="mt-1 text-[11.5px] text-mut">Web and API runs on this account.</p>
            </div>
            <Link href="/runs" className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-ind">public registry</Link>
          </div>
          <div className="scroll-thin max-h-96 divide-y divide-line overflow-y-auto">
            {recentRuns.length === 0 ? (
              <div className="px-6 py-10 text-center text-[12.5px] text-mut">No runs yet — your next evaluation will appear here.</div>
            ) : recentRuns.map((run) => (
              <Link key={run.id} href={`/runs/${run.id}`} className="flex items-center gap-4 px-6 py-3.5 transition-colors hover:bg-panel2/60">
                <DomainTag domain={run.domain} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-semibold">{run.name}</p>
                  <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-dim">{run.source} · {new Date(run.createdAt).toLocaleDateString()}</p>
                </div>
                {run.bestDhs != null && <span className="font-mono text-[11px]">{run.bestDhs.toFixed(3)}</span>}
                {run.bestGrade && <GradeBadge grade={run.bestGrade} />}
                <ArrowRight className="h-3.5 w-3.5 text-dim" />
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
