import type { PaymentProvider } from "./types";
import { StripePaymentProvider } from "./stripe";

export function getPaymentProvider(): PaymentProvider {
  const provider = (process.env.PAYMENT_PROVIDER || "stripe").toLowerCase();

  switch (provider) {
    case "stripe":
    default:
      return new StripePaymentProvider();
  }
}
