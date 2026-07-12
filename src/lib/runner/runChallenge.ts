import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { materializeSandbox } from "./sandbox";
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
 * Persistent jest cache, shared across runs and users. The sandbox itself is
 * a throwaway temp dir, so without pinning the cache here jest would recompile
 * every test file with ts-jest on every run. Cache entries are keyed by file
 * content + config hash, so reuse is safe: identical test files (served from
 * the registry) and identical user edits hit the cache; changed files miss.
 */
const JEST_CACHE_DIR = path.join(os.tmpdir(), "arena-jest-cache");

/**
 * Materialize the challenge into a temp dir, spawn jest, and return the
 * structured result once the child exits. If `handlers.onStdout` /
 * `onStderr` are provided, chunks are delivered live for SSE streaming.
 *
 * jest and ts-jest are resolved from the app's own node_modules so the
 * sandbox doesn't need its own. Both are devDependencies.
 */
export async function runChallenge(
    challenge: ChallengeDefinition,
    fileState: Record<string, string>,
    handlers: RunHandlers = {},
): Promise<RunResult> {
    // Resolve from the app's own node_modules via filesystem paths so the
    // sandbox doesn't need its own. Direct paths sidestep next/webpack's
    // module resolver (which honours package.json#exports and refuses
    // jest/bin/jest.js since it isn't exported).
    const projectRoot = process.cwd();
    const jestBin = path.join(
        projectRoot,
        "node_modules",
        "jest",
        "bin",
        "jest.js",
    );
    const tsJestPath = path.join(projectRoot, "node_modules", "ts-jest");

    const sandbox = await materializeSandbox(challenge, fileState, tsJestPath);
    const resultFile = path.join(sandbox.cwd, ".jest-result.json");
    const start = Date.now();

    try {
        const proc = spawn(
            process.execPath,
            [
                jestBin,
                "--rootDir",
                sandbox.cwd,
                "--config",
                path.join(sandbox.cwd, "jest.config.js"),
                "--json",
                "--outputFile",
                resultFile,
                "--colors",
                // Run in the jest process itself - for a single small suite the
                // worker fork/IPC overhead (especially on Windows) dwarfs the
                // test time.
                "--runInBand",
                // Reuse ts-jest's compiled output across runs; the sandbox dir
                // is deleted each time, so the cache must live outside it.
                "--cacheDirectory",
                JEST_CACHE_DIR,
                // Stream each test name live so the terminal shows progress
                // instead of dumping everything at the end.
                "--verbose",
            ],
            {
                cwd: sandbox.cwd,
                env: {
                    ...process.env,
                    CI: "true",
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

        let passed = 0;
        let failed = 0;
        let total = 0;
        try {
            const raw = await fs.readFile(resultFile, "utf-8");
            const parsed = JSON.parse(raw);
            passed = parsed.numPassedTests ?? 0;
            failed = parsed.numFailedTests ?? 0;
            total = parsed.numTotalTests ?? 0;
        } catch {
            // Jest crashed before writing the result file - stdout/stderr will
            // already have the failure reason.
        }

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
