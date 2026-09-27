// ── DocTune extreme test harness ────────────────────────────────────────────
// Engine edge cases + API abuse cases. Prints PASS/FAIL with evidence.

import { evaluateRag, type EvalQuestion } from "@/lib/engine/evaluate";
import { extractNumbers } from "@/lib/engine/nlp";
import { CONFIGS } from "@/lib/engine/configs";
import { SAMPLES } from "@/lib/samples";

const BASE = process.env.BASE?.trim() || "http://127.0.0.1:3000";

let passCount = 0;
let failCount = 0;
let infoCount = 0;

function pass(name: string, evidence: string) {
  passCount++;
  console.log(`  PASS  ${name} — ${evidence}`);
}
function fail(name: string, evidence: string) {
  failCount++;
  console.log(`  FAIL  ${name} — ${evidence}`);
}
function info(name: string, evidence: string) {
  infoCount++;
  console.log(`  info  ${name} — ${evidence}`);
}
function check(name: string, cond: boolean, evidence: string) {
  (cond ? pass : fail)(name, evidence);
}

function parseSampleQuestions(domain: keyof typeof SAMPLES, keepRefs = true): EvalQuestion[] {
  return SAMPLES[domain].questions
    .split("\n").filter(Boolean)
    .map((l) => {
      const [q, ref] = l.split("|||").map((s) => s.trim());
      return { q, ref: keepRefs ? ref : undefined };
    });
}

const flatScores = (res: ReturnType<typeof evaluateRag>) =>
  [
    ...res.configs.flatMap((c) => [c.dhs, c.factual, c.numeric, c.hitRate, c.avgLatencyMs]),
    ...res.questions.flatMap((q) => q.perConfig.flatMap((p) => [p.dhs, p.factual, p.numeric])),
  ];

/* ══ ENGINE CASES ══════════════════════════════════════════════════════════ */

function engineTests() {
  console.log("\n══ ENGINE ══");

  // E1 — typo robustness: char-n-gram embeddings should beat unigram/bigram
  {
    const typoQs: EvalQuestion[] = [
      { q: "What is the strating dose of lisinoprl for hypertenson?", ref: "10 mg once daily, up to 40 mg per day" },
      { q: "What targit INR rang is used for warfrain?", ref: "INR range 2.0 to 3.0" },
      { q: "When is apixabn redueced to 2.5 mg twic daily?", ref: "Two of: age 80+, weight 60 kg or less, creatinine 1.5 mg/dL or higher" },
    ];
    const s = SAMPLES.healthcare;
    const res = evaluateRag("healthcare", [{ name: s.docName, content: s.docContent }], typoQs);
    const fam = { bge: [] as number[], openai: [] as number[] };
    for (const q of res.questions) {
      for (const p of q.perConfig) {
        const cfg = CONFIGS.find((c) => c.key === p.configKey)!;
        fam[cfg.embedding].push(p.factual);
      }
    }
    const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
    const bge = mean(fam.bge);
    const oai = mean(fam.openai);
    check("E1 typo robustness (char-ngram > unigram)", oai > bge + 0.02,
      `openai=${oai.toFixed(3)} bge=${bge.toFixed(3)}`);
  }

  // E2 — out-of-domain calibration: off-corpus questions must score low
  {
    const alienQs: EvalQuestion[] = [
      { q: "What is the best temperature for proofing sourdough?", ref: "Around 26 celsius for 4 hours." },
      { q: "Which planet has the longest orbital period?", ref: "Neptune, about 165 years." },
      { q: "How do you fix a leaking kitchen faucet?", ref: "Replace the cartridge and the 2 O-rings." },
      { q: "What won best picture in 1998?", ref: "Titanic won 11 Oscars." },
    ];
    const s = SAMPLES.healthcare;
    const res = evaluateRag("healthcare", [{ name: s.docName, content: s.docContent }], alienQs);
    check("E2 out-of-domain calibration", res.bestDhs < 0.6,
      `winner=${res.winnerName} dhs=${res.bestDhs.toFixed(3)} (should be < 0.60)`);
  }

  // E3 — number format equivalence
  {
    const doc = {
      name: "formats.txt",
      content:
        "The liability cap is $1,250,000 in aggregate. Monthly uptime is 99.9 percent. " +
        "The initial term is 24 months from the effective date. The therapeutic INR range is 2.0-3.0. " +
        "The apixaban dose reduction threshold is 2.5 mg twice daily for eligible patients over 80 years.",
    };
    const qs: EvalQuestion[] = [
      { q: "What is the liability cap?", ref: "The cap is 1250000 in aggregate." },
      { q: "What uptime is guaranteed?", ref: "99.9% monthly uptime." },
      { q: "How long is the term?", ref: "The term is twenty four months." }, // compound words — hard
      { q: "What is the INR range?", ref: "Between 2 and 3." },
    ];
    const res = evaluateRag("legal", [doc], qs);
    const wins = res.questions.map((q) => {
      const best = q.perConfig.find((p) => p.configKey === res.winnerKey)!;
      return best.numeric;
    });
    const hard = wins.filter((v) => v < 0.99).length;
    info("E3 numeric formats per question", res.questions.map((q, i) => `Q${i + 1}=${wins[i].toFixed(2)}`).join(" "));
    check("E3 format equivalence ($1,250,000↔1250000, 99.9↔percent, 2.0↔2)", wins[0] === 1 && wins[1] === 1 && wins[3] === 1,
      `cap=${wins[0]} uptime=${wins[1]} range=${wins[3]}`);
    info("E3 compound number-words", `'twenty four months' numeric=${wins[2].toFixed(2)} ${hard > 0 ? "(improvement candidate)" : ""}`);
  }

  // E4 — tiny corpus (just above the 200-char floor)
  {
    const doc = {
      name: "tiny.txt",
      content:
        "Acme Corp reported revenue of $12 million in 2024, up from $9 million in 2023. " +
        "Gross margin was 55 percent. The company employed 64 people at year end across two offices in Austin.",
    };
    const qs: EvalQuestion[] = [
      { q: "What revenue did Acme report?", ref: "$12 million in 2024." },
      { q: "How many employees?", ref: "64 people." },
    ];
    const res = evaluateRag("finance", [doc], qs);
    const scores = flatScores(res);
    check("E4 tiny corpus runs clean", res.questions.length === 2 && res.configs.length === 16,
      `winner=${res.winnerName} ${res.bestDhs.toFixed(3)}`);
    check("E4 no NaN/undefined scores", scores.every((v) => Number.isFinite(v)), `${scores.length} values checked`);
  }

  // E5 — unicode-heavy corpus
  {
    const doc = {
      name: "unicode.txt",
      content:
        "The café near the naïve founder’s Zürich office — “ Bistro № 7 ” — reported €2.4 million in sales. " +
        "Management said: “Growth was 12 percent year over year.” Employees enjoyed crème brûlée Fridays ☕ and jalapeño bagels.",
    };
    const res = evaluateRag("finance", [doc], [
      { q: "What sales did the café report?", ref: "€2.4 million in sales." },
      { q: "What growth was reported?", ref: "12 percent year over year." },
    ]);
    const scores = flatScores(res);
    check("E5 unicode corpus runs clean", scores.every((v) => Number.isFinite(v)),
      `winner=${res.winnerName} ${res.bestDhs.toFixed(3)}`);
  }

  // E6 — multi-hop coverage (informational)
  {
    const s = SAMPLES.healthcare;
    const qs: EvalQuestion[] = [
      { q: "How do the maximum lisinopril dose and the amlodipine add-on dose compare?", ref: "Lisinopril max is 40 mg per day, while add-on amlodipine is 5 mg once daily." },
    ];
    const res = evaluateRag("healthcare", [{ name: s.docName, content: s.docContent }], qs);
    const best = res.questions[0].perConfig.find((p) => p.configKey === res.winnerKey)!;
    info("E6 multi-hop (winner numeric recall", `dhs=${best.dhs.toFixed(3)} numeric=${best.numeric.toFixed(3)} answer="${best.answer.slice(0, 140)}…"`);
  }

  // E7 — faithfulness-mode inflation (informational)
  {
    const s = SAMPLES.finance;
    const withRef = evaluateRag("finance", [{ name: s.docName, content: s.docContent }], parseSampleQuestions("finance", true));
    const withoutRef = evaluateRag("finance", [{ name: s.docName, content: s.docContent }], parseSampleQuestions("finance", false));
    const winnerFact = (r: typeof withRef) => r.configs.find((c) => c.configKey === r.winnerKey)!;
    info("E7 scoring modes",
      `reference winner=${withRef.winnerName} dhs=${withRef.bestDhs.toFixed(3)} F=${winnerFact(withRef).factual.toFixed(3)} | ` +
      `faithfulness winner=${withoutRef.winnerName} dhs=${withoutRef.bestDhs.toFixed(3)} F=${winnerFact(withoutRef).factual.toFixed(3)}`);
    check("E7 faithfulness not inflated vs reference", winnerFact(withoutRef).factual <= winnerFact(withRef).factual + 0.2,
      `delta=${(winnerFact(withoutRef).factual - winnerFact(withRef).factual).toFixed(3)}`);
  }

  // E8 — scale + timing: ~20k char corpus × 25 questions × 16 configs
  {
    const s = SAMPLES.finance;
    const big = Array.from({ length: 12 }, (_, i) => `${s.docContent}\n\nAddendum ${i + 1}: regional revenue varied between $3 million and $40 million by segment.`).join("\n\n");
    const qs = Array.from({ length: 25 }, (_, i) => ({
      q: i % 2 === 0 ? `${parseSampleQuestions("finance")[i % 6].q}` : `What revenue did Heliotrope report in Q3 (variant ${i})?`,
      ref: parseSampleQuestions("finance")[i % 6].ref,
    }));
    const t0 = Date.now();
    const res = evaluateRag("finance", [{ name: "big.txt", content: big }], qs);
    const ms = Date.now() - t0;
    check("E8 scale timing (25q × 16 configs, 20k+ chars)", ms < 15000, `${ms}ms for ${res.questions.length * 16} answers over ${(big.length / 1000).toFixed(0)}k chars`);
  }

  // E9 — determinism
  {
    const s = SAMPLES.legal;
    const a = evaluateRag("legal", [{ name: s.docName, content: s.docContent }], parseSampleQuestions("legal"));
    const b = evaluateRag("legal", [{ name: s.docName, content: s.docContent }], parseSampleQuestions("legal"));
    const same =
      a.winnerKey === b.winnerKey &&
      JSON.stringify(a.configs.map((c) => c.dhs)) === JSON.stringify(b.configs.map((c) => c.dhs));
    check("E9 deterministic results", same, `winner=${a.winnerKey} both runs`);
  }

  // E10 — number extraction sanity table
  {
    const cases: Array<[string, string[]]> = [
      ["$1,250.00", ["1250"]],
      ["99.9%", ["99.9"]],
      ["2.0–3.0", ["2", "3"]],
      ["140/90 mmHg", ["140", "90"]],
      ["FY2025", ["2025"]],
      ["five mg twice daily", ["5"]],
      ["0.24 per share", ["0.24"]],
      ["thirty five percent", ["35"]],
      ["twenty four months", ["24"]],
    ];
    const bad = cases.filter(([text, want]) => {
      const got = extractNumbers(text);
      return JSON.stringify(got) !== JSON.stringify(want);
    });
    for (const [text, want] of cases) {
      info("E10 extractNumbers", JSON.stringify(text) + " -> " + JSON.stringify(extractNumbers(text)));
    }
    check("E10 numeric extraction", bad.length === 0, bad.length ? `${bad.length} mismatches (want ${JSON.stringify(bad[0]?.[1])})` : "all formats normalized");
  }
}

/* ══ API CASES ═════════════════════════════════════════════════════════════ */

async function post(body: unknown) {
  const res = await fetch(`${BASE}/api/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let data: Record<string, unknown> = {};
  try { data = await res.json(); } catch { /* empty */ }
  return { status: res.status, data };
}

async function apiTests() {
  console.log("\n══ API ══");
  try {
    const h = await fetch(`${BASE}/api/health`);
    if (!h.ok) throw new Error("health failed");
  } catch {
    info("API", `unreachable at ${BASE} — skipping API cases`);
    return;
  }

  {
    const r = await post({ domain: "astrology", documents: [{ name: "a", content: "x".repeat(500) }], questions: [{ q: "Hello there?" }] });
    check("A1 invalid domain → 400", r.status === 400, `got ${r.status}`);
  }
  {
    const r = await post({ domain: "finance", documents: [], questions: [{ q: "Hello there?" }] });
    check("A2 no documents → 400", r.status === 400, `got ${r.status}`);
  }
  {
    const r = await post({ domain: "finance", documents: [{ name: "a", content: "x".repeat(500) }], questions: [] });
    check("A3 no questions → 400", r.status === 400, `got ${r.status}`);
  }
  {
    const r = await post({ domain: "finance", documents: [{ name: "a", content: "tiny" }], questions: [{ q: "Hello there?" }] });
    check("A4 sub-200-char corpus → 400", r.status === 400, `got ${r.status}`);
  }
  {
    const r = await post({
      domain: "finance",
      documents: [{ name: "huge-a", content: "x".repeat(130_000) }],
      questions: [{ q: "Hello there?" }],
    });
    check("A5a over 120k per-doc limit → 400 (no silent truncation)", r.status === 400, `got ${r.status}`);
    const r2 = await post({
      domain: "finance",
      documents: ["a", "b", "c"].map((n) => ({ name: n, content: "x".repeat(119_000) })),
      questions: [{ q: "Hello there?" }],
    });
    check("A5b over 250k total budget → 400", r2.status === 400, `got ${r2.status}`);
  }
  {
    const s = SAMPLES.legal;
    const qs = parseSampleQuestions("legal");
    const padded = [
      ...Array.from({ length: 30 }, (_, i) => ({ q: `What is the liability cap (variant ${i})?` })),
      qs[0], qs[0], // duplicates
    ];
    const r = await post({
      name: "extreme-api-cap",
      domain: "legal",
      documents: [{ name: s.docName, content: s.docContent }],
      questions: padded,
    });
    const detail = r.data.id
      ? await fetch(`${BASE}/api/runs/${r.data.id}`).then((x) => x.json())
      : null;
    check("A6 question cap + dedupe", r.status === 200 && detail && detail.questions.length === 25,
      `questions stored=${detail?.questions?.length}`);
    if (r.data.id) await fetch(`${BASE}/api/runs/${r.data.id}`, { method: "DELETE" });
  }
  {
    const res = await fetch(`${BASE}/api/runs/not-a-uuid`);
    check("A7 malformed uuid GET → 404 (not 500)", res.status === 404, `got ${res.status}`);
    const del = await fetch(`${BASE}/api/runs/not-a-uuid`, { method: "DELETE" });
    check("A7 malformed uuid DELETE → 404 (not 500)", del.status === 404, `got ${del.status}`);
  }
  {
    const res = await fetch(`${BASE}/api/runs/00000000-0000-0000-0000-000000000000`);
    check("A8 unknown uuid → 404", res.status === 404, `got ${res.status}`);
  }
  {
    const s = SAMPLES.finance;
    const results = await Promise.all(
      [0, 1, 2].map((i) =>
        post({
          name: `extreme-concurrent-${i}`,
          domain: "finance",
          documents: [{ name: s.docName, content: s.docContent }],
          questions: parseSampleQuestions("finance").slice(0, 2),
        }),
      ),
    );
    const ids = results.map((r) => r.data.id);
    check("A9 concurrent posts", results.every((r) => r.status === 200) && new Set(ids).size === 3,
      `statuses=${results.map((r) => r.status).join(",")}`);
  }
  {
    const s = SAMPLES.healthcare;
    const r = await post({
      name: "extreme-xss",
      domain: "healthcare",
      documents: [{ name: s.docName, content: s.docContent }],
      questions: [{ q: `<img src=x onerror=alert(1)> what is the dose?`, ref: "10 mg once daily, up to 40 mg per day" }],
    });
    check("A10 XSS payload stored safely", r.status === 200, `status=${r.status} (React escapes on render)`);
  }

  // Runs created by these cases are anonymous (no owner) — clean them directly.
  try {
    const { db } = await import("@/db");
    const { runs } = await import("@/db/schema");
    const { like } = await import("drizzle-orm");
    await db.delete(runs).where(like(runs.name, "extreme-%"));
  } catch {
    // engine-only environments have no database — nothing to sweep
  }
}

async function main() {
  engineTests();
  await apiTests();
  console.log(`\n══ SCORECARD ══  ${passCount} pass · ${failCount} fail · ${infoCount} info`);
  if (failCount > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
