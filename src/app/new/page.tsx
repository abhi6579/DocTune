import SiteNav from "@/components/site-nav";
import NewRunForm from "@/components/new-run-form";
import { getCurrentUser } from "@/lib/auth";
import { WEB_RUN_COST } from "@/lib/billing";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "New tuning run — DocTune",
  description: "Upload documents and questions, pick a domain, and race 16 RAG configurations.",
};

export default async function NewRunPage() {
  const user = await getCurrentUser();

  return (
    <>
      <SiteNav />
      <main className="relative mx-auto min-h-screen max-w-7xl px-5 pb-24 pt-28 md:px-8">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="bg-grid fade-y absolute inset-0 opacity-70" />
          <div className="absolute left-1/2 top-[-260px] h-[480px] w-[760px] -translate-x-1/2 rounded-full bg-ind/[0.06] blur-[130px]" />
        </div>
        <NewRunForm
          wallet={user ? { balance: user.balanceCredits, cost: WEB_RUN_COST } : null}
        />
      </main>
    </>
  );
}
