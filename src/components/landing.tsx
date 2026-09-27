"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  BrainCircuit,
  CircleDot,
  FileUp,
  FlaskConical,
  Gauge,
  ListChecks,
  Trophy,
  Terminal,
  KeyRound,
} from "lucide-react";
import {
  CONFIGS,
  DOMAIN_META,
  EMBEDDING_LABELS,
  GENERATION_LABELS,
  RETRIEVAL_LABELS,
  configBlurb,
} from "@/lib/engine/configs";
import { PhotoHeader, SectionKicker, cx, gradeStyle } from "@/components/ui-bits";

/* ── motion presets ─────────────────────────────────────────── */
const rise = {
  hidden: { opacity: 0, y: 26 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

/* ── live race board ────────────────────────────────────────── */
const LAP_TARGETS = [
  [0.91, 0.86, 0.78, 0.83, 0.72, 0.79, 0.58, 0.7, 0.75, 0.84, 0.69, 0.81, 0.73, 0.94, 0.8, 0.64],
  [0.88, 0.92, 0.74, 0.81, 0.7, 0.83, 0.61, 0.72, 0.77, 0.85, 0.66, 0.79, 0.71, 0.9, 0.83, 0.67],
  [0.93, 0.84, 0.8, 0.77, 0.75, 0.86, 0.56, 0.68, 0.79, 0.88, 0.72, 0.84, 0.7, 0.95, 0.78, 0.62],
];

function ConfigRace() {
  const [scores, setScores] = useState<number[]>(() =>
    CONFIGS.map((_, i) => 0.4 + i * 0.015),
  );
  const [lap, setLap] = useState(0);
  const tick = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      tick.current += 1;
      if (tick.current % 90 === 0) setLap((l) => (l + 1) % LAP_TARGETS.length);
      setScores((prev) =>
        prev.map((s, i) => {
          const target = LAP_TARGETS[lap % LAP_TARGETS.length][i];
          const next = s + (target - s) * 0.055 + (Math.random() - 0.5) * 0.012;
          return Math.min(0.985, Math.max(0.35, next));
        }),
      );
    }, 130);
    return () => clearInterval(id);
  }, [lap]);

  const order = CONFIGS.map((c, i) => ({ c, score: scores[i] })).sort(
    (a, b) => b.score - a.score,
  );

  return (
    <div className="panel relative overflow-hidden rounded-2xl">
      <div className="bg-grid-fine pointer-events-none absolute inset-0 opacity-60" />
      <div className="relative flex items-center justify-between border-b border-line px-5 py-3.5">
        <div className="flex items-center gap-3">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ind opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-ind" />
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-mut">
            live evaluation · 16 configs · parallel
          </span>
        </div>
        <span className="font-mono text-[10px] tracking-[0.2em] text-dim">
          DHS / TRI-DOMAIN
        </span>
      </div>

      <div className="relative grid grid-cols-1 gap-1.5 p-3.5 lg:grid-cols-2">
        {order.map(({ c, score }, rank) => {
          const grade = score >= 0.85 ? "A" : score >= 0.7 ? "B" : "C";
          const gs = gradeStyle(grade);
          return (
            <motion.div
              key={c.key}
              layout
              transition={{ type: "spring", stiffness: 120, damping: 20 }}
              className={cx(
                "flex items-center gap-2 rounded-lg border px-2 py-1.5",
                rank === 0
                  ? "border-ind/30 bg-ind/[0.06]"
                  : "border-line/70 bg-panel2/40",
              )}
            >
              <span className="w-3 font-mono text-[9px] text-dim">
                {String(rank + 1).padStart(2, "0")}
              </span>
              <span
                className={cx(
                  "grid h-5 w-5 shrink-0 place-items-center rounded border font-mono text-[8px] uppercase",
                  rank === 0
                    ? "border-ind/50 text-ind"
                    : "border-line text-mut",
                )}
              >
                {c.key}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-[11px] font-medium tracking-tight">
                    {c.name}
                    {rank === 0 && (
                      <Trophy className="ml-1 inline h-3 w-3 text-ind" />
                    )}
                  </p>
                  <p className="font-mono text-[10px] text-mut">
                    {score.toFixed(3)}
                    <span className={cx("ml-1 font-medium", gs.text)}>{grade}</span>
                  </p>
                </div>
                <div className="mt-1 h-0.5 overflow-hidden rounded-full bg-line/80">
                  <div
                    className={cx(
                      "h-full rounded-full transition-[width] duration-200",
                      rank === 0
                        ? "bg-gradient-to-r from-ind to-blu"
                        : "bg-mut/50",
                    )}
                    style={{ width: `${score * 100}%` }}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="relative border-t border-line px-5 py-3">
        <p className="font-mono text-[10px] tracking-[0.14em] text-dim">
          verdict emitted at convergence · avg wall-time 4.2s
        </p>
      </div>
    </div>
  );
}

/* ── marquee ────────────────────────────────────────────────── */
const TICKER = [
  "chunk_128", "chunk_1024", "bge-large-en", "text-embedding-3", "faiss_dense",
  "hybrid_bm25", "gpt-4o-mini", "llama-3.3-70b", "overlap_0.125",
  "dhs_0.932", "grade_A", "factual_f1", "numeric_precision", "hit_rate_94%",
  "latency_p50", "domain_healthcare", "tri-dom-bench", "16_configs",
];

function Marquee() {
  const seq = [...TICKER, ...TICKER];
  return (
    <div className="relative overflow-hidden border-y border-line bg-panel/60 py-3">
      <div className="animate-marquee flex w-max items-center gap-8 whitespace-nowrap">
        {seq.map((t, i) => (
          <span key={i} className="flex items-center gap-8 font-mono text-[11px] tracking-[0.16em] text-dim">
            {t}
            <CircleDot className="h-2.5 w-2.5 text-ind/50" />
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── pipeline diagram (svg) ─────────────────────────────────── */
function PipelineDiagram() {
  const nodes = [
    { x: 60, label: "chunk" },
    { x: 180, label: "embed" },
    { x: 300, label: "retrieve" },
    { x: 420, label: "rerank" },
    { x: 540, label: "generate" },
    { x: 660, label: "dhs" },
  ];
  return (
    <svg viewBox="0 0 720 90" className="w-full opacity-90">
      {nodes.slice(0, -1).map((n, i) => (
        <line
          key={i}
          x1={n.x + 26}
          y1={40}
          x2={nodes[i + 1].x - 26}
          y2={40}
          stroke="#6366f1"
          strokeOpacity="0.45"
          strokeWidth="1.4"
          className="dash-flow"
        />
      ))}
      {nodes.map((n, i) => (
        <g key={n.label}>
          <circle cx={n.x} cy={40} r={17} fill="#ffffff" stroke={i === 5 ? "#10b981" : "#c7d2fe"} strokeWidth="1.4" />
          <circle cx={n.x} cy={40} r={17} fill="none" stroke={i === 5 ? "#10b981" : "#4f46e5"} strokeWidth="1" className="node-ping" style={{ animationDelay: `${i * 0.35}s` }} />
          <circle cx={n.x} cy={40} r={4} fill={i === 5 ? "#10b981" : "#4f46e5"} />
          <text x={n.x} y={74} textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="IBM Plex Mono, monospace" letterSpacing="2">
            {n.label.toUpperCase()}
          </text>
        </g>
      ))}
    </svg>
  );
}

/* ── main landing ───────────────────────────────────────────── */
export default function Landing() {
  return (
    <div className="relative min-h-screen">
      {/* ambient background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="bg-grid fade-y absolute inset-0" />
        <div className="absolute left-1/2 top-[-320px] h-[640px] w-[900px] -translate-x-1/2 rounded-full bg-ind/[0.07] blur-[140px]" />
        <div className="absolute right-[-200px] top-[30%] h-[400px] w-[400px] rounded-full bg-blu/[0.08] blur-[120px]" />
        <div className="bg-noise absolute inset-0" />
      </div>

      {/* ── hero ── */}
      <section className="mx-auto max-w-7xl px-5 pb-16 pt-32 md:px-8 md:pt-40">
        <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <motion.p variants={rise} initial="hidden" animate="show" custom={0}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-panel2/70 px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.26em] text-mut">
              <FlaskConical className="h-3.5 w-3.5 text-ind" />
              autonomous rag tuning agent
            </motion.p>

            <motion.h1 variants={rise} initial="hidden" animate="show" custom={1}
              className="text-balance text-[13vw] font-bold leading-[0.95] tracking-[-0.03em] sm:text-6xl md:text-7xl">
              Your RAG stack is a <span className="font-serif italic text-grad-ind">guess.</span>
              <br />
              Make it a <span className="text-grad">measurement.</span>
            </motion.h1>

            <motion.p variants={rise} initial="hidden" animate="show" custom={2}
              className="mt-7 max-w-xl text-pretty text-[15px] leading-relaxed text-mut md:text-base">
              DocTune races <span className="text-ink">16 pre-set RAG pipelines</span> against your own
              documents and gold questions, scores every answer with the domain-weighted{" "}
              <span className="text-ink">DHS metric</span> — factual accuracy × numerical precision —
              and hands you a graded, deployable recommendation. Weeks of manual tuning, compressed into seconds.
            </motion.p>

            <motion.div variants={rise} initial="hidden" animate="show" custom={3}
              className="mt-9 flex flex-wrap items-center gap-4">
              <Link href="/new"
                className="group inline-flex items-center gap-2.5 rounded-full bg-ind px-6 py-3.5 text-[13px] font-semibold tracking-tight text-white transition-all hover:shadow-glow">
                Launch a tuning run
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <Link href="/runs"
                className="group inline-flex items-center gap-2 rounded-full border border-line px-6 py-3.5 font-mono text-[11px] uppercase tracking-[0.18em] text-mut transition-colors hover:border-linelt hover:text-ink">
                Browse past runs
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </motion.div>

            <motion.div variants={rise} initial="hidden" animate="show" custom={4}
              className="mt-12 flex flex-wrap gap-x-10 gap-y-4">
              {[
                ["16", "pipelines raced"],
                ["3", "domain weightings"],
                ["2", "DHS sub-scores"],
                ["1", "clear verdict"],
              ].map(([n, l]) => (
                <div key={l}>
                  <p className="font-mono text-2xl font-medium text-ink">{n}</p>
                  <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-dim">{l}</p>
                </div>
              ))}
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="animate-floaty"
          >
            <ConfigRace />
          </motion.div>
        </div>
      </section>

      <Marquee />

      {/* ── what is DocTune ── */}
      <section id="about" className="mx-auto max-w-7xl px-5 pt-20 md:px-8">
        <motion.div
          variants={rise} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }}
          className="panel flex flex-wrap items-center gap-x-10 gap-y-6 rounded-2xl px-7 py-7 md:px-10"
        >
          <div className="min-w-0 max-w-2xl flex-1">
            <SectionKicker>what is DocTune</SectionKicker>
            <p className="mt-3 text-pretty text-lg leading-relaxed text-ink md:text-xl">
              An AI agent that{" "}
              <span className="font-serif italic text-grad-ind">automatically finds the optimal RAG pipeline</span>{" "}
              for your domain data — upload documents and questions, pick a domain, and get a graded, deployable configuration back.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-panel2/70 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-mut">
              made by <span className="text-ink">Abhinav Mishra</span>
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-blu/40 bg-blu/10 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-blu">
              <Trophy className="h-3 w-3" /> BuildSpirit hackathon
            </span>
            <Link
              href="/about"
              className="group inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.2em] text-ind transition-colors hover:text-ink"
            >
              read the full story
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ── problem ── */}
      <section className="mx-auto max-w-7xl px-5 py-24 md:px-8">
        <motion.div variants={rise} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }}>
          <SectionKicker>The problem</SectionKicker>
          <h2 className="mt-4 max-w-3xl text-4xl font-bold tracking-[-0.02em] md:text-5xl">
            Most teams ship the default pipeline —{" "}
            <span className="font-serif italic font-normal text-mut">and hope.</span>
          </h2>
        </motion.div>

        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {[
            {
              icon: BrainCircuit,
              stat: "4,000+",
              label: "plausible permutations",
              body: "Chunk size × overlap × embedding × retrieval × reranker × generator. The search space is enormous — nobody explores it by hand.",
            },
            {
              icon: Gauge,
              stat: "6–10 wks",
              label: "burned per tuning cycle",
              body: "Manual benchmarking means spreadsheets, hunches, and stale eval sets. By launch, the corpus has already drifted.",
            },
            {
              icon: ListChecks,
              stat: "0.4 F1",
              label: "typical baseline on figure-dense QA",
              body: "Dense-only retrieval routinely drops dosages, caps, and guidance figures — the exact numbers your users ask about.",
            },
          ].map((c, i) => (
            <motion.div key={c.label} variants={rise} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }} custom={i}
              className="panel group relative overflow-hidden rounded-2xl p-7 transition-colors hover:border-linelt">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-ind/[0.05] blur-2xl transition-opacity group-hover:opacity-100" />
              <c.icon className="h-5 w-5 text-ind" />
              <p className="mt-6 font-mono text-4xl font-medium tracking-tight text-ink">{c.stat}</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-ind">{c.label}</p>
              <p className="mt-4 text-[13.5px] leading-relaxed text-mut">{c.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── process ── */}
      <section id="how" className="border-y border-line bg-panel/40 py-24">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <motion.div variants={rise} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }}>
            <SectionKicker>How it works</SectionKicker>
            <h2 className="mt-4 text-4xl font-bold tracking-[-0.02em] md:text-5xl">
              Upload. Race. <span className="font-serif italic font-normal text-grad-ind">Ship the winner.</span>
            </h2>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 1 }}
            className="mt-12 hidden md:block">
            <PipelineDiagram />
          </motion.div>

          <div className="mt-10 grid gap-4 md:grid-cols-4">
            {[
              {
                icon: FileUp, step: "01", title: "Ingest",
                body: "Drop domain documents (txt/md) and gold questions — with reference answers, or run faithfulness mode without them.",
              },
              {
                icon: BrainCircuit, step: "02", title: "Race",
                body: "Sixteen pipelines execute in parallel: chunking 128→1024, BGE ↔ OpenAI embeddings, FAISS dense ↔ hybrid retrieval, GPT-4o-mini ↔ Llama-3.3-70B synthesis.",
              },
              {
                icon: FlaskConical, step: "03", title: "Score",
                body: "Each synthesized answer is graded with DHS — Factual F1 and Numerical Precision, weighted for healthcare, legal, or finance.",
              },
              {
                icon: Trophy, step: "04", title: "Ship",
                body: "A ranked leaderboard, A/B/C deployment grades, per-question forensics, and a copy-paste stack recipe for the winner.",
              },
            ].map((s, i) => (
              <motion.div key={s.step} variants={rise} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }} custom={i}
                className="group relative rounded-2xl border border-line bg-bg/60 p-6 transition-all hover:border-ind/30 hover:bg-panel2">
                <div className="flex items-center justify-between">
                  <s.icon className="h-4.5 w-4.5 text-ind" />
                  <span className="font-mono text-[11px] tracking-[0.2em] text-dim group-hover:text-ind">{s.step}</span>
                </div>
                <h3 className="mt-8 text-lg font-semibold tracking-tight">{s.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-mut">{s.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DHS metric ── */}
      <section id="metric" className="mx-auto max-w-7xl px-5 py-24 md:px-8">
        <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
          <motion.div variants={rise} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }}>
            <SectionKicker>The scoring function</SectionKicker>
            <h2 className="mt-4 text-4xl font-bold tracking-[-0.02em] md:text-5xl">
              DHS — accuracy you can{" "}
              <span className="font-serif italic font-normal text-grad-ind">defend.</span>
            </h2>
            <p className="mt-6 max-w-lg text-[15px] leading-relaxed text-mut">
              Derived from the <span className="text-ink">TriDomRAG-Bench</span> evaluation framework,
              the Domain Health Score blends two sub-metrics under domain-specific weights — because
              a dropped dosage in healthcare is far worse than a paraphrased clause in legal.
            </p>

            <div className="panel mt-8 rounded-2xl p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-dim">formula</p>
              <p className="mt-3 font-mono text-xl tracking-tight text-ink md:text-2xl">
                DHS <span className="text-dim">=</span> <span className="text-ind">α</span>·FactualF1{" "}
                <span className="text-dim">+</span> <span className="text-blu">β</span>·NumericPrecision
              </p>
              <div className="mt-5 space-y-2.5 border-t border-line pt-5 text-[12.5px] text-mut">
                <p><span className="font-mono text-ind">FactualF1</span> — content unigram+bigram F1 of the answer against the gold reference (or retrieved context in faithfulness mode).</p>
                <p><span className="font-mono text-blu">NumericPrecision</span> — recall of required figures × grounding of every emitted number in the source corpus.</p>
              </div>
            </div>
          </motion.div>

          <div className="space-y-4">
            {(Object.keys(DOMAIN_META) as Array<keyof typeof DOMAIN_META>).map((d, i) => {
              const meta = DOMAIN_META[d];
              return (
                <motion.div key={d} variants={rise} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-40px" }} custom={i}
                  className="panel overflow-hidden rounded-2xl">
                  <PhotoHeader domain={d} height="h-28" />
                  <div className="p-6 pt-4">
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-lg font-semibold tracking-tight">{meta.label}</h3>
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-dim">
                      α {meta.factual.toFixed(1)} · β {meta.numeric.toFixed(1)}
                    </p>
                  </div>
                  <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-line/70">
                    <motion.div initial={{ width: 0 }} whileInView={{ width: `${meta.factual * 100}%` }} viewport={{ once: true }}
                      transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                      className="h-full bg-ind" />
                    <motion.div initial={{ width: 0 }} whileInView={{ width: `${meta.numeric * 100}%` }} viewport={{ once: true }}
                      transition={{ duration: 0.9, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
                      className="h-full bg-blu" />
                  </div>
                  <div className="mt-2 flex justify-between font-mono text-[9.5px] uppercase tracking-[0.16em] text-dim">
                    <span>factual {(meta.factual * 100).toFixed(0)}%</span>
                    <span>numeric {(meta.numeric * 100).toFixed(0)}%</span>
                  </div>
                  <p className="mt-3 text-[12.5px] text-mut">{meta.tagline}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── configs ── */}
      <section id="configs" className="border-y border-line bg-panel/40 py-24">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <motion.div variants={rise} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }}
            className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <SectionKicker>The grid</SectionKicker>
              <h2 className="mt-4 text-4xl font-bold tracking-[-0.02em] md:text-5xl">
                16 configurations. <span className="font-serif italic font-normal text-mut">Zero mercy.</span>
              </h2>
            </div>
            <p className="max-w-sm text-[13.5px] leading-relaxed text-mut">
              The TriDomRAG-Bench grid — 128→1024-token chunking, BGE and OpenAI embeddings,
              FAISS and hybrid retrieval, GPT-4o-mini and Llama-3.3-70B generation.
            </p>
          </motion.div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CONFIGS.map((c, i) => (
              <motion.div key={c.key} variants={rise} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-40px" }} custom={i % 4}
                className="group flex flex-col rounded-2xl border border-line bg-bg/60 p-5 transition-all hover:-translate-y-1 hover:border-ind/30 hover:shadow-glow">
                <div className="flex items-center justify-between">
                  <span className="grid h-7 w-7 place-items-center rounded-md border border-line font-mono text-[10px] uppercase text-mut transition-colors group-hover:border-ind/40 group-hover:text-ind">
                    {c.key}
                  </span>
                  <span className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-dim">
                    {c.chunkSize} tok
                  </span>
                </div>
                <h3 className="mt-4 font-semibold tracking-tight">{c.name}</h3>
                <p className="mt-1.5 flex-1 text-[12px] leading-relaxed text-mut">{configBlurb(c)}</p>
                <div className="mt-4 space-y-1 border-t border-line pt-3 font-mono text-[10px] tracking-wide text-dim">
                  <p>chunk {c.chunkSize}·ov {c.chunkOverlap}</p>
                  <p>{EMBEDDING_LABELS[c.embedding]}</p>
                  <p>{RETRIEVAL_LABELS[c.retrieval]}</p>
                  <p>{GENERATION_LABELS[c.generator]}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── API product ── */}
      <section className="mx-auto max-w-7xl px-5 pt-24 md:px-8">
        <motion.div
          variants={rise} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }}
          className="overflow-hidden rounded-3xl border border-slate-700 bg-slate-950 text-white shadow-xl"
        >
          <div className="grid items-center gap-10 p-8 md:p-12 lg:grid-cols-[1fr_0.9fr]">
            <div>
              <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.26em] text-indigo-300">
                <KeyRound className="h-3.5 w-3.5" /> developer API · v1
              </p>
              <h2 className="mt-4 text-3xl font-bold tracking-[-0.02em] md:text-4xl">
                Put the 16-pipeline race inside your own product.
              </h2>
              <p className="mt-4 max-w-xl text-[13.5px] leading-relaxed text-slate-400">
                One authenticated request returns the ranked leaderboard, DHS sub-scores, deployment grade, recommendation, and an account report. Prepaid wallet pricing: 25 credits ($0.25) per API call, 10 credits per browser run — 200 credits free when you sign up.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/login" className="inline-flex items-center gap-2 rounded-full bg-ind px-5 py-3 text-[12.5px] font-semibold text-white hover:bg-indigo-500">
                  Get an API key <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/developers" className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-5 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-300 hover:border-slate-500 hover:text-white">
                  API reference <Terminal className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-black/25">
              <div className="border-b border-slate-800 px-4 py-3 font-mono text-[9px] uppercase tracking-[0.2em] text-slate-500">POST /api/v1/evaluate</div>
              <pre className="scroll-thin overflow-x-auto p-5 font-mono text-[10.5px] leading-relaxed text-slate-300"><code>{`curl -X POST https://doctune.app/api/v1/evaluate \\
  -H "Authorization: Bearer dt_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "domain": "finance",
    "documents": [...],
    "questions": [...]
  }'`}</code></pre>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── grades + cta ── */}
      <section className="mx-auto max-w-7xl px-5 py-24 md:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { g: "A", t: "Production-ready", b: "DHS ≥ 0.85. The pipeline preserves facts and figures at deployable fidelity. Ship it." },
            { g: "B", t: "Viable", b: "DHS 0.70–0.84. Deploy behind guardrails, spot-check numeric answers, schedule a re-tune." },
            { g: "C", t: "At risk", b: "DHS < 0.70. The configuration misrepresents your corpus. Do not deploy — rerun with different data splits." },
          ].map((x, i) => {
            const gs = gradeStyle(x.g);
            return (
              <motion.div key={x.g} variants={rise} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-40px" }} custom={i}
                className={cx("relative overflow-hidden rounded-2xl border bg-panel/60 p-7", gs.border)}>
                <span className={cx("absolute -right-4 -top-10 font-mono text-[180px] font-bold leading-none opacity-[0.07]", gs.text)}>
                  {x.g}
                </span>
                <span className={cx("font-mono text-3xl font-medium", gs.text)}>{x.g}</span>
                <h3 className="mt-2 text-lg font-semibold tracking-tight">{x.t}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-mut">{x.b}</p>
              </motion.div>
            );
          })}
        </div>

        <motion.div variants={rise} initial="hidden" whileInView="show" viewport={{ once: true }}
          className="panel relative mt-20 overflow-hidden rounded-3xl px-8 py-16 text-center md:py-20">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-1/2 h-72 w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-ind/[0.08] blur-[100px]" />
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ind">ready when you are</p>
          <h2 className="mx-auto mt-4 max-w-2xl text-4xl font-bold tracking-[-0.02em] md:text-5xl">
            Find your optimal pipeline{" "}
            <span className="font-serif italic font-normal text-grad-ind">before your users find the bugs.</span>
          </h2>
          <Link href="/new"
            className="group mt-9 inline-flex items-center gap-2.5 rounded-full bg-ind px-8 py-4 text-[13px] font-semibold text-white transition-all hover:shadow-glow">
            Start a tuning run — free, in-browser
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
          <p className="mt-5 font-mono text-[10px] tracking-[0.18em] text-dim">
            SAMPLE CORPORA INCLUDED · HEALTHCARE / LEGAL / FINANCE
          </p>
        </motion.div>
      </section>

      {/* ── footer ── */}
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-8 md:px-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-dim">
            DocTune · RAG autotuning agent
          </p>
          <p className="font-mono text-[10px] tracking-[0.16em] text-dim">
            Made by <Link href="/about" className="text-mut transition-colors hover:text-ind">Abhinav Mishra</Link>
            {" "}· Built for the <span className="text-mut">BuildSpirit</span> hackathon
          </p>
          <p className="font-mono text-[10px] tracking-[0.16em] text-dim">
            DHS from TriDomRAG-Bench research
          </p>
        </div>
      </footer>
    </div>
  );
}
