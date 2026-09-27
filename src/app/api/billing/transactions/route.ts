import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { walletTransactions } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getBalance, TOPUP_PACKAGES } from "@/lib/billing";
import { stripeEnabled } from "@/lib/stripe";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const [balance, transactions] = await Promise.all([
    getBalance(user.id),
    db
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.userId, user.id))
      .orderBy(desc(walletTransactions.createdAt))
      .limit(50),
  ]);

  return NextResponse.json({
    balance,
    stripeEnabled: stripeEnabled(),
    packages: TOPUP_PACKAGES,
    transactions: transactions.map((t) => ({
      id: t.id,
      type: t.type,
      amountCredits: t.amountCredits,
      amountUsdCents: t.amountUsdCents,
      description: t.description,
      createdAt: t.createdAt,
    })),
  });
}
