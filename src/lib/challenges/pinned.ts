import { prisma } from "../prisma";
import { loadChallenge, loadChallengeSummary } from "./loader";
import { MemoryStore } from "./store/memory";
import { asTree } from "./store/tree";
import type { ChallengeDefinition, Runtime } from "../../../challenges/_schema";

/**
 * Content resolution for a session pinned to a specific `ChallengeVersion`.
 *
 * The registry serves whatever is currently published. That is right for
 * listings and for starting a challenge, and wrong for a session already
 * underway: an admin publishing an edit would move the description, hints and
 * test files under someone mid-attempt, and their score would be computed
 * against content they were never given. A pinned session reads its snapshot
 * instead.
 *
 * The snapshot is a raw file tree, exactly like the live row, so it is parsed
 * by the same `loader.ts` through a `MemoryStore` - the path the admin editor
 * already uses to validate an unsaved tree. Nothing here re-implements how a
 * tree becomes a challenge.
 *
 * Cached and, unlike the registry's caches, never invalidated: a
 * `ChallengeVersion` is immutable once written, so a cached parse cannot go
 * stale. Publishing an edit creates a new version rather than mutating one,
 * which is what makes that safe.
 */

interface PinnedAggregate {
    languages: Runtime[];
    defaultLanguage: Runtime;
    variants: Map<Runtime, ChallengeDefinition>;
}

/**
 * Bound on distinct (slug, version) parses held in memory. Immutable entries
 * would otherwise accumulate for the life of the process as challenges are
 * edited. Eviction is insertion-order rather than true LRU - with a handful of
 * challenges and one hot version each, the distinction does not pay for itself.
 */
const MAX_CACHED_VERSIONS = 64;

const cache = new Map<string, Promise<PinnedAggregate | null>>();

const cacheKey = (slug: string, version: number) => `${slug}@${version}`;

async function buildPinned(
    slug: string,
    version: number,
): Promise<PinnedAggregate | null> {
    const row = await prisma.challengeVersion.findUnique({
        where: { challengeSlug_version: { challengeSlug: slug, version } },
        select: { content: true },
    });
    if (!row) return null;

    const store = MemoryStore.forChallenge(slug, asTree(row.content));
    const summary = await loadChallengeSummary(store, slug);
    const variants = new Map<Runtime, ChallengeDefinition>();
    for (const language of summary.languages) {
        variants.set(language, await loadChallenge(store, slug, language));
    }
    return {
        languages: summary.languages,
        defaultLanguage: summary.defaultLanguage,
        variants,
    };
}

function getPinnedAggregate(
    slug: string,
    version: number,
): Promise<PinnedAggregate | null> {
    const key = cacheKey(slug, version);
    let pending = cache.get(key);
    if (!pending) {
        pending = buildPinned(slug, version).catch((err) => {
            cache.delete(key); // don't cache a transient failure
            throw err;
        });
        cache.set(key, pending);
        if (cache.size > MAX_CACHED_VERSIONS) {
            const oldest = cache.keys().next().value;
            if (oldest !== undefined) cache.delete(oldest);
        }
    }
    return pending;
}

/**
 * A pinned challenge in one language, or undefined when the version does not
 * exist or does not offer that language.
 *
 * A missing version is possible in principle - the row is FK-protected, so it
 * takes a deliberate database operation - and callers treat it the same way
 * they treat a missing challenge rather than crashing a session over it.
 */
export async function getPinnedChallenge(
    slug: string,
    version: number,
    language?: Runtime,
): Promise<ChallengeDefinition | undefined> {
    const aggregate = await getPinnedAggregate(slug, version);
    if (!aggregate) return undefined;
    return aggregate.variants.get(language ?? aggregate.defaultLanguage);
}

/** Every variant of a pinned version, shaped like `getChallengeVariants`. */
export async function getPinnedChallengeVariants(
    slug: string,
    version: number,
): Promise<
    | {
          languages: Runtime[];
          defaultLanguage: Runtime;
          variants: Partial<Record<Runtime, ChallengeDefinition>>;
      }
    | undefined
> {
    const aggregate = await getPinnedAggregate(slug, version);
    if (!aggregate) return undefined;
    const variants: Partial<Record<Runtime, ChallengeDefinition>> = {};
    aggregate.variants.forEach((def, language) => {
        variants[language] = def;
    });
    return {
        languages: aggregate.languages,
        defaultLanguage: aggregate.defaultLanguage,
        variants,
    };
}

/** The languages a pinned version offers, or undefined when it is missing. */
export async function getPinnedChallengeLanguages(
    slug: string,
    version: number,
): Promise<Runtime[] | undefined> {
    const aggregate = await getPinnedAggregate(slug, version);
    return aggregate?.languages;
}
