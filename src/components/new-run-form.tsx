"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  CircleAlert,
  CircleCheck,
  Coins,
  FileText,
  FileUp,
  Loader2,
  Rocket,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { CONFIGS, DOMAIN_META, type Domain } from "@/lib/engine/configs";
import { SAMPLES } from "@/lib/samples";
import { DomainGlyph, PhotoHeader, cx } from "@/components/ui-bits";

type Doc = { name: string; content: string };

const MAX_TOTAL = 250_000;
const STAGES = [
  "ingesting corpus",
  `chunking × ${CONFIGS.length} strategies`,
  "racing retrieval stacks",
  "synthesizing answers",
  "scoring DHS × domain weights",
  "ranking · grading · verdict",
];

function parseQuestions(text: string) {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"))
    .map((l) => {
      const [q, ref] = l.split("|||").map((s) => s.trim());
      return { q, ref };
    })
    .filter((x) => x.q.length >= 6);
}

export default function NewRunForm({
  wallet,
}: {
  wallet: { balance: number; cost: number } | null;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [domain, setDomain] = useState<Domain>("healthcare");
  const [docs, setDocs] = useState<Doc[]>([]);
  const [qText, setQText] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsTopUp, setNeedsTopUp] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [stage, setStage] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const qFileInput = useRef<HTMLInputElement>(null);

  const totalChars = useMemo(() => docs.reduce((a, d) => a + d.content.length, 0), [docs]);
  const questions = useMemo(() => parseQuestions(qText), [qText]);
  const withRefs = questions.filter((q) => q.ref).length;
  const ready = docs.length > 0 && questions.length > 0 && totalChars >= 200 && totalChars <= MAX_TOTAL;

  const addFiles = useCallback(async (files: FileList | File[]) => {
    setError(null);
    const next: Doc[] = [];
    for (const f of Array.from(files).slice(0, 6)) {
      try {
        const content = await f.text();
        if (content.trim().length < 50) continue;
        next.push({ name: f.name, content: content.slice(0, 120_000) });
      } catch {
        /* skip unreadable */
      }
    }
    if (next.length > 0) setDocs((prev) => [...prev, ...next].slice(0, 6));
  }, []);

  const loadSample = useCallback((d: Domain) => {
    const s = SAMPLES[d];
    setDocs([{ name: s.docName, content: s.docContent }]);
    setQText(s.questions);
    setError(null);
  }, []);

  async function launch() {
    setError(null);
    setNeedsTopUp(false);
    if (!ready) {
      setError("Add at least one document (200+ chars total) and one question.");
      return;
    }
    setLaunching(true);
    setStage(0);
    const stageTimer = setInterval(
      () => setStage((s) => Math.min(s + 1, STAGES.length - 1)),
      720,
    );

    const started = Date.now();
    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          domain,
          documents: docs,
          questions: questions.map((q) => ({ q: q.q, ref: q.ref || undefined })),
        }),
      });
      const data = await res.json();
      // let the telemetry sequence breathe
      const elapsed = Date.now() - started;
      if (elapsed < 4300) await new Promise((r) => setTimeout(r, 4300 - elapsed));
      clearInterval(stageTimer);
      if (!res.ok) {
        setError(data.error ?? "Evaluation failed.");
        setLaunching(false);
        return;
      }
      setStage(STAGES.length - 1);
      router.push(`/runs/${data.id}`);
    } catch {
      clearInterval(stageTimer);
      setError("Network error while starting the run.");
      setLaunching(false);
    }
  }

  return (
    <>
      {/* header */}
      <div className="mb-10 max-w-2xl">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-ind">new tuning run</p>
        <h1 className="mt-3 text-4xl font-bold tracking-[-0.02em] md:text-5xl">
          Point the agent at <span className="font-serif italic font-normal text-grad-ind">your corpus.</span>
        </h1>
        <p className="mt-4 text-[14.5px] leading-relaxed text-mut">
          Upload domain documents and gold questions (add a reference answer after{" "}
          <span className="font-mono text-[12.5px] text-ind">|||</span>, or run faithfulness mode without one).
          DocTune races {CONFIGS.length} pipelines and returns a graded winner.
        </p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
        {/* left column */}
        <div className="space-y-6">
          {/* 01 domain */}
          <section className="panel rounded-2xl p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="flex items-center gap-3 text-sm font-semibold tracking-tight">
                <span className="font-mono text-[11px] tracking-[0.2em] text-ind">01</span> Domain weighting
              </h2>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-dim">α factual · β numeric</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {(Object.keys(DOMAIN_META) as Domain[]).map((d) => {
                const m = DOMAIN_META[d];
                const active = domain === d;
                return (
                  <button
                    key={d}
                    onClick={() => setDomain(d)}
                    className={cx(
                      "group overflow-hidden rounded-xl border text-left transition-all",
                      active
                        ? "border-ind/50 bg-ind/[0.07] shadow-glow"
                        : "border-line bg-panel2/40 hover:border-linelt",
                    )}
                  >
                    <div className={cx("relative transition-opacity", !active && "opacity-80 group-hover:opacity-100")}>
                      <PhotoHeader domain={d} height="h-16" />
                      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-3 pb-2">
                        <span className={cx(
                          "grid h-6 w-6 place-items-center rounded-md border backdrop-blur-sm",
                          active ? "border-ind/60 bg-white/90 text-ind" : "border-line bg-white/85 text-mut",
                        )}>
                          <DomainGlyph domain={d} className="h-3.5 w-3.5" />
                        </span>
                        {active && <CircleCheck className="h-4 w-4 rounded-full bg-white/90 text-ind" />}
                      </div>
                    </div>
                    <div className="p-4">
                      <p className="text-[14px] font-semibold tracking-tight">{m.label}</p>
                      <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-line/70">
                        <div className="h-full bg-ind" style={{ width: `${m.factual * 100}%` }} />
                        <div className="h-full bg-blu" style={{ width: `${m.numeric * 100}%` }} />
                      </div>
                      <p className="mt-2 font-mono text-[9.5px] tracking-[0.14em] text-dim">
                        α{m.factual.toFixed(1)} · β{m.numeric.toFixed(1)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="mt-4 text-[12.5px] text-mut">{DOMAIN_META[domain].tagline}</p>
          </section>

          {/* 02 documents */}
          <section className="panel rounded-2xl p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-3 text-sm font-semibold tracking-tight">
                <span className="font-mono text-[11px] tracking-[0.2em] text-ind">02</span> Corpus documents
              </h2>
              <button
                onClick={() => loadSample(domain)}
                className="inline-flex items-center gap-1.5 rounded-full border border-blu/40 bg-blu/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-blu transition-colors hover:bg-blu/20"
              >
                <Sparkles className="h-3 w-3" />
                load {domain} sample
              </button>
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
              onClick={() => fileInput.current?.click()}
              className={cx(
                "cursor-pointer rounded-xl border border-dashed p-8 text-center transition-all",
                dragOver ? "border-ind/70 bg-ind/[0.06]" : "border-line bg-panel2/30 hover:border-linelt",
              )}
            >
              <UploadCloud className={cx("mx-auto h-6 w-6", dragOver ? "text-ind" : "text-dim")} />
              <p className="mt-3 text-[13px] text-mut">
                Drop <span className="text-ink">.txt / .md / .csv</span> files here, or click to browse
              </p>
              <p className="mt-1 font-mono text-[10px] tracking-[0.14em] text-dim">up to 6 files · 120k chars each</p>
              <input
                ref={fileInput}
                type="file"
                accept=".txt,.md,.csv,.text"
                multiple
                className="hidden"
                onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }}
              />
            </div>

            <AnimatePresence>
              {docs.map((d, i) => (
                <motion.div
                  key={`${d.name}-${i}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  className="mt-3 flex items-center gap-3 rounded-lg border border-line bg-panel2/50 px-4 py-3"
                >
                  <FileText className="h-4 w-4 shrink-0 text-ind" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium">{d.name}</p>
                    <p className="font-mono text-[10px] text-dim">{d.content.length.toLocaleString()} chars</p>
                  </div>
                  <button
                    onClick={() => setDocs((prev) => prev.filter((_, j) => j !== i))}
                    className="rounded-md p-1.5 text-dim transition-colors hover:bg-rose/10 hover:text-rose"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>

            <div className="mt-4">
              <div className="flex justify-between font-mono text-[10px] tracking-[0.14em] text-dim">
                <span>corpus budget</span>
                <span className={cx(totalChars > MAX_TOTAL && "text-rose")}>
                  {(totalChars / 1000).toFixed(1)}k / {MAX_TOTAL / 1000}k
                </span>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-line/70">
                <div
                  className={cx("h-full transition-all", totalChars > MAX_TOTAL ? "bg-rose" : "bg-gradient-to-r from-ind to-blu")}
                  style={{ width: `${Math.min(100, (totalChars / MAX_TOTAL) * 100)}%` }}
                />
              </div>
            </div>
          </section>

          {/* 03 questions */}
          <section className="panel rounded-2xl p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-3 text-sm font-semibold tracking-tight">
                <span className="font-mono text-[11px] tracking-[0.2em] text-ind">03</span> Gold questions
              </h2>
              <button
                onClick={() => qFileInput.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-mut transition-colors hover:border-linelt hover:text-ink"
              >
                <FileUp className="h-3 w-3" />
                import .txt
              </button>
              <input
                ref={qFileInput}
                type="file"
                accept=".txt,.md,.csv"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    const text = await f.text();
                    setQText((prev) => (prev.trim() ? `${prev.trim()}\n${text}` : text));
                  }
                  e.target.value = "";
                }}
              />
            </div>
            <textarea
              value={qText}
              onChange={(e) => setQText(e.target.value)}
              spellCheck={false}
              placeholder={
                "One question per line. Append ||| and a reference answer for reference mode:\n\nWhat is the starting dose of lisinopril? ||| 10 mg once daily, up to 40 mg/day.\nWhat is the liability cap? ||| Fees paid in the preceding 12 months."
              }
              className="h-44 w-full resize-y rounded-xl border border-line bg-panel2/40 p-4 font-mono text-[12.5px] leading-relaxed text-ink placeholder:text-dim/70 focus:border-ind/50 focus:outline-none"
            />
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-[10px] tracking-[0.14em] text-dim">
              <span>{questions.length} question{questions.length === 1 ? "" : "s"} parsed</span>
              <span>{withRefs} with references</span>
              <span className="text-ind">
                mode: {withRefs > 0 ? "reference scoring" : questions.length > 0 ? "faithfulness scoring" : "—"}
              </span>
            </div>
          </section>
        </div>

        {/* right column — mission summary */}
        <aside className="space-y-6 lg:sticky lg:top-24">
          <section className="panel rounded-2xl p-6">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.24em] text-dim">run config</h2>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`${domain}-tuning-run (auto)`}
              className="mt-3 w-full rounded-lg border border-line bg-panel2/40 px-3.5 py-2.5 text-[13px] placeholder:text-dim/70 focus:border-ind/50 focus:outline-none"
            />
            <dl className="mt-5 space-y-3 border-t border-line pt-5 font-mono text-[11.5px]">
              {[
                ["domain", domain],
                ["documents", String(docs.length)],
                ["corpus size", `${(totalChars / 1000).toFixed(1)}k chars`],
                ["questions", String(questions.length)],
                ["pipelines", `${CONFIGS.length} configs`],
                ["scoring", withRefs > 0 ? "reference DHS" : "faithfulness DHS"],
                ["evaluations", `${questions.length * CONFIGS.length} answers`],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between">
                  <dt className="uppercase tracking-[0.16em] text-dim">{k}</dt>
                  <dd className="text-ink">{v}</dd>
                </div>
              ))}
            </dl>

            <button
              onClick={launch}
              disabled={!ready || launching}
              className={cx(
                "group mt-6 flex w-full items-center justify-center gap-2.5 rounded-full py-3.5 text-[13px] font-semibold tracking-tight transition-all",
                ready && !launching
                  ? "bg-ind text-white hover:shadow-glow"
                  : "cursor-not-allowed bg-line/60 text-dim",
              )}
            >
              {launching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Rocket className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              )}
              {launching ? "Agent running…" : "Launch evaluation"}
            </button>
            {!ready && (
              <p className="mt-3 text-center font-mono text-[10px] tracking-[0.14em] text-dim">
                add a document + at least one question
              </p>
            )}

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-4 flex items-start gap-2 rounded-lg border border-rose/30 bg-rose/10 px-3.5 py-2.5 text-[12px] text-rose"
                >
                  <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
          </section>

          <section className="panel hidden rounded-2xl p-6 lg:block">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.24em] text-dim">the grid</h2>
            <ul className="mt-4 space-y-2">
              {CONFIGS.map((c) => (
                <li key={c.key} className="flex items-center justify-between text-[12px]">
                  <span className="flex items-center gap-2.5">
                    <span className="grid h-5 w-5 place-items-center rounded border border-line font-mono text-[9px] uppercase text-mut">{c.key}</span>
                    {c.name}
                  </span>
                  <span className="font-mono text-[10px] text-dim">{c.chunkSize}tok</span>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      {/* launch overlay */}
      <AnimatePresence>
        {launching && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] grid place-items-center bg-bg/90 backdrop-blur-md"
          >
            <div className="w-[min(480px,90vw)]">
              <div className="mb-8 flex items-center justify-between">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ind">agent active</p>
                <button onClick={() => setLaunching(false)} className="text-dim hover:text-ink">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-3.5">
                {STAGES.map((s, i) => {
                  const done = i < stage;
                  const current = i === stage;
                  return (
                    <motion.div
                      key={s}
                      initial={{ opacity: 0.25 }}
                      animate={{ opacity: done || current ? 1 : 0.25 }}
                      className="flex items-center gap-3.5"
                    >
                      <span className={cx(
                        "grid h-6 w-6 place-items-center rounded-full border font-mono text-[9px]",
                        done ? "border-mint/50 text-mint" : current ? "border-ind/60 text-ind" : "border-line text-dim",
                      )}>
                        {done ? <CircleCheck className="h-3.5 w-3.5" /> : current ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : String(i + 1).padStart(2, "0")}
                      </span>
                      <p className={cx("font-mono text-[12px] tracking-[0.08em]", done || current ? "text-ink" : "text-dim")}>
                        {s}
                        {current && <span className="ticker-blink text-ind"> _</span>}
                      </p>
                    </motion.div>
                  );
                })}
              </div>
              <div className="mt-8 h-1 overflow-hidden rounded-full bg-line/70">
                <motion.div
                  className="h-full bg-gradient-to-r from-ind to-blu"
                  animate={{ width: `${((stage + 1) / STAGES.length) * 100}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
