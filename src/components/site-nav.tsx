import Link from "next/link";
import { AudioWaveform, ArrowUpRight, CircleUserRound } from "lucide-react";

export default function SiteNav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-slate-900/95 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8">
        <Link href="/" className="group flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg border border-white/15 bg-white/5">
            <AudioWaveform className="h-4.5 w-4.5 text-indigo-300 transition-transform duration-300 group-hover:scale-110" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-white">
            DocTune
            <span className="ml-2 hidden font-mono text-[10px] font-normal uppercase tracking-[0.24em] text-slate-400 sm:inline">
              rag autotuner
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 font-mono text-[10.5px] uppercase tracking-[0.18em] text-slate-400 lg:flex">
          <a href="/#how" className="transition-colors hover:text-white">Process</a>
          <a href="/#metric" className="transition-colors hover:text-white">DHS metric</a>
          <Link href="/runs" className="transition-colors hover:text-white">Runs</Link>
          <Link href="/developers" className="transition-colors hover:text-white">API</Link>
          <Link href="/about" className="transition-colors hover:text-white">About</Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/account"
            aria-label="Developer account"
            className="grid h-9 w-9 place-items-center rounded-full border border-white/15 text-slate-300 transition-colors hover:border-white/30 hover:bg-white/5 hover:text-white"
          >
            <CircleUserRound className="h-4 w-4" />
          </Link>
          <Link
            href="/new"
            className="group inline-flex items-center gap-2 rounded-full bg-ind px-4 py-2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-white transition-all hover:bg-indigo-500 hover:shadow-glow"
          >
            <span className="hidden sm:inline">Tune a pipeline</span>
            <span className="sm:hidden">Tune</span>
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
