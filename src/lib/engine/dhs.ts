// ── DHS (Domain Health Score) ────────────────────────────────────────────────
// Composite metric inspired by TriDomRAG-Bench: blends factual accuracy with
// numerical precision using domain-specific weights.

import {
  bigrams,
  contentTokens,
  extractNumbers,
  multisetF1,
  multisetRecall,
} from "./nlp";

export type DhsWeights = { factual: number; numeric: number };

/**
 * Content-word accuracy against the target text.
 * Blends strict F1 with gold containment and phrase overlap — an extractive
 * answer that covers every gold fact scores high even with extra context.
 */
export function factualScore(answer: string, target: string): number {
  const pred = contentTokens(answer);
  const gold = contentTokens(target);
  if (gold.length === 0) return 1;

  const fUni = multisetF1(pred, gold);
  const recallUni = multisetRecall(pred, gold);
  const goldBi = bigrams(gold);
  const biContainment =
    goldBi.length > 0 ? multisetRecall(bigrams(pred), goldBi) : recallUni;

  return clamp01(0.35 * fUni + 0.45 * recallUni + 0.2 * biContainment);
}

/**
 * Numerical precision:
 * - recall  = fraction of required (gold) figures reproduced
 * - precision = fraction of emitted figures grounded in the source context
 * If the question requires no figures, emitting ungrounded ones is penalized.
 */
export function numericScore(
  answer: string,
  goldNums: string[],
  sourceNums: string[],
): number {
  const pred = extractNumbers(answer);
  const source = new Set(sourceNums);

  if (goldNums.length === 0) {
    if (pred.length === 0) return 1;
    const ungrounded = pred.filter((n) => !source.has(n)).length;
    return Math.max(0, 1 - 0.6 * (ungrounded / pred.length));
  }

  const grounded = pred.filter((n) => source.has(n)).length;
  const precision = pred.length > 0 ? grounded / pred.length : 0;

  const remaining = new Map<string, number>();
  for (const g of goldNums) remaining.set(g, (remaining.get(g) ?? 0) + 1);
  let matched = 0;
  for (const p of pred) {
    const c = remaining.get(p) ?? 0;
    if (c > 0) {
      matched++;
      remaining.set(p, c - 1);
    }
  }
  const recall = matched / goldNums.length;
  if (precision + recall === 0) return 0;
  return (2 * precision * recall) / (precision + recall);
}

export type DhsResult = {
  dhs: number;
  factual: number;
  numeric: number;
  hasGoldNumbers: boolean;
};

export function composeDhs(
  answer: string,
  reference: string,
  contextText: string,
  weights: DhsWeights,
  question = "",
): DhsResult {
  const ref = reference.trim();

  let factual: number;
  if (ref.length > 0) {
    factual = factualScore(answer, ref);
  } else {
    // Faithfulness mode: (a) is every answer claim grounded in the retrieved
    // context, and (b) does the answer actually address the question?
    const ans = contentTokens(answer);
    const ctx = contentTokens(contextText);
    const precision = multisetRecall(ctx, ans); // grounded answer-token share
    const qRecall = question.trim()
      ? multisetRecall(ans, contentTokens(question)) // question coverage
      : 0.5;
    factual = clamp01(0.55 * precision + 0.45 * qRecall);
  }

  const goldNums = extractNumbers(ref);
  const sourceNums = Array.from(
    new Set([...extractNumbers(ref), ...extractNumbers(contextText)]),
  );
  const numeric = numericScore(answer, goldNums, sourceNums);

  const dhs = weights.factual * factual + weights.numeric * numeric;
  return {
    dhs: clamp01(dhs),
    factual: clamp01(factual),
    numeric: clamp01(numeric),
    hasGoldNumbers: goldNums.length > 0,
  };
}

export function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}
