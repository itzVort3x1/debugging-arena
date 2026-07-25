"""Pagination helpers. Pages are 1-indexed."""


def paginate(items, page, page_size):
    """Return a single page of ``items``.

    Pages are 1-indexed: page 1 is the first ``page_size`` items, page 2 the
    next block, and so on. The last page may be partial, and a page past the
    end is empty.
    """
    # BUG: ``page`` is 1-indexed but a slice offset is 0-indexed. Multiplying
    # the 1-indexed page straight in makes page 1 start at ``page_size``, so the
    # real first block is never returned.
    start = page * page_size
    return items[start:start + page_size]
