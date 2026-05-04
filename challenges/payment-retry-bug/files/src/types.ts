// Subset of the Stripe webhook event surface relevant to this challenge.
export interface PaymentIntentSucceededObject {
  id: string;
  amount: number;
  currency: string;
}

export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: PaymentIntentSucceededObject;
  };
}

// Backed by Postgres in production. The `processed_events` table tracks
// which webhook event ids have already been handled so retries are no-ops.
export interface PaymentDb {
  isEventProcessed(eventId: string): Promise<boolean>;
  markEventProcessed(eventId: string): Promise<void>;
  applyCharge(
    paymentIntentId: string,
    amount: number,
    currency: string
  ): Promise<void>;
}
