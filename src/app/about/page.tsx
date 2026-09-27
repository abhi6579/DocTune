import SiteNav from "@/components/site-nav";
import AboutContent from "@/components/about-content";

export const metadata = {
  title: "About — DocTune",
  description:
    "DocTune is an AI agent by Abhinav Mishra, built for the BuildSpirit hackathon, that automatically finds the optimal RAG pipeline configuration for your domain data.",
};

export default function AboutPage() {
  return (
    <>
      <SiteNav />
      <main className="relative mx-auto min-h-screen max-w-7xl px-5 pb-24 pt-32 md:px-8">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="bg-grid fade-y absolute inset-0 opacity-70" />
          <div className="absolute left-1/3 top-[-260px] h-[480px] w-[760px] rounded-full bg-ind/[0.06] blur-[130px]" />
          <div className="absolute right-[-160px] top-[45%] h-[380px] w-[380px] rounded-full bg-blu/[0.07] blur-[110px]" />
        </div>
        <AboutContent />
      </main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-8 md:px-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-dim">
            DocTune · RAG autotuning agent
          </p>
          <p className="font-mono text-[10px] tracking-[0.16em] text-dim">
            Made by <span className="text-mut">Abhinav Mishra</span> · Built for the{" "}
            <span className="text-mut">BuildSpirit</span> hackathon
          </p>
        </div>
      </footer>
    </>
  );
}
