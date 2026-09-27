import { SAMPLES } from "@/lib/samples";
import type { Domain } from "@/lib/engine/configs";

const BASE = process.env.BASE ?? "http://127.0.0.1:3000";

function parse(q: string, keepRefs: boolean) {
  return q.split("\n").filter(Boolean).map((l) => {
    const [a, b] = l.split("|||").map((s) => s.trim());
    return { q: a, ref: keepRefs ? b : undefined };
  });
}

async function post(name: string, domain: Domain, keepRefs: boolean) {
  const s = SAMPLES[domain];
  const res = await fetch(`${BASE}/api/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      domain,
      documents: [{ name: s.docName, content: s.docContent }],
      questions: parse(s.questions, keepRefs),
    }),
  });
  const data = await res.json();
  console.log(`${res.ok ? "OK " : "ERR"} ${domain} refs=${keepRefs} ->`, data);
  return data.id as string | undefined;
}

async function main() {
  const ids: string[] = [];
  for (const d of ["healthcare", "legal", "finance"] as Domain[]) {
    const id = await post(`${d}-sample-evaluation`, d, true);
    if (id) ids.push(id);
  }
  const fid = await post("faithfulness-mode-demo", "healthcare", false);
  if (fid) ids.push(fid);

  // verify one public detail fetch (deletion is owner-only by design)
  if (ids[0]) {
    const detail = await fetch(`${BASE}/api/runs/${ids[0]}`).then((r) => r.json());
    console.log("detail:", detail.run.name, "configs:", detail.configs.length, "questions:", detail.questions.length, "winner:", detail.run.winnerName, detail.run.bestGrade);
  }

  const list = await fetch(`${BASE}/api/runs`).then((r) => r.json());
  console.log("total runs in registry:", list.runs.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
