import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { ArrowRight, ArrowUpRight, Inbox } from "lucide-react";
import { db } from "@/db";
import { runs } from "@/db/schema";
import SiteNav from "@/components/site-nav";
import { DomainTag, GradeBadge, cx, gradeStyle } from "@/components/ui-bits";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Run history — DocTune",
};

export default async function RunsPage() {
  const all = await db
    .select()
    .from(runs)
    .where(eq(runs.visibility, "public"))
    .orderBy(desc(runs.createdAt))
    .limit(50);

  return (
    <>
      <SiteNav />
      <main className="relative mx-auto min-h-screen max-w-7xl px-5 pb-24 pt-28 md:px-8">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="bg-grid fade-y absolute inset-0 opacity-60" />
          <div className="absolute left-1/2 top-[-260px] h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-ind/[0.05] blur-[120px]" />
        </div>

        <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-ind">registry</p>
            <h1 className="mt-3 text-4xl font-bold tracking-[-0.02em] md:text-5xl">
              Tuning runs
            </h1>
            <p className="mt-3 max-w-lg text-[14px] text-mut">
              Every evaluation the agent has executed — leaderboard, grade, and full question forensics per run.
            </p>
          </div>
          <Link
            href="/new"
            className="group inline-flex items-center gap-2 rounded-full bg-ind px-5 py-3 text-[13px] font-semibold text-white transition-all hover:shadow-glow"
          >
            New run
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {all.length === 0 ? (
          <div className="panel grid place-items-center rounded-2xl px-8 py-24 text-center">
            <Inbox className="h-8 w-8 text-dim" />
            <p className="mt-5 text-lg font-semibold tracking-tight">No runs yet</p>
            <p className="mt-2 max-w-sm text-[13px] text-mut">
              Load a sample corpus in one click and watch 8 pipelines race for the best DHS score.
            </p>
            <Link
              href="/new"
              className="mt-7 inline-flex items-center gap-2 rounded-full border border-ind/40 bg-ind/10 px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-ind hover:bg-ind/20"
            >
              Launch your first run
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {all.map((r) => {
              const gs = gradeStyle(r.bestGrade);
              return (
                <div
                  key={r.id}
                  className="panel group relative flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl px-5 py-4 transition-all hover:border-linelt"
                >
                  <Link href={`/runs/${r.id}`} className="absolute inset-0 rounded-2xl" aria-label={r.name} />
                  <div className="min-w-0 flex-1 basis-56">
                    <p className="truncate text-[15px] font-semibold tracking-tight">{r.name}</p>
                    <p className="mt-1 font-mono text-[10px] tracking-[0.14em] text-dim">
                      {new Date(r.createdAt).toLocaleString("en-US", {
                        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                      })}
                      {" · "}
                      {r.questionCount}q · {(r.docChars / 1000).toFixed(1)}k chars
                    </p>
                  </div>
                  <DomainTag domain={r.domain} />
                  <div className="hidden font-mono text-[11px] text-mut sm:block">
                    {r.status === "completed" ? (
                      <>
                        winner <span className="text-ink">{r.winnerName}</span>
                      </>
                    ) : (
                      <span className={r.status === "failed" ? "text-rose" : "text-amber"}>{r.status}</span>
                    )}
                  </div>
                  {r.status === "completed" && (
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[13px] text-ink">
                        {r.bestDhs?.toFixed(3)}
                        <span className="ml-1.5 text-[9.5px] uppercase tracking-[0.14em] text-dim">dhs</span>
                      </span>
                      <span className={cx("grid h-8 w-8 place-items-center rounded-lg border font-mono text-[14px] font-medium", gs.text, gs.bg, gs.border)}>
                        {r.bestGrade}
                      </span>
                    </div>
                  )}
                  {r.status === "failed" && <GradeBadge grade="C" className="h-8 w-8 text-[13px]" />}
                  <ArrowUpRight className="h-4 w-4 text-dim transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
