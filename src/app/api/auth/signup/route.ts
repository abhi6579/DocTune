import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  createSession,
  hashPassword,
  normalizeEmail,
} from "@/lib/auth";
import { grantCredits, SIGNUP_BONUS_CREDITS } from "@/lib/billing";

export async function POST(req: NextRequest) {
  let body: { name?: string; email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const name = (body.name ?? "").trim().slice(0, 80);
  const email = normalizeEmail(body.email ?? "");
  const password = body.password ?? "";

  if (name.length < 2) {
    return NextResponse.json({ error: "Name must be at least 2 characters." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 180) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (password.length < 8 || password.length > 128) {
    return NextResponse.json({ error: "Password must be 8–128 characters." }, { status: 400 });
  }

  try {
    const [user] = await db
      .insert(users)
      .values({ name, email, passwordHash: hashPassword(password) })
      .returning({ id: users.id, name: users.name, email: users.email });
    await createSession(user.id);
    // Welcome credits — enough to try the product before paying.
    await grantCredits({
      userId: user.id,
      credits: SIGNUP_BONUS_CREDITS,
      type: "signup_bonus",
      description: "Welcome bonus — 200 free credits",
    });
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    const typed = error as { code?: string; cause?: { code?: string } };
    const code = typed.code ?? typed.cause?.code;
    if (code === "23505") {
      return NextResponse.json(
        { error: "An account already exists for this email." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "Unable to create account." }, { status: 500 });
  }
}
