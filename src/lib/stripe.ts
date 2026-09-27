import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Dependency-free Stripe client.
 * - Checkout Sessions via the REST API (form-encoded)
 * - Webhook signature verification via Stripe's documented HMAC scheme
 *
 * When STRIPE_SECRET_KEY is absent, the app runs in "demo top-up" mode:
 * wallet credits are granted instantly so the full product flow works
 * end-to-end without payment credentials.
 */

export function stripeEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export type CheckoutResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

export async function createCheckoutSession(input: {
  packageId: string;
  packageName: string;
  amountCents: number;
  credits: number;
  userId: string;
  origin: string;
}): Promise<CheckoutResult> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return { ok: false, error: "Stripe is not configured." };

  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("success_url", `${input.origin}/account?topup=success`);
  params.set("cancel_url", `${input.origin}/account?topup=cancelled`);
  params.set("client_reference_id", input.userId);
  params.set("metadata[userId]", input.userId);
  params.set("metadata[packageId]", input.packageId);
  params.set("metadata[credits]", String(input.credits));
  params.set("line_items[0][quantity]", "1");
  params.set("line_items[0][price_data][currency]", "usd");
  params.set("line_items[0][price_data][unit_amount]", String(input.amountCents));
  params.set(
    "line_items[0][price_data][product_data][name]",
    `DocTune — ${input.credits} credits`,
  );

  try {
    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    const data = (await res.json()) as { url?: string; error?: { message?: string } };
    if (!res.ok || !data.url) {
      return { ok: false, error: data.error?.message ?? "Stripe request failed." };
    }
    return { ok: true, url: data.url };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Stripe request failed.",
    };
  }
}

/** Verify Stripe-Signature: t=<ts>,v1=<hmac> against the raw body. */
export function verifyStripeSignature(
  payload: string,
  signatureHeader: string | null,
  secret: string | undefined,
  toleranceSec = 300,
): boolean {
  if (!signatureHeader || !secret) return false;

  const parts = signatureHeader.split(",").reduce<Record<string, string>>(
    (acc, part) => {
      const [k, v] = part.split("=");
      if (k && v) acc[k.trim()] = v.trim();
      return acc;
    },
    {},
  );
  const timestamp = parts.t;
  const provided = parts.v1;
  if (!timestamp || !provided) return false;

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > toleranceSec) return false;

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(provided, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
