import { NextRequest, NextResponse } from "next/server";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { createRawApiKey, getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const keys = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      prefix: apiKeys.keyPrefix,
      lastUsedAt: apiKeys.lastUsedAt,
      revokedAt: apiKeys.revokedAt,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.userId, user.id))
    .orderBy(desc(apiKeys.createdAt));
  return NextResponse.json({ keys });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  let body: { name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const name = (body.name ?? "").trim().slice(0, 50);
  if (name.length < 2) {
    return NextResponse.json({ error: "Key name must be at least 2 characters." }, { status: 400 });
  }

  const [active] = await db
    .select({ value: count() })
    .from(apiKeys)
    .where(and(eq(apiKeys.userId, user.id), isNull(apiKeys.revokedAt)));
  if (Number(active?.value ?? 0) >= 5) {
    return NextResponse.json(
      { error: "Starter accounts can have up to 5 active API keys." },
      { status: 409 },
    );
  }

  const generated = createRawApiKey();
  const [key] = await db
    .insert(apiKeys)
    .values({
      userId: user.id,
      name,
      keyPrefix: generated.prefix,
      keyHash: generated.hash,
    })
    .returning({
      id: apiKeys.id,
      name: apiKeys.name,
      prefix: apiKeys.keyPrefix,
      createdAt: apiKeys.createdAt,
    });

  // Raw key is returned once and never stored.
  return NextResponse.json({ key: { ...key, value: generated.raw } }, { status: 201 });
}
