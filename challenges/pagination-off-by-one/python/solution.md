## Fix

The page number is **1-indexed**, but a slice offset is **0-indexed**. The
buggy line feeds the 1-indexed page straight into the offset:

```python
start = page * page_size  # page 1 -> starts at page_size, skipping block 1
```

Subtract one first so page 1 maps to offset 0:

```python
def paginate(items, page, page_size):
    start = (page - 1) * page_size
    return items[start:start + page_size]
```

Python slicing clamps out-of-range indices, so the partial last page
(`items[6:9]` → `[7]`) and the past-the-end page (`items[9:12]` → `[]`) need no
special handling once the start index is right.
