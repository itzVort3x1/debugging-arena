import type { ChallengeDefinition } from "../../../../challenges/_schema";
import type { ExecEnv, RunCommand } from "../exec/types";

/** Normalized test counts, framework-agnostic. */
export interface TestCounts {
    passed: number;
    failed: number;
    total: number;
}

/**
 * A per-language strategy for running a challenge's test suite. The
 * orchestrator (runChallenge) picks one by `meta.runtime` and drives it,
 * launching its command via the selected Executor (host or container):
 *
 *   scaffold() → files written into the sandbox (config, manifests…)
 *   command()  → the process to spawn, built against the executor's ExecEnv
 *   parseResults() → machine output → normalized counts
 *
 * Everything downstream (RunResult, SSE streaming, scoring) is
 * language-agnostic and consumes only the counts + raw stdio.
 */
export interface LanguageRunner {
    /** Container image this runtime executes in (see docker/arena-<runtime>). */
    readonly image: string;

    /**
     * Runtime-specific files to materialize alongside the user's editable
     * files and the read-only tests (e.g. jest.config.js + tsconfig.json,
     * requirements.txt, go.mod). Keyed by sandbox-relative path.
     *
     * `env` provides the tool paths for the world the command will run in, so
     * e.g. jest.config.js can reference ts-jest at the right absolute path
     * (host node_modules vs the image's). Written after fileState and
     * testFiles, so a malformed fileState cannot override the runner's config.
     */
    scaffold(
        challenge: ChallengeDefinition,
        fileState: Record<string, string>,
        env: ExecEnv,
    ): Record<string, string>;

    /**
     * How to invoke the test suite. `env` gives the tool paths (node, jest,
     * cache) and `workDir` is where the sandbox is seen from — the host temp
     * dir under the host executor, or `/work` inside a container.
     */
    command(env: ExecEnv, workDir: string): RunCommand;

    /**
     * Normalize this framework's machine output into pass/fail/total counts.
     * `sandboxDir` is always the host path (the container bind-mounts it), and
     * `stdout` is provided for frameworks that only report on the console.
     */
    parseResults(sandboxDir: string, stdout: string): Promise<TestCounts>;
}
