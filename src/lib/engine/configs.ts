import type { EmbeddingMode } from "./nlp";

export type Domain = "healthcare" | "legal" | "finance";

export const DOMAINS: Domain[] = ["healthcare", "legal", "finance"];

export const DOMAIN_META: Record<
  Domain,
  { label: string; tagline: string; factual: number; numeric: number }
> = {
  healthcare: {
    label: "Healthcare",
    tagline: "Dosages, lab values and clinical thresholds are life-critical.",
    factual: 0.5,
    numeric: 0.5,
  },
  legal: {
    label: "Legal",
    tagline: "Clause fidelity dominates; dates and caps are secondary.",
    factual: 0.7,
    numeric: 0.3,
  },
  finance: {
    label: "Finance",
    tagline: "Figures, margins and guidance drive every decision.",
    factual: 0.4,
    numeric: 0.6,
  },
};

/* ── pipeline stack vocabulary (TriDomRAG-Bench grid) ───────── */

export type EmbeddingModel = "bge" | "openai";
export type RetrievalStyle = "faiss" | "hybrid";
export type GeneratorModel = "gpt-4o-mini" | "llama-3.3-70b";

/** internal engine behavior per stack component */
type RetrievalMode = "dense" | "bm25" | "hybrid" | "hybrid-rerank";
export type GenerationMode = "compact" | "standard" | "verbose";

export const EMBED_ENGINE: Record<EmbeddingModel, EmbeddingMode> = {
  bge: "unibi",
  openai: "char3",
};

export const RETR_ENGINE: Record<RetrievalStyle, RetrievalMode> = {
  faiss: "dense",
  hybrid: "hybrid",
};

export const GEN_ENGINE: Record<GeneratorModel, GenerationMode> = {
  "gpt-4o-mini": "standard",
  "llama-3.3-70b": "verbose",
};

export const EMBEDDING_LABELS: Record<EmbeddingModel, string> = {
  bge: "BGE · bge-large-en",
  openai: "OpenAI · text-embedding-3",
};

export const RETRIEVAL_LABELS: Record<RetrievalStyle, string> = {
  faiss: "FAISS dense",
  hybrid: "Hybrid · FAISS + BM25",
};

export const GENERATION_LABELS: Record<GeneratorModel, string> = {
  "gpt-4o-mini": "GPT-4o-mini",
  "llama-3.3-70b": "Llama-3.3-70B",
};

export type RagConfig = {
  key: string;
  name: string;
  chunkSize: number;
  chunkOverlap: number;
  embedding: EmbeddingModel;
  retrieval: RetrievalStyle;
  generator: GeneratorModel;
};

type CfgTuple = [string, string, number, number, EmbeddingModel, RetrievalStyle, GeneratorModel];

const GRID: CfgTuple[] = [
  ["01", "Nano Dense", 128, 16, "bge", "faiss", "gpt-4o-mini"],
  ["02", "Nano Hybrid", 128, 16, "bge", "hybrid", "gpt-4o-mini"],
  ["03", "Small Dense", 256, 32, "bge", "faiss", "gpt-4o-mini"],
  ["04", "Small Hybrid", 256, 32, "bge", "hybrid", "gpt-4o-mini"],
  ["05", "Medium Dense", 512, 64, "bge", "faiss", "gpt-4o-mini"],
  ["06", "Medium Hybrid", 512, 64, "bge", "hybrid", "gpt-4o-mini"],
  ["07", "Large Dense", 1024, 128, "bge", "faiss", "gpt-4o-mini"],
  ["08", "Large Hybrid", 1024, 128, "bge", "hybrid", "gpt-4o-mini"],
  ["09", "OpenAI Dense", 512, 64, "openai", "faiss", "gpt-4o-mini"],
  ["10", "OpenAI Hybrid", 512, 64, "openai", "hybrid", "gpt-4o-mini"],
  ["11", "Llama Dense", 512, 64, "bge", "faiss", "llama-3.3-70b"],
  ["12", "Llama Hybrid", 512, 64, "bge", "hybrid", "llama-3.3-70b"],
  ["13", "OpenAI Llama", 512, 64, "openai", "faiss", "llama-3.3-70b"],
  ["14", "OpenAI Hybrid Llama", 512, 64, "openai", "hybrid", "llama-3.3-70b"],
  ["15", "Small OpenAI", 256, 32, "openai", "hybrid", "llama-3.3-70b"],
  ["16", "Large OpenAI", 1024, 128, "openai", "hybrid", "llama-3.3-70b"],
];

function blurbFor(chunkSize: number, generator: GeneratorModel): string {
  const tier =
    chunkSize <= 128
      ? "Pinpoint chunks for exact-figure retrieval; fragile on wide context"
      : chunkSize <= 256
        ? "Tight windows balancing pinpoint precision and local context"
        : chunkSize <= 512
          ? "The common default window; solid all-round retrieval"
          : "Maximum context per chunk; risks diluting the signal";
  const gen =
    generator === "gpt-4o-mini"
      ? "GPT-4o-mini synthesis (fast, terse)"
      : "Llama-3.3-70B synthesis (verbose, high-recall)";
  return `${tier}. ${gen}.`;
}

export const CONFIGS: RagConfig[] = GRID.map(
  ([key, name, chunkSize, chunkOverlap, embedding, retrieval, generator]) => ({
    key,
    name,
    chunkSize,
    chunkOverlap,
    embedding,
    retrieval,
    generator,
  }),
);

export function configBlurb(c: RagConfig): string {
  return blurbFor(c.chunkSize, c.generator);
}

export type Grade = "A" | "B" | "C";

export function gradeFor(dhs: number): Grade {
  if (dhs >= 0.85) return "A";
  if (dhs >= 0.7) return "B";
  return "C";
}

export const GRADE_META: Record<Grade, { label: string; verdict: string }> = {
  A: { label: "Production-ready", verdict: "Deploy with confidence." },
  B: { label: "Viable", verdict: "Deploy with guardrails and spot checks." },
  C: { label: "At risk", verdict: "Do not deploy. Re-tune before release." },
};
