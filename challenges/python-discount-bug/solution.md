# Solution

The bug is a percentage-vs-fraction mix-up in `apply_discount`.

`percent` is a whole number (`20` = 20% off), so before multiplying it into the
price it must be divided by 100. The broken code applied it raw:

```python
# Broken: subtracts 20x the price for a "20% off" coupon
return price - price * percent          # apply_discount(100, 20) -> -1900
```

Divide the percentage by 100 to turn it into a fraction of the price:

```python
def apply_discount(price, percent):
    return price - price * (percent / 100)   # apply_discount(100, 20) -> 80
```

`add_tax` and `cart_total` were already correct, which is why only the discount
tests failed.
