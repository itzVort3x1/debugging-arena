/**
 * Execution layer: how a runner's command is actually launched.
 *
 * The same LanguageRunner command runs either directly on the host (the
 * in-process `spawn`, no isolation) or inside a locked-down container. The
 * paths a command must reference (node, jest, ts-jest, the cache, the working
 * dir) differ between those two worlds, so an Executor supplies them via
 * `ExecEnv` and the runner builds its command against that.
 */

export interface RunHandlers {
    /** Called with every stdout chunk as it arrives (may be partial line). */
    onStdout?: (chunk: string) => void;
    /** Called with every stderr chunk as it arrives (may be partial line). */
    onStderr?: (chunk: string) => void;
    /** When this signal aborts, the running process (or container) is killed. */
    signal?: AbortSignal;
}

/** A process to spawn: executable + args + extra env (merged, never leaked). */
export interface RunCommand {
    cmd: string;
    args: string[];
    env?: Record<string, string>;
}

/**
 * Path slots a runner needs to build its command, resolved for whichever
 * world the command will run in. On the host these are absolute paths into
 * the app's own node_modules and the OS temp dir; in a container they are the
 * fixed paths baked into the image and its mounts.
 */
export interface ExecEnv {
    /** Node executable: `process.execPath` on host, `"node"` in the image. */
    nodeExec: string;
    /** Absolute path to jest's CLI entry as the running process sees it. */
    jestBin: string;
    /** Absolute path to the ts-jest module as the running process sees it. */
    tsJestPath: string;
    /** Persistent test-tool cache dir as the running process sees it. */
    cacheDir: string;
}

/** Captured result of a streamed process/container run. */
export interface ExecResult {
    exitCode: number | null;
    stdout: string;
    stderr: string;
}

/** Everything an executor needs to launch one suite. */
export interface ExecRequest {
    /** Container image for this runtime (ignored by the host executor). */
    image: string;
    /** The command to run, already built against this executor's ExecEnv. */
    command: RunCommand;
    /** Host path of the materialized sandbox (bind-mounted in the container). */
    sandboxDir: string;
    handlers: RunHandlers;
    /** Wall-clock ceiling; the process/container is killed when it elapses. */
    timeoutMs: number;
}

export interface Executor {
    readonly kind: "host" | "docker";
    /** Path slots for building a command in this executor's world. */
    env(): ExecEnv;
    /** The working dir a command should target: host sandbox path, or `/work`. */
    workDir(sandboxDir: string): string;
    /** Launch the command, stream output, honor timeout + abort. */
    run(req: ExecRequest): Promise<ExecResult>;
}
