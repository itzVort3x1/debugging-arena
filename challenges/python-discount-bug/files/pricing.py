"""Checkout pricing helpers."""


def apply_discount(price, percent):
    """Return `price` with a `percent`% discount applied.

    `percent` is a whole number: 20 means 20% off, so a $100 item becomes $80.
    """
    # BUG: `percent` is a percentage, but here it's applied as a raw fraction,
    # so a 20%-off coupon subtracts 20x the price instead of a fifth of it.
    return price - price * percent


def add_tax(price, rate):
    """Return `price` with tax at `rate` (a fraction, e.g. 0.1 for 10%)."""
    return price + price * rate


def cart_total(items):
    """Sum a cart of `(unit_price, quantity)` tuples."""
    return sum(unit_price * quantity for unit_price, quantity in items)
