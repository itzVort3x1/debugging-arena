import {
  listChallengeRoots,
  loadChallenge,
  loadChallengeSummary,
  type ChallengeSummary,
} from "./loader";
import { MANIFEST_PATH, parseManifest } from "./manifest";
import { selectChallengeStore } from "./store/select";
import type {
  ChallengeDefinition,
  ChallengeMeta,
  Runtime,
} from "../../../challenges/_schema";

/**
 * The registry has two tiers so cloud reads stay cheap:
 *
 *   - Meta tier — a warmed index of every challenge's `ChallengeSummary`
 *     (slug, languages, resolved `meta`). Cheap to build, needed everywhere
 *     (listings, dashboard, difficulty counts).
 *   - Content tier — the full `ChallengeDefinition` per language, loaded and
 *     cached lazily per slug, only when the arena/run/result paths need it.
 *
 * Every accessor is async and awaits the index internally, so no caller has to
 * remember a warm-up step. Both caches use a TTL with stale-while-revalidate +
 * stale-if-error: past the TTL the cached copy is served immediately while a
 * background refresh runs, and a failed refresh keeps the last-known-good copy.
 * {@link invalidateChallengeCache} drops everything for an instant refresh
 * (e.g. after seeding new content). Caches are per process instance.
 */

/** An index entry: the challenge summary plus its store-relative root path. */
interface IndexEntry extends ChallengeSummary {
  root: string;
}

/** One challenge, fully loaded across every language it offers. */
interface ChallengeAggregate {
  slug: string;
  languages: Runtime[];
  defaultLanguage: Runtime;
  variants: Map<Runtime, ChallengeDefinition>;
}

const DEFAULT_CACHE_TTL_MS = 5 * 60_000;

/** Cache TTL in ms. `0` (or negative) disables caching (always refetch). */
function cacheTtlMs(): number {
  const raw = process.env.ARENA_CHALLENGE_CACHE_TTL_MS;
  if (raw === undefined) return DEFAULT_CACHE_TTL_MS;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_CACHE_TTL_MS;
}

interface IndexCache {
  index: Map<string, IndexEntry>;
  loadedAt: number;
}

let indexCache: IndexCache | null = null;
let indexInit: Promise<void> | null = null; // in-flight first (blocking) load
let indexRefresh: Promise<void> | null = null; // in-flight background refresh
const aggregateCache = new Map<string, Promise<ChallengeAggregate>>();

async function buildIndex(): Promise<Map<string, IndexEntry>> {
  const store = selectChallengeStore();

  // One read gets the whole index: PostgresStore synthesizes index.json from a
  // single query, so this branch is what actually runs. The fallback — list the
  // store, read each summary — is kept because it is the only path that works
  // for a store that has no manifest to serve, and both yield the same
  // IndexEntry shape.
  const manifestRaw = await store.readText(MANIFEST_PATH);
  let entries: IndexEntry[];
  if (manifestRaw !== undefined) {
    const manifest = parseManifest(manifestRaw);
    entries = manifest.challenges.map((c) => ({
      root: c.path,
      slug: c.slug,
      languages: c.languages,
      defaultLanguage: c.defaultLanguage,
      meta: c.meta,
    }));
  } else {
    const roots = await listChallengeRoots(store);
    entries = await Promise.all(
      roots.map(async (root) => ({
        root,
        ...(await loadChallengeSummary(store, root)),
      })),
    );
  }

  // Sort by slug so listings are deterministic regardless of source/order.
  entries.sort((a, b) => a.slug.localeCompare(b.slug));
  const index = new Map<string, IndexEntry>();
  for (const entry of entries) index.set(entry.slug, entry);
  return index;
}

/** Rebuild the index and swap it in, dropping stale content aggregates. */
async function refreshIndex(): Promise<void> {
  const index = await buildIndex(); // may throw - callers decide how to handle
  indexCache = { index, loadedAt: Date.now() };
  // Content was loaded against the previous index; drop it so it reloads fresh.
  aggregateCache.clear();
}

/**
 * Return the meta index, honoring the TTL. First load blocks (and dedupes
 * concurrent callers); afterwards a stale index is served immediately while a
 * background refresh runs, and a failed refresh keeps the stale copy.
 */
async function ensureIndex(): Promise<Map<string, IndexEntry>> {
  const ttl = cacheTtlMs();

  // No-cache mode: always rebuild fresh (blocking). Local-authoring escape hatch.
  if (ttl <= 0) {
    await refreshIndex();
    return indexCache!.index;
  }

  // First load: block until there's an index, deduping concurrent callers. On
  // failure indexInit clears so the next request retries (no cached failure).
  if (!indexCache) {
    if (!indexInit) {
      indexInit = refreshIndex().finally(() => {
        indexInit = null;
      });
    }
    await indexInit;
    return indexCache!.index;
  }

  // Cached: serve it now; refresh in the background if stale (stale-while-
  // revalidate). A failed refresh is swallowed so we keep serving stale
  // (stale-if-error); the next stale hit tries again.
  if (Date.now() - indexCache.loadedAt >= ttl && !indexRefresh) {
    indexRefresh = refreshIndex()
      .catch((err) => {
        console.error(
          "Challenge index refresh failed; serving stale index:",
          err,
        );
      })
      .finally(() => {
        indexRefresh = null;
      });
  }
  return indexCache.index;
}

/**
 * Drop all cached challenge data (index + loaded content) so the next access
 * reloads from the store. Used by the admin revalidate hook after content
 * changes. Per-instance: in a multi-instance deploy each instance must be
 * invalidated (or wait out the TTL).
 *
 * Also clears the store's own cache where it has one (PostgresStore memoizes
 * rows). Without that, clearing the registry would just refill it from stale
 * data held one layer down.
 */
export function invalidateChallengeCache(): void {
  indexCache = null;
  indexInit = null;
  indexRefresh = null;
  aggregateCache.clear();
  selectChallengeStore().invalidate?.();
}

/** A read-only snapshot of the registry caches, for the admin source probe. */
export interface ChallengeCacheStatus {
  /** True once the meta index has been built at least once. */
  warm: boolean;
  /** When the current index was built, or null while cold. */
  loadedAt: string | null;
  /** Age of the current index in ms, or null while cold. */
  ageMs: number | null;
  /** Configured TTL; `0` means caching is disabled. */
  ttlMs: number;
  /** Slugs in the meta index. */
  indexedSlugs: number;
  /** Slugs whose full content has been loaded into the content tier. */
  loadedContentSlugs: number;
}

/**
 * Describe the cache without touching it. Deliberately does not call
 * {@link ensureIndex}: a probe that warmed the cache in order to report on it
 * could never report a cold one.
 */
export function describeChallengeCache(): ChallengeCacheStatus {
  return {
    warm: indexCache !== null,
    loadedAt: indexCache ? new Date(indexCache.loadedAt).toISOString() : null,
    ageMs: indexCache ? Date.now() - indexCache.loadedAt : null,
    ttlMs: cacheTtlMs(),
    indexedSlugs: indexCache?.index.size ?? 0,
    loadedContentSlugs: aggregateCache.size,
  };
}

async function buildAggregate(entry: IndexEntry): Promise<ChallengeAggregate> {
  const store = selectChallengeStore();
  const variants = new Map<Runtime, ChallengeDefinition>();
  for (const lang of entry.languages) {
    variants.set(lang, await loadChallenge(store, entry.root, lang));
  }
  return {
    slug: entry.slug,
    languages: entry.languages,
    defaultLanguage: entry.defaultLanguage,
    variants,
  };
}

/** Load (once) + return the full aggregate for a slug, or undefined if unknown. */
async function getAggregate(
  slug: string,
): Promise<ChallengeAggregate | undefined> {
  const index = await ensureIndex();
  const entry = index.get(slug);
  if (!entry) return undefined;

  let aggregate = aggregateCache.get(slug);
  if (!aggregate) {
    aggregate = buildAggregate(entry).catch((err) => {
      aggregateCache.delete(slug); // allow a retry on the next request
      throw err;
    });
    aggregateCache.set(slug, aggregate);
  }
  return aggregate;
}

// ----- Meta tier (warmed index; no file content) -----

/** Warm the meta index. Optional - accessors warm it themselves. */
export async function ensureChallengeIndex(): Promise<void> {
  await ensureIndex();
}

/** Resolved `ChallengeMeta` for a slug, or undefined for an unknown slug. */
export async function getChallengeMeta(
  slug: string,
): Promise<ChallengeMeta | undefined> {
  const index = await ensureIndex();
  return index.get(slug)?.meta;
}

/** Every challenge's resolved default-variant meta (listings/dashboards). */
export async function getAllChallengeMeta(): Promise<ChallengeMeta[]> {
  const index = await ensureIndex();
  return Array.from(index.values()).map((e) => e.meta);
}

/** The languages a challenge offers, or undefined for an unknown slug. */
export async function getChallengeLanguages(
  slug: string,
): Promise<Runtime[] | undefined> {
  const index = await ensureIndex();
  return index.get(slug)?.languages;
}

// ----- Content tier (full definitions, lazily loaded + cached) -----

/**
 * Resolve a challenge for a given language, defaulting to its `defaultLanguage`
 * when omitted. Returns undefined for an unknown slug or an unavailable
 * language, so callers can 404 rather than throw.
 */
export async function getChallenge(
  slug: string,
  language?: Runtime,
): Promise<ChallengeDefinition | undefined> {
  const aggregate = await getAggregate(slug);
  if (!aggregate) return undefined;
  return aggregate.variants.get(language ?? aggregate.defaultLanguage);
}

/**
 * All variants of a challenge as a plain (serializable) object, for handing the
 * whole set to the arena client so it can switch languages without a
 * round-trip. Returns undefined for an unknown slug.
 */
export async function getChallengeVariants(slug: string): Promise<
  | {
      languages: Runtime[];
      defaultLanguage: Runtime;
      variants: Partial<Record<Runtime, ChallengeDefinition>>;
    }
  | undefined
> {
  const aggregate = await getAggregate(slug);
  if (!aggregate) return undefined;
  const variants: Partial<Record<Runtime, ChallengeDefinition>> = {};
  aggregate.variants.forEach((def, lang) => {
    variants[lang] = def;
  });
  return {
    languages: aggregate.languages,
    defaultLanguage: aggregate.defaultLanguage,
    variants,
  };
}
