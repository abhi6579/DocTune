import "dotenv/config";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { runs, users } from "@/db/schema";

const BASE = process.env.BASE?.trim() || "http://127.0.0.1:3000";
const email = `api-test-${Date.now()}@example.com`;
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
  console.log("\n══ ACCOUNT + API PRODUCT ══");
  try {
    // Signup and capture the HttpOnly cookie manually (works against local HTTP
    // even though production cookies are correctly marked Secure).
    const signup = await jsonFetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "API Test", email, password: "test-password-123" }),
    });
    const cookie = signup.response.headers.get("set-cookie")?.split(";")[0] ?? "";
    check("signup", signup.response.status === 201 && Boolean(cookie), `${signup.response.status}, cookie=${Boolean(cookie)}`);

    const duplicate = await jsonFetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Duplicate", email, password: "test-password-123" }),
    });
    check("duplicate email blocked", duplicate.response.status === 409, `got ${duplicate.response.status}`);

    const wrong = await jsonFetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "wrong-password" }),
    });
    check("wrong password blocked", wrong.response.status === 401, `got ${wrong.response.status}`);

    const account = await fetch(`${BASE}/account`, { headers: { Cookie: cookie } });
    check("authenticated account page", account.status === 200 && (await account.text()).includes("API keys"), `got ${account.status}`);

    const createKey = await jsonFetch("/api/account/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ name: "Test integration" }),
    });
    const rawKey = createKey.body?.key?.value as string | undefined;
    const keyId = createKey.body?.key?.id as string | undefined;
    check("create API key", createKey.response.status === 201 && rawKey?.startsWith("dt_live_") === true, `${createKey.response.status}, prefix=${rawKey?.slice(0, 8)}`);

    const listKeys = await jsonFetch("/api/account/keys", { headers: { Cookie: cookie } });
    const serialized = JSON.stringify(listKeys.body);
    check("raw key never returned again", listKeys.response.status === 200 && !serialized.includes(rawKey ?? "__none__"), `${listKeys.body?.keys?.length} key(s)`);

    const unauth = await jsonFetch("/api/v1/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    check("missing bearer rejected", unauth.response.status === 401, `got ${unauth.response.status}`);

    const invalid = await jsonFetch("/api/v1/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${rawKey}` },
      body: JSON.stringify({ domain: "invalid" }),
    });
    check("authenticated invalid input", invalid.response.status === 400 && invalid.body?.error?.code === "validation_error", `got ${invalid.response.status}/${invalid.body?.error?.code}`);

    const corpus = [
      "Heliotrope Technologies reported Q3 revenue of $4.82 billion, up 18 percent year over year.",
      "Gross margin was 62.4 percent and free cash flow totaled $968 million.",
      "Full-year guidance was raised to $19.5 billion to $19.8 billion.",
    ].join(" ");
    const evaluated = await jsonFetch("/api/v1/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${rawKey}` },
      body: JSON.stringify({
        name: "private-api-contract-test",
        domain: "finance",
        documents: [{ name: "q3.txt", content: corpus }],
        questions: [
          { q: "What Q3 revenue was reported?", ref: "$4.82 billion, up 18 percent." },
          { q: "What was gross margin?", ref: "62.4 percent." },
        ],
      }),
    });
    const runId = evaluated.body?.id as string | undefined;
    check("authenticated evaluation", evaluated.response.status === 200 && evaluated.body?.configurations_tested === 16 && evaluated.body?.leaderboard?.length === 16, `${evaluated.response.status}, winner=${evaluated.body?.recommendation?.name}`);
    check("wallet metering headers", evaluated.response.headers.get("x-doctune-credits-charged") === "25" && Number(evaluated.response.headers.get("x-doctune-balance-remaining")) >= 0,
      `charged=${evaluated.response.headers.get("x-doctune-credits-charged")} remaining=${evaluated.response.headers.get("x-doctune-balance-remaining")}`);

    const publicList = await fetch(`${BASE}/api/runs`).then((r) => r.text());
    check("private API run absent from public registry", !publicList.includes(runId ?? "__none__"), `run=${runId}`);

    const published = await jsonFetch("/api/v1/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${rawKey}` },
      body: JSON.stringify({
        name: "public-api-contract-test",
        domain: "finance",
        visibility: "public",
        documents: [{ name: "q3.txt", content: corpus }],
        questions: [{ q: "What Q3 revenue was reported?", ref: "$4.82 billion, up 18 percent." }],
      }),
    });
    const publishedId = published.body?.id as string | undefined;
    const listAfterPublish = await fetch(`${BASE}/api/runs`).then((r) => r.text());
    check("explicit public API run appears in registry", published.response.status === 200 && listAfterPublish.includes(publishedId ?? "__none__"), `run=${publishedId}`);

    const privateAnon = await fetch(`${BASE}/api/runs/${runId}`);
    const privateOwner = await fetch(`${BASE}/api/runs/${runId}`, { headers: { Cookie: cookie } });
    check("private report hidden from anonymous users", privateAnon.status === 404, `got ${privateAnon.status}`);
    check("private report available to owner", privateOwner.status === 200, `got ${privateOwner.status}`);

    const keysAfter = await jsonFetch("/api/account/keys", { headers: { Cookie: cookie } });
    check("last-used timestamp recorded", Boolean(keysAfter.body?.keys?.[0]?.lastUsedAt), `${keysAfter.body?.keys?.[0]?.lastUsedAt ?? "missing"}`);

    const revoke = await jsonFetch(`/api/account/keys/${keyId}`, {
      method: "DELETE",
      headers: { Cookie: cookie },
    });
    check("revoke API key", revoke.response.status === 200, `got ${revoke.response.status}`);

    const afterRevoke = await jsonFetch("/api/v1/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${rawKey}` },
      body: JSON.stringify({}),
    });
    check("revoked key rejected", afterRevoke.response.status === 401, `got ${afterRevoke.response.status}`);
  } finally {
    // Cascade cleans session, key, usage, and private evaluation.
    await db.delete(users).where(eq(users.email, email));
  }

  console.log(`\n══ SCORECARD ══  ${pass} pass · ${fail} fail`);
  if (fail) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
