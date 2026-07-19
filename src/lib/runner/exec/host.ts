import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { streamProcess } from "./stream";
import type { ExecEnv, Executor, ExecRequest, ExecResult } from "./types";

/**
 * Persistent test-tool cache, shared across runs and users. The sandbox itself
 * is a throwaway temp dir, so without pinning the cache here a tool like
 * ts-jest would recompile every test file on every run. Named for its original
 * (jest) use; other host-mode runtimes may reuse it under their own subdir.
 */
const HOST_CACHE_DIR = path.join(os.tmpdir(), "arena-jest-cache");

/**
 * Runs the suite in-process on the host, exactly as the pre-container runner
 * did: jest and ts-jest resolved from the app's own node_modules, spawned into
 * the sandbox temp dir with the host environment inherited.
 *
 * This inherits `process.env` and has full filesystem/network access — it is
 * the INSECURE path, kept only as an explicit dev/CI escape hatch behind
 * `ARENA_RUNNER=host`. Never make it the default in a deployed environment.
 */
export const hostExecutor: Executor = {
    kind: "host",

    env(): ExecEnv {
        const root = process.cwd();
        return {
            kind: "host",
            cacheDir: HOST_CACHE_DIR,
            // Tools live under the app's own working dir (its node_modules).
            toolPath: (...segments) => path.join(root, ...segments),
        };
    },

    workDir(sandboxDir: string): string {
        return sandboxDir;
    },

    run(req: ExecRequest): Promise<ExecResult> {
        const { command, sandboxDir, handlers, timeoutMs } = req;
        const proc = spawn(command.cmd, command.args, {
            cwd: sandboxDir,
            // Host env is inherited here — see the security note above.
            env: { ...process.env, ...command.env },
        });
        return streamProcess(proc, handlers, timeoutMs, () =>
            proc.kill("SIGKILL"),
        );
    },
};
