import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

/**
 * Hosted Postgres providers (Neon, Supabase, Vercel Postgres) require SSL
 * and ship a `sslmode=require` connection string. Local development over
 * localhost must NOT use SSL, so the flag is derived from the URL itself.
 */
const useSsl =
  databaseUrl.includes("sslmode=require") || process.env.DB_SSL === "1";

const globalForDb = globalThis as typeof globalThis & {
  __doctunePgPool?: Pool;
};

export const pool =
  globalForDb.__doctunePgPool ??
  new Pool({
    connectionString: databaseUrl,
    ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__doctunePgPool = pool;
}

export const db = drizzle(pool);
