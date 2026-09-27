// ── DocTune site checks: render, links, latency ─────────────────────────────
const BASE = process.env.BASE?.trim() || "http://127.0.0.1:3000";

let passCount = 0;
let failCount = 0;
const rows: string[] = [];

function report(name: string, ok: boolean, detail: string) {
  if (ok) passCount++;
  else failCount++;
  rows.push(`  ${ok ? "PASS" : "FAIL"}  ${name.padEnd(38)} ${detail}`);
}

async function probe(path: string, expectStatus: number, contains?: string) {
  const t0 = performance.now();
  let status = 0;
  let body = "";
  let ms1 = 0;
  try {
    const r1 = await fetch(`${BASE}${path}`);
    status = r1.status;
    body = await r1.text();
    ms1 = performance.now() - t0;
    const t1 = performance.now();
    await fetch(`${BASE}${path}`);
    const ms2 = performance.now() - t1;
    const statusOk = status === expectStatus;
    const bodyOk = contains ? body.includes(contains) : true;
    const sizeKb = (body.length / 1024).toFixed(0);
    report(
      `render ${path}`,
      statusOk && bodyOk,
      `${status} (want ${expectStatus}) · cold ${ms1.toFixed(0)}ms · warm ${ms2.toFixed(0)}ms · ${sizeKb}kb${contains && !bodyOk ? ` · MISSING "${contains}"` : ""}`,
    );
    return body;
  } catch (e) {
    report(`render ${path}`, false, `fetch error: ${e instanceof Error ? e.message : e}`);
    return "";
  }
}

async function main() {
  console.log(`\n══ RENDER + LATENCY ══  (${BASE})`);

  const list = await fetch(`${BASE}/api/runs`).then((r) => r.json());
  const firstId = list.runs?.[0]?.id as string | undefined;
  if (!firstId) {
    console.log("  no runs in registry — seeding one for link checks…");
    await fetch(`${BASE}/api/runs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "check-probe",
        domain: "finance",
        documents: [{ name: "probe.txt", content: "Acme revenue was $12 million in 2024. ".repeat(30) }],
        questions: [{ q: "What revenue did Acme report?", ref: "$12 million in 2024" }],
      }),
    });
    const l2 = await fetch(`${BASE}/api/runs`).then((r) => r.json());
    void l2;
  }
  const list2 = await fetch(`${BASE}/api/runs`).then((r) => r.json());
  const runId = (list2.runs?.[0]?.id as string | undefined) ?? firstId;

  const home = await probe("/", 200, "Make it a");
  await probe("/", 200, "images.pexels.com");
  await probe("/new", 200, "Point the agent");
  await probe("/developers", 200, "RAG benchmarking as an");
  await probe("/login", 200, "Create account");
  await probe("/account", 200, "NEXT_REDIRECT"); // App Router redirect shell → /login
  await probe("/about", 200, "BuildSpirit");
  await probe("/about", 200, "Pexels");
  await probe("/runs", 200, "Tuning runs");
  if (runId) await probe(`/runs/${runId}`, 200, "recommended configuration");
  await probe("/api/health", 200, '"ok":true');
  await probe("/api/runs", 200, '"runs"');
  await probe("/icon.svg", 200);
  await probe("/runs/not-a-uuid", 404);
  await probe("/definitely-missing-route", 404);

  console.log("\n══ LINKS ══");
  const hrefs = Array.from(new Set(Array.from(home.matchAll(/href="([^"]+)"/g)).map((m) => m[1])));
  const internal = hrefs.filter((h) => h.startsWith("/") && !h.startsWith("//"));
  for (const href of internal) {
    const [path, anchor] = href.split("#");
    if (anchor && (path === "" || path === "/")) {
      const ok = home.includes(`id="${anchor}"`);
      report(`anchor #${anchor}`, ok, ok ? "target exists on /" : "NO anchor target");
    } else {
      const t = performance.now();
      const r = await fetch(`${BASE}${path}`);
      const ms = performance.now() - t;
      report(`link ${href}`, r.status === 200, `${r.status} · ${ms.toFixed(0)}ms`);
    }
  }
  const aboutPage = await fetch(`${BASE}/about`).then((r) => r.text());
  const aboutHrefs = Array.from(
    new Set(Array.from(aboutPage.matchAll(/href="(\/[^"]*)"/g)).map((m) => m[1])),
  );
  for (const href of aboutHrefs) {
    const r = await fetch(`${BASE}${href.split("#")[0]}`);
    report(`link ${href}`, r.status === 200, `${r.status}`);
  }

  console.log("\n══ DOMAIN PHOTOGRAPHY ══");
  const imgUrls = Array.from(
    new Set(Array.from(home.matchAll(/https:\/\/images\.pexels\.com\/[^"')\\]+/g)).map((m) => m[0])),
  );
  for (const url of imgUrls) {
    try {
      const t = performance.now();
      const r = await fetch(url, { method: "HEAD" });
      const ms = performance.now() - t;
      report(`photo …${url.slice(-60, -30)}…`, r.status === 200, `${r.status} · ${ms.toFixed(0)}ms`);
    } catch {
      report("photo (external)", false, "unreachable from this network");
    }
  }

  console.log(rows.join("\n"));
  console.log(`\n══ SCORECARD ══  ${passCount} pass · ${failCount} fail`);
  if (failCount > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
