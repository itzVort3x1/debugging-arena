import os from "node:os";

/**
 * Admission control for challenge runs.
 *
 * Each run consumes a heavyweight resource (a container capped at 512m/1cpu, or
 * a host process). Without a cap, a burst of concurrent "Run" clicks fans out
 * one container per request and can exhaust host memory. This limiter caps how
 * many runs execute at once and queues the rest FIFO; beyond a queue ceiling it
 * rejects fast with `RunnerBusyError` so callers can shed load instead of
 * piling up unboundedly.
 *
 * Scope is per-process. A multi-instance deployment gets this limit per
 * instance (total = limit x instances); a cross-host global cap would need a
 * shared queue (Redis/worker fleet), which is out of scope here.
 */

/** Thrown by `acquire` when the queue is full — callers should shed load. */
export class RunnerBusyError extends Error {
    readonly code = "RUNNER_BUSY";
    constructor(
        message = "The test runner is at capacity right now. Please try again in a moment.",
    ) {
        super(message);
        this.name = "RunnerBusyError";
        // Keep `instanceof RunnerBusyError` working even when compiled to a
        // target where extending Error otherwise breaks the prototype chain.
        Object.setPrototypeOf(this, RunnerBusyError.prototype);
    }
}

/** Rejected acquire when the caller aborts before a slot is granted. */
function abortError(): Error {
    const err = new Error("Run aborted before it started.");
    err.name = "AbortError";
    return err;
}

interface AcquireOptions {
    /** Aborting while queued drops the waiter and rejects — never starts a run. */
    signal?: AbortSignal;
    /** Called once, only if the request has to wait for a slot. */
    onQueued?: () => void;
}

interface Waiter {
    resolve: (release: () => void) => void;
    reject: (err: Error) => void;
    signal?: AbortSignal;
    onAbort?: () => void;
}

export class RunLimiter {
    private active = 0;
    private readonly queue: Waiter[] = [];

    constructor(
        private readonly maxConcurrent: number,
        private readonly maxQueued: number,
    ) {}

    get stats() {
        return {
            active: this.active,
            queued: this.queue.length,
            maxConcurrent: this.maxConcurrent,
            maxQueued: this.maxQueued,
        };
    }

    /**
     * Acquire a run slot. Resolves with a `release` fn (idempotent) that must
     * be called in a `finally` to free the slot. Rejects with `RunnerBusyError`
     * if the queue is full, or an `AbortError` if `signal` fires while queued.
     */
    acquire(opts: AcquireOptions = {}): Promise<() => void> {
        const { signal, onQueued } = opts;

        if (signal?.aborted) return Promise.reject(abortError());

        if (this.active < this.maxConcurrent) {
            this.active++;
            return Promise.resolve(this.makeRelease());
        }

        if (this.queue.length >= this.maxQueued) {
            return Promise.reject(new RunnerBusyError());
        }

        return new Promise<() => void>((resolve, reject) => {
            const waiter: Waiter = { resolve, reject, signal };
            waiter.onAbort = () => {
                const i = this.queue.indexOf(waiter);
                if (i >= 0) this.queue.splice(i, 1);
                reject(abortError());
            };
            signal?.addEventListener("abort", waiter.onAbort, { once: true });
            this.queue.push(waiter);
            onQueued?.();
        });
    }

    /** A one-shot release that frees the slot and promotes the next waiter. */
    private makeRelease(): () => void {
        let released = false;
        return () => {
            if (released) return;
            released = true;
            this.active--;
            this.pump();
        };
    }

    /** Promote queued waiters into freed slots (FIFO). */
    private pump(): void {
        while (this.active < this.maxConcurrent && this.queue.length > 0) {
            const waiter = this.queue.shift()!;
            // Aborted waiters remove themselves via onAbort, so anything still
            // in the queue is live; detach its listener and grant the slot.
            if (waiter.signal && waiter.onAbort) {
                waiter.signal.removeEventListener("abort", waiter.onAbort);
            }
            this.active++;
            waiter.resolve(this.makeRelease());
        }
    }
}

function intFromEnv(name: string, fallback: number): number {
    const raw = process.env[name];
    if (!raw) return fallback;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Process-wide run limiter. Defaults: concurrency = CPU count (each container
 * is pinned to 1 cpu, so ~cores avoids oversubscription), queue depth = 50.
 * Both tunable via ARENA_MAX_CONCURRENT_RUNS / ARENA_MAX_QUEUED_RUNS.
 */
export const runLimiter = new RunLimiter(
    intFromEnv("ARENA_MAX_CONCURRENT_RUNS", Math.max(1, os.cpus().length)),
    intFromEnv("ARENA_MAX_QUEUED_RUNS", 50),
);
