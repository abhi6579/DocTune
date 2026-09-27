import { createHash } from "node:crypto";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { users, walletTransactions, webUsage } from "@/db/schema";

/* ── pricing (all money in cents, all usage in credits) ─────── */

export const CREDITS_PER_USD = 100; // 1 credit = $0.01
export const SIGNUP_BONUS_CREDITS = 200; // ≈ 20 web runs / 8 API runs
export const WEB_RUN_COST = 10; // $0.10 — signed-in browser evaluation
export const API_RUN_COST = 25; // $0.25 — authenticated API evaluation

export type TopUpPackage = {
  id: string;
  name: string;
  amountCents: number;
  baseCredits: number;
  bonusCredits: number;
  bonusPct: number;
  popular?: boolean;
};

export const TOPUP_PACKAGES: TopUpPackage[] = [
  { id: "pack5", name: "Starter", amountCents: 500, baseCredits: 500, bonusCredits: 0, bonusPct: 0 },
  { id: "pack10", name: "Popular", amountCents: 1000, baseCredits: 1000, bonusCredits: 100, bonusPct: 10, popular: true },
  { id: "pack20", name: "Pro", amountCents: 2000, baseCredits: 2000, bonusCredits: 400, bonusPct: 20 },
  { id: "pack50", name: "Scale", amountCents: 5000, baseCredits: 5000, bonusCredits: 1500, bonusPct: 30 },
];

export function packageById(id: string): TopUpPackage | undefined {
  return TOPUP_PACKAGES.find((p) => p.id === id);
}

export function creditsToUsd(credits: number): string {
  return `$${(credits / CREDITS_PER_USD).toFixed(2)}`;
}

export function anonFreeWebRuns(): number {
  const n = parseInt(process.env.WEB_FREE_DAILY ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : 20;
}

/* ── wallet operations (atomic) ─────────────────────────────── */

export type GrantResult = { balance: number; duplicate?: boolean };

export async function grantCredits(input: {
  userId: string;
  credits: number;
  type: "signup_bonus" | "topup" | "refund";
  description: string;
  amountUsdCents?: number;
  stripeEventId?: string;
}): Promise<GrantResult> {
  if (input.stripeEventId) {
    const existing = await db
      .select({ id: walletTransactions.id })
      .from(walletTransactions)
      .where(eq(walletTransactions.stripeEventId, input.stripeEventId))
      .limit(1);
    if (existing.length > 0) {
      const [u] = await db
        .select({ balance: users.balanceCredits })
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1);
      return { balance: u?.balance ?? 0, duplicate: true };
    }
  }

  const [updated] = await db
    .update(users)
    .set({ balanceCredits: sql`${users.balanceCredits} + ${input.credits}` })
    .where(eq(users.id, input.userId))
    .returning({ balance: users.balanceCredits });

  await db.insert(walletTransactions).values({
    userId: input.userId,
    type: input.type,
    amountCredits: input.credits,
    amountUsdCents: input.amountUsdCents ?? null,
    description: input.description,
    stripeEventId: input.stripeEventId ?? null,
  });

  return { balance: updated?.balance ?? 0 };
}

/**
 * Atomically deduct credits. Returns the new balance, or null when the
 * balance is insufficient — the conditional UPDATE makes this race-safe.
 */
export async function chargeCredits(
  userId: string,
  credits: number,
  description: string,
): Promise<number | null> {
  const [updated] = await db
    .update(users)
    .set({ balanceCredits: sql`${users.balanceCredits} - ${credits}` })
    .where(and(eq(users.id, userId), gte(users.balanceCredits, credits)))
    .returning({ balance: users.balanceCredits });

  if (!updated) return null;

  await db.insert(walletTransactions).values({
    userId,
    type: "charge",
    amountCredits: -credits,
    description,
  });
  return updated.balance;
}

export async function getBalance(userId: string): Promise<number> {
  const [row] = await db
    .select({ balance: users.balanceCredits })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row?.balance ?? 0;
}

/* ── anonymous browser-demo allowance ───────────────────────── */

export function clientIpHash(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  const ip = fwd.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
  return createHash("sha256").update(`doctune:${ip}`).digest("hex");
}

function utcDay(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function anonQuotaRemaining(ipHash: string): Promise<number> {
  const limit = anonFreeWebRuns();
  const [row] = await db
    .select({ count: webUsage.count })
    .from(webUsage)
    .where(and(eq(webUsage.day, utcDay()), eq(webUsage.ipHash, ipHash)))
    .limit(1);
  return Math.max(0, limit - (row?.count ?? 0));
}

export async function incrAnonWebUsage(ipHash: string): Promise<void> {
  await db
    .insert(webUsage)
    .values({ day: utcDay(), ipHash, count: 1 })
    .onConflictDoUpdate({
      target: [webUsage.day, webUsage.ipHash],
      set: { count: sql`${webUsage.count} + 1` },
    });
}
