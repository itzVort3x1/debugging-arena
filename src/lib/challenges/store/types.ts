/**
 * Storage seam for challenge content. The loader reads every challenge file
 * through this async interface instead of touching `fs` directly, so the same
 * loader logic works over the local filesystem (dev/test) or a remote store
 * (Supabase Storage in prod) — selected by {@link selectChallengeStore}.
 *
 * Deliberately minimal and language-neutral: just "read this text file" and
 * "list this directory". All paths are store-relative and use forward slashes
 * (e.g. `pagination-off-by-one/node/files`); each store maps them onto its own
 * root and path separator.
 */

/** One entry from {@link ChallengeStore.list}. */
export interface ChallengeEntry {
  /** Base name (no path), e.g. `meta.json` or `node`. */
  name: string;
  /** True for a directory, false for a file. */
  isDir: boolean;
}

export interface ChallengeStore {
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
}
