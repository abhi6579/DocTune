import { redirect } from "next/navigation";
import { and, desc, eq, gte, sum } from "drizzle-orm";
import { db } from "@/db";
import { apiKeys, runs, walletTransactions } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import {
  API_RUN_COST,
  CREDITS_PER_USD,
  SIGNUP_BONUS_CREDITS,
  TOPUP_PACKAGES,
  WEB_RUN_COST,
} from "@/lib/billing";
import { monthStartUtc } from "@/lib/api-auth";
import { stripeEnabled } from "@/lib/stripe";
import SiteNav from "@/components/site-nav";
import AccountDashboard from "@/components/account-dashboard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Developer account — DocTune" };

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const monthStart = monthStartUtc();
  const [keys, recent, transactions, spentRow, apiCallsRow] = await Promise.all([
    db
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
      .orderBy(desc(apiKeys.createdAt)),
    db
      .select({
        id: runs.id,
        name: runs.name,
        domain: runs.domain,
        source: runs.source,
        bestDhs: runs.bestDhs,
        bestGrade: runs.bestGrade,
        createdAt: runs.createdAt,
      })
      .from(runs)
      .where(eq(runs.ownerId, user.id))
      .orderBy(desc(runs.createdAt))
      .limit(10),
    db
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.userId, user.id))
      .orderBy(desc(walletTransactions.createdAt))
      .limit(30),
    db
      .select({ total: sum(walletTransactions.amountCredits) })
      .from(walletTransactions)
      .where(
        and(
          eq(walletTransactions.userId, user.id),
          eq(walletTransactions.type, "charge"),
          gte(walletTransactions.createdAt, monthStart),
        ),
      ),
    db
      .select({ id: runs.id })
      .from(runs)
      .where(and(eq(runs.ownerId, user.id), gte(runs.createdAt, monthStart))),
  ]);

  const creditsSpentThisMonth = Math.abs(Number(spentRow[0]?.total ?? 0));

  return (
    <>
      <SiteNav />
      <main className="relative mx-auto min-h-screen max-w-6xl px-5 pb-24 pt-28 md:px-8">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="bg-grid fade-y absolute inset-0 opacity-50" />
        </div>
        <AccountDashboard
          user={{
            name: user.name,
            email: user.email,
            balance: user.balanceCredits,
          }}
          pricing={{
            webRunCost: WEB_RUN_COST,
            apiRunCost: API_RUN_COST,
            creditsPerUsd: CREDITS_PER_USD,
            signupBonus: SIGNUP_BONUS_CREDITS,
          }}
          packages={TOPUP_PACKAGES.map((p) => ({
            id: p.id,
            name: p.name,
            amountCents: p.amountCents,
            baseCredits: p.baseCredits,
            bonusCredits: p.bonusCredits,
            bonusPct: p.bonusPct,
            popular: p.popular ?? false,
          }))}
          stripeEnabled={stripeEnabled()}
          monthlyStats={{
            calls: apiCallsRow.length,
            creditsSpent: creditsSpentThisMonth,
          }}
          initialKeys={keys.map((k) => ({
            ...k,
            lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
            revokedAt: k.revokedAt?.toISOString() ?? null,
            createdAt: k.createdAt.toISOString(),
          }))}
          initialTransactions={transactions.map((t) => ({
            id: t.id,
            type: t.type,
            amountCredits: t.amountCredits,
            description: t.description,
            createdAt: t.createdAt.toISOString(),
          }))}
          recentRuns={recent.map((r) => ({
            ...r,
            createdAt: r.createdAt.toISOString(),
          }))}
        />
      </main>
    </>
  );
}
