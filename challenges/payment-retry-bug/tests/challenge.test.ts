import { handlePaymentWebhook } from "../src/payment-handler";
import type { PaymentDb, StripeWebhookEvent } from "../src/types";

class InMemoryDb implements PaymentDb {
  processed = new Set<string>();
  charges: Array<{ id: string; amount: number; currency: string }> = [];

  async isEventProcessed(eventId: string): Promise<boolean> {
    return this.processed.has(eventId);
  }
  async markEventProcessed(eventId: string): Promise<void> {
    this.processed.add(eventId);
  }
  async applyCharge(
    paymentIntentId: string,
    amount: number,
    currency: string
  ): Promise<void> {
    this.charges.push({ id: paymentIntentId, amount, currency });
  }
}

function makeEvent(
  eventId: string,
  intentId = "pi_1",
  amount = 1000,
  currency = "usd",
  type = "payment_intent.succeeded"
): StripeWebhookEvent {
  return {
    id: eventId,
    type,
    data: { object: { id: intentId, amount, currency } },
  };
}

describe("Stripe webhook idempotency", () => {
  it("charges once for a single delivery", async () => {
    const db = new InMemoryDb();
    await handlePaymentWebhook(makeEvent("evt_1"), db);
    expect(db.charges).toEqual([{ id: "pi_1", amount: 1000, currency: "usd" }]);
  });

  it("charges only once when the same event is delivered twice", async () => {
    const db = new InMemoryDb();
    await handlePaymentWebhook(makeEvent("evt_1"), db);
    await handlePaymentWebhook(makeEvent("evt_1"), db);
    expect(db.charges.length).toBe(1);
  });

  it("survives 10 webhook retries without overcharging", async () => {
    const db = new InMemoryDb();
    for (let i = 0; i < 10; i++) {
      await handlePaymentWebhook(makeEvent("evt_1"), db);
    }
    expect(db.charges.length).toBe(1);
  });

  it("charges different events independently", async () => {
    const db = new InMemoryDb();
    await handlePaymentWebhook(makeEvent("evt_1", "pi_1", 500), db);
    await handlePaymentWebhook(makeEvent("evt_2", "pi_2", 700), db);
    expect(db.charges.length).toBe(2);
    expect(db.charges).toEqual([
      { id: "pi_1", amount: 500, currency: "usd" },
      { id: "pi_2", amount: 700, currency: "usd" },
    ]);
  });

  it("ignores events of other types", async () => {
    const db = new InMemoryDb();
    await handlePaymentWebhook(
      makeEvent("evt_x", "pi_x", 100, "usd", "invoice.created"),
      db
    );
    expect(db.charges).toEqual([]);
  });
});
