# DocTune

**An AI agent that automatically finds the optimal RAG pipeline configuration for your domain data.**

Upload your domain documents and gold questions, pick a domain (Healthcare, Legal, or Finance), and DocTune races **16 pre-set RAG configurations** in parallel, scores every answer with the domain-weighted **DHS metric** (from TriDomRAG-Bench research), and returns a graded, deployable recommendation.

> Made by **Abhinav Mishra** · Built for the **BuildSpirit** hackathon

---

## Table of contents

- [The problem](#the-problem)
- [The solution](#the-solution)
- [Key features](#key-features)
- [The 16 configurations](#the-16-configurations)
- [The DHS metric](#the-dhs-metric)
- [Grading rubric](#grading-rubric)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Getting started](#getting-started)
- [Usage](#usage)
- [API reference](#api-reference)
- [Project structure](#project-structure)
- [Development scripts](#development-scripts)
- [Who it's for](#who-its-for)
- [Company benchmark playbook](GO_TO_MARKET.md)
- [Notes & limitations](#notes--limitations)

---

## The problem

Teams building RAG (Retrieval-Augmented Generation) systems waste **weeks or months** manually testing configurations — chunk sizes, embedding models, retrieval strategies, and generation models. The search space spans thousands of plausible permutations, yet most teams deploy **the default pipeline without proper benchmarking**, leading to poor answer quality and expensive production failures.

## The solution

DocTune automates the entire benchmarking loop:

1. **Ingest** — upload domain documents (`.txt` / `.md` / `.csv`) and gold questions (with or without reference answers).
2. **Race** — 16 pre-set pipelines execute in parallel over your corpus.
3. **Score** — every synthesized answer is graded with the domain-weighted DHS metric (factual accuracy × numerical precision).
4. **Ship** — you receive a ranked leaderboard, an A/B/C deployment grade, per-question forensics, and a copy-paste stack recipe for the winner.

## Key features

| Feature | What it does |
| --- | --- |
| **16 configurations** | Tests chunk sizes, embedding models, retrieval methods, and generation models from the TriDomRAG-Bench grid |
| **DHS metric** | Measures both factual accuracy and numerical precision of every answer |
| **Domain-aware** | Healthcare, Legal, and Finance each carry different accuracy weights |
| **Actionable reports** | Returns an A/B/C grade, ranked leaderboard, and a clear recommendation |
| **Question forensics** | Per-question audit of what every pipeline retrieved and synthesized |
| **Full-stack** | Next.js experience, TypeScript evaluation engine, PostgreSQL persistence |

## The 16 configurations

Every run evaluates the complete TriDomRAG-Bench grid:

| # | Name | Chunk / Overlap | Embedding | Retrieval | Generation |
| --- | --- | --- | --- | --- | --- |
| 01 | Nano Dense | 128 / 16 | BGE | FAISS | GPT-4o-mini |
| 02 | Nano Hybrid | 128 / 16 | BGE | Hybrid | GPT-4o-mini |
| 03 | Small Dense | 256 / 32 | BGE | FAISS | GPT-4o-mini |
| 04 | Small Hybrid | 256 / 32 | BGE | Hybrid | GPT-4o-mini |
| 05 | Medium Dense | 512 / 64 | BGE | FAISS | GPT-4o-mini |
| 06 | Medium Hybrid | 512 / 64 | BGE | Hybrid | GPT-4o-mini |
| 07 | Large Dense | 1024 / 128 | BGE | FAISS | GPT-4o-mini |
| 08 | Large Hybrid | 1024 / 128 | BGE | Hybrid | GPT-4o-mini |
| 09 | OpenAI Dense | 512 / 64 | OpenAI | FAISS | GPT-4o-mini |
| 10 | OpenAI Hybrid | 512 / 64 | OpenAI | Hybrid | GPT-4o-mini |
| 11 | Llama Dense | 512 / 64 | BGE | FAISS | Llama-3.3-70B |
| 12 | Llama Hybrid | 512 / 64 | BGE | Hybrid | Llama-3.3-70B |
| 13 | OpenAI Llama | 512 / 64 | OpenAI | FAISS | Llama-3.3-70B |
| 14 | OpenAI Hybrid Llama | 512 / 64 | OpenAI | Hybrid | Llama-3.3-70B |
| 15 | Small OpenAI | 256 / 32 | OpenAI | Hybrid | Llama-3.3-70B |
| 16 | Large OpenAI | 1024 / 128 | OpenAI | Hybrid | Llama-3.3-70B |

The latency model reflects real stack costs: OpenAI embeddings carry API round-trip overhead, and Llama-3.3-70B generation is roughly 3× slower per answer than GPT-4o-mini — so speed-vs-quality tradeoffs surface directly in the leaderboard.

## The DHS metric

The **Domain Health Score** (derived from the TriDomRAG-Bench evaluation framework) blends two sub-metrics under domain-specific weights:

```
DHS = α · FactualF1  +  β · NumericPrecision
```

- **FactualF1** — content unigram+bigram accuracy of the answer against the gold reference (or the retrieved context in faithfulness mode). Blends strict F1 with gold containment and phrase overlap, so extractive answers that cover every gold fact score high even with extra context.
- **NumericPrecision** — recall of required figures × grounding of every emitted number in the source corpus. Hallucinated figures are penalized.

Domain weights (a dropped dosage is worse than a paraphrased clause):

| Domain | α (factual) | β (numeric) | Rationale |
| --- | --- | --- | --- |
| Healthcare | 0.5 | 0.5 | Dosages, lab values and clinical thresholds are life-critical |
| Legal | 0.7 | 0.3 | Clause fidelity dominates; dates and caps are secondary |
| Finance | 0.4 | 0.6 | Figures, margins and guidance drive every decision |

**Scoring modes**

- **Reference mode** — when questions include a gold answer, DHS compares against it directly.
- **Faithfulness mode** — without references, answers are scored for grounding against the retrieved context.

## Grading rubric

| Grade | Threshold | Verdict |
| --- | --- | --- |
| **A** | DHS ≥ 0.85 | Production-ready — deploy with confidence |
| **B** | DHS 0.70–0.84 | Viable — deploy with guardrails and spot checks |
| **C** | DHS < 0.70 | At risk — do not deploy, re-tune before release |

## Tech stack

| Layer | Technology |
| --- | --- |
| Experience | Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · Framer Motion |
| Evaluation engine | TypeScript — sentence-aware chunking, TF-IDF & char-n-gram embeddings, BM25, hybrid fusion, number-aware rerank |
| Persistence | PostgreSQL · Drizzle ORM |
| Metric | DHS — Domain Health Score (TriDomRAG-Bench research) |
| The grid | 16 pre-set RAG pipelines raced in parallel |

## Architecture

```
Browser (upload, domain, questions)
   │
   ▼
POST /api/runs ─────────────────────────────┐
   │                                        │
   ▼                                        │
Evaluation engine (src/lib/engine)          │
   ├─ nlp.ts       tokenizer, stemmer, sentence splitter,
   │               sliding chunker, TF-IDF, BM25, cosine
   ├─ configs.ts   the 16-pipeline grid + domain weights
   ├─ dhs.ts       FactualF1 + NumericPrecision → DHS
   └─ evaluate.ts  per config: chunk → embed → retrieve →
                   synthesize → score, then rank + grade
   │                                        │
   ▼                                        ▼
PostgreSQL (Drizzle)                    JSON response
   ├─ runs              run metadata, winner, verdict
   ├─ config_results    16 rows per run (scores, grades, ranks)
   └─ question_results  per-question per-config answers + sub-scores
```

The run report renders the winner hero (grade + agent verdict), animated leaderboard, top-3 radar, specification matrix, and expandable question forensics — with one-click JSON export.

## Getting started

**Prerequisites:** Node.js 20+, a PostgreSQL database.

```bash
# 1. install dependencies
npm install

# 2. create .env from the template and set DATABASE_URL
cp .env.example .env
# Default local URL: postgresql://postgres:postgres@127.0.0.1:5432/app_db
# PostgreSQL must be running and the app_db database must exist.

# 3. apply the schema (creates the app tables)
npx drizzle-kit push

# 4. run the dev server
npm run dev
```

Open http://localhost:3000.

**Production:**

```bash
npm run build
npm start
```

## Usage

1. Go to **/new**.
2. Pick a **domain** (its DHS weights are shown live).
3. Upload **documents** — or click **"load sample"** for a built-in Healthcare / Legal / Finance corpus.
4. Add **gold questions**, one per line. Append `|||` and a reference answer for reference-mode scoring:

   ```
   What is the liability cap? ||| Fees paid or payable in the preceding 12 months.
   What INR range is targeted? ||| 2.0 to 3.0, checked every 3 to 4 days during initiation.
   ```

5. **Launch evaluation** — the agent races all 16 pipelines and redirects to the report.

**Limits (enforced server-side):** up to 6 documents, 120k characters each, 250k total, up to 25 questions.

## API reference

Interactive documentation and pricing live at **`/developers`**. Create an account at **`/login`**, then issue/revoke keys at **`/account`**.

### Product endpoint

```http
POST /api/v1/evaluate
Authorization: Bearer dt_live_your_key
Content-Type: application/json
```

```json
{
  "name": "cardiology-pilot",
  "domain": "healthcare",
  "visibility": "private",
  "documents": [{ "name": "protocol.txt", "content": "..." }],
  "questions": [
    { "q": "What is the starting dose?", "ref": "10 mg once daily" }
  ]
}
```

The response contains the winner, DHS/grade, all 16 ranked configurations, quota headers, and an account report URL. Successful requests consume one evaluation; validation and server errors do not. API runs are **private by default**. Pass `"visibility": "public"` only for reports you intentionally want in the public registry.

| Status | Meaning |
| --- | --- |
| `200` | Evaluation completed |
| `400` | Invalid/over-limit payload |
| `401` | Missing, invalid, or revoked key |
| `429` | Monthly quota exhausted |
| `500` | Evaluation failed (not charged) |

Every authenticated response includes `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset`.

### Other routes

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Liveness check |
| `GET` | `/api/runs` | List public runs (owner IDs/private runs excluded) |
| `POST` | `/api/runs` | Public web-demo evaluator |
| `GET` | `/api/runs/:id` | Public report, or private report for its signed-in owner |
| `DELETE` | `/api/runs/:id` | Owner-only deletion |
| `POST` | `/api/auth/signup` / `login` / `logout` | Account session lifecycle |
| `GET/POST` | `/api/account/keys` | List/create authenticated API keys |
| `DELETE` | `/api/account/keys/:id` | Revoke an owned key |

## Project structure

```
src/
├─ app/
│  ├─ page.tsx               landing (race board, DHS explainer, config grid)
│  ├─ new/page.tsx           run creation flow
│  ├─ runs/page.tsx          run registry
│  ├─ runs/[id]/page.tsx     run report (SSR)
│  ├─ about/page.tsx         project story & credits
│  └─ api/
│     ├─ health/route.ts
│     └─ runs/[...]/route.ts REST endpoints
├─ components/               landing, run form, run report, nav, ui bits
├─ db/
│  ├─ index.ts               Drizzle client (pg pool)
│  └─ schema.ts              runs · config_results · question_results
└─ lib/
   ├─ engine/                nlp · configs · dhs · evaluate
   └─ samples.ts             built-in sample corpora per domain
scripts/
├─ smoke.ts                  engine sanity check over all samples
└─ seed.ts                   seeds demo runs through the live API
```

## Development scripts

Start PostgreSQL, configure `.env`, and push the schema before running the app or
database-backed checks. `smoke` evaluates the engine without a database; the
other checks call the running app and generally require the database schema.

```bash
# sanity-check the engine across all three sample domains
npm run smoke

# check rendered pages, links, and API health against the running dev server
npm run check

# exercise account/API, wallet billing, and edge-case contracts against the running server
npm run test:api
npm run test:billing
npm run test:extreme

# seed the registry with demo runs (defaults to http://127.0.0.1:3000)
BASE=http://localhost:3000 npx tsx scripts/seed.ts

# type checks and production build
npx next typegen
npm run typecheck
npm run lint
npm run build
```

The `test:*` scripts are integration checks, not isolated unit tests. Run them
only against a local/test database because they create temporary accounts and
evaluation runs.

## Deploying to Vercel

> Full step-by-step guide with troubleshooting: **[DEPLOYMENT.md](DEPLOYMENT.md)**

The app is a standard Next.js project — no custom server, so it deploys as-is. The only external dependency is PostgreSQL (serverless Postgres such as Neon / Vercel Postgres / Supabase).

1. **Create a hosted Postgres database** (e.g. Vercel → Storage → Neon, or Supabase) and copy the pooled connection string — it typically ends with `?sslmode=require`. The app enables SSL automatically when the URL contains `sslmode=require`.
2. **Push the schema to the hosted database** from your machine:

   ```bash
   DATABASE_URL="postgresql://…?sslmode=require" npx drizzle-kit push
   ```

3. **Import the repo in Vercel** (New Project → Import Git Repository). Framework preset: **Next.js** — build command and output are auto-detected.
4. **Add the environment variable** in Project → Settings → Environment Variables:

   | Key | Value |
   | --- | --- |
   | `DATABASE_URL` | your hosted Postgres connection string |
   | `NEXT_PUBLIC_SALES_EMAIL` | your sales/pilot email (optional) |

   Do **not** commit your local `.env`; Vercel injects this at build and runtime.
5. **Deploy.** Then seed the demo runs against production:

   ```bash
   BASE="https://your-app.vercel.app" npx tsx scripts/seed.ts
   ```

> Note: the DB client uses a per-instance `pg` pool, which is fine for hackathon-scale traffic. For high-traffic serverless workloads, swap `src/db/index.ts` to Neon's serverless HTTP driver — the Drizzle schema and queries stay unchanged.

## Who it's for

| User | Benefit |
| --- | --- |
| **AI Engineers** | Save weeks of manual tuning — get a defensible pipeline recipe in seconds |
| **Data Scientists** | Benchmark RAG performance on your own gold questions with a consistent metric |
| **Enterprises** | Reduce cost and time-to-market for AI projects by shipping the measured best setup first |

## Notes & limitations

- The evaluation stack is deliberately **self-contained and deterministic** — retrieval and synthesis run in-process (TF-IDF/char-n-gram embeddings, BM25, heuristic rerank, extractive synthesis) so the full grid executes in seconds with zero external API keys.
- **Latency is modeled per pipeline stage** (encode → retrieve → generate) using stack-realistic constants — useful for relative speed-vs-quality comparison, not as absolute SLA numbers.
- Reference answers are optional; without them the metric switches to faithfulness mode and measures grounding against retrieved context.
- The DHS composite and domain weights follow the TriDomRAG-Bench evaluation framework.

---

**DocTune** — stop guessing your RAG stack. Measure it.

Made by **Abhinav Mishra**.
