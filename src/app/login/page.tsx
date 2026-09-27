import { redirect } from "next/navigation";
import SiteNav from "@/components/site-nav";
import AuthForm from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Developer account — DocTune",
  description: "Create a DocTune developer account and issue API keys.",
};

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/account");

  return (
    <>
      <SiteNav />
      <main className="relative mx-auto min-h-screen max-w-7xl px-5 pb-24 pt-28 md:px-8">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="bg-grid fade-y absolute inset-0 opacity-60" />
          <div className="absolute left-1/2 top-[-260px] h-[520px] w-[800px] -translate-x-1/2 rounded-full bg-ind/[0.07] blur-[140px]" />
        </div>
        <div className="mx-auto grid max-w-4xl items-center gap-12 lg:grid-cols-[1fr_420px]">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ind">DocTune API</p>
            <h1 className="mt-4 text-4xl font-bold leading-[1.04] tracking-[-0.03em] md:text-5xl">
              Put RAG evaluation inside{" "}
              <span className="font-serif italic font-normal text-grad-ind">your workflow.</span>
            </h1>
            <p className="mt-5 max-w-lg text-[14.5px] leading-relaxed text-mut">
              One authenticated request races 16 RAG pipelines and returns the ranked leaderboard, DHS sub-scores, deployment grade, and a shareable report.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-3">
              {[["200", "free credits"], ["16", "configs / run"], ["$0.25", "per API call"]].map(([n, l]) => (
                <div key={l} className="panel rounded-xl p-4">
                  <p className="font-mono text-xl font-medium text-ind">{n}</p>
                  <p className="mt-1 font-mono text-[8.5px] uppercase tracking-[0.14em] text-dim">{l}</p>
                </div>
              ))}
            </div>
          </div>
          <AuthForm />
        </div>
      </main>
    </>
  );
}
