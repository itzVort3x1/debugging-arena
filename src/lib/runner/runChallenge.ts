import { materializeSandbox } from "./sandbox";
import { getRunner } from "./languages/registry";
import { selectExecutor } from "./exec/select";
import type { RunHandlers } from "./exec/types";
import type { ChallengeDefinition } from "../../../challenges/_schema";

export type { RunHandlers } from "./exec/types";

export interface RunResult {
    stdout: string;
    stderr: string;
    exitCode: number | null;
    passed: number;
    failed: number;
    total: number;
    durationMs: number;
}

/** Hard ceiling so a runaway test can't pin a worker forever. */
const RUN_TIMEOUT_MS = 30_000;

/**
 * Materialize the challenge into a temp dir, run its test suite, and return
 * the structured result once it finishes. If `handlers.onStdout` / `onStderr`
 * are provided, chunks are delivered live for SSE streaming.
 *
 * Two axes are pluggable:
 *   - the LanguageRunner (by `challenge.meta.runtime`, default node → jest)
 *     provides scaffolding, the command, and output parsing.
 *   - the Executor (by `ARENA_RUNNER`, default docker) decides whether that
 *     command runs in an isolated container or in-process on the host.
 *
 * This function only orchestrates the sandbox lifecycle and normalizes into
 * RunResult; timeout, abort, and streaming live in the executor.
 */
export async function runChallenge(
    challenge: ChallengeDefinition,
    fileState: Record<string, string>,
    handlers: RunHandlers = {},
): Promise<RunResult> {
    const runner = getRunner(challenge.meta.runtime);
    const executor = selectExecutor();
    const env = executor.env();

    const scaffoldFiles = runner.scaffold(challenge, fileState, env);
    const sandbox = await materializeSandbox(challenge, fileState, scaffoldFiles);
    const start = Date.now();

    try {
        const command = runner.command(env, executor.workDir(sandbox.cwd));
        const { exitCode, stdout, stderr } = await executor.run({
            image: runner.image,
            command,
            sandboxDir: sandbox.cwd,
            handlers,
            timeoutMs: RUN_TIMEOUT_MS,
        });

        const { passed, failed, total } = await runner.parseResults(
            sandbox.cwd,
            stdout,
        );

        return {
            stdout,
            stderr,
            exitCode,
            passed,
            failed,
            total,
            durationMs: Date.now() - start,
        };
    } finally {
        await sandbox.cleanup();
    }
}
