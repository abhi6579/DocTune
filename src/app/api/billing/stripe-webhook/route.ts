import { NextRequest, NextResponse } from "next/server";
import { grantCredits, packageById } from "@/lib/billing";
import { verifyStripeSignature } from "@/lib/stripe";

export const runtime = "nodejs";

type StripeEvent = {
  id: string;
  type: string;
  data: {
    object: {
      payment_status?: string;
      amount_total?: number;
      metadata?: { userId?: string; packageId?: string; credits?: string };
    };
  };
};

export async function POST(req: NextRequest) {
  const payload = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!verifyStripeSignature(payload, signature, process.env.STRIPE_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(payload) as StripeEvent;
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object;
  const userId = session.metadata?.userId;
  const credits = Number(session.metadata?.credits ?? 0);

  if (session.payment_status !== "paid" || !userId || !Number.isFinite(credits) || credits <= 0) {
    return NextResponse.json({ received: true });
  }

  const pkg = session.metadata?.packageId
    ? packageById(session.metadata.packageId)
    : undefined;

  // Idempotent: stripeEventId is unique — duplicate deliveries are no-ops.
  await grantCredits({
    userId,
    credits,
    type: "topup",
    amountUsdCents: session.amount_total ?? pkg?.amountCents ?? undefined,
    description: pkg
      ? `${pkg.name} top-up — ${pkg.baseCredits} credits${pkg.bonusCredits > 0 ? ` + ${pkg.bonusCredits} bonus` : ""}`
      : `Wallet top-up — ${credits} credits`,
    stripeEventId: event.id,
  });

  return NextResponse.json({ received: true });
}
