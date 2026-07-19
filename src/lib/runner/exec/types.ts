/**
 * Execution layer: how a runner's command is actually launched.
 *
 * The same LanguageRunner command runs either directly on the host (the
 * in-process `spawn`, no isolation) or inside a locked-down container. The
 * paths a command must reference (tool binaries, the cache, the working dir)
 * differ between those two worlds, so an Executor supplies them via `ExecEnv`
 * — deliberately language-neutral — and each runner resolves its own tool
 * locations against it.
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
 * The world a command will run in, language-neutral. A runner reads `kind` to
 * pick its interpreter, `cacheDir` for its test-tool cache, and `toolPath()`
 * to locate binaries it installed under the app/image root. Runners whose
 * tools live elsewhere (e.g. pytest on the image's PATH) simply don't call
 * `toolPath()`.
 */
export interface ExecEnv {
    /** Which world the command runs in. */
    kind: "host" | "docker";
    /** Persistent, writable cache dir for test-tool caches in this world. */
    cacheDir: string;
    /**
     * Resolve a path under this world's app/image root using its path
     * separator: the app's own working dir on the host, `/opt/arena` in a
     * container. E.g. `toolPath("node_modules", "jest", "bin", "jest.js")`.
     */
    toolPath(...segments: string[]): string;
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
