import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getServerSession } from "@/lib/auth";
import { getCreditPackageById } from "@/config/pricing";
import { getDb, paymentOrders } from "@/db";
import { getPaymentProvider } from "@/lib/payment/factory";

const CheckoutSchema = z.object({
  packageId: z.string().min(1),
  locale: z.enum(["zh", "en"]).default("zh"),
});

export async function POST(request: Request) {
  const session = await getServerSession(request.headers);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = CheckoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid checkout request" }, { status: 400 });
  }

  const pkg = getCreditPackageById(parsed.data.packageId);
  if (!pkg) {
    return NextResponse.json({ error: "Credit package not found" }, { status: 404 });
  }

  const provider = getPaymentProvider();
  const orderId = crypto.randomUUID();
  const db = getDb();

  await db.insert(paymentOrders).values({
    id: orderId,
    userId: session.user.id,
    packageId: pkg.id,
    provider: provider.name,
    amountCents: pkg.priceCents,
    currency: pkg.currency,
    creditsGranted: pkg.credits,
    status: "PENDING",
  });

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin).replace(
    /\/$/,
    ""
  );
  const locale = parsed.data.locale;

  try {
    const checkout = await provider.createCheckout({
      orderId,
      userId: session.user.id,
      userEmail: session.user.email,
      packageId: pkg.id,
      packageName: locale === "zh" ? pkg.nameZh : pkg.nameEn,
      credits: pkg.credits,
      amountCents: pkg.priceCents,
      currency: pkg.currency,
      successUrl: `${baseUrl}/pricing?checkout=success`,
      cancelUrl: `${baseUrl}/pricing?checkout=canceled`,
    });

    await db
      .update(paymentOrders)
      .set({ externalId: checkout.externalId })
      .where(eq(paymentOrders.id, orderId));

    return NextResponse.json({ checkoutUrl: checkout.checkoutUrl, orderId });
  } catch (err) {
    await db
      .update(paymentOrders)
      .set({ status: "FAILED" })
      .where(eq(paymentOrders.id, orderId));

    const message = err instanceof Error ? err.message : "Failed to create checkout session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
