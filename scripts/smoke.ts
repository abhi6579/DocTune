import { evaluateRag } from "@/lib/engine/evaluate";
import { SAMPLES } from "@/lib/samples";
import type { Domain } from "@/lib/engine/configs";

function parse(q: string) {
  return q.split("\n").filter(Boolean).map((l) => {
    const [a, b] = l.split("|||").map((s) => s.trim());
    return { q: a, ref: b };
  });
}

for (const d of Object.keys(SAMPLES) as Domain[]) {
  const s = SAMPLES[d];
  console.log(`\n=== ${d.toUpperCase()} ===`);
  const res = evaluateRag(d, [{ name: s.docName, content: s.docContent }], parse(s.questions));
  for (const c of res.configs) {
    console.log(
      `#${c.rank} ${c.configKey} ${c.name.padEnd(18)} dhs=${c.dhs.toFixed(3)} ` +
      `F=${c.factual.toFixed(3)} N=${c.numeric.toFixed(3)} hit=${(c.hitRate * 100).toFixed(0)}% ` +
      `${c.avgLatencyMs}ms grade=${c.grade}`,
    );
  }
  console.log("winner:", res.winnerName, res.bestDhs.toFixed(3), res.bestGrade);
  console.log("narrative:", res.narrative.slice(0, 200));
  const q0 = res.questions[0];
  const best = q0.perConfig.find((p) => p.configKey === res.winnerKey)!;
  console.log("Q1:", q0.question);
  console.log("winner A:", best.answer.slice(0, 220));
}
