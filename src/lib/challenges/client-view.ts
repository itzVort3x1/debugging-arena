import type {
    ChallengeDefinition,
    ClientChallengeDefinition,
    Runtime,
} from "../../../challenges/_schema";

/**
 * The single place a `ChallengeDefinition` becomes something safe to send to a
 * browser.
 *
 * Hint bodies and the worked solution are what the scoring model charges for,
 * so they are stripped rather than hidden - anything that reaches the client
 * has been paid for, whatever the UI chooses to render.
 *
 * Reveals are shared per (user, challenge), not per session or language, which
 * is why this takes the reveal state rather than a session: revealing level 2
 * in the Node variant reveals it in Python too, and the payload has to agree
 * with that or a language switch would blank out a hint the user already owns.
 */

export interface RevealState {
    /** Hint levels this user has revealed for this challenge. */
    revealedHintLevels: number[];
    /** Whether the worked solution has been revealed (forfeiting the score). */
    solutionRevealed: boolean;
}

/** Nothing revealed - the right default for an unauthenticated or fresh view. */
export const NO_REVEALS: RevealState = {
    revealedHintLevels: [],
    solutionRevealed: false,
};

export function toClientChallenge(
    challenge: ChallengeDefinition,
    reveals: RevealState = NO_REVEALS,
): ClientChallengeDefinition {
    const revealed = new Set(reveals.revealedHintLevels);
    const { hints, solution, ...rest } = challenge;

    return {
        ...rest,
        hints: hints.map((hint) => ({
            level: hint.level,
            title: hint.title,
            penaltyPoints: hint.penaltyPoints,
            // Spread rather than `content: undefined`, so an unrevealed hint has no
            // `content` key at all and cannot show up as a null in the payload.
            ...(revealed.has(hint.level) ? { content: hint.content } : {}),
        })),
        hasSolution: Boolean(solution),
        ...(solution && reveals.solutionRevealed ? { solution } : {}),
    };
}

/** Apply {@link toClientChallenge} across a variant map. */
export function toClientVariants(
    variants: Partial<Record<Runtime, ChallengeDefinition>>,
    reveals: RevealState = NO_REVEALS,
): Partial<Record<Runtime, ClientChallengeDefinition>> {
    const out: Partial<Record<Runtime, ClientChallengeDefinition>> = {};
    for (const [language, definition] of Object.entries(variants)) {
        if (definition) {
            out[language as Runtime] = toClientChallenge(definition, reveals);
        }
    }
    return out;
}
