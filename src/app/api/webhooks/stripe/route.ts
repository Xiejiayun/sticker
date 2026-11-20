import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb, paymentOrders } from "@/db";
import { addCredits } from "@/lib/credits";
import { StripePaymentProvider } from "@/lib/payment/stripe";

export async function POST(request: Request) {
  const provider = new StripePaymentProvider();

  try {
    const verified = await provider.verifyWebhook(request);
    if (!verified || !verified.paid) {
      return NextResponse.json({ received: true });
    }

    const db = getDb();
    // Atomic idempotent transition: only grant credits when transitioning PENDING -> PAID
    const updated = await db
      .update(paymentOrders)
      .set({
        status: "PAID",
        externalId: verified.externalId,
        paidAt: new Date(),
      })
      .where(
        and(
          eq(paymentOrders.id, verified.orderId),
          eq(paymentOrders.status, "PENDING")
        )
      )
      .returning();

    if (updated.length > 0) {
      const order = updated[0];
      await addCredits(
        order.userId,
        order.creditsGranted,
        "PURCHASE",
        order.id,
        `Stripe credit pack purchase (${order.packageId})`
      );
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[stripe-webhook] Verification or processing error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Webhook error" },
      { status: 400 }
    );
  }
}
