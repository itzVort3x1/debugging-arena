import {
  listChallengeSlugs,
  loadChallenge,
  listChallengeLanguages,
} from "./loader";
import type {
  ChallengeDefinition,
  ChallengeMeta,
  Runtime,
} from "../../../challenges/_schema";

/**
 * One challenge, resolved across all the languages it can be solved in. The
 * `variants` map holds a fully-loaded ChallengeDefinition per language;
 * `languages` / `defaultLanguage` describe the set.
 */
interface ChallengeAggregate {
  slug: string;
  languages: Runtime[];
  defaultLanguage: Runtime;
  variants: Map<Runtime, ChallengeDefinition>;
}

let registry: Map<string, ChallengeAggregate> | null = null;

function buildAggregate(slug: string): ChallengeAggregate {
  const languages = listChallengeLanguages(slug);
  const variants = new Map<Runtime, ChallengeDefinition>();
  for (const lang of languages) {
    variants.set(lang, loadChallenge(slug, lang));
  }
  // Every variant carries the same resolved defaultLanguage; read it off one.
  const defaultLanguage = variants.get(languages[0])!.meta.defaultLanguage!;
  return { slug, languages, defaultLanguage, variants };
}

function getRegistry(): Map<string, ChallengeAggregate> {
  if (!registry) {
    registry = new Map();
    for (const slug of listChallengeSlugs()) {
      registry.set(slug, buildAggregate(slug));
    }
  }
  return registry;
}

/**
 * Resolve a challenge for a given language, defaulting to its `defaultLanguage`
 * when omitted. Returns undefined for an unknown slug or an unavailable
 * language, so callers can 404 rather than throw.
 */
export function getChallenge(
  slug: string,
  language?: Runtime,
): ChallengeDefinition | undefined {
  const aggregate = getRegistry().get(slug);
  if (!aggregate) return undefined;
  return aggregate.variants.get(language ?? aggregate.defaultLanguage);
}

/** The languages a challenge offers, or undefined for an unknown slug. */
export function getChallengeLanguages(slug: string): Runtime[] | undefined {
  return getRegistry().get(slug)?.languages;
}

/** Every challenge's default variant (used for listings/dashboards). */
export function getAllChallenges(): ChallengeDefinition[] {
  return Array.from(getRegistry().values()).map(
    (a) => a.variants.get(a.defaultLanguage)!,
  );
}

export function getAllChallengeMeta(): ChallengeMeta[] {
  return getAllChallenges().map((c) => c.meta);
}
