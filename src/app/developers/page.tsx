import Link from "next/link";
import {
  ArrowRight,
  Check,
  Clock3,
  Code2,
  KeyRound,
  ShieldCheck,
  Terminal,
  Zap,
} from "lucide-react";
import SiteNav from "@/components/site-nav";
import { SectionKicker, cx } from "@/components/ui-bits";

export const metadata = {
  title: "API documentation — DocTune",
  description: "Integrate DocTune's 16-configuration RAG evaluation API.",
};

const curlExample = `curl -X POST https://your-doctune-domain.com/api/v1/evaluate \\
  -H "Authorization: Bearer dt_live_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "quarterly-report-benchmark",
    "domain": "finance",
    "documents": [{
      "name": "q3-results.txt",
      "content": "Heliotrope reported revenue of $4.82 billion..."
    }],
    "questions": [{
      "q": "What revenue was reported?",
      "ref": "$4.82 billion"
    }]
  }'`;

const nodeExample = `const response = await fetch(
  "https://your-doctune-domain.com/api/v1/evaluate",
  {
    method: "POST",
    headers: {
      Authorization: \`Bearer \${process.env.DOCTUNE_API_KEY}\`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      domain: "legal",
      documents: [{ name: "msa.txt", content: msaText }],
      questions: [{ q: "What is the liability cap?", ref: reference }],
    }),
  },
);
const evaluation = await response.json();
console.log(evaluation.recommendation);`;

const responseExample = `{
  "object": "evaluation",
  "id": "41f4...",
  "status": "completed",
  "domain": "finance",
  "scoring_mode": "reference",
  "questions_evaluated": 6,
  "configurations_tested": 16,
  "recommendation": {
    "config_key": "01",
    "name": "Nano Dense",
    "dhs": 0.907,
    "grade": "A",
    "narrative": "Nano Dense is the strongest pipeline..."
  },
  "leaderboard": ["16 ranked configuration objects"],
  "report_url": "https://.../runs/41f4..."
}`;

function CodeBlock({ title, children }: { title: string; children: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-lg">
      <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3">
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-slate-400">{title}</span>
        <Code2 className="h-3.5 w-3.5 text-indigo-300" />
      </div>
      <pre className="scroll-thin overflow-x-auto p-5 font-mono text-[11px] leading-relaxed text-slate-300"><code>{children}</code></pre>
    </div>
  );
}

export default function DevelopersPage() {
  const salesEmail = process.env.NEXT_PUBLIC_SALES_EMAIL;
  const salesHref = salesEmail
    ? `mailto:${salesEmail}?subject=DocTune%20paid%20pilot`
    : "/login";

  return (
    <>
      <SiteNav />
      <main className="relative mx-auto min-h-screen max-w-7xl px-5 pb-24 pt-32 md:px-8">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="bg-grid fade-y absolute inset-0 opacity-55" />
          <div className="absolute left-1/2 top-[-300px] h-[520px] w-[850px] -translate-x-1/2 rounded-full bg-ind/[0.07] blur-[140px]" />
        </div>

        <section className="grid items-center gap-12 lg:grid-cols-[1fr_0.9fr]">
          <div>
            <SectionKicker>DocTune API · v1</SectionKicker>
            <h1 className="mt-4 text-5xl font-bold leading-[1.02] tracking-[-0.035em] md:text-6xl">
              RAG benchmarking as an{" "}
              <span className="font-serif italic font-normal text-grad-ind">API call.</span>
            </h1>
            <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-mut">
              Send documents and gold questions. Receive the winner across 16 pipelines, DHS sub-scores, an A/B/C deployment grade, full leaderboard, and a shareable report URL.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login" className="inline-flex items-center gap-2 rounded-full bg-ind px-6 py-3.5 text-[13px] font-semibold text-white hover:bg-indigo-600 hover:shadow-glow">
                Get an API key <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#reference" className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-6 py-3.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-mut hover:text-ink">
                Read reference <Terminal className="h-3.5 w-3.5" />
              </a>
            </div>
            <div className="mt-9 flex flex-wrap gap-x-7 gap-y-3 font-mono text-[9.5px] uppercase tracking-[0.15em] text-dim">
              <span className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-mint" /> hashed keys</span>
              <span className="flex items-center gap-2"><Clock3 className="h-3.5 w-3.5 text-ind" /> synchronous result</span>
              <span className="flex items-center gap-2"><Zap className="h-3.5 w-3.5 text-amber" /> 200 credits free on signup</span>
            </div>
          </div>
          <CodeBlock title="quickstart · curl">{curlExample}</CodeBlock>
        </section>

        <section id="reference" className="mt-24 grid gap-10 lg:grid-cols-[260px_1fr]">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-dim">endpoint</p>
            <div className="mt-3 rounded-xl border border-line bg-white p-4 shadow-sm">
              <p className="font-mono text-[11px] font-medium text-ink"><span className="mr-2 text-mint">POST</span>/api/v1/evaluate</p>
              <p className="mt-2 text-[11px] leading-relaxed text-mut">Bearer key required. Each successful request costs 25 credits ($0.25) from your wallet — failed evaluations are refunded automatically.</p>
            </div>
            <p className="mt-6 font-mono text-[9px] uppercase tracking-[0.24em] text-dim">limits</p>
            <dl className="mt-3 space-y-2 text-[11.5px] text-mut">
              <div className="flex justify-between"><dt>Documents</dt><dd className="font-mono text-ink">6</dd></div>
              <div className="flex justify-between"><dt>Per document</dt><dd className="font-mono text-ink">120k chars</dd></div>
              <div className="flex justify-between"><dt>Total corpus</dt><dd className="font-mono text-ink">250k chars</dd></div>
              <div className="flex justify-between"><dt>Questions</dt><dd className="font-mono text-ink">25</dd></div>
              <div className="flex justify-between"><dt>Configurations</dt><dd className="font-mono text-ink">16</dd></div>
            </dl>
          </aside>

          <div className="space-y-12">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Authentication</h2>
              <p className="mt-3 text-[13.5px] leading-relaxed text-mut">Create a key in your account, then send it in the Authorization header. Keys start with <code className="rounded bg-panel2 px-1.5 py-0.5 font-mono text-[11px] text-ind">dt_live_</code>, are shown once, and stored only as SHA-256 hashes.</p>
              <div className="mt-4 rounded-xl border border-line bg-white px-4 py-3 font-mono text-[11px] text-ink shadow-sm">Authorization: Bearer dt_live_your_key</div>
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Request body</h2>
              <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-white">
                <table className="w-full min-w-[600px] text-left text-[12px]">
                  <thead className="border-b border-line bg-panel2/70 font-mono text-[9px] uppercase tracking-[0.16em] text-dim"><tr><th className="px-5 py-3">field</th><th className="px-5 py-3">type</th><th className="px-5 py-3">required</th><th className="px-5 py-3">description</th></tr></thead>
                  <tbody className="divide-y divide-line">
                    {[
                      ["domain", "string", "yes", "healthcare, legal, or finance"],
                      ["documents", "array", "yes", "Objects with name and content"],
                      ["questions", "array", "yes", "Objects with q and optional ref"],
                      ["name", "string", "no", "Human-readable evaluation name"],
                    ].map((r) => <tr key={r[0]}><td className="px-5 py-3 font-mono text-ind">{r[0]}</td><td className="px-5 py-3 font-mono text-mut">{r[1]}</td><td className="px-5 py-3">{r[2]}</td><td className="px-5 py-3 text-mut">{r[3]}</td></tr>)}
                  </tbody>
                </table>
              </div>
            </div>
            <CodeBlock title="node.js">{nodeExample}</CodeBlock>
            <div>
              <h2 className="mb-4 text-2xl font-bold tracking-tight">Response</h2>
              <CodeBlock title="200 · application/json">{responseExample}</CodeBlock>
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Errors & quota headers</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  ["400", "validation_error", "Malformed or over-limit input"],
                  ["401", "unauthorized", "Missing, invalid, or revoked key"],
                  ["402", "insufficient_credits", "Wallet balance too low — top up to continue"],
                  ["500", "evaluation_failed", "Run failed; charge refunded automatically"],
                ].map(([status, code, text]) => (
                  <div key={status} className="panel rounded-xl p-4"><p className="font-mono text-[11px]"><span className="mr-2 text-rose">{status}</span>{code}</p><p className="mt-1.5 text-[11.5px] text-mut">{text}</p></div>
                ))}
              </div>
              <p className="mt-4 text-[12px] text-mut">Every successful response includes <code className="font-mono text-ink">X-DocTune-Credits-Charged</code> and <code className="font-mono text-ink">X-DocTune-Balance-Remaining</code>.</p>
            </div>
          </div>
        </section>

        <section className="mt-24">
          <div className="text-center">
            <SectionKicker>pricing</SectionKicker>
            <h2 className="mt-4 text-4xl font-bold tracking-tight">Prepaid wallet. No subscription.</h2>
            <p className="mx-auto mt-3 max-w-xl text-[13.5px] text-mut">Add credits once, spend them per evaluation. Bigger top-ups earn bonus credits. Credits never expire.</p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              ["web evaluation", "10 credits", "$0.10 per run", "Signed-in browser runs via the interactive evaluator"],
              ["api evaluation", "25 credits", "$0.25 per call", "POST /api/v1/evaluate — failures refunded automatically"],
              ["signup bonus", "free", "200 credits", "Enough for 20 web runs or 8 API runs — no card required"],
            ].map(([name, price, per, desc]) => (
              <div key={name} className="panel rounded-2xl p-6">
                <p className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-dim">{name}</p>
                <p className="mt-4 text-3xl font-bold tracking-tight">{price}</p>
                <p className="mt-1 font-mono text-[11px] text-ind">{per}</p>
                <p className="mt-3 text-[12px] leading-relaxed text-mut">{desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { price: "$5", credits: "500", bonus: null },
              { price: "$10", credits: "1,100", bonus: "+10% bonus" },
              { price: "$20", credits: "2,400", bonus: "+20% bonus" },
              { price: "$50", credits: "6,500", bonus: "+30% bonus" },
            ].map((p) => (
              <div key={p.price} className={cx("rounded-2xl border bg-white p-5 shadow-sm", p.bonus === "+20% bonus" ? "border-ind shadow-glow" : "border-line")}>
                <p className="text-2xl font-bold tracking-tight">{p.price}</p>
                <p className="mt-1 font-mono text-[11px] text-mut">{p.credits} credits</p>
                {p.bonus ? (
                  <p className="mt-2 inline-block rounded bg-mint/10 px-2 py-0.5 font-mono text-[9.5px] font-medium text-mint">{p.bonus}</p>
                ) : (
                  <p className="mt-2 font-mono text-[9.5px] text-dim">starter pack</p>
                )}
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/login" className="inline-flex items-center gap-2 rounded-full bg-ind px-6 py-3 text-[12.5px] font-semibold text-white hover:bg-indigo-600 hover:shadow-glow">
              Create account — get 200 free credits <ArrowRight className="h-4 w-4" />
            </Link>
            {salesEmail && (
              <a href={salesHref} className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-6 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-mut hover:text-ink">
                Need volume or a private pilot? <Check className="hidden" /><ArrowRight className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
