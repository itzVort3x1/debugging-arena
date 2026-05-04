import { loadAllChallenges } from "./loader";
import type {
  ChallengeDefinition,
  ChallengeMeta,
} from "../../../challenges/_schema";

let registry: Map<string, ChallengeDefinition> | null = null;

function getRegistry(): Map<string, ChallengeDefinition> {
  if (!registry) {
    registry = new Map();
    for (const c of loadAllChallenges()) {
      registry.set(c.meta.slug, c);
    }
  }
  return registry;
}

export function getChallenge(slug: string): ChallengeDefinition | undefined {
  return getRegistry().get(slug);
}

export function getAllChallenges(): ChallengeDefinition[] {
  return Array.from(getRegistry().values());
}

export function getAllChallengeMeta(): ChallengeMeta[] {
  return getAllChallenges().map((c) => c.meta);
}
