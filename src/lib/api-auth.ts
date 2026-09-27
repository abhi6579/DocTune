import { and, count, eq, gte, isNull } from "drizzle-orm";
import { db } from "@/db";
import { apiKeys, apiUsage, users } from "@/db/schema";
import { hashToken } from "@/lib/auth";

export type ApiIdentity = {
  userId: string;
  apiKeyId: string;
  email: string;
  plan: string;
};

export function monthStartUtc(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export async function authenticateApiKey(
  authorization: string | null,
): Promise<ApiIdentity | null> {
  if (!authorization?.startsWith("Bearer ")) return null;
  const raw = authorization.slice(7).trim();
  if (!raw.startsWith("dt_live_") || raw.length < 30) return null;

  const [identity] = await db
    .select({
      userId: users.id,
      apiKeyId: apiKeys.id,
      email: users.email,
      plan: users.plan,
    })
    .from(apiKeys)
    .innerJoin(users, eq(apiKeys.userId, users.id))
    .where(and(eq(apiKeys.keyHash, hashToken(raw)), isNull(apiKeys.revokedAt)))
    .limit(1);

  if (!identity) return null;
  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, identity.apiKeyId));
  return identity;
}

export async function getMonthlyUsage(userId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(apiUsage)
    .where(
      and(
        eq(apiUsage.userId, userId),
        eq(apiUsage.statusCode, 200),
        gte(apiUsage.createdAt, monthStartUtc()),
      ),
    );
  return Number(row?.value ?? 0);
}

export async function recordApiUsage(input: {
  userId: string;
  apiKeyId: string;
  runId?: string;
  statusCode: number;
  durationMs?: number;
}): Promise<void> {
  await db.insert(apiUsage).values({
    userId: input.userId,
    apiKeyId: input.apiKeyId,
    runId: input.runId,
    endpoint: "/api/v1/evaluate",
    statusCode: input.statusCode,
    durationMs: input.durationMs,
  });
}
