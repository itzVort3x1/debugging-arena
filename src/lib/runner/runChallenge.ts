import { spawn } from "node:child_process";
import { materializeSandbox } from "./sandbox";
import { getRunner } from "./languages/registry";
import type { ChallengeDefinition } from "../../../challenges/_schema";

export interface RunResult {
    stdout: string;
    stderr: string;
    exitCode: number | null;
    passed: number;
    failed: number;
    total: number;
    durationMs: number;
}

export interface RunHandlers {
    /** Called with every stdout chunk as it arrives (may be partial line). */
    onStdout?: (chunk: string) => void;
    /** Called with every stderr chunk as it arrives (may be partial line). */
    onStderr?: (chunk: string) => void;
    /** When this signal aborts, the child process is killed. */
    signal?: AbortSignal;
}

/** Hard ceiling so a runaway test can't pin a worker forever. */
const RUN_TIMEOUT_MS = 30_000;

/**
 * Materialize the challenge into a temp dir, run its test suite, and return
 * the structured result once the child exits. If `handlers.onStdout` /
 * `onStderr` are provided, chunks are delivered live for SSE streaming.
 *
 * The framework-specific work (scaffolding, invocation, output parsing) is
 * delegated to the LanguageRunner selected by `challenge.meta.runtime`
 * (defaults to "node" → jest). This function only orchestrates the sandbox
 * lifecycle, streaming, timeout, and abort, and normalizes into RunResult.
 */
export async function runChallenge(
    challenge: ChallengeDefinition,
    fileState: Record<string, string>,
    handlers: RunHandlers = {},
): Promise<RunResult> {
    const runner = getRunner(challenge.meta.runtime);
    const scaffoldFiles = runner.scaffold(challenge, fileState);
    const sandbox = await materializeSandbox(
        challenge,
        fileState,
        scaffoldFiles,
    );
    const start = Date.now();

    try {
        const { cmd, args, env } = runner.command(sandbox.cwd);
        const proc = spawn(cmd, args, {
            cwd: sandbox.cwd,
            env: { ...process.env, ...env },
        });

        let stdout = "";
        let stderr = "";
        proc.stdout?.on("data", (b) => {
            const s = b.toString();
            stdout += s;
            handlers.onStdout?.(s);
        });
        proc.stderr?.on("data", (b) => {
            const s = b.toString();
            stderr += s;
            handlers.onStderr?.(s);
        });

        const abortHandler = () => proc.kill("SIGKILL");
        handlers.signal?.addEventListener("abort", abortHandler, {
            once: true,
        });

        const timer = setTimeout(() => proc.kill("SIGKILL"), RUN_TIMEOUT_MS);

        const exitCode = await new Promise<number | null>((resolve, reject) => {
            proc.on("close", (code) => {
                clearTimeout(timer);
                handlers.signal?.removeEventListener("abort", abortHandler);
                resolve(code);
            });
            proc.on("error", (err) => {
                clearTimeout(timer);
                handlers.signal?.removeEventListener("abort", abortHandler);
                reject(err);
            });
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
