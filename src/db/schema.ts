import {
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export type QuestionConfigResult = {
  configKey: string;
  answer: string;
  dhs: number;
  factual: number;
  numeric: number;
  latencyMs: number;
  retrieved: number;
  topChunk: string;
};

/* ── identity + API product ─────────────────────────────────── */

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  plan: text("plan").notNull().default("payg"),
  balanceCredits: integer("balance_credits").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/** Append-only wallet ledger: topups, bonuses, per-call charges, refunds. */
export const walletTransactions = pgTable("wallet_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // signup_bonus | topup | charge | refund
  amountCredits: integer("amount_credits").notNull(), // + grant, − charge
  amountUsdCents: integer("amount_usd_cents"),
  description: text("description").notNull(),
  runId: uuid("run_id").references(() => runs.id, { onDelete: "set null" }),
  stripeEventId: text("stripe_event_id").unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/** Anonymous browser-demo allowance: N free runs per IP per UTC day. */
export const webUsage = pgTable(
  "web_usage",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    day: text("day").notNull(), // YYYY-MM-DD (UTC)
    ipHash: text("ip_hash").notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [uniqueIndex("web_usage_day_ip_hash").on(t.day, t.ipHash)],
);

export const sessions = pgTable("sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const apiKeys = pgTable("api_keys", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  keyPrefix: text("key_prefix").notNull(),
  keyHash: text("key_hash").notNull().unique(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/* ── evaluation results ─────────────────────────────────────── */

export const runs = pgTable("runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
  source: text("source").notNull().default("web"), // web | api
  visibility: text("visibility").notNull().default("public"), // public | private
  name: text("name").notNull(),
  domain: text("domain").notNull(), // healthcare | legal | finance
  status: text("status").notNull().default("running"), // running | completed | failed
  scoringMode: text("scoring_mode").notNull().default("reference"), // reference | faithfulness
  docNames: jsonb("doc_names").$type<string[]>().notNull(),
  docChars: integer("doc_chars").notNull(),
  questionCount: integer("question_count").notNull(),
  winnerConfig: text("winner_config"),
  winnerName: text("winner_name"),
  bestDhs: real("best_dhs"),
  bestGrade: text("best_grade"),
  narrative: text("narrative"),
  error: text("error"),
  durationMs: integer("duration_ms"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const configResults = pgTable("config_results", {
  id: uuid("id").defaultRandom().primaryKey(),
  runId: uuid("run_id")
    .notNull()
    .references(() => runs.id, { onDelete: "cascade" }),
  configKey: text("config_key").notNull(),
  name: text("name").notNull(),
  chunkSize: integer("chunk_size").notNull(),
  chunkOverlap: integer("chunk_overlap").notNull(),
  embedding: text("embedding").notNull(),
  retrieval: text("retrieval").notNull(),
  generation: text("generation").notNull(),
  dhs: real("dhs").notNull(),
  factual: real("factual").notNull(),
  numeric: real("numeric").notNull(),
  numericHeavyDhs: real("numeric_heavy_dhs").notNull(),
  factualHeavyDhs: real("factual_heavy_dhs").notNull(),
  hitRate: real("hit_rate").notNull(),
  avgLatencyMs: real("avg_latency_ms").notNull(),
  grade: text("grade").notNull(),
  rank: integer("rank").notNull(),
});

export const questionResults = pgTable("question_results", {
  id: uuid("id").defaultRandom().primaryKey(),
  runId: uuid("run_id")
    .notNull()
    .references(() => runs.id, { onDelete: "cascade" }),
  idx: integer("idx").notNull(),
  question: text("question").notNull(),
  reference: text("reference"),
  isNumericHeavy: integer("is_numeric_heavy").notNull().default(0),
  perConfig: jsonb("per_config").$type<QuestionConfigResult[]>().notNull(),
  bestConfig: text("best_config").notNull(),
  bestDhs: real("best_dhs").notNull(),
});

export const apiUsage = pgTable("api_usage", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  apiKeyId: uuid("api_key_id").references(() => apiKeys.id, {
    onDelete: "set null",
  }),
  runId: uuid("run_id").references(() => runs.id, { onDelete: "set null" }),
  endpoint: text("endpoint").notNull().default("/api/v1/evaluate"),
  statusCode: integer("status_code").notNull(),
  durationMs: integer("duration_ms"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type User = typeof users.$inferSelect;
export type ApiKey = typeof apiKeys.$inferSelect;
export type Run = typeof runs.$inferSelect;
export type ConfigResult = typeof configResults.$inferSelect;
export type QuestionResult = typeof questionResults.$inferSelect;
