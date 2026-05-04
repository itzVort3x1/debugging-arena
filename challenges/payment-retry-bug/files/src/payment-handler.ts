import type { PaymentDb, StripeWebhookEvent } from "./types";

/**
 * Webhook handler invoked from POST /webhooks/stripe with the parsed,
 * signature-verified event body.
 */
export async function handlePaymentWebhook(
  event: StripeWebhookEvent,
  db: PaymentDb
): Promise<void> {
  if (event.type !== "payment_intent.succeeded") return;

  const intent = event.data.object;
  await db.applyCharge(intent.id, intent.amount, intent.currency);
}
