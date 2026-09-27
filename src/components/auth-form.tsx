"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, CircleAlert, KeyRound, Loader2 } from "lucide-react";
import { cx } from "@/components/ui-bits";

export default function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Unable to continue.");
        return;
      }
      router.push("/account");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel overflow-hidden rounded-2xl">
      <div className="grid grid-cols-2 border-b border-line bg-panel2/60 p-1.5">
        {(["signup", "login"] as const).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setError(null); }}
            className={cx(
              "rounded-lg px-4 py-2.5 text-[12px] font-semibold transition-all",
              mode === m
                ? "bg-white text-ink shadow-sm"
                : "text-mut hover:text-ink",
            )}
          >
            {m === "signup" ? "Create account" : "Sign in"}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="p-6 md:p-8">
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
          <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-ind" />
          <p className="text-[12.5px] leading-relaxed text-slate-600">
            {mode === "signup"
              ? "Get 200 free credits on signup — no card required. Then pay 10–25 credits per evaluation from your wallet."
              : "Sign in to manage your wallet, API keys, and usage."}
          </p>
        </div>

        <div className="space-y-4">
          {mode === "signup" && (
            <label className="block">
              <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-dim">Name</span>
              <input
                required
                minLength={2}
                maxLength={80}
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-line bg-white px-4 py-3 text-[13px] outline-none transition-colors focus:border-ind"
                placeholder="Your name"
              />
            </label>
          )}
          <label className="block">
            <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-dim">Work email</span>
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-line bg-white px-4 py-3 text-[13px] outline-none transition-colors focus:border-ind"
              placeholder="you@company.com"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-dim">Password</span>
            <input
              required
              type="password"
              minLength={8}
              maxLength={128}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-line bg-white px-4 py-3 text-[13px] outline-none transition-colors focus:border-ind"
              placeholder="8+ characters"
            />
          </label>
        </div>

        {error && (
          <p className="mt-4 flex items-start gap-2 rounded-lg border border-rose/25 bg-rose/5 px-3.5 py-2.5 text-[12px] text-rose">
            <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {error}
          </p>
        )}

        <button
          disabled={busy}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-ind px-5 py-3.5 text-[13px] font-semibold text-white transition-all hover:bg-indigo-600 hover:shadow-glow disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
          {!busy && <ArrowRight className="h-4 w-4" />}
        </button>

        <p className="mt-5 text-center text-[11px] leading-relaxed text-dim">
          By continuing, you agree to use the API responsibly. See the{" "}
          <Link href="/developers" className="text-ind hover:underline">API documentation</Link>.
        </p>
      </form>
    </div>
  );
}
