import { spawn } from "node:child_process";
import path from "node:path";
import { materializeSandbox } from "./sandbox";
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
}

/** Hard ceiling so a runaway script can't pin a worker forever. */
const RUN_TIMEOUT_MS = 30_000;

/**
 * Materialize the challenge into a temp dir and execute a single TypeScript
 * file directly with ts-node, streaming its stdout/stderr. Unlike
 * `runChallenge`, this runs no tests and computes no pass/fail — it's the
 * "just run the file and see my console.logs" debugging path.
 *
 * ts-node is resolved from the app's own node_modules by absolute path so the
 * sandbox (which has no node_modules) can still load it via `-r`. Type errors
 * are ignored (TS_NODE_TRANSPILE_ONLY) so the file runs the same way the jest
 * path runs with `diagnostics: false`.
 */
export async function runFile(
    challenge: ChallengeDefinition,
    fileState: Record<string, string>,
    entryPath: string,
    handlers: RunFileHandlers = {},
): Promise<RunFileResult> {
    const projectRoot = process.cwd();
    const tsJestPath = path.join(projectRoot, "node_modules", "ts-jest");
    // ts-node's register hook, by absolute path. `-r` accepts an absolute
    // module path, and ts-node resolves `typescript` from its own location
    // inside the app's node_modules.
    const tsNodeRegister = path.join(
        projectRoot,
        "node_modules",
        "ts-node",
        "register",
    );

    const sandbox = await materializeSandbox(challenge, fileState, tsJestPath);
    const entryAbs = path.join(sandbox.cwd, entryPath);
    // The sandbox writes its own commonjs tsconfig. Pin ts-node to it so it
    // never searches upward and picks up a foreign config (e.g. the app's
    // NodeNext tsconfig), which would fail to compile the entry file.
    const tsconfigPath = path.join(sandbox.cwd, "tsconfig.json");
    const start = Date.now();

    try {
        const proc = spawn(
            process.execPath,
            ["-r", tsNodeRegister, entryAbs],
            {
                cwd: sandbox.cwd,
                env: {
                    ...process.env,
                    // Transpile only: don't fail on type errors, mirroring the
                    // jest path's `diagnostics: false`.
                    TS_NODE_TRANSPILE_ONLY: "1",
                    TS_NODE_PROJECT: tsconfigPath,
                    FORCE_COLOR: "1",
                },
            },
        );

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

        return {
            stdout,
            stderr,
            exitCode,
            durationMs: Date.now() - start,
        };
    } finally {
        await sandbox.cleanup();
    }
}
