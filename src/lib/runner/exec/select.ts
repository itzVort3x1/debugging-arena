import { dockerExecutor } from "./docker";
import { hostExecutor } from "./host";
import type { Executor } from "./types";

/**
 * Choose the executor from `ARENA_RUNNER`:
 *
 *   docker (default) — run suites inside an isolated container.
 *   host             — run in-process on the host. NO isolation; an explicit
 *                      dev/CI escape hatch for when Docker isn't available.
 *                      Never use as the default in a deployed environment.
 */
export function selectExecutor(): Executor {
    const mode = (process.env.ARENA_RUNNER ?? "docker").toLowerCase();
    switch (mode) {
        case "docker":
            return dockerExecutor;
        case "host":
            return hostExecutor;
        default:
            throw new Error(
                `Invalid ARENA_RUNNER="${mode}" (expected "docker" or "host").`,
            );
    }
}
