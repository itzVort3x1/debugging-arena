import type { ChallengeEntry } from "./types";

/**
 * Shared helpers for stores whose backing data is a flat path -> content map
 * rather than a real directory tree: `PostgresStore` (a jsonb column) and
 * `MemoryStore` (an unsaved tree being validated).
 *
 * Keeping this in one place matters for more than deduplication - the admin
 * editor validates a candidate tree through `MemoryStore`, and whatever it
 * accepts is later served through `PostgresStore`. If the two synthesized
 * directory structures could disagree, a challenge could validate and then
 * fail to load.
 */

/** A challenge's files: root-relative forward-slash path -> file content. */
export type ChallengeTree = Record<string, string>;

/**
 * Coerce an untrusted value (a jsonb column, a request body) into a tree,
 * dropping non-string entries so malformed data degrades to "file missing"
 * rather than crashing the loader.
 */
export function asTree(content: unknown): ChallengeTree {
    if (!content || typeof content !== "object" || Array.isArray(content)) {
        return {};
    }
    const tree: ChallengeTree = {};
    for (const [path, value] of Object.entries(
        content as Record<string, unknown>,
    )) {
        if (typeof value === "string") tree[path] = value;
    }
    return tree;
}

/** Split a store path into its challenge slug and the root-relative remainder. */
export function splitPath(rel: string): { slug: string; rest: string } {
    const [slug = "", ...tail] = rel.split("/").filter(Boolean);
    return { slug, rest: tail.join("/") };
}

/**
 * The immediate children of `dir` within a tree, derived from the file paths.
 * Directories are implied by path prefixes - nothing stores them explicitly.
 */
export function childrenOf(tree: ChallengeTree, dir: string): ChallengeEntry[] {
    const prefix = dir ? `${dir}/` : "";
    const seen = new Map<string, boolean>(); // name -> isDir
    for (const path of Object.keys(tree)) {
        if (!path.startsWith(prefix)) continue;
        const remainder = path.slice(prefix.length);
        if (!remainder) continue;
        const slash = remainder.indexOf("/");
        if (slash === -1) seen.set(remainder, false);
        else seen.set(remainder.slice(0, slash), true);
    }
    return Array.from(seen, ([name, isDir]) => ({ name, isDir }));
}
