/**
 * Scratchpad - run this file (the "Run file" button) to exercise the webhook
 * handler and watch its console output. Nothing here is a test; edit freely.
 *
 * Stripe retries webhooks, so the same event can arrive more than once. This
 * delivers one event twice and counts how many charges actually land.
 */
import { handlePaymentWebhook } from "./src/payment-handler";
import type { PaymentDb, StripeWebhookEvent } from "./src/types";

// In-memory stand-in for the Postgres-backed PaymentDb.
const processed = new Set<string>();
const charges: Array<{ paymentIntentId: string; amount: number }> = [];

const db: PaymentDb = {
    async isEventProcessed(eventId) {
        return processed.has(eventId);
    },
    async markEventProcessed(eventId) {
        processed.add(eventId);
    },
    async applyCharge(paymentIntentId, amount, currency) {
        charges.push({ paymentIntentId, amount });
        console.log(
            `applyCharge: ${amount} ${currency} for ${paymentIntentId}`,
        );
    },
};

const event: StripeWebhookEvent = {
    id: "evt_123",
    type: "payment_intent.succeeded",
    data: { object: { id: "pi_123", amount: 5000, currency: "usd" } },
};

async function main() {
    // Same webhook delivered twice (Stripe retry).
    await handlePaymentWebhook(event, db);
    await handlePaymentWebhook(event, db);
    console.log(`total charges applied: ${charges.length} (should be 1)`);
}

main().catch((err) => {
    console.error("handler threw:", err);
    process.exit(1);
});
