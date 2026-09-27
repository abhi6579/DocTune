import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { configResults, questionResults, runs } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Run not found." }, { status: 404 });
  }
  const [run] = await db.select().from(runs).where(eq(runs.id, id)).limit(1);
  if (!run) {
    return NextResponse.json({ error: "Run not found." }, { status: 404 });
  }
  if (run.visibility === "private") {
    const user = await getCurrentUser();
    if (!user || user.id !== run.ownerId) {
      return NextResponse.json({ error: "Run not found." }, { status: 404 });
    }
  }
  const { ownerId: _ownerId, ...safeRun } = run;
  if (run.status !== "completed") {
    return NextResponse.json({ run: safeRun, configs: [], questions: [] });
  }
  const [configs, questions] = await Promise.all([
    db
      .select()
      .from(configResults)
      .where(eq(configResults.runId, id))
      .orderBy(asc(configResults.rank)),
    db
      .select()
      .from(questionResults)
      .where(eq(questionResults.runId, id))
      .orderBy(asc(questionResults.idx)),
  ]);
  return NextResponse.json({ run: safeRun, configs, questions });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Run not found." }, { status: 404 });
  }
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const deleted = await db
    .delete(runs)
    .where(and(eq(runs.id, id), eq(runs.ownerId, user.id)))
    .returning();
  if (deleted.length === 0) {
    return NextResponse.json({ error: "Run not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
