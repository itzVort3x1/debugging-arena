import type { ChallengeEntry, ChallengeStore } from "./types";
import { childrenOf, splitPath, type ChallengeTree } from "./tree";

/**
 * A {@link ChallengeStore} over in-memory trees. Not a source the app ever
 * reads from — it exists so a challenge that has not been saved anywhere can
 * still be run through `loader.ts`.
 *
 * That is what backs admin validation: the editor posts a candidate tree, this
 * wraps it, and the real loader parses it. Whatever the loader accepts here is
 * exactly what it will accept from `PostgresStore` later, because both derive
 * their directory structure from the same helpers in `./tree`.
 */
export class MemoryStore implements ChallengeStore {
  readonly kind = "memory" as const;

  /** slug -> that challenge's file tree. */
  private readonly challenges: Record<string, ChallengeTree>;

  constructor(challenges: Record<string, ChallengeTree>) {
    this.challenges = challenges;
  }

  /** Convenience for the common case of validating a single challenge. */
  static forChallenge(slug: string, tree: ChallengeTree): MemoryStore {
    return new MemoryStore({ [slug]: tree });
  }

  async readText(rel: string): Promise<string | undefined> {
    const { slug, rest } = splitPath(rel);
    if (!slug || !rest) return undefined; // the root and a bare slug are dirs
    return this.challenges[slug]?.[rest];
  }

  async list(rel: string): Promise<ChallengeEntry[]> {
    const { slug, rest } = splitPath(rel);
    if (!slug) {
      return Object.keys(this.challenges).map((name) => ({
        name,
        isDir: true,
      }));
    }
    const tree = this.challenges[slug];
    if (!tree) return []; // missing challenge lists as empty, like a missing dir
    return childrenOf(tree, rest);
  }
}
