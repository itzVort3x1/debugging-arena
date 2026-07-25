# Pagination Skips to the Wrong Page

## The report

> **BUG-2291** — *"Page 1 of the results is missing!"*
>
> Support is flooded. Customers hitting the first page of any list — orders,
> invoices, search results — see it start from the **second** page. The very
> first records are impossible to reach from the UI: asking for page 1 returns
> what should be page 2, and the last page comes back partly empty.

## The contract

`paginate(items, page, pageSize)` returns a single slice of `items`:

- **Pages are 1-indexed.** Page `1` is the first `pageSize` items, page `2`
  the next block, and so on.
- The final page may be **partial** (fewer than `pageSize` items).
- A page **past the end** returns an empty list.

Find why the first page is being skipped and make the tests green. It's the
same one-line off-by-one whether you solve it in Node or Python.
