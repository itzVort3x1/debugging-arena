/**
 * Storage seam for challenge content. The loader reads every challenge file
 * through this async interface instead of touching `fs` directly.
 *
 * Only `PostgresStore` now backs the running app, but the seam still earns its
 * keep: `MemoryStore` satisfies the same interface, which is what lets the
 * admin editor validate an unsaved tree through the exact loader that will
 * serve it later. If the two could disagree, a challenge could validate and
 * then fail to load.
 *
 * Deliberately minimal and language-neutral: just "read this text file" and
 * "list this directory". All paths are store-relative and use forward slashes
 * (e.g. `pagination-off-by-one/node/files`); each store maps them onto its own
 * layout.
 */

/** One entry from {@link ChallengeStore.list}. */
export interface ChallengeEntry {
  /** Base name (no path), e.g. `meta.json` or `node`. */
  name: string;
  /** True for a directory, false for a file. */
  isDir: boolean;
}

/** Which backend a {@link ChallengeStore} instance is. */
export type ChallengeStoreKind = "postgres" | "memory";

export interface ChallengeStore {
  /**
   * Which backend this instance actually is, for diagnostics.
   *
   * Declared by each store rather than derived from the class name, which the
   * production minifier renames.
   */
  readonly kind: ChallengeStoreKind;

  /**
   * Read a store-relative text file. Resolves to `undefined` when the file
   * does not exist (so optional files like `hints.json` need no separate
   * existence check).
   */
  readText(path: string): Promise<string | undefined>;

  /**
   * List the immediate children of a store-relative directory (non-recursive).
   * Resolves to `[]` for a missing directory, so callers can probe for
   * optional dirs (e.g. a `python/` variant) without a separate check.
   */
  list(path: string): Promise<ChallengeEntry[]>;

  /**
   * Drop anything the store itself has cached, so the next read hits the
   * underlying source. Optional: stores that hold no state (filesystem)
   * omit it.
   *
   * The store is a process-wide singleton, so a store that memoizes rows would
   * otherwise keep serving stale content after
   * {@link invalidateChallengeCache} cleared the registry above it.
   */
  invalidate?(): void;
}
