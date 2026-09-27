import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { configResults, questionResults, runs } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import SiteNav from "@/components/site-nav";
import RunReport from "@/components/run-report";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolve the run in generateMetadata: metadata is computed before the
 * response shell flushes, so notFound() here yields a real HTTP 404 status
 * (calling it inside the streamed page body produces a soft-404 instead).
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const [run] = await db
    .select({
      id: runs.id,
      name: runs.name,
      ownerId: runs.ownerId,
      visibility: runs.visibility,
    })
    .from(runs)
    .where(eq(runs.id, id))
    .limit(1);
  if (!run) notFound();
  if (run.visibility === "private") {
    const user = await getCurrentUser();
    if (!user || user.id !== run.ownerId) notFound();
  }
  return { title: `${run.name} — DocTune run report` };
}

export default async function RunDetailPage({ params }: Props) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const [run] = await db.select().from(runs).where(eq(runs.id, id)).limit(1);
  if (!run) notFound();
  if (run.visibility === "private") {
    const user = await getCurrentUser();
    if (!user || user.id !== run.ownerId) notFound();
  }

  const [configs, questions] =
    run.status === "completed"
      ? await Promise.all([
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
        ])
      : [[], []];

  return (
    <>
      <SiteNav />
      <main className="relative mx-auto min-h-screen max-w-7xl px-5 pb-24 pt-28 md:px-8">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="bg-grid fade-y absolute inset-0 opacity-60" />
          <div className="absolute left-1/4 top-[-220px] h-[480px] w-[720px] rounded-full bg-ind/[0.05] blur-[130px]" />
        </div>
        <RunReport
          run={{
            ...run,
            ownerId: null,
            createdAt: run.createdAt.toISOString() as unknown as Date,
            completedAt: run.completedAt
              ? (run.completedAt.toISOString() as unknown as Date)
              : null,
          }}
          configs={configs}
          questions={questions}
        />
      </main>
    </>
  );
}
