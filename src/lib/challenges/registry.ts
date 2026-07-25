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
 * remember a warm-up step. Caches live for the process lifetime (no TTL yet;
 * invalidation is a later PR).
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

let indexPromise: Promise<Map<string, IndexEntry>> | null = null;
const aggregateCache = new Map<string, Promise<ChallengeAggregate>>();

async function buildIndex(): Promise<Map<string, IndexEntry>> {
  const store = selectChallengeStore();

  // Prefer the precomputed manifest (one read); fall back to listing the store
  // and reading each summary when it's absent (local dev without a generated
  // manifest). Both yield the same IndexEntry shape.
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

/** Build (once) + return the meta index, retrying on a failed build. */
function ensureIndex(): Promise<Map<string, IndexEntry>> {
  if (!indexPromise) {
    indexPromise = buildIndex().catch((err) => {
      // Don't cache the failure - let the next request retry the load.
      indexPromise = null;
      throw err;
    });
  }
  return indexPromise;
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
