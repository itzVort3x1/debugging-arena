## Fix

The page number is **1-indexed**, but a slice offset is **0-indexed**. The
buggy line feeds the 1-indexed page straight into the offset:

```ts
const start = page * pageSize; // page 1 → starts at pageSize, skipping block 1
```

Subtract one first so page 1 maps to offset 0:

```ts
export function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}
```

`Array.prototype.slice` clamps out-of-range indices, so the partial last page
(`slice(6, 9)` → `[7]`) and the past-the-end page (`slice(9, 12)` → `[]`) need
no special handling once the start index is right.
