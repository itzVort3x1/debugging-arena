import type { ChallengeTree } from "./store/tree";

/**
 * What changed between two challenge trees. Used by the history panel to say
 * what restoring an old version would actually do, without rendering a full
 * line-level diff.
 *
 * Pure and dependency-free so it can run on either side of the wire.
 */
export interface TreeChange {
  added: string[];
  removed: string[];
  modified: string[];
}

/** Paths added, removed, or edited going `from` one tree `to` another. */
export function summarizeTreeChange(
  from: ChallengeTree,
  to: ChallengeTree,
): TreeChange {
  const added: string[] = [];
  const removed: string[] = [];
  const modified: string[] = [];

  for (const path of Object.keys(to)) {
    if (from[path] === undefined) added.push(path);
    else if (from[path] !== to[path]) modified.push(path);
  }
  for (const path of Object.keys(from)) {
    if (to[path] === undefined) removed.push(path);
  }

  const byName = (a: string, b: string) => a.localeCompare(b);
  return {
    added: added.sort(byName),
    removed: removed.sort(byName),
    modified: modified.sort(byName),
  };
}

/** True when the two trees hold the same files with the same contents. */
export function treesMatch(a: ChallengeTree, b: ChallengeTree): boolean {
  const change = summarizeTreeChange(a, b);
  return (
    change.added.length === 0 &&
    change.removed.length === 0 &&
    change.modified.length === 0
  );
}
