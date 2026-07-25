import { materializeSandbox } from "./sandbox";
import { getRunner } from "./languages/registry";
import { selectExecutor } from "./exec/select";
import { runLimiter } from "./concurrency";
import type { ChallengeDefinition } from "../../../challenges/_schema";

export interface RunFileResult {
    stdout: string;
    stderr: string;
    exitCode: number | null;
    durationMs: number;
}

export interface RunFileHandlers {
    /** Called with every stdout chunk as it arrives (may be partial line). */
    onStdout?: (chunk: string) => void;
    /** Called with every stderr chunk as it arrives (may be partial line). */
    onStderr?: (chunk: string) => void;
    /** When this signal aborts, the child process is killed. */
    signal?: AbortSignal;
    /** Called once if the run has to wait for a free slot (see concurrency). */
    onQueued?: () => void;
}

/** Hard ceiling so a runaway script can't pin a worker forever. */
const RUN_TIMEOUT_MS = 30_000;

/**
 * Materialize the challenge into a temp dir and execute a single editable file
 * for its console output, streaming stdout/stderr. Unlike `runChallenge`, this
 * runs no tests and computes no pass/fail - it's the "just run the file and see
 * my logs" debugging path.
 *
 * Dispatches by `meta.runtime` exactly like `runChallenge`: the LanguageRunner
 * supplies the single-file command (ts-node for node, `python` for python) and
 * the selected Executor decides host vs container. A runtime whose runner has
 * no `fileCommand` (no single-file entrypoint) rejects; the UI disables the
 * Run File button for those so it shouldn't be reachable.
 */
export async function runFile(
    challenge: ChallengeDefinition,
    fileState: Record<string, string>,
    entryPath: string,
    handlers: RunFileHandlers = {},
): Promise<RunFileResult> {
    // Same admission gate as runChallenge — a single-file run still spawns a
    // process, so it shares the concurrency budget and can't bypass the cap.
    const release = await runLimiter.acquire({
        signal: handlers.signal,
        onQueued: handlers.onQueued,
    });
    try {
        const runner = getRunner(challenge.meta.runtime);
        if (!runner.fileCommand) {
            throw new Error(
                `Running a single file isn't supported for the ${
                    challenge.meta.runtime ?? "node"
                } runtime`,
            );
        }

        const executor = selectExecutor();
        const env = executor.env();
        const scaffoldFiles = runner.scaffold(challenge, fileState, env);
        const sandbox = await materializeSandbox(
            challenge,
            fileState,
            scaffoldFiles,
        );
        const start = Date.now();

        try {
            const command = runner.fileCommand(
                env,
                executor.workDir(sandbox.cwd),
                entryPath,
            );
            const { exitCode, stdout, stderr } = await executor.run({
                image: runner.image,
                command,
                sandboxDir: sandbox.cwd,
                handlers,
                timeoutMs: RUN_TIMEOUT_MS,
            });

            return {
                stdout,
                stderr,
                exitCode,
                durationMs: Date.now() - start,
            };
        } finally {
            await sandbox.cleanup();
        }
    } finally {
        release();
    }
}
