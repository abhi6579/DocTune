import { eq } from "drizzle-orm";
import { db } from "@/db";
import { configResults, questionResults, runs } from "@/db/schema";
import { DOMAINS, type Domain } from "@/lib/engine/configs";
import {
  evaluateRag,
  type EvalDocument,
  type EvalQuestion,
  type EvaluationResult,
} from "@/lib/engine/evaluate";

export const RUN_LIMITS = {
  maxDocChars: 120_000,
  maxTotalChars: 250_000,
  maxDocs: 6,
  maxQuestions: 25,
} as const;

export type CreateRunPayload = {
  name?: string;
  domain?: string;
  visibility?: "public" | "private";
  documents?: EvalDocument[];
  questions?: EvalQuestion[];
};

export type PreparedRun = {
  name: string;
  domain: Domain;
  documents: EvalDocument[];
  questions: EvalQuestion[];
  totalChars: number;
};

export type ValidationResult =
  | { ok: true; data: PreparedRun }
  | { ok: false; error: string };

const NAME_PARTS = [
  "aurora", "vector", "signal", "meridian", "cobalt", "atlas", "harbor",
  "kepler", "onyx", "prism", "quartz", "relay", "summit", "tundra",
];

function autoName(domain: string): string {
  const a = NAME_PARTS[Math.floor(Math.random() * NAME_PARTS.length)];
  return `${domain}-${a}-${Math.floor(100 + Math.random() * 900)}`;
}

export function prepareRunPayload(payload: CreateRunPayload): ValidationResult {
  const domain = (payload.domain ?? "") as Domain;
  if (!DOMAINS.includes(domain)) {
    return { ok: false, error: "Domain must be healthcare, legal, or finance." };
  }

  const rawDocs = (payload.documents ?? []).filter(
    (d) => d && typeof d.content === "string" && d.content.trim(),
  );
  const oversized = rawDocs.find(
    (d) => d.content.length > RUN_LIMITS.maxDocChars,
  );
  if (oversized) {
    return {
      ok: false,
      error: `Document "${(oversized.name || "document").slice(0, 60)}" exceeds the ${RUN_LIMITS.maxDocChars / 1000}k character per-document limit.`,
    };
  }

  const documents = rawDocs.slice(0, RUN_LIMITS.maxDocs).map((d, i) => ({
    name: (d.name || `document-${i + 1}.txt`).slice(0, 120),
    content: d.content,
  }));
  const totalChars = documents.reduce((a, d) => a + d.content.length, 0);
  if (documents.length === 0 || totalChars < 200) {
    return {
      ok: false,
      error: "Provide at least one document with 200+ characters of text.",
    };
  }
  if (totalChars > RUN_LIMITS.maxTotalChars) {
    return { ok: false, error: "Documents exceed the 250k character budget." };
  }

  const seen = new Set<string>();
  const questions = (payload.questions ?? [])
    .map((q) => ({
      q: (q.q ?? "").trim().slice(0, 600),
      ref: (q.ref ?? "").trim().slice(0, 1200) || undefined,
    }))
    .filter((q) => {
      if (q.q.length < 6 || seen.has(q.q.toLowerCase())) return false;
      seen.add(q.q.toLowerCase());
      return true;
    })
    .slice(0, RUN_LIMITS.maxQuestions);
  if (questions.length === 0) {
    return { ok: false, error: "Provide at least one question (6+ characters)." };
  }

  return {
    ok: true,
    data: {
      name: (payload.name ?? "").trim().slice(0, 80) || autoName(domain),
      domain,
      documents,
      questions,
      totalChars,
    },
  };
}

export class RunExecutionError extends Error {
  runId: string;
  constructor(message: string, runId: string) {
    super(message);
    this.runId = runId;
  }
}

export async function executeRun(
  prepared: PreparedRun,
  options: {
    ownerId?: string;
    source?: "web" | "api";
    visibility?: "public" | "private";
  } = {},
): Promise<{ runId: string; result: EvaluationResult }> {
  const [run] = await db
    .insert(runs)
    .values({
      ownerId: options.ownerId,
      source: options.source ?? "web",
      visibility: options.visibility ?? "public",
      name: prepared.name,
      domain: prepared.domain,
      status: "running",
      docNames: prepared.documents.map((d) => d.name),
      docChars: prepared.totalChars,
      questionCount: prepared.questions.length,
    })
    .returning();

  try {
    const result = evaluateRag(
      prepared.domain,
      prepared.documents,
      prepared.questions,
    );

    await db.insert(configResults).values(
      result.configs.map((c) => ({
        runId: run.id,
        configKey: c.configKey,
        name: c.name,
        chunkSize: c.chunkSize,
        chunkOverlap: c.chunkOverlap,
        embedding: c.embedding,
        retrieval: c.retrieval,
        generation: c.generation,
        dhs: c.dhs,
        factual: c.factual,
        numeric: c.numeric,
        numericHeavyDhs: c.numericHeavyDhs,
        factualHeavyDhs: c.factualHeavyDhs,
        hitRate: c.hitRate,
        avgLatencyMs: c.avgLatencyMs,
        grade: c.grade,
        rank: c.rank,
      })),
    );

    await db.insert(questionResults).values(
      result.questions.map((q) => ({
        runId: run.id,
        idx: q.idx,
        question: q.question,
        reference: q.reference,
        isNumericHeavy: q.isNumericHeavy ? 1 : 0,
        perConfig: q.perConfig,
        bestConfig: q.bestConfig,
        bestDhs: q.bestDhs,
      })),
    );

    await db
      .update(runs)
      .set({
        status: "completed",
        scoringMode: result.scoringMode,
        winnerConfig: result.winnerKey,
        winnerName: result.winnerName,
        bestDhs: result.bestDhs,
        bestGrade: result.bestGrade,
        narrative: result.narrative,
        durationMs: result.durationMs,
        completedAt: new Date(),
      })
      .where(eq(runs.id, run.id));

    return { runId: run.id, result };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Evaluation failed.";
    await db
      .update(runs)
      .set({ status: "failed", error: message })
      .where(eq(runs.id, run.id));
    throw new RunExecutionError(message, run.id);
  }
}
