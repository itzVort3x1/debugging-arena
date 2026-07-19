// Canonical types for challenge definitions.
// Each challenge directory under /challenges/<slug>/ is parsed by lib/challenges/loader.ts
// into a ChallengeDefinition that conforms to these types.

export type Difficulty = "easy" | "medium" | "hard";

/**
 * Execution runtime a challenge's tests run under. Selects the LanguageRunner
 * (see src/lib/runner/languages). Only "node" is implemented today; the rest
 * are declared so meta.json can name them ahead of their runners landing.
 */
export type Runtime = "node" | "python" | "go" | "rust";

/** All known runtimes, also the directory names a multi-language challenge uses. */
export const RUNTIMES: Runtime[] = ["node", "python", "go", "rust"];

export interface ChallengeMeta {
    slug: string;
    title: string;
    difficulty: Difficulty;
    tags: string[];
    /** Suggested time to solve, in seconds. Used for scoring. */
    timeLimit: number;
    /** Tech stack labels shown in the UI, e.g. ["Node.js", "Redis"]. */
    stack: string[];
    /** One-line summary mimicking a bug report / Jira issue. */
    issueContext: string;
    /**
     * Execution runtime for this challenge's tests. Defaults to "node" when
     * absent, so existing (single-language) challenges need no change.
     *
     * On a `ChallengeDefinition` loaded for a specific language this is always
     * the resolved variant's runtime.
     */
    runtime?: Runtime;
    /**
     * Languages this challenge can be solved in. Populated by the loader:
     * `[runtime]` for a single-language challenge, or the set of variant dirs
     * (`node/`, `python/`, …) for a multi-language one. Authors may set it in a
     * multi-language `meta.json` to fix the ordering shown in the UI.
     */
    languages?: Runtime[];
    /** Which language a fresh session starts in. Defaults to `languages[0]`. */
    defaultLanguage?: Runtime;
}

export interface ChallengeFile {
    /** Path relative to the challenge sandbox root, e.g. "src/chat-server.ts". */
    path: string;
    content: string;
    /** True for files the user must not edit (test files). */
    readOnly: boolean;
    /** Monaco language id, derived from the file extension. */
    language: string;
}

export type HintLevelNumber = 1 | 2 | 3 | 4;

export interface HintLevel {
    level: HintLevelNumber;
    title: string;
    content: string;
    /** Subtracted from the final score when this hint is revealed. */
    penaltyPoints: number;
}

export interface ChallengeDefinition {
    meta: ChallengeMeta;
    /** Markdown body shown in the ProblemPanel. */
    description: string;
    /** Editable broken source files. */
    files: ChallengeFile[];
    /** Read-only test files copied alongside `files` into the sandbox. */
    testFiles: ChallengeFile[];
    hints: HintLevel[];
    /**
     * Full worked solution (markdown). Optional - only present when the
     * challenge ships a `solution.md`. Revealing it in the arena forfeits the
     * score, and is gated behind revealing every hint first.
     */
    solution?: string;
}
