import {
    loadChallenge,
    loadChallengeSummary,
    type ChallengeSummary,
} from "./loader";
import { MemoryStore } from "./store/memory";
import type { ChallengeTree } from "./store/tree";

/**
 * Validate a candidate challenge tree by running it through the real
 * `loader.ts` - the same code path the app uses to serve challenges. Nothing
 * here re-implements the layout rules, so a challenge that validates is one
 * that loads.
 *
 * This is the replacement for what code review and CI used to catch, now that
 * challenges are authored in the admin UI instead of committed to the repo.
 */

export interface ChallengeValidation {
    ok: boolean;
    /** Human-readable problems, ready to show in the editor. */
    errors: string[];
    /**
     * The resolved summary, present only when the tree parsed. The save path
     * needs it to write the meta projection columns.
     */
    summary?: ChallengeSummary;
}

/** Files a challenge cannot do without. */
const REQUIRED_FILES = ["meta.json", "description.md"];

/**
 * Reject paths that would escape the challenge root once the runner
 * materializes the tree into a sandbox directory. Admin-authored content is
 * written to disk and executed, so a `../` here is a sandbox escape, not a
 * cosmetic problem.
 */
function pathErrors(tree: ChallengeTree): string[] {
    const errors: string[] = [];
    for (const path of Object.keys(tree)) {
        if (path.trim() === "") {
            errors.push("A file has an empty path.");
            continue;
        }
        if (path.startsWith("/") || /^[a-zA-Z]:/.test(path)) {
            errors.push(`"${path}": must be a relative path.`);
        }
        if (path.includes("\\")) {
            errors.push(`"${path}": use forward slashes, not backslashes.`);
        }
        const segments = path.split("/");
        if (segments.includes("..")) {
            errors.push(`"${path}": ".." is not allowed in a challenge path.`);
        }
        if (segments.some((s) => s === "")) {
            errors.push(`"${path}": has an empty path segment.`);
        }
    }
    return errors;
}

/** The message from a thrown loader error, without the stack. */
function messageOf(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
}

/**
 * Check `tree` as challenge `slug`. Returns every problem found rather than
 * stopping at the first, so the editor can show them all at once.
 */
export async function validateChallengeTree(
    slug: string,
    tree: ChallengeTree,
): Promise<ChallengeValidation> {
    const errors = pathErrors(tree);

    for (const required of REQUIRED_FILES) {
        if (tree[required] === undefined) {
            errors.push(`Missing required file "${required}".`);
        }
    }

    // Path problems make the tree unsafe to interpret at all; stop before
    // handing it to the loader.
    if (errors.length > 0) return { ok: false, errors };

    const store = MemoryStore.forChallenge(slug, tree);

    let summary: ChallengeSummary;
    try {
        summary = await loadChallengeSummary(store, slug);
    } catch (err) {
        // A bad meta.json (or a slug mismatch) fails here, and nothing further
        // can be resolved without it.
        return { ok: false, errors: [messageOf(err)] };
    }

    for (const language of summary.languages) {
        try {
            const definition = await loadChallenge(store, slug, language);
            if (definition.files.length === 0) {
                errors.push(
                    `[${language}] has no editable files under "files/".`,
                );
            }
            if (definition.testFiles.length === 0) {
                errors.push(
                    `[${language}] has no test files under "tests/" - nothing could grade a submission.`,
                );
            }
            if (definition.description.trim() === "") {
                errors.push(`[${language}] description.md is empty.`);
            }
        } catch (err) {
            errors.push(`[${language}] ${messageOf(err)}`);
        }
    }

    return { ok: errors.length === 0, errors, summary };
}
