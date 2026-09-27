# Deploying DocTune to Vercel

This app is a standard Next.js project (no custom server), so deployment is push-button once Postgres is hosted. The only stateful dependency is PostgreSQL — Vercel serverless functions need a **hosted, SSL-enabled Postgres** (Neon, Supabase, or Vercel Postgres). Your local `127.0.0.1` database cannot be reached from Vercel.

---

## Step 0 — Prerequisites

- [ ] Repo pushed to GitHub (or GitLab/Bitbucket)
- [ ] Vercel account
- [ ] The two deploy-readiness changes applied:
  - `src/db/index.ts` enables SSL automatically when `DATABASE_URL` contains `sslmode=require`
  - `drizzle.config.ts` reads `DATABASE_URL` from the environment (replaces the old hardcoded `drizzle.config.json`)

Sanity check everything before deploying:

```bash
npm install
npm run build        # must pass locally first
npx tsx scripts/extreme.ts   # optional: 22-case test suite
```

---

## Step 1 — Create the hosted Postgres

### Option A — Neon via Vercel (recommended)

1. Vercel dashboard → **Storage** → **Create Database** → **Neon (Serverless Postgres)**.
2. Create the database, then copy the **pooled connection string**, which looks like:
   `postgresql://user:pass@ep-xxx-pooler.us-east-1.aws.neon.tech/dbname?sslmode=require`
3. If you link the database to your project in the dashboard, Vercel sets `DATABASE_URL` for you automatically and you can skip Step 4's manual env var.

### Option B — Supabase

1. Create a project at supabase.com → **Project Settings → Database**.
2. Use the **Connection Pooling** string (port 6543) and append `?sslmode=require`:
   `postgresql://postgres.xxxx:pass@aws-0-region.pooler.supabase.com:6543/postgres?sslmode=require`

### Option C — Any Postgres you already host

Just make sure the string carries `sslmode=require` — the app's DB client turns SSL on automatically when it sees that parameter (no SSL is used for `127.0.0.1`, or force with `DB_SSL=1`).

---

## Step 2 — Create the tables in the hosted database

From your local machine or codespace (this creates `runs`, `config_results`, `question_results`):

```bash
DATABASE_URL="postgresql://…your-hosted-string…?sslmode=require" npx drizzle-kit push
```

Expected output: `[✓] Changes applied`.

---

## Step 3 — Import the repo into Vercel

1. **Add New → Project → Import** your GitHub repo (`doctune`).
2. Framework preset auto-detects **Next.js** — leave build (`next build`) and install (`npm install`) defaults. (`vercel.json` pins the same values.)

## Step 4 — Set the environment variable

Project → **Settings → Environment Variables** → add:

| Key | Value | Scope |
| --- | --- | --- |
| `DATABASE_URL` | hosted Postgres connection string | Production + Preview |
| `NEXT_PUBLIC_SALES_EMAIL` | your email for paid-pilot/team CTAs (optional) | Production + Preview |

> Never commit your local `.env`. The repo's `.gitignore` excludes it; Vercel injects the variable at build and runtime.

## Step 5 — Deploy

Click **Deploy**. The build does not touch the database (all data pages are `force-dynamic`), so it succeeds independently of DB availability. First runtime request connects to Postgres.

Verify after deploy:

```bash
curl https://your-app.vercel.app/api/health    # {"ok":true}
```

## Step 6 — Seed the demo runs (optional)

```bash
BASE="https://your-app.vercel.app" npx tsx scripts/seed.ts
```

This creates the three sample-domain evaluations plus the faithfulness-mode demo in the production registry.

---

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `relation "runs" does not exist` at runtime | schema never pushed to the hosted DB | re-run Step 2 against the correct URL |
| `DATABASE_URL is required` in runtime logs | env var not set in Vercel | Step 4, then redeploy |
| `self signed certificate` / SSL errors | hosted DB without `sslmode=require` | append it to the URL (or set `DB_SSL=1`) |
| `ECONNREFUSED` / timeouts | using a local `127.0.0.1` URL | hosted Postgres required — Step 1 |
| Font fetch errors during build | `next/font/google` needs network at build | happens only on locked-down CI; Vercel is fine |
| `too many clients` under load | pg pool per serverless instance | use the provider's **pooled/pooler** URL (Neon `-pooler`, Supabase port 6543); for serious traffic switch `src/db/index.ts` to Neon's serverless HTTP driver — schema and queries unchanged |

## Notes for production hardening (post-hackathon)

- Swap the `pg` Pool for **Neon's serverless HTTP driver** (`@neondatabase/serverless` + `drizzle-orm/neon-http`) for high serverless concurrency.
- Add rate limiting on `POST /api/runs` (public unauthenticated endpoint by design for the demo).
- The latency numbers in reports are modeled per pipeline stage for relative comparison, not measured SLAs.
