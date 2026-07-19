import type { ChallengeDefinition } from "../../../../challenges/_schema";

/** Normalized test counts, framework-agnostic. */
export interface TestCounts {
    passed: number;
    failed: number;
    total: number;
}

/** How to invoke a test suite inside a materialized sandbox. */
export interface RunCommand {
    cmd: string;
    args: string[];
    env?: Record<string, string>;
}

/**
 * A per-language strategy for running a challenge's test suite. The
 * orchestrator (runChallenge) picks one by `meta.runtime` and drives it:
 *
 *   scaffold() → files written into the sandbox (config, manifests…)
 *   command()  → the process to spawn
 *   parseResults() → machine output → normalized counts
 *
 * Everything downstream (RunResult, SSE streaming, scoring) is
 * language-agnostic and consumes only the counts + raw stdio.
 */
export interface LanguageRunner {
    /**
     * Runtime-specific files to materialize alongside the user's editable
     * files and the read-only tests (e.g. jest.config.js + tsconfig.json,
     * requirements.txt, go.mod). Keyed by sandbox-relative path.
     *
     * These are written after fileState and testFiles, so a malformed
     * fileState cannot override the runner's own config.
     */
    scaffold(
        challenge: ChallengeDefinition,
        fileState: Record<string, string>,
    ): Record<string, string>;

    /** How to invoke the test suite inside the sandbox. */
    command(sandboxDir: string): RunCommand;

    /**
     * Normalize this framework's machine output into pass/fail/total counts.
     * `stdout` is provided for frameworks that report on the console; others
     * read a results file the command wrote under `sandboxDir`.
     */
    parseResults(sandboxDir: string, stdout: string): Promise<TestCounts>;
}
