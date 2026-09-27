import "dotenv/config";
import { eq, like } from "drizzle-orm";
import { db } from "@/db";
import { runs, users } from "@/db/schema";

const BASE = process.env.BASE?.trim() || "http://127.0.0.1:3000";
const email = `billing-test-${Date.now()}@example.com`;
const RUN_NAME = "billing-wallet-test";
let pass = 0;
let fail = 0;

function check(name: string, ok: boolean, detail: string) {
  if (ok) pass++; else fail++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name} — ${detail}`);
}

async function jsonFetch(path: string, init?: RequestInit) {
  const response = await fetch(`${BASE}${path}`, init);
  let body: any = null;
  try { body = await response.json(); } catch { /* empty */ }
  return { response, body };
}

async function main() {
  console.log("\n══ PREPAID WALLET ══");
  let cookie = "";
  let rawKey = "";

  try {
    // 1. signup → 200 welcome credits
    const signup = await jsonFetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Billing Test", email, password: "test-password-123" }),
    });
    cookie = signup.response.headers.get("set-cookie")?.split(";")[0] ?? "";
    const wallet = await jsonFetch("/api/billing/transactions", { headers: { Cookie: cookie } });
    check("signup grants 200 credits", wallet.body?.balance === 200, `balance=${wallet.body?.balance}`);
    check("signup bonus in ledger", (wallet.body?.transactions ?? []).some((t: any) => t.type === "signup_bonus"), `${wallet.body?.transactions?.length} tx`);

    // 2. demo top-up: $10 → 1000 + 100 bonus
    const topup = await jsonFetch("/api/billing/topup", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ packageId: "pack10" }),
    });
    check("demo top-up credits wallet", topup.response.status === 200 && topup.body?.credited === true && topup.body?.balance === 1300, `balance=${topup.body?.balance}`);

    // 3. unknown package rejected
    const badPkg = await jsonFetch("/api/billing/topup", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ packageId: "pack999" }),
    });
    check("unknown package rejected", badPkg.response.status === 400, `got ${badPkg.response.status}`);

    // 4. create key for API-side tests
    const keyRes = await jsonFetch("/api/account/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ name: "Billing test" }),
    });
    rawKey = keyRes.body?.key?.value ?? "";

    const corpus = "Heliotrope Technologies reported Q3 revenue of $4.82 billion, up 18 percent year over year. Gross margin was 62.4 percent, and free cash flow totaled $968 million. Full-year guidance was raised to $19.5 billion, with operating margin of 24.1 percent.";
    const questions = [{ q: "What Q3 revenue was reported?", ref: "$4.82 billion, up 18 percent." }];

    // 5. signed-in web run costs 10 credits
    const webRun = await jsonFetch("/api/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ name: RUN_NAME, domain: "finance", documents: [{ name: "q3.txt", content: corpus }], questions }),
    });
    check("web run charges 10 credits", webRun.response.status === 200 && webRun.body?.credits_charged === 10 && webRun.body?.balance_remaining === 1290,
      `charged=${webRun.body?.credits_charged} balance=${webRun.body?.balance_remaining}`);

    // 6. API run costs 25 credits with wallet headers
    const apiRun = await jsonFetch("/api/v1/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${rawKey}` },
      body: JSON.stringify({ name: RUN_NAME, domain: "finance", documents: [{ name: "q3.txt", content: corpus }], questions }),
    });
    check("api run charges 25 credits", apiRun.response.status === 200 && apiRun.body?.credits_charged === 25 && apiRun.body?.balance_remaining === 1265,
      `charged=${apiRun.body?.credits_charged} balance=${apiRun.body?.balance_remaining}`);
    check("wallet response headers", apiRun.response.headers.get("x-doctune-credits-charged") === "25" && Number(apiRun.response.headers.get("x-doctune-balance-remaining")) === 1265,
      `charged hdr=${apiRun.response.headers.get("x-doctune-credits-charged")} remaining hdr=${apiRun.response.headers.get("x-doctune-balance-remaining")}`);

    // 7. ledger reflects charges
    const ledger = await jsonFetch("/api/billing/transactions", { headers: { Cookie: cookie } });
    const charges = (ledger.body?.transactions ?? []).filter((t: any) => t.type === "charge");
    check("charges recorded in ledger", charges.length === 2 && charges.every((t: any) => t.amountCredits < 0), `${charges.length} charge tx`);

    // 8. insufficient balance → 402 (set balance below cost directly)
    await db.update(users).set({ balanceCredits: 5 }).where(eq(users.email, email));
    const broke = await jsonFetch("/api/v1/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${rawKey}` },
      body: JSON.stringify({ name: RUN_NAME, domain: "finance", documents: [{ name: "q3.txt", content: corpus }], questions }),
    });
    check("insufficient balance → 402", broke.response.status === 402 && broke.body?.error?.code === "insufficient_credits",
      `${broke.response.status}/${broke.body?.error?.code}`);

    // 9. anonymous web run works with free allowance
    const anon = await jsonFetch("/api/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: RUN_NAME, domain: "finance", documents: [{ name: "q3.txt", content: corpus }], questions }),
    });
    check("anonymous web run (free allowance)", anon.response.status === 200 && typeof anon.body?.free_runs_remaining === "number",
      `remaining=${anon.body?.free_runs_remaining}`);

    // 10. webhook rejects bad signatures
    const hook = await fetch(`${BASE}/api/billing/stripe-webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Stripe-Signature": "t=1,v1=deadbeef" },
      body: JSON.stringify({ type: "checkout.session.completed" }),
    });
    check("webhook rejects bad signature", hook.status === 400, `got ${hook.status}`);
  } finally {
    await db.delete(runs).where(like(runs.name, `${RUN_NAME}%`));
    await db.delete(users).where(eq(users.email, email));
  }

  console.log(`\n══ SCORECARD ══  ${pass} pass · ${fail} fail`);
  if (fail) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
