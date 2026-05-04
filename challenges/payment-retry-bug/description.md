# Stripe Webhook Double-Charges

## Bug report from #payments-incident

Customers are reporting being charged 2x or 3x for the same order. Support
has confirmed: the application's records show a single order, but the
customer's card was charged multiple times within a few seconds of each
other.

> "I bought one shirt. My card was charged $40 three times. The order
> confirmation email says one shirt for $40."

## What we know

- We use Stripe and process events via webhook at `/webhooks/stripe`.
- Stripe **retries webhooks** on any non-2xx response, on timeout, and
  occasionally even after a 2xx for at-least-once delivery guarantees.
  This is documented behavior, not a Stripe bug.
- Each retry carries the same `event.id`, but each call currently triggers
  a fresh charge in our system.
- We have a `processed_events` table available with helpers
  `isEventProcessed()` and `markEventProcessed()` already wired into the
  `PaymentDb` interface.

## Your task

Fix `src/payment-handler.ts` so a duplicate webhook delivery never
double-charges. The test in `tests/challenge.test.ts` simulates retried
deliveries.

Make all tests pass without modifying the test file or the `types.ts`
interface.
