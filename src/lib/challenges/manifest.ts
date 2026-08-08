import type { ChallengeSummary } from "./loader";
import type { ChallengeMeta, Runtime } from "../../../challenges/_schema";

/**
 * The challenge index, precomputed. Lets the registry warm its whole meta tier
 * from a single read (`index.json`) instead of listing the store and reading
 * every challenge's `meta.json` - the difference between one request and dozens
 * against a remote store.
 *
 * It is no longer a stored artifact anywhere. `PostgresStore` synthesizes it on
 * read from one query over the meta columns, so the registry warms its entire
 * meta tier in a single round-trip and a computed index cannot drift from the
 * rows it describes - which is why this module is load-bearing rather than the
 * optimization it started as.
 */

/** Where the manifest lives, relative to the store root. */
export const MANIFEST_PATH = "index.json";

/**
 * One challenge's entry: its resolved {@link ChallengeSummary} plus the
 * store-relative `path` of its root. `path` is layout-specific (the flat
 * `<slug>` for the local tree, `<difficulty>/<slug>` for the bucket), so the
 * registry reads `path` and never has to know the layout.
 */
export interface ChallengeManifestEntry extends ChallengeSummary {
    path: string;
}

export interface ChallengeManifest {
    /** Generation timestamp (ISO 8601); also the cache-busting version key. */
    version: string;
    challenges: ChallengeManifestEntry[];
}

/** Serialize a manifest to the JSON text served at {@link MANIFEST_PATH}. */
export function serializeManifest(manifest: ChallengeManifest): string {
    return JSON.stringify(manifest, null, 2) + "\n";
}

/** Parse + shallowly validate manifest JSON. Throws with a clear message. */
export function parseManifest(raw: string): ChallengeManifest {
    let data: unknown;
    try {
        data = JSON.parse(raw);
    } catch (err) {
        throw new Error(`Invalid manifest JSON: ${(err as Error).message}`);
    }
    if (!data || typeof data !== "object") {
        throw new Error("Manifest must be a JSON object");
    }
    const { version, challenges } = data as Record<string, unknown>;
    if (typeof version !== "string") {
        throw new Error("Manifest.version must be a string");
    }
    if (!Array.isArray(challenges)) {
        throw new Error("Manifest.challenges must be an array");
    }
    challenges.forEach((c, i) => {
        const e = c as Record<string, unknown>;
        if (
            typeof e.slug !== "string" ||
            typeof e.path !== "string" ||
            !Array.isArray(e.languages) ||
            typeof e.defaultLanguage !== "string" ||
            !e.meta ||
            typeof e.meta !== "object"
        ) {
            throw new Error(`Manifest.challenges[${i}] is malformed`);
        }
    });
    return data as ChallengeManifest;
}

// Re-exported so callers building an index off a manifest have the field types.
export type { ChallengeMeta, Runtime };
