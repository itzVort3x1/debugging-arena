import type { ChildProcess } from "node:child_process";
import type { ExecResult, RunHandlers } from "./types";

/**
 * Wire a spawned child's stdio into the handlers, accumulate the full output,
 * and resolve once it exits. A wall-clock timeout and the abort signal both
 * fire `kill`, which each executor implements differently (SIGKILL the child
 * on the host; `docker kill` the container, since killing the `docker run`
 * client alone leaves the container running).
 */
export function streamProcess(
    proc: ChildProcess,
    handlers: RunHandlers,
    timeoutMs: number,
    kill: () => void,
): Promise<ExecResult> {
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

    const abortHandler = () => kill();
    handlers.signal?.addEventListener("abort", abortHandler, { once: true });
    const timer = setTimeout(kill, timeoutMs);

    return new Promise<ExecResult>((resolve, reject) => {
        proc.on("close", (code) => {
            clearTimeout(timer);
            handlers.signal?.removeEventListener("abort", abortHandler);
            resolve({ exitCode: code, stdout, stderr });
        });
        proc.on("error", (err) => {
            clearTimeout(timer);
            handlers.signal?.removeEventListener("abort", abortHandler);
            reject(err);
        });
    });
}
