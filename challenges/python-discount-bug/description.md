# Checkout Applies the Wrong Discount

## Bug report from #checkout-bugs

Customers say applying a coupon at checkout makes the total go **negative**.
Finance caught it when a batch of orders came through with totals like
`-$1,900.00`.

> "I had $100 in my cart, entered the `SAVE20` coupon for 20% off, and the
> page showed a total of **-$1,900**. I just wanted to pay $80."

## What we know

- The pricing helpers live in `pricing.py`.
- `apply_discount(price, percent)` takes `percent` as a whole number — `20`
  means "20% off", not `0.20`.
- A 20%-off coupon on a $100 cart should charge **$80**. Instead it's
  producing a wildly negative number, which points at how the percentage is
  being applied.
- `add_tax(...)` and `cart_total(...)` look correct — the failing tests are
  all about the discount.

## Your task

Fix `apply_discount` in `pricing.py` so a percentage discount is applied
correctly. The suite in `tests/test_pricing.py` covers a few discount cases
plus tax and cart totals.

Make all tests pass without modifying the test file.
