// ── DocTune evaluation orchestrator ─────────────────────────────────────────
// Runs 8 RAG configurations over the user's corpus + questions, scores each
// with the domain-weighted DHS metric, and produces a verdict.

import {
  CONFIGS,
  DOMAIN_META,
  EMBEDDING_LABELS,
  EMBED_ENGINE,
  GENERATION_LABELS,
  GEN_ENGINE,
  RETRIEVAL_LABELS,
  RETR_ENGINE,
  gradeFor,
  type Domain,
  type Grade,
  type RagConfig,
} from "./configs";
import { composeDhs, type DhsWeights } from "./dhs";
import {
  Bm25,
  bigrams,
  buildIdf,
  chunkDocument,
  contentTokens,
  cosine,
  extractNumbers,
  hashString,
  minMaxNormalize,
  mulberry32,
  termsFor,
  tfidfVector,
  tokenize,
  type Chunk,
} from "./nlp";

export type EvalDocument = { name: string; content: string };
export type EvalQuestion = { q: string; ref?: string };

export type PerConfigQuestion = {
  configKey: string;
  answer: string;
  dhs: number;
  factual: number;
  numeric: number;
  latencyMs: number;
  retrieved: number;
  topChunk: string;
};

export type QuestionOutcome = {
  idx: number;
  question: string;
  reference: string | null;
  isNumericHeavy: boolean;
  bestConfig: string;
  bestDhs: number;
  perConfig: PerConfigQuestion[];
};

export type ConfigOutcome = {
  configKey: string;
  name: string;
  chunkSize: number;
  chunkOverlap: number;
  embedding: string;
  retrieval: string;
  generation: string;
  dhs: number;
  factual: number;
  numeric: number;
  numericHeavyDhs: number;
  factualHeavyDhs: number;
  hitRate: number;
  avgLatencyMs: number;
  grade: Grade;
  rank: number;
};

export type EvaluationResult = {
  scoringMode: "reference" | "faithfulness";
  configs: ConfigOutcome[];
  questions: QuestionOutcome[];
  winnerKey: string;
  winnerName: string;
  bestDhs: number;
  bestGrade: Grade;
  narrative: string;
  durationMs: number;
};

const NUMERIC_INTENT_RE =
  /how much|how many|dose|dosage|amount|rate|ratio|margin|revenue|eps|fee|cap|capped|threshold|target|uptime|notice|penalty|interest|value|price|cost|salary|deadline|duration|percent|number of|maximum|minimum|dose|inr|blood pressure|guidance/i;

function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function rankTopK(cfg: RagConfig, ctx: ConfigContext, question: string): number[] {
  const { chunks, vecs, idf, bm } = ctx;
  const retr = RETR_ENGINE[cfg.retrieval];
  const qTerms = termsFor(question, EMBED_ENGINE[cfg.embedding]);
  const qVec = tfidfVector(qTerms, idf);
  const qToks = tokenize(question);

  const dense = chunks.map((_, i) => cosine(vecs[i], qVec));
  const sparse = chunks.map((_, i) => bm.score(qToks, i));

  let fused: number[];
  if (retr === "dense") {
    fused = dense;
  } else if (retr === "bm25") {
    fused = minMaxNormalize(sparse);
  } else {
    const dn = minMaxNormalize(dense);
    const sn = minMaxNormalize(sparse);
    fused = dn.map((d, i) => 0.6 * d + 0.4 * (sn[i] ?? 0));
  }

  const order = chunks
    .map((_, i) => i)
    .sort((a, b) => (fused[b] ?? 0) - (fused[a] ?? 0) || a - b);

  if (retr === "hybrid-rerank") {
    const pool = order.slice(0, Math.min(8, order.length));
    const qContent = new Set(contentTokens(question));
    const qNums = extractNumbers(question);
    const qBigrams = bigrams(contentTokens(question));
    const boosted = pool.map((i) => {
      const cText = chunks[i].text.toLowerCase();
      const cSet = new Set(contentTokens(chunks[i].text));
      let overlap = 0;
      qContent.forEach((t) => {
        if (cSet.has(t)) overlap++;
      });
      let boost = 0.03 * Math.min(overlap, 4);
      const cNums = new Set(extractNumbers(chunks[i].text));
      let numHits = 0;
      for (const n of qNums) if (cNums.has(n)) numHits++;
      boost += 0.1 * Math.min(numHits, 2);
      if (qBigrams.some((bg) => cText.includes(bg))) boost += 0.08;
      return { i, score: (fused[i] ?? 0) + boost };
    });
    boosted.sort((a, b) => b.score - a.score || a.i - b.i);
    return boosted.slice(0, 4).map((b) => b.i);
  }

  return order.slice(0, 4);
}

type SentenceCandidate = {
  s: string;
  chunkRank: number;
  idxInChunk: number;
  score: number;
};

function synthesize(
  cfg: RagConfig,
  question: string,
  topChunks: Chunk[],
  idf: Map<string, number>,
): string {
  const qContent = new Set(contentTokens(question));
  const wantsNums =
    extractNumbers(question).length > 0 || NUMERIC_INTENT_RE.test(question);

  let totalW = 0;
  qContent.forEach((t) => {
    totalW += idf.get(t) ?? 0.5;
  });
  totalW = Math.max(totalW, 1e-6);

  const cands: SentenceCandidate[] = [];
  topChunks.forEach((chunk, rank) => {
    chunk.sentences.forEach((s, idxInChunk) => {
      const sContent = contentTokens(s);
      if (sContent.length === 0) return;
      const sSet = new Set(sContent);
      let inter = 0;
      let matchW = 0;
      for (const t of sSet) {
        if (qContent.has(t)) {
          inter++;
          matchW += idf.get(t) ?? 0.5;
        }
      }
      const wRecall = matchW / totalW;
      const jaccard = inter / (qContent.size + sSet.size - inter);
      // penalize very long extractions slightly (focus), keep order preference
      let score =
        1.9 * wRecall + 0.5 * jaccard + 0.1 * (1 / (rank + 1)) -
        0.0012 * sContent.length;
      if (wantsNums && extractNumbers(s).length > 0) score += 0.35;
      cands.push({ s, chunkRank: rank, idxInChunk, score });
    });
  });

  const pick = { compact: 2, standard: 3, verbose: 4 }[GEN_ENGINE[cfg.generator]];
  const chosen = cands
    .filter((c) => c.score > 0.08)
    .sort((a, b) => b.score - a.score)
    .slice(0, pick)
    .sort((a, b) => a.chunkRank - b.chunkRank || a.idxInChunk - b.idxInChunk);

  const fallback = (topChunks[0]?.sentences ?? []).slice(0, 2);
  const body = (chosen.length > 0 ? chosen.map((c) => c.s) : fallback).join(" ");
  if (!body) return "No answer could be synthesized from the retrieved passages.";

  if (GEN_ENGINE[cfg.generator] === "verbose") {
    const seen = new Set<string>();
    const figs: string[] = [];
    for (const c of chosen.length > 0 ? chosen : []) {
      for (const n of extractNumbers(c.s)) {
        if (!seen.has(n)) {
          seen.add(n);
          figs.push(n);
        }
      }
    }
    const lead =
      `Synthesis across ${topChunks.length} retrieved passages. `;
    const figLine =
      figs.length > 0 ? ` Key figures: ${figs.slice(0, 6).join(", ")}.` : "";
    return `${lead}${body}${figLine}`;
  }

  return body;
}

type ConfigContext = {
  chunks: Chunk[];
  vecs: Map<string, number>[];
  idf: Map<string, number>;
  bm: Bm25;
};

function buildContext(cfg: RagConfig, documents: EvalDocument[]): ConfigContext {
  const chunks: Chunk[] = [];
  let nextId = 0;
  for (const d of documents) {
    const produced = chunkDocument(
      d.name,
      d.content,
      cfg.chunkSize,
      cfg.chunkOverlap,
      nextId,
    );
    chunks.push(...produced);
    nextId += produced.length;
  }
  const terms = chunks.map((c) => termsFor(c.text, EMBED_ENGINE[cfg.embedding]));
  const idf = buildIdf(terms);
  const vecs = terms.map((t) => tfidfVector(t, idf));
  const bm = new Bm25(chunks.map((c) => tokenize(c.text)));
  return { chunks, vecs, idf, bm };
}

function modeledLatency(
  cfg: RagConfig,
  question: string,
  qi: number,
  chunkCount: number,
  answer: string,
): number {
  const rnd = mulberry32(hashString(`${cfg.key}::${qi}::${question}`));
  // embedding: BGE encodes locally; OpenAI adds API round-trip overhead
  const encodeMs =
    cfg.embedding === "openai"
      ? 85 + chunkCount * 0.16
      : 16 + chunkCount * 0.11;
  // retrieval: FAISS dense scan is cheap; hybrid adds a BM25 pass + fusion
  const retrieveMs =
    5 + chunkCount * 0.025 + (RETR_ENGINE[cfg.retrieval] !== "dense" ? 7 : 0);
  // generation: GPT-4o-mini is fast; Llama-3.3-70B is heavier per token
  const answerTokens = tokenize(answer).length;
  const genMs =
    cfg.generator === "llama-3.3-70b"
      ? 980 + answerTokens * 11
      : 380 + answerTokens * 5;
  const total = (encodeMs + retrieveMs + genMs) * (0.9 + rnd() * 0.22);
  return Math.round(total);
}

export function evaluateRag(
  domain: Domain,
  documents: EvalDocument[],
  questions: EvalQuestion[],
): EvaluationResult {
  const t0 = Date.now();
  const weights: DhsWeights = DOMAIN_META[domain];
  const scoringMode: "reference" | "faithfulness" = questions.some(
    (q) => q.ref && q.ref.trim().length > 0,
  )
    ? "reference"
    : "faithfulness";

  // Pre-compute question-level numeric intent (independent of config)
  const numericHeavy = questions.map((q) => {
    if (q.ref && extractNumbers(q.ref).length > 0) return true;
    return (
      extractNumbers(q.q).length > 0 || NUMERIC_INTENT_RE.test(q.q)
    );
  });

  const perConfigAnswers: PerConfigQuestion[][] = [];
  const outcomes: ConfigOutcome[] = [];

  for (const cfg of CONFIGS) {
    const ctx = buildContext(cfg, documents);
    const qResults: PerConfigQuestion[] = [];
    const hits: number[] = [];

    questions.forEach((q, qi) => {
      const topIdx = rankTopK(cfg, ctx, q.q);
      const topChunks = topIdx.map((i) => ctx.chunks[i]).filter(Boolean);
      const answer = synthesize(cfg, q.q, topChunks, ctx.idf);
      const ctxText = topChunks
        .map((c) => c.text)
        .join(" ")
        .slice(0, 4000);
      const ref = (q.ref ?? "").trim();

      const { dhs, factual, numeric } = composeDhs(answer, ref, ctxText, weights, q.q);

      // retrieval hit: top-3 chunk shares ≥2 content tokens or a number with ref
      let hit = 0;
      if (ref) {
        const refContent = new Set(contentTokens(ref));
        const refNums = new Set(extractNumbers(ref));
        hit = topChunks.slice(0, 3).some((c) => {
          const cc = new Set(contentTokens(c.text));
          let inter = 0;
          refContent.forEach((t) => {
            if (cc.has(t)) inter++;
          });
          const cn = new Set(extractNumbers(c.text));
          const numHit = [...refNums].some((n) => cn.has(n));
          return inter >= 2 || numHit;
        })
          ? 1
          : 0;
      } else {
        const qc = contentTokens(q.q);
        const cc = new Set(
          contentTokens(topChunks[0]?.text ?? ""),
        );
        const inter = qc.filter((t) => cc.has(t)).length;
        hit = inter / Math.max(1, qc.length) >= 0.3 ? 1 : 0;
      }
      hits.push(hit);

      qResults.push({
        configKey: cfg.key,
        answer,
        dhs: round3(dhs),
        factual: round3(factual),
        numeric: round3(numeric),
        latencyMs: modeledLatency(cfg, q.q, qi, ctx.chunks.length, answer),
        retrieved: topChunks.length,
        topChunk: (topChunks[0]?.text ?? "").slice(0, 420),
      });
    });

    perConfigAnswers.push(qResults);

    const dhsAll = qResults.map((r) => r.dhs);
    const numDhs = qResults.filter((_, i) => numericHeavy[i]).map((r) => r.dhs);
    const factDhs = qResults
      .filter((_, i) => !numericHeavy[i])
      .map((r) => r.dhs);
    const dhs = mean(dhsAll);

    outcomes.push({
      configKey: cfg.key,
      name: cfg.name,
      chunkSize: cfg.chunkSize,
      chunkOverlap: cfg.chunkOverlap,
      embedding: cfg.embedding,
      retrieval: cfg.retrieval,
      generation: cfg.generator,
      dhs: round3(dhs),
      factual: round3(mean(qResults.map((r) => r.factual))),
      numeric: round3(mean(qResults.map((r) => r.numeric))),
      numericHeavyDhs: round3(numDhs.length > 0 ? mean(numDhs) : dhs),
      factualHeavyDhs: round3(factDhs.length > 0 ? mean(factDhs) : dhs),
      hitRate: round3(mean(hits)),
      avgLatencyMs: Math.round(mean(qResults.map((r) => r.latencyMs))),
      grade: gradeFor(dhs),
      rank: 0,
    });
  }

  // rank + questions aggregation
  const sorted = [...outcomes].sort(
    (a, b) =>
      b.dhs - a.dhs ||
      b.factual - a.factual ||
      a.avgLatencyMs - b.avgLatencyMs,
  );
  sorted.forEach((o, i) => {
    const target = outcomes.find((x) => x.configKey === o.configKey);
    if (target) target.rank = i + 1;
  });

  const questionOutcomes: QuestionOutcome[] = questions.map((q, qi) => {
    const perConfig = perConfigAnswers.map((arr) => arr[qi]);
    const best = [...perConfig].sort(
      (a, b) => b.dhs - a.dhs || a.latencyMs - b.latencyMs,
    )[0];
    return {
      idx: qi,
      question: q.q,
      reference: q.ref && q.ref.trim() ? q.ref.trim() : null,
      isNumericHeavy: numericHeavy[qi],
      bestConfig: best.configKey,
      bestDhs: best.dhs,
      perConfig,
    };
  });

  const winner = sorted[0];
  const runnerUp = sorted[1] ?? sorted[0];
  const worst = sorted[sorted.length - 1];
  const winnerCfg = CONFIGS.find((c) => c.key === winner.configKey)!;
  const domainLabel = DOMAIN_META[domain].label.toLowerCase();
  const strength =
    winner.numericHeavyDhs >= winner.factualHeavyDhs
      ? `figure-dense queries (DHS ${winner.numericHeavyDhs.toFixed(3)})`
      : `fact-fidelity queries (DHS ${winner.factualHeavyDhs.toFixed(3)})`;

  const deltaUp = Math.max(0, winner.dhs - runnerUp.dhs);
  const deltaText =
    runnerUp.configKey === winner.configKey || deltaUp < 0.0005
      ? `level with the next best (${runnerUp.name})`
      : `+${deltaUp.toFixed(3)} over the next best (${runnerUp.name})`;

  const narrative =
    `${winner.name} is the strongest pipeline for this ${domainLabel} corpus at ` +
    `DHS ${winner.dhs.toFixed(3)} — ${deltaText} and ` +
    `+${Math.max(0, winner.dhs - worst.dhs).toFixed(3)} over the weakest setup. ` +
    `It performs best on ${strength}, with retrieval hit rate ` +
    `${(winner.hitRate * 100).toFixed(0)}% and modeled latency of ~${winner.avgLatencyMs}ms per query. ` +
    `Recommended stack: ${winnerCfg.chunkSize}-token chunks (${winnerCfg.chunkOverlap} overlap), ` +
    `${EMBEDDING_LABELS[winnerCfg.embedding]}, ${RETRIEVAL_LABELS[winnerCfg.retrieval]}, ` +
    `${GENERATION_LABELS[winnerCfg.generator]}.`;

  return {
    scoringMode,
    configs: outcomes.sort((a, b) => a.rank - b.rank),
    questions: questionOutcomes,
    winnerKey: winner.configKey,
    winnerName: winner.name,
    bestDhs: winner.dhs,
    bestGrade: winner.grade,
    narrative,
    durationMs: Date.now() - t0,
  };
}
