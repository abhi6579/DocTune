import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { runs } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import {
  anonFreeWebRuns,
  anonQuotaRemaining,
  chargeCredits,
  clientIpHash,
  creditsToUsd,
  grantCredits,
  incrAnonWebUsage,
  WEB_RUN_COST,
} from "@/lib/billing";
import {
  executeRun,
  prepareRunPayload,
  RunExecutionError,
  type CreateRunPayload,
} from "@/lib/run-service";

export async function GET() {
  const rows = await db
    .select({
      id: runs.id,
      source: runs.source,
      name: runs.name,
      domain: runs.domain,
      status: runs.status,
      scoringMode: runs.scoringMode,
      docNames: runs.docNames,
      docChars: runs.docChars,
      questionCount: runs.questionCount,
      winnerConfig: runs.winnerConfig,
      winnerName: runs.winnerName,
      bestDhs: runs.bestDhs,
      bestGrade: runs.bestGrade,
      narrative: runs.narrative,
      error: runs.error,
      durationMs: runs.durationMs,
      createdAt: runs.createdAt,
      completedAt: runs.completedAt,
    })
    .from(runs)
    .where(eq(runs.visibility, "public"))
    .orderBy(desc(runs.createdAt))
    .limit(50);
  return NextResponse.json({ runs: rows });
}

/** Public web-demo endpoint. The product API lives at /api/v1/evaluate. */
export async function POST(req: NextRequest) {
  let payload: CreateRunPayload;
  try {
    payload = (await req.json()) as CreateRunPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const prepared = prepareRunPayload(payload);
  if (!prepared.ok) {
    return NextResponse.json({ error: prepared.error }, { status: 400 });
  }

  const user = await getCurrentUser();

  if (user) {
    // Signed-in browser runs are wallet-metered (cheaper than API calls).
    const balance = await chargeCredits(
      user.id,
      WEB_RUN_COST,
      `Web evaluation — ${prepared.data.name}`,
    );
    if (balance === null) {
      return NextResponse.json(
        {
          error: `This run costs ${WEB_RUN_COST} credits (${creditsToUsd(WEB_RUN_COST)}). Your wallet balance is too low — add credits in your account to continue.`,
          code: "insufficient_credits",
        },
        { status: 402 },
      );
    }
    try {
      const { runId } = await executeRun(prepared.data, {
        ownerId: user.id,
        source: "web",
      });
      return NextResponse.json({
        id: runId,
        status: "completed",
        credits_charged: WEB_RUN_COST,
        balance_remaining: balance,
      });
    } catch (error) {
      await grantCredits({
        userId: user.id,
        credits: WEB_RUN_COST,
        type: "refund",
        description: "Refund — failed web evaluation",
      });
      const message =
        error instanceof Error ? error.message : "Evaluation failed.";
      const runId = error instanceof RunExecutionError ? error.runId : undefined;
      return NextResponse.json({ error: message, id: runId }, { status: 500 });
    }
  }

  // Anonymous demo: free daily allowance per IP, then prompt to sign up.
  const ipHash = clientIpHash(req);
  const remaining = await anonQuotaRemaining(ipHash);
  if (remaining <= 0) {
    return NextResponse.json(
      {
        error: `You have used your ${anonFreeWebRuns()} free evaluations for today. Create a free account to get 200 welcome credits and keep evaluating.`,
        code: "anon_limit_reached",
      },
      { status: 429 },
    );
  }

  try {
    const { runId } = await executeRun(prepared.data, { source: "web" });
    await incrAnonWebUsage(ipHash);
    return NextResponse.json({
      id: runId,
      status: "completed",
      free_runs_remaining: remaining - 1,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Evaluation failed.";
    const runId = error instanceof RunExecutionError ? error.runId : undefined;
    return NextResponse.json({ error: message, id: runId }, { status: 500 });
  }
}
