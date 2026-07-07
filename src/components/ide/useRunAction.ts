"use client";

import { useCallback, useState } from "react";
import { useArenaStore } from "@/store/arena";
import { useRunStream, type RunStreamOptions } from "./useRunStream";

export interface RunAction {
    /** This button's own run is in flight (drives its spinner). */
    pending: boolean;
    /** Session is submitted / read-only - no runs allowed. */
    locked: boolean;
    /** A run is active, but not the one this button started. */
    runningElsewhere: boolean;
    /** Start a run, managing the pending flag and the shared guards. */
    start: (options: RunStreamOptions) => Promise<void>;
}

/**
 * Shared state machine behind the Run buttons. Owns the per-button `pending`
 * flag, the `locked`/`runningElsewhere` derivations, and the guarded
 * pending-wrapped call into {@link useRunStream}. Callers supply only the
 * run options and their own extra enablement (e.g. "is this file runnable").
 */
export function useRunAction(): RunAction {
    const { run, isRunning } = useRunStream();
    const session = useArenaStore((s) => s.session);

    // Local so only this button spins; a run started elsewhere just disables it.
    const [pending, setPending] = useState(false);
    const locked = !!session && session.status !== "IN_PROGRESS";

    const start = useCallback(
        async (options: RunStreamOptions) => {
            if (isRunning || !session || locked) return;
            setPending(true);
            try {
                await run(options);
            } finally {
                setPending(false);
            }
        },
        [isRunning, session, locked, run],
    );

    return { pending, locked, runningElsewhere: isRunning && !pending, start };
}
