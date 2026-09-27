"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  CircleAlert,
  Crosshair,
  Download,
  FileText,
  Flame,
  Gauge,
  RotateCcw,
  Trophy,
  Zap,
} from "lucide-react";
import type { ConfigResult, QuestionResult, Run } from "@/db/schema";
import {
  EMBEDDING_LABELS,
  GENERATION_LABELS,
  GRADE_META,
  RETRIEVAL_LABELS,
  type EmbeddingModel,
  type GeneratorModel,
  type RetrievalStyle,
} from "@/lib/engine/configs";
import {
  DomainTag,
  GradeBadge,
  SectionKicker,
  cx,
  fmtMs,
  gradeStyle,
  pct,
} from "@/components/ui-bits";

type Props = {
  run: Run;
  configs: ConfigResult[];
  questions: QuestionResult[];
};

const RANK_COLORS = ["#4f46e5", "#3b82f6", "#f59e0b"];

const GRADE_BLOB: Record<string, string> = {
  A: "rgba(16, 185, 129, 0.16)",
  B: "rgba(245, 158, 11, 0.15)",
  C: "rgba(239, 68, 68, 0.13)",
};

/* ── speed-normalized radar for top-3 ───────────────────────── */
function Radar({ configs }: { configs: ConfigResult[] }) {
  const top3 = configs.slice(0, 3);
  const lats = top3.map((c) => c.avgLatencyMs);
  const maxLat = Math.max(...lats);
  const minLat = Math.min(...lats);
  const span = Math.max(1, maxLat - minLat);

  const entries = top3.map((c, i) => ({
    key: c.configKey,
    name: c.name,
    color: RANK_COLORS[i],
    values: [
      c.dhs,
      c.factual,
      c.numeric,
      c.hitRate,
      0.35 + 0.65 * (1 - (c.avgLatencyMs - minLat) / span),
    ],
  }));

  const AXES = ["DHS", "FACT", "NUM", "HIT", "SPEED"];
  const N = AXES.length;
  const R = 86;
  const CX = 130;
  const CY = 112;
  const ang = (i: number) => (Math.PI * 2 * i) / N - Math.PI / 2;
  const pt = (i: number, v: number) => [
    CX + Math.cos(ang(i)) * R * v,
    CY + Math.sin(ang(i)) * R * v,
  ];
  const poly = (vals: number[]) =>
    vals.map((v, i) => pt(i, v).map((n) => n.toFixed(1)).join(",")).join(" ");

  return (
    <div>
      <svg viewBox="0 0 260 224" className="w-full">
        {[0.25, 0.5, 0.75, 1].map((r) => (
          <polygon
            key={r}
            points={Array.from({ length: N }, (_, i) =>
              pt(i, r).map((n) => n.toFixed(1)).join(","),
            ).join(" ")}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="1"
          />
        ))}
        {AXES.map((a, i) => {
          const [x, y] = pt(i, 1);
          const [lx, ly] = pt(i, 1.18);
          return (
            <g key={a}>
              <line x1={CX} y1={CY} x2={x} y2={y} stroke="#e2e8f0" strokeWidth="1" />
              <text
                x={lx}
                y={ly + 3}
                textAnchor="middle"
                fill="#94a3b8"
                fontSize="8.5"
                fontFamily="IBM Plex Mono, monospace"
                letterSpacing="2"
              >
                {a}
              </text>
            </g>
          );
        })}
        {entries.map((e) => (
          <motion.polygon
            key={e.key}
            points={poly(e.values)}
            fill={e.color}
            fillOpacity="0.10"
            stroke={e.color}
            strokeWidth="1.6"
            initial={{ opacity: 0, scale: 0.6 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{ transformOrigin: `${CX}px ${CY}px` }}
          />
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap justify-center gap-x-5 gap-y-1.5">
        {entries.map((e) => (
          <span key={e.key} className="flex items-center gap-2 font-mono text-[10px] tracking-[0.1em] text-mut">
            <span className="h-2 w-2 rounded-full" style={{ background: e.color }} />
            {e.key.toUpperCase()} · {e.name}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── question forensics accordion ───────────────────────────── */
function QuestionForensics({
  questions,
  configs,
}: {
  questions: QuestionResult[];
  configs: ConfigResult[];
}) {
  const [open, setOpen] = useState<number | null>(0);
  const byKey = useMemo(
    () => new Map(configs.map((c) => [c.configKey, c])),
    [configs],
  );

  return (
    <div className="space-y-3">
      {questions.map((q) => {
        const expanded = open === q.idx;
        const sortedPer = [...q.perConfig].sort(
          (a, b) =>
            (byKey.get(a.configKey)?.rank ?? 99) - (byKey.get(b.configKey)?.rank ?? 99),
        );
        return (
          <div key={q.id} className="panel overflow-hidden rounded-xl">
            <button
              onClick={() => setOpen(expanded ? null : q.idx)}
              className="flex w-full items-center gap-4 px-5 py-4 text-left"
            >
              <span className="font-mono text-[10px] text-dim">
                Q{String(q.idx + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium tracking-tight">
                {q.question}
              </span>
              {q.isNumericHeavy === 1 && (
                <span className="hidden rounded-full border border-blu/35 bg-blu/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-blu sm:inline">
                  figures
                </span>
              )}
              <span className="hidden font-mono text-[10.5px] text-mut md:inline">
                best: <span className="text-ind">{byKey.get(q.bestConfig)?.name ?? q.bestConfig}</span>
              </span>
              <span className="font-mono text-[11.5px] text-ink">{q.bestDhs.toFixed(3)}</span>
              <ChevronDown
                className={cx("h-4 w-4 shrink-0 text-dim transition-transform duration-300", expanded && "rotate-180")}
              />
            </button>

            <motion.div
              initial={false}
              animate={{ height: expanded ? "auto" : 0, opacity: expanded ? 1 : 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="border-t border-line px-5 py-5">
                {q.reference && (
                  <div className="mb-4 rounded-lg border border-mint/25 bg-mint/[0.05] px-4 py-3">
                    <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-mint">reference answer</p>
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink/90">{q.reference}</p>
                  </div>
                )}
                <div className="grid gap-2.5 md:grid-cols-2">
                  {sortedPer.map((p) => {
                    const cfg = byKey.get(p.configKey);
                    if (!cfg) return null;
                    const isBest = p.configKey === q.bestConfig;
                    const gs = gradeStyle(cfg.grade);
                    return (
                      <div
                        key={p.configKey}
                        className={cx(
                          "rounded-lg border p-3.5",
                          isBest ? "border-ind/40 bg-ind/[0.05]" : "border-line bg-panel2/30",
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="flex items-center gap-2 text-[12px] font-semibold tracking-tight">
                            <span className={cx(
                              "grid h-4.5 w-4.5 place-items-center rounded border font-mono text-[8.5px] uppercase",
                              isBest ? "border-ind/50 text-ind" : "border-line text-mut",
                            )}>
                              {p.configKey}
                            </span>
                            {cfg.name}
                            {isBest && <Trophy className="h-3 w-3 text-ind" />}
                          </p>
                          <p className="font-mono text-[10.5px] text-mut">
                            dhs <span className={cx("font-medium", gs.text)}>{p.dhs.toFixed(3)}</span>
                          </p>
                        </div>
                        <p className="mt-2.5 text-[11.5px] leading-relaxed text-mut">{p.answer}</p>
                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[9.5px] tracking-[0.08em] text-dim">
                          <span>fact <span className="text-ind">{p.factual.toFixed(2)}</span></span>
                          <span>num <span className="text-blu">{p.numeric.toFixed(2)}</span></span>
                          <span>{fmtMs(p.latencyMs)}</span>
                          <span>{p.retrieved} chunks</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}

/* ── main report ────────────────────────────────────────────── */
export default function RunReport({ run, configs, questions }: Props) {
  const winner = configs[0];
  const gs = gradeStyle(run.bestGrade);
  const meta = run.bestGrade ? GRADE_META[run.bestGrade as keyof typeof GRADE_META] : null;
  const gradeCounts = useMemo(() => {
    const acc = { A: 0, B: 0, C: 0 } as Record<string, number>;
    configs.forEach((c) => { acc[c.grade] = (acc[c.grade] ?? 0) + 1; });
    return acc;
  }, [configs]);

  function exportJson() {
    const blob = new Blob(
      [JSON.stringify({ exportedBy: "DocTune", run, configs, questions }, null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `doctune-${run.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (run.status !== "completed") {
    const failed = run.status === "failed";
    return (
      <div className="panel mx-auto max-w-xl rounded-2xl p-10 text-center">
        <CircleAlert className={cx("mx-auto h-7 w-7", failed ? "text-rose" : "text-amber")} />
        <h1 className="mt-5 text-2xl font-bold tracking-tight">
          {failed ? "Run failed" : "Run still processing"}
        </h1>
        <p className="mt-3 text-[13.5px] text-mut">
          {failed
            ? run.error ?? "Unknown engine error."
            : "The agent has not finished this evaluation yet. Refresh in a moment."}
        </p>
        <Link href="/new" className="mt-7 inline-flex items-center gap-2 rounded-full bg-ind px-5 py-2.5 text-[13px] font-semibold text-white">
          Start a new run <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-16">
      {/* ── header ── */}
      <div>
        <Link href="/runs" className="inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.2em] text-dim transition-colors hover:text-ink">
          <ArrowLeft className="h-3.5 w-3.5" /> all runs
        </Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="truncate text-3xl font-bold tracking-[-0.02em] md:text-4xl">{run.name}</h1>
              <DomainTag domain={run.domain} />
              <span className="rounded-full border border-line bg-panel2 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-mut">
                {run.scoringMode} mode
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[10.5px] tracking-[0.12em] text-dim">
              <span>{new Date(run.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
              <span>{run.questionCount} questions × {configs.length} configs = {run.questionCount * configs.length} answers</span>
              <span>{(run.docChars / 1000).toFixed(1)}k corpus chars</span>
              <span>engine time {(run.durationMs ?? 0)}ms</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {run.docNames.map((d) => (
                <span key={d} className="inline-flex items-center gap-1.5 rounded-md border border-line bg-panel2/60 px-2.5 py-1 font-mono text-[10px] text-mut">
                  <FileText className="h-3 w-3 text-ind" />{d}
                </span>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={exportJson}
              className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-mut transition-colors hover:border-linelt hover:text-ink"
            >
              <Download className="h-3.5 w-3.5" /> export
            </button>
            <Link
              href="/new"
              className="inline-flex items-center gap-2 rounded-full border border-ind/40 bg-ind/10 px-4 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-ind transition-colors hover:bg-ind/20"
            >
              <RotateCcw className="h-3.5 w-3.5" /> new run
            </Link>
          </div>
        </div>
      </div>

      {/* ── winner hero ── */}
      {winner && (
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className={cx("panel relative overflow-hidden rounded-3xl", gs.glow)}
        >
          <div className="pointer-events-none absolute inset-0">
            <div
              className="absolute -right-24 -top-24 h-80 w-80 rounded-full blur-[90px]"
              style={{ background: GRADE_BLOB[run.bestGrade ?? "C"] }}
            />
            <div className="bg-grid-fine absolute inset-0 opacity-40" />
          </div>
          <div className="relative grid gap-10 p-8 md:grid-cols-[220px_1fr] md:p-12">
            <div className="flex flex-col items-center justify-center border-b border-line pb-8 md:border-b-0 md:border-r md:pb-0 md:pr-10">
              <motion.span
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 120, damping: 12, delay: 0.15 }}
                className={cx("font-mono text-[120px] font-bold leading-none", gs.text)}
              >
                {run.bestGrade}
              </motion.span>
              <p className={cx("mt-2 font-mono text-[10px] uppercase tracking-[0.24em]", gs.text)}>
                {meta?.label}
              </p>
              <p className="mt-2 text-center text-[11.5px] leading-relaxed text-dim">{meta?.verdict}</p>
            </div>

            <div>
              <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.28em] text-ind">
                <Trophy className="h-3.5 w-3.5" /> recommended configuration
              </p>
              <div className="mt-3 flex flex-wrap items-baseline gap-x-5 gap-y-2">
                <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{winner.name}</h2>
                <span className="font-mono text-[12px] uppercase tracking-[0.2em] text-dim">
                  {winner.configKey} · rank #{winner.rank}
                </span>
                <span className="font-mono text-2xl font-medium text-ind md:text-3xl">
                  {winner.dhs.toFixed(3)}
                  <span className="ml-2 text-[10px] uppercase tracking-[0.2em] text-dim">dhs</span>
                </span>
              </div>

              <p className="mt-5 max-w-3xl text-[14px] leading-relaxed text-mut">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-dim">agent verdict — </span>
                {run.narrative}
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {[
                  `chunk ${winner.chunkSize} · ov ${winner.chunkOverlap}`,
                  EMBEDDING_LABELS[winner.embedding as EmbeddingModel],
                  RETRIEVAL_LABELS[winner.retrieval as RetrievalStyle],
                  GENERATION_LABELS[winner.generation as GeneratorModel],
                ].map((t) => (
                  <span key={t} className="rounded-md border border-line bg-bg/60 px-3 py-1.5 font-mono text-[10.5px] tracking-[0.06em] text-ink/90">
                    {t}
                  </span>
                ))}
              </div>

              <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { icon: Crosshair, label: "factual f1", value: winner.factual.toFixed(3), tone: "text-ind" },
                  { icon: Gauge, label: "numeric precision", value: winner.numeric.toFixed(3), tone: "text-blu" },
                  { icon: Flame, label: "retrieval hit rate", value: pct(winner.hitRate, 0), tone: "text-mint" },
                  { icon: Zap, label: "modeled p50 latency", value: fmtMs(winner.avgLatencyMs), tone: "text-amber" },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border border-line bg-bg/50 p-3.5">
                    <s.icon className={cx("h-4 w-4", s.tone)} />
                    <p className="mt-2.5 font-mono text-lg font-medium text-ink">{s.value}</p>
                    <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-dim">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.section>
      )}

      {/* ── leaderboard ── */}
      <section>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <SectionKicker>leaderboard</SectionKicker>
            <h2 className="mt-3 text-3xl font-bold tracking-[-0.02em]">
              8 pipelines, <span className="font-serif italic font-normal text-grad-ind">ranked by DHS.</span>
            </h2>
          </div>
          <div className="flex gap-4 font-mono text-[10.5px] tracking-[0.12em] text-dim">
            <span><span className="text-mint">{gradeCounts.A}</span> graded A</span>
            <span><span className="text-amber">{gradeCounts.B}</span> graded B</span>
            <span><span className="text-rose">{gradeCounts.C}</span> graded C</span>
          </div>
        </div>

        <div className="space-y-2.5">
          {configs.map((c, i) => {
            const g = gradeStyle(c.grade);
            return (
              <motion.div
                key={c.configKey}
                initial={{ opacity: 0, x: -18 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.55, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                className={cx(
                  "panel flex items-center gap-4 rounded-xl px-4 py-3.5 md:gap-6 md:px-6",
                  i === 0 && "border-ind/30 shadow-glow",
                )}
              >
                <span className="w-6 font-mono text-[11px] text-dim">#{c.rank}</span>
                <span className={cx(
                  "grid h-7 w-7 shrink-0 place-items-center rounded-md border font-mono text-[10px] uppercase",
                  i === 0 ? "border-ind/50 text-ind" : "border-line text-mut",
                )}>
                  {c.configKey}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                    <p className="truncate text-[13.5px] font-semibold tracking-tight">
                      {c.name}
                      {i === 0 && <Trophy className="ml-1.5 inline h-3.5 w-3.5 text-ind" />}
                    </p>
                    <p className="font-mono text-[12px] text-ink">
                      {c.dhs.toFixed(3)}
                      <span className="ml-2 text-[10px] text-dim">
                        Δ {(c.dhs - winner.dhs).toFixed(3)}
                      </span>
                    </p>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line/70">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${c.dhs * 100}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, delay: 0.2 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                        className={cx(
                          "h-full rounded-full",
                          i === 0 ? "bg-gradient-to-r from-ind to-blu" : c.grade === "A" ? "bg-mint/70" : c.grade === "B" ? "bg-amber/60" : "bg-rose/50",
                        )}
                      />
                    </div>
                    <span className="hidden w-14 font-mono text-[10px] text-dim sm:block">{fmtMs(c.avgLatencyMs)}</span>
                  </div>
                  <div className="mt-2 flex gap-1.5">
                    <div className="h-0.5 rounded-full bg-ind/70" style={{ width: `${c.factual * 90}px` }} title={`factual ${c.factual}`} />
                    <div className="h-0.5 rounded-full bg-blu/70" style={{ width: `${c.numeric * 90}px` }} title={`numeric ${c.numeric}`} />
                    <span className="ml-2 font-mono text-[9px] tracking-[0.1em] text-dim">
                      F {c.factual.toFixed(2)} · N {c.numeric.toFixed(2)} · HIT {pct(c.hitRate, 0)}
                    </span>
                  </div>
                </div>
                <GradeBadge grade={c.grade} className={cx("h-7 w-7 text-[12px]", g.glow)} />
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── radar + spec matrix ── */}
      <section className="grid items-start gap-6 lg:grid-cols-[380px_1fr]">
        <div className="panel rounded-2xl p-6">
          <h3 className="font-mono text-[10px] uppercase tracking-[0.24em] text-dim">top-3 shape</h3>
          <Radar configs={configs} />
        </div>

        <div className="panel overflow-hidden rounded-2xl">
          <div className="border-b border-line px-5 py-4">
            <h3 className="font-mono text-[10px] uppercase tracking-[0.24em] text-dim">specification matrix</h3>
          </div>
          <div className="scroll-thin overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="border-b border-line font-mono text-[9px] uppercase tracking-[0.18em] text-dim">
                  <th className="px-5 py-3 font-medium">config</th>
                  <th className="px-3 py-3 font-medium">chunking</th>
                  <th className="px-3 py-3 font-medium">embedding</th>
                  <th className="px-3 py-3 font-medium">retrieval</th>
                  <th className="px-3 py-3 font-medium">generation</th>
                  <th className="px-3 py-3 font-medium text-right">numeric-heavy</th>
                  <th className="px-5 py-3 font-medium text-right">fact-heavy</th>
                </tr>
              </thead>
              <tbody>
                {configs.map((c, i) => (
                  <tr key={c.configKey} className={cx("border-b border-line/60 text-[12px]", i === 0 && "bg-ind/[0.04]")}>
                    <td className="px-5 py-3">
                      <span className="font-semibold">{c.name}</span>
                      <span className="ml-2 font-mono text-[9.5px] uppercase text-dim">{c.configKey}</span>
                    </td>
                    <td className="px-3 py-3 font-mono text-[11px] text-mut">{c.chunkSize}·{c.chunkOverlap}</td>
                    <td className="px-3 py-3 font-mono text-[11px] text-mut">{EMBEDDING_LABELS[c.embedding as EmbeddingModel]}</td>
                    <td className="px-3 py-3 font-mono text-[11px] text-mut">{RETRIEVAL_LABELS[c.retrieval as RetrievalStyle]}</td>
                    <td className="px-3 py-3 font-mono text-[11px] text-mut">{GENERATION_LABELS[c.generation as GeneratorModel]}</td>
                    <td className="px-3 py-3 text-right font-mono text-[11px] text-blu">{c.numericHeavyDhs.toFixed(3)}</td>
                    <td className="px-5 py-3 text-right font-mono text-[11px] text-ind">{c.factualHeavyDhs.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── question forensics ── */}
      <section>
        <div className="mb-8">
          <SectionKicker>question forensics</SectionKicker>
          <h2 className="mt-3 text-3xl font-bold tracking-[-0.02em]">
            Every answer, <span className="font-serif italic font-normal text-grad-ind">audited.</span>
          </h2>
          <p className="mt-3 max-w-lg text-[13.5px] text-mut">
            Expand a question to inspect what each pipeline retrieved and synthesized,
            with per-answer factual and numeric sub-scores.
          </p>
        </div>
        <QuestionForensics questions={questions} configs={configs} />
      </section>

      <p className="border-t border-line pt-6 font-mono text-[10px] leading-relaxed tracking-[0.1em] text-dim">
        * Latency is modeled per pipeline stage (encode → retrieve → rerank → generate) for relative comparison.
        DHS composite derived from the TriDomRAG-Bench framework with {run.domain} weights applied.
      </p>
    </div>
  );
}
