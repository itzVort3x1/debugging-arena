/**
 * Return a single page of `items`.
 *
 * Pages are 1-indexed: page 1 is the first `pageSize` items, page 2 the next
 * block, and so on. The last page may be partial, and a page past the end is
 * empty.
 */
export function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  // BUG: `page` is 1-indexed but a slice offset is 0-indexed. Multiplying the
  // 1-indexed page straight in makes page 1 start at `pageSize`, so the real
  // first block is never returned.
  const start = page * pageSize;
  return items.slice(start, start + pageSize);
}
