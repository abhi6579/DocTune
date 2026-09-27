# DocTune — 7-Day Company Benchmark Playbook

The goal is not to claim a company has a bad RAG system. You cannot know their private stack. The credible offer is:

> “We benchmarked 16 RAG configurations on a small, public corpus in your domain. Here is the reproducible result. Would your AI/data team tell us where this differs from your real evaluation workflow?”

That framing creates value, avoids overclaiming, and makes feedback easy.

## Before you start — evidence rules

- Use only **public, permitted documents**: annual reports, public policies, published clinical guidance, SEC/regulatory filings, public contracts, product documentation.
- Record every source URL, publication date, and access date.
- Do not upload personal data, leaked material, paywalled documents, confidential files, or copyrighted material whose terms prohibit this use.
- Never write “Company X's RAG is bad.” Write “On this public-corpus benchmark, configuration X outperformed configuration Y.”
- Disclose that DocTune's current engine uses deterministic local proxies for the named stack families and modeled latency; scores are comparative evaluation signals, not the company's production performance.
- Publish only runs intentionally created with `"visibility": "public"`. API runs default to private.

## Pick one target, not ten

Choose a company with:

1. A document-heavy public surface (reports, help center, policy library, filings).
2. An active AI/data/engineering team on LinkedIn.
3. A domain where number fidelity matters (finance, legal/compliance, healthcare).
4. A visible RAG/search/chat product or a plausible internal knowledge use case.
5. A reachable person: AI Engineer, Applied Scientist, Data Platform Lead, Search Lead, or CTO at a smaller firm.

Start with a company small enough to respond but credible enough to create a useful case study.

## 7-day schedule

### Day 1 — Target + hypothesis

- Select one company and one narrow workflow.
- Write a falsifiable hypothesis, e.g. “Hybrid retrieval will improve figure-heavy questions over FAISS-only retrieval on quarterly reports.”
- Create a source ledger: URL, title, date, license/terms note.

**Deliverable:** one-page benchmark brief, no data collection yet.

### Day 2 — Build the public corpus

- Collect 3–8 recent, relevant public documents.
- Convert to plain text and remove navigation, duplicate footers, cookie text, and unrelated appendices.
- Keep the corpus below DocTune's 250k-character budget for the first study.
- Save immutable source copies and hashes so the run can be reproduced.

**Deliverable:** cleaned corpus + source ledger.

### Day 3 — Create the gold set

Write 15–25 questions before looking at pipeline results:

- 40% direct facts.
- 30% exact figures, ranges, dates, caps, thresholds.
- 20% cross-section/multi-hop comparisons.
- 10% intentionally unanswerable questions to test abstention/calibration.

For every answer, cite the exact source passage. Have another person spot-check at least five questions if possible.

**Deliverable:** question/reference file in `question ||| reference` format.

### Day 4 — Run + challenge the result

- Run the benchmark at least twice to verify determinism.
- Inspect per-question forensics, not only the winner.
- Flag questions where the gold answer is ambiguous.
- Run an ablation: remove one document or question category and see if the winner changes.
- Export the JSON report.

**Deliverable:** final public run + raw JSON + limitations list.

### Day 5 — Create a useful artifact

Create one carousel/thread/blog post:

1. The use case and public sources.
2. The 16 configurations tested.
3. The DHS metric and domain weights.
4. Winner + runner-up + meaningful score delta.
5. Where the winner still failed.
6. What you would test with access to production data.
7. Link to the public DocTune report and methodology.

A credible case study includes failures. Do not hide grade B/C results.

### Day 6 — Publish + tag carefully

Post from your profile. Tag the company once and at most two relevant people. Lead with the finding, not the product pitch.

**Suggested post:**

> We ran a small, reproducible RAG configuration benchmark over [Company]'s public [document set].
>
> 16 pipelines varied chunk size (128–1024), embedding family, FAISS vs hybrid retrieval, and generation family. On [N] gold questions, [winner] scored DHS [score], [delta] above [runner-up]. The largest gap appeared on [numeric/factual] questions.
>
> The interesting failure: [one honest failure]. With production feedback, the next test would be [specific improvement].
>
> Public sources, method, and report: [link]
>
> Built with DocTune. This is an independent public-corpus study, not an evaluation of [Company]'s private system.

### Day 7 — Direct outreach + learn

Send a short message to a relevant practitioner:

> Hi [Name] — I built an independent RAG config benchmark on a small set of [Company]'s public [docs]. I am not evaluating your private stack; the goal is to test whether our evaluation report matches what a real team needs. [One-sentence finding]. Would you be open to giving 3 pieces of feedback on the report? I can also rerun it on a public question set you prefer. [link]

Ask only three questions:

1. Which metric or diagnostic is missing for a deployment decision?
2. Is the config grid realistic for your stack?
3. What would make this worth paying for: API volume, custom evaluation design, private deployment, or expert analysis?

## What to sell first

Do not start by selling API tokens alone. Sell a result:

- **Paid evaluation pilot — $499:** corpus/question design, one domain benchmark, expert interpretation, executive recommendation.
- **Team API — custom:** higher monthly quota, private benchmarks, priority support.
- **Later:** self-serve monthly plans once 3–5 teams repeat usage without your help.

The app's `/developers` page reflects this positioning: a free API starter tier, a paid pilot, and a custom team tier. Set `NEXT_PUBLIC_SALES_EMAIL` in Vercel so pilot CTAs reach you.

## Weekly learning scorecard

Track:

- Qualified views (people in AI/data/search roles).
- Report opens and API signups.
- Replies / conversations, not likes.
- Which failure mode people mention first.
- Requests for private data handling or new metrics.
- Willingness to share a real question set.
- Paid-pilot conversion.

The week's success condition is **one serious 20-minute feedback call**, not viral reach.
