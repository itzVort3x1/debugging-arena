from pricing import apply_discount, add_tax, cart_total


def test_discount_20_percent():
    # $100 with 20% off should cost $80.
    assert apply_discount(100, 20) == 80


def test_discount_50_percent():
    assert apply_discount(50, 50) == 25


def test_discount_zero_percent_is_noop():
    assert apply_discount(100, 0) == 100


def test_add_tax():
    assert add_tax(100, 0.1) == 110


def test_cart_total_sums_line_items():
    assert cart_total([(10, 2), (5, 3)]) == 35
