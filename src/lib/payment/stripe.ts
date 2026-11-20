import Stripe from "stripe";
import type {
  CreateCheckoutInput,
  CreateCheckoutResult,
  PaymentProvider,
  VerifiedPaymentEvent,
} from "./types";

function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(secretKey, {
    httpClient: Stripe.createFetchHttpClient(),
  });
}

export class StripePaymentProvider implements PaymentProvider {
  readonly name = "stripe" as const;

  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    const stripe = getStripeClient();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: input.userEmail,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: input.currency,
            unit_amount: input.amountCents,
            product_data: {
              name: `${input.packageName} (${input.credits} Credits)`,
              description: `One-time sticker generation credits — never expire`,
            },
          },
        },
      ],
      metadata: {
        orderId: input.orderId,
        userId: input.userId,
        packageId: input.packageId,
        credits: String(input.credits),
      },
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
    });

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL");
    }

    return {
      checkoutUrl: session.url,
      externalId: session.id,
    };
  }

  async verifyWebhook(req: Request): Promise<VerifiedPaymentEvent | null> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
    }

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return null;
    }

    const rawBody = await req.text();
    const stripe = getStripeClient();
    const event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      webhookSecret,
      undefined,
      Stripe.createSubtleCryptoProvider()
    );

    if (event.type !== "checkout.session.completed") {
      return null;
    }

    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId;
    if (!orderId) {
      return null;
    }

    return {
      orderId,
      externalId: session.id,
      paid: session.payment_status === "paid",
    };
  }
}
