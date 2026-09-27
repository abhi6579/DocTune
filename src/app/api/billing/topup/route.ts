import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { grantCredits, packageById } from "@/lib/billing";
import { createCheckoutSession, stripeEnabled } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  let body: { packageId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const pkg = packageById((body.packageId ?? "").trim());
  if (!pkg) {
    return NextResponse.json({ error: "Unknown top-up package." }, { status: 400 });
  }

  const totalCredits = pkg.baseCredits + pkg.bonusCredits;

  if (stripeEnabled()) {
    const session = await createCheckoutSession({
      packageId: pkg.id,
      packageName: pkg.name,
      amountCents: pkg.amountCents,
      credits: totalCredits,
      userId: user.id,
      origin: req.nextUrl.origin,
    });
    if (!session.ok) {
      return NextResponse.json(
        { error: `Payment setup failed: ${session.error}` },
        { status: 502 },
      );
    }
    return NextResponse.json({ checkoutUrl: session.url });
  }

  // Demo mode (no STRIPE_SECRET_KEY): credit the wallet instantly so the
  // full product flow is testable. Configure Stripe for live payments.
  const { balance } = await grantCredits({
    userId: user.id,
    credits: totalCredits,
    type: "topup",
    amountUsdCents: pkg.amountCents,
    description:
      pkg.bonusCredits > 0
        ? `${pkg.name} top-up — ${pkg.baseCredits} credits + ${pkg.bonusCredits} bonus (demo)`
        : `${pkg.name} top-up — ${pkg.baseCredits} credits (demo)`,
  });
  return NextResponse.json({ credited: true, balance, demo: true });
}
