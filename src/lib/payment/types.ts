import type { PaymentProviderName } from "@/db/schema";

export interface CreateCheckoutInput {
  orderId: string;
  userId: string;
  userEmail: string;
  packageId: string;
  packageName: string;
  credits: number;
  amountCents: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CreateCheckoutResult {
  checkoutUrl: string;
  externalId: string;
}

export interface VerifiedPaymentEvent {
  orderId: string;
  externalId: string;
  paid: boolean;
}

export interface PaymentProvider {
  readonly name: PaymentProviderName;
  createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult>;
  verifyWebhook(req: Request): Promise<VerifiedPaymentEvent | null>;
}
