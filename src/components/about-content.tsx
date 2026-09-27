"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Code2,
  Database,
  FileSearch,
  FlaskConical,
  Gauge,
  Layers,
  Quote,
  Scale,
  Sparkles,
  Trophy,
  UserRound,
} from "lucide-react";
import { SectionKicker, cx } from "@/components/ui-bits";
import { DOMAIN_IMAGES } from "@/lib/domain-images";
import { DOMAIN_META, type Domain } from "@/lib/engine/configs";

const rise = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      delay: i * 0.08,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
};

const FEATURES = [
  {
    icon: Layers,
    title: "16 Configurations",
    body: "Tests chunk sizes, embedding models, retrieval methods, and generation models — sixteen pre-set RAG pipelines racing in parallel.",
  },
  {
    icon: FlaskConical,
    title: "DHS Metric",
    body: "The Domain Health Score (from TriDomRAG-Bench research) measures both factual accuracy and numerical precision of every answer.",
  },
  {
    icon: Scale,
    title: "Domain-Aware",
    body: "Healthcare, Legal, and Finance each carry different weights — a dropped dosage matters more than a paraphrased clause.",
  },
  {
    icon: Gauge,
    title: "Actionable Reports",
    body: "Returns an A/B/C deployment grade, a ranked leaderboard, per-question forensics, and a clear configuration recommendation.",
  },
  {
    icon: Code2,
    title: "Full-Stack",
    body: "Next.js web experience, a TypeScript evaluation engine, and PostgreSQL persistence — one deployable artifact.",
  },
];

const AUDIENCE = [
  {
    icon: UserRound,
    who: "AI Engineers",
    benefit: "Save weeks of manual tuning — get a defensible pipeline recipe in seconds.",
  },
  {
    icon: FlaskConical,
    who: "Data Scientists",
    benefit: "Benchmark RAG performance on your own gold questions with a consistent metric.",
  },
  {
    icon: Building2,
    who: "Enterprises",
    benefit: "Reduce cost and time-to-market for AI projects by shipping the measured best setup first.",
  },
];

const STACK = [
  ["Experience", "Next.js 16 · React 19 · Tailwind CSS · Framer Motion"],
  ["Evaluation engine", "TypeScript — chunking, TF-IDF & char-n-gram embeddings, BM25, hybrid rerank"],
  ["Persistence", "PostgreSQL · Drizzle ORM — runs, leaderboards, question forensics"],
  ["Metric", "DHS — Domain Health Score (TriDomRAG-Bench research)"],
  ["The grid", "16 pre-set RAG pipelines raced in parallel"],
];

export default function AboutContent() {
  return (
    <div className="space-y-20">
      {/* hero */}
      <div className="max-w-3xl">
        <motion.p variants={rise} initial="hidden" animate="show" custom={0}>
          <SectionKicker>about the project</SectionKicker>
        </motion.p>
        <motion.h1
          variants={rise} initial="hidden" animate="show" custom={1}
          className="mt-4 text-balance text-4xl font-bold leading-[1.02] tracking-[-0.02em] md:text-6xl"
        >
          DocTune is an AI agent that finds the{" "}
          <span className="font-serif italic font-normal text-grad-ind">
            optimal RAG pipeline
          </span>{" "}
          for your domain data.
        </motion.h1>
        <motion.blockquote
          variants={rise} initial="hidden" animate="show" custom={2}
          className="panel mt-8 flex items-start gap-4 rounded-2xl p-6"
        >
          <Quote className="mt-1 h-5 w-5 shrink-0 text-ind" />
          <p className="text-[15px] leading-relaxed text-mut">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ind">one-liner — </span>
            DocTune automatically benchmarks your retrieval-augmented generation stack:
            you upload documents and questions, and it returns the configuration that
            actually preserves your facts and figures.
          </p>
        </motion.blockquote>

        {/* real-world domains, real photography */}
        <motion.div variants={rise} initial="hidden" animate="show" custom={3} className="mt-8">
          <div className="grid gap-4 sm:grid-cols-3">
            {(Object.keys(DOMAIN_IMAGES) as Domain[]).map((d) => {
              const img = DOMAIN_IMAGES[d];
              return (
                <figure key={d} className="panel group overflow-hidden rounded-2xl">
                  <div className="relative h-36 overflow-hidden">
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                      style={{ backgroundImage: `url(${img.url})` }}
                      role="img"
                      aria-label={img.alt}
                    />
                    <div className="absolute inset-0 bg-indigo-950/20 mix-blend-multiply" />
                    <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
                    <figcaption className="absolute bottom-2.5 left-3.5 rounded-md border border-line/60 bg-white/85 px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.2em] text-ink backdrop-blur-sm">
                      {DOMAIN_META[d].label}
                    </figcaption>
                  </div>
                </figure>
              );
            })}
          </div>
          <p className="mt-2.5 font-mono text-[9.5px] tracking-[0.12em] text-dim">
            Photography from Pexels (royalty-free) —{" "}
            {Object.values(DOMAIN_IMAGES).map((i) => i.credit).join(" · ")}
          </p>
        </motion.div>
      </div>

      {/* problem / solution */}
      <div className="grid gap-4 md:grid-cols-2">
        {[
          {
            kicker: "the problem",
            icon: FileSearch,
            title: "RAG tuning is manual, slow, and usually skipped.",
            body: "Teams building RAG systems waste weeks or months hand-testing combinations — chunk sizes, embedding models, retrieval strategies, and generation models. Most deploy without proper benchmarking at all, which leads to poor answer quality and expensive production failures.",
            tone: "border-rose/25",
          },
          {
            kicker: "the solution",
            icon: Sparkles,
            title: "An agent that benchmarks everything, then recommends.",
            body: "Upload your domain documents and gold questions, pick Healthcare, Legal, or Finance, and DocTune races 16 different RAG configurations in parallel. Every synthesized answer is scored with the domain-weighted DHS metric, and the agent ships back the optimal setup — with a grade.",
            tone: "border-mint/25",
          },
        ].map((c, i) => (
          <motion.div
            key={c.kicker}
            variants={rise} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }} custom={i}
            className={cx("panel rounded-2xl border p-7", c.tone)}
          >
            <div className="flex items-center gap-3">
              <c.icon className="h-4.5 w-4.5 text-ind" />
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-dim">{c.kicker}</p>
            </div>
            <h2 className="mt-4 text-xl font-semibold tracking-tight">{c.title}</h2>
            <p className="mt-3 text-[13.5px] leading-relaxed text-mut">{c.body}</p>
          </motion.div>
        ))}
      </div>

      {/* features */}
      <section>
        <motion.div variants={rise} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }}>
          <SectionKicker>key features</SectionKicker>
          <h2 className="mt-4 text-3xl font-bold tracking-[-0.02em] md:text-4xl">
            What DocTune <span className="font-serif italic font-normal text-grad-ind">does.</span>
          </h2>
        </motion.div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              variants={rise} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-40px" }} custom={i % 3}
              className="group rounded-2xl border border-line bg-panel/60 p-6 transition-all hover:-translate-y-1 hover:border-ind/30 hover:shadow-glow"
            >
              <f.icon className="h-5 w-5 text-ind" />
              <h3 className="mt-4 font-semibold tracking-tight">{f.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-mut">{f.body}</p>
            </motion.div>
          ))}
          <motion.div
            variants={rise} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-40px" }} custom={2}
            className="flex flex-col justify-between rounded-2xl border border-ind/30 bg-gradient-to-br from-ind/[0.08] to-blu/[0.08] p-6"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-ind">
              upload → race → score → ship
            </p>
            <p className="mt-4 text-lg font-semibold leading-snug tracking-tight">
              Weeks of tuning, compressed into one run.
            </p>
            <Link
              href="/new"
              className="group mt-6 inline-flex w-fit items-center gap-2 rounded-full bg-ind px-5 py-2.5 text-[12.5px] font-semibold text-white transition-all hover:shadow-glow"
            >
              Try it now
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* audience */}
      <section>
        <motion.div variants={rise} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }}>
          <SectionKicker>who it&rsquo;s for</SectionKicker>
          <h2 className="mt-4 text-3xl font-bold tracking-[-0.02em] md:text-4xl">
            Built for the people <span className="font-serif italic font-normal text-mut">shipping RAG.</span>
          </h2>
        </motion.div>
        <div className="mt-10 space-y-3">
          {AUDIENCE.map((a, i) => (
            <motion.div
              key={a.who}
              variants={rise} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-40px" }} custom={i}
              className="panel flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl px-6 py-4"
            >
              <span className="flex items-center gap-3">
                <a.icon className="h-4 w-4 text-ind" />
                <span className="text-[15px] font-semibold tracking-tight">{a.who}</span>
              </span>
              <span className="h-px flex-1 bg-line" />
              <span className="text-[13px] text-mut">{a.benefit}</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* stack + credits */}
      <section className="grid items-start gap-4 lg:grid-cols-[1fr_360px]">
        <motion.div variants={rise} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }}
          className="panel overflow-hidden rounded-2xl"
        >
          <div className="border-b border-line px-6 py-4">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.24em] text-dim">tech stack</h2>
          </div>
          <ul>
            {STACK.map(([layer, tech], i) => (
              <li
                key={layer}
                className={cx(
                  "flex flex-col gap-1 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6",
                  i !== STACK.length - 1 && "border-b border-line/60",
                )}
              >
                <span className="w-40 shrink-0 font-mono text-[10px] uppercase tracking-[0.2em] text-dim">{layer}</span>
                <span className="font-mono text-[12px] leading-relaxed text-ink/90">{tech}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div variants={rise} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }} custom={1}
          className="space-y-4"
        >
          <div className="panel relative overflow-hidden rounded-2xl p-6">
            <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-ind/[0.08] blur-2xl" />
            <BadgeCheck className="h-5 w-5 text-ind" />
            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.24em] text-dim">made by</p>
            <p className="mt-1.5 text-2xl font-bold tracking-tight">Abhinav Mishra</p>
            <p className="mt-2 text-[12.5px] leading-relaxed text-mut">
              Designed and engineered end-to-end — evaluation engine, metric, and experience.
            </p>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-blu/35 bg-gradient-to-br from-blu/[0.1] to-ind/[0.06] p-6">
            <Trophy className="h-5 w-5 text-blu" />
            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.24em] text-dim">built for</p>
            <p className="mt-1.5 text-2xl font-bold tracking-tight">
              BuildSpirit <span className="font-serif italic font-normal text-grad-ind">hackathon</span>
            </p>
            <p className="mt-2 text-[12.5px] leading-relaxed text-mut">
              An AI agent that automates RAG pipeline tuning — from corpus to deployable config in a single run.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-blu/40 bg-blu/10 px-3 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.2em] text-blu">
              <Database className="h-3 w-3" />
              full-stack submission
            </div>
          </div>
        </motion.div>
      </section>

      {/* cta */}
      <motion.section
        variants={rise} initial="hidden" whileInView="show" viewport={{ once: true }}
        className="panel relative overflow-hidden rounded-3xl px-8 py-14 text-center"
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/2 h-64 w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-ind/[0.08] blur-[90px]" />
        </div>
        <h2 className="relative mx-auto max-w-xl text-3xl font-bold tracking-[-0.02em] md:text-4xl">
          See the agent race your domain data.
        </h2>
        <Link
          href="/new"
          className="group relative mt-8 inline-flex items-center gap-2.5 rounded-full bg-ind px-7 py-3.5 text-[13px] font-semibold text-white transition-all hover:shadow-glow"
        >
          Launch a tuning run
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </motion.section>
    </div>
  );
}
