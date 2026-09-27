import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey, recordApiUsage } from "@/lib/api-auth";
import {
  API_RUN_COST,
  chargeCredits,
  creditsToUsd,
  grantCredits,
} from "@/lib/billing";
import {
  executeRun,
  prepareRunPayload,
  RunExecutionError,
  type CreateRunPayload,
} from "@/lib/run-service";

export const runtime = "nodejs";
export const maxDuration = 60;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}

export async function POST(req: NextRequest) {
  const started = Date.now();
  const identity = await authenticateApiKey(req.headers.get("authorization"));
  if (!identity) {
    return NextResponse.json(
      {
        error: {
          code: "unauthorized",
          message: "Provide a valid DocTune API key as a Bearer token.",
        },
      },
      {
        status: 401,
        headers: { ...cors, "WWW-Authenticate": "Bearer" },
      },
    );
  }

  let payload: CreateRunPayload;
  try {
    payload = (await req.json()) as CreateRunPayload;
  } catch {
    return NextResponse.json(
      { error: { code: "invalid_json", message: "Invalid JSON body." } },
      { status: 400, headers: cors },
    );
  }

  const prepared = prepareRunPayload(payload);
  if (!prepared.ok) {
    return NextResponse.json(
      { error: { code: "validation_error", message: prepared.error } },
      { status: 400, headers: cors },
    );
  }

  // Wallet metering: charge upfront (atomic), refund automatically on failure.
  const balance = await chargeCredits(
    identity.userId,
    API_RUN_COST,
    `API evaluation — ${prepared.data.name}`,
  );
  if (balance === null) {
    return NextResponse.json(
      {
        error: {
          code: "insufficient_credits",
          message: `This evaluation costs ${API_RUN_COST} credits (${creditsToUsd(API_RUN_COST)}). Your wallet balance is too low — top up at /account to continue.`,
          credits_required: API_RUN_COST,
        },
      },
      {
        status: 402,
        headers: { ...cors, "X-DocTune-Credits-Required": String(API_RUN_COST) },
      },
    );
  }

  const walletHeaders = {
    ...cors,
    "X-DocTune-Credits-Charged": String(API_RUN_COST),
    "X-DocTune-Balance-Remaining": String(balance),
  };

  try {
    const visibility = payload.visibility === "public" ? "public" : "private";
    const { runId, result } = await executeRun(prepared.data, {
      ownerId: identity.userId,
      source: "api",
      visibility,
    });
    await recordApiUsage({
      userId: identity.userId,
      apiKeyId: identity.apiKeyId,
      runId,
      statusCode: 200,
      durationMs: Date.now() - started,
    });

    return NextResponse.json(
      {
        object: "evaluation",
        id: runId,
        status: "completed",
        domain: prepared.data.domain,
        scoring_mode: result.scoringMode,
        questions_evaluated: prepared.data.questions.length,
        configurations_tested: result.configs.length,
        credits_charged: API_RUN_COST,
        balance_remaining: balance,
        recommendation: {
          config_key: result.winnerKey,
          name: result.winnerName,
          dhs: result.bestDhs,
          grade: result.bestGrade,
          narrative: result.narrative,
        },
        leaderboard: result.configs.map((c) => ({
          rank: c.rank,
          config_key: c.configKey,
          name: c.name,
          chunk_size: c.chunkSize,
          chunk_overlap: c.chunkOverlap,
          embedding: c.embedding,
          retrieval: c.retrieval,
          generation: c.generation,
          dhs: c.dhs,
          factual: c.factual,
          numeric: c.numeric,
          hit_rate: c.hitRate,
          avg_latency_ms: c.avgLatencyMs,
          grade: c.grade,
        })),
        report_url: `${req.nextUrl.origin}/runs/${runId}`,
        created_at: new Date().toISOString(),
      },
      { status: 200, headers: walletHeaders },
    );
  } catch (error) {
    // Evaluation failed — refund the charge, don't bill for failures.
    const runId = error instanceof RunExecutionError ? error.runId : undefined;
    await grantCredits({
      userId: identity.userId,
      credits: API_RUN_COST,
      type: "refund",
      description: `Refund — failed evaluation${runId ? ` (${runId.slice(0, 8)})` : ""}`,
    });
    await recordApiUsage({
      userId: identity.userId,
      apiKeyId: identity.apiKeyId,
      runId,
      statusCode: 500,
      durationMs: Date.now() - started,
    });
    return NextResponse.json(
      {
        error: {
          code: "evaluation_failed",
          message: error instanceof Error ? error.message : "Evaluation failed.",
          run_id: runId,
          refunded_credits: API_RUN_COST,
        },
      },
      { status: 500, headers: walletHeaders },
    );
  }
}
