import { spawn } from "node:child_process";
import crypto from "node:crypto";
import { streamProcess } from "./stream";
import type { ExecEnv, Executor, ExecRequest, ExecResult } from "./types";

/** Fixed paths inside the arena-<runtime> images (see docker/ Dockerfiles). */
const WORK_DIR = "/work";
const CACHE_DIR = "/cache";
const APP_DIR = "/opt/arena";

/**
 * Named volume holding a runtime's persistent test-tool cache (ts-jest compile
 * output, pytest cache, …). One per image so runtimes don't share a cache dir;
 * survives across `--rm` containers to keep the cache-reuse optimization. The
 * image initializes it owned by its unprivileged user on first use.
 */
function cacheVolumeFor(image: string): string {
    return `${image}-cache`;
}

/** docker run isolation flags. The whole point of this executor. */
function isolationArgs(): string[] {
    return [
        "--rm",
        // No network at all — challenge/user code cannot phone home.
        "--network=none",
        // Drop every Linux capability; nothing here needs any.
        "--cap-drop=ALL",
        "--security-opt=no-new-privileges",
        // Resource ceilings so a runaway suite can't exhaust the host.
        "--pids-limit=256",
        "--memory=512m",
        "--cpus=1",
        // Read-only root filesystem; only the explicit mounts below are
        // writable (the bind-mounted sandbox, the cache volume, and /tmp).
        "--read-only",
        "--tmpfs=/tmp",
    ];
}

/**
 * One-time check that the Docker engine is reachable, cached for the process.
 * Without this a stopped Docker Desktop surfaces as an opaque non-zero exit
 * from `docker run`; here we turn it into an actionable message.
 */
let dockerCheck: Promise<void> | undefined;
function assertDockerAvailable(): Promise<void> {
    if (!dockerCheck) {
        dockerCheck = new Promise<void>((resolve, reject) => {
            const proc = spawn("docker", ["version", "--format", "{{.Server.Version}}"]);
            let err = "";
            proc.stderr?.on("data", (b) => (err += b.toString()));
            proc.on("error", () =>
                reject(
                    new Error(
                        "Docker CLI not found. Install Docker, or set ARENA_RUNNER=host for the in-process runner.",
                    ),
                ),
            );
            proc.on("close", (code) => {
                if (code === 0) return resolve();
                reject(
                    new Error(
                        "Docker engine is not reachable (is Docker Desktop running?). " +
                            "Start it, or set ARENA_RUNNER=host for the in-process runner.\n" +
                            err.trim(),
                    ),
                );
            });
        });
        // Don't cache a transient failure — let the next run retry.
        dockerCheck.catch(() => {
            dockerCheck = undefined;
        });
    }
    return dockerCheck;
}

/**
 * Runs the suite inside a per-runtime container with the host env dropped,
 * no network, dropped capabilities, and resource caps. The sandbox temp dir
 * is bind-mounted at /work, so files the suite writes there (e.g. jest's
 * result JSON) are read back out by the runner on the host afterwards.
 */
export const dockerExecutor: Executor = {
    kind: "docker",

    env(): ExecEnv {
        return {
            kind: "docker",
            cacheDir: CACHE_DIR,
            // POSIX join under the image's app root (always forward slashes,
            // regardless of the host OS building this string).
            toolPath: (...segments) => [APP_DIR, ...segments].join("/"),
        };
    },

    workDir(): string {
        return WORK_DIR;
    },

    async run(req: ExecRequest): Promise<ExecResult> {
        await assertDockerAvailable();

        const { image, command, sandboxDir, handlers, timeoutMs } = req;
        const name = `arena-run-${crypto.randomUUID()}`;
        const cacheVolume = cacheVolumeFor(image);

        // Only the command's own env is passed — the host environment is NOT
        // forwarded, so no host secrets reach the container.
        const envArgs = Object.entries(command.env ?? {}).flatMap(([k, v]) => [
            "-e",
            `${k}=${v}`,
        ]);

        const dockerArgs = [
            "run",
            "--name",
            name,
            ...isolationArgs(),
            "-v",
            `${sandboxDir}:${WORK_DIR}`,
            "-v",
            `${cacheVolume}:${CACHE_DIR}`,
            "-w",
            WORK_DIR,
            ...envArgs,
            image,
            command.cmd,
            ...command.args,
        ];

        const proc = spawn("docker", dockerArgs);
        return streamProcess(proc, handlers, timeoutMs, () => {
            // Killing the local `docker run` client does not stop the
            // container; kill it by name. Fire-and-forget — the container is
            // `--rm`, and the client exits once it's gone.
            spawn("docker", ["kill", name]);
            proc.kill("SIGKILL");
        });
    },
};
