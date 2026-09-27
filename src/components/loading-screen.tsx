import { AudioWaveform } from "lucide-react";

/**
 * Branded route loading screen — pure CSS/SVG animation, no emoji.
 * Shown by Next.js `loading.tsx` boundaries during navigation / data fetches.
 */
export default function LoadingScreen({
  label = "loading workspace",
}: {
  label?: string;
}) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-bg/85 backdrop-blur-sm">
      <div className="w-[min(400px,88vw)]">
        <div className="mb-7 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-white shadow-sm">
            <AudioWaveform className="h-5 w-5 text-ind" />
          </span>
          <div>
            <p className="text-[15px] font-semibold tracking-tight">DocTune</p>
            <p className="font-mono text-[9px] uppercase tracking-[0.26em] text-dim">
              rag autotuning agent
            </p>
          </div>
        </div>

        {/* staggered race bars — echoes the live evaluation board */}
        <div className="space-y-1.5" aria-hidden>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <span className="w-4 text-right font-mono text-[9px] text-dim">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200/90">
                <div
                  className="loadrace h-full rounded-full bg-gradient-to-r from-ind to-blu"
                  style={{ animationDelay: `${i * 0.09}s` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.26em] text-mut">
            {label}
            <span className="ticker-blink text-ind"> _</span>
          </p>
          <p className="font-mono text-[9px] tracking-[0.16em] text-dim">16 configs queued</p>
        </div>
        <div className="relative mt-2.5 h-0.5 overflow-hidden rounded-full bg-slate-200">
          <div className="loadsheen absolute inset-y-0 w-1/4 rounded-full bg-ind" />
        </div>
      </div>
    </div>
  );
}
