"use client";

import { useEffect, useRef } from "react";
import { apiFetch } from "@/lib/api-client";
import { HEARTBEAT_INTERVAL_SECONDS } from "@/lib/session-time";

/**
 * Beat the session's heartbeat while the arena tab is visible, so elapsed time
 * reflects work rather than wall clock since the session row was created.
 *
 * Beats on mount, on every interval, and whenever the tab becomes visible
 * again. It deliberately does NOT beat while hidden: a laptop shut overnight
 * with the arena open should not accrue eight hours. The server caps what any
 * single beat is worth, so the gap on returning credits about one interval
 * rather than the whole absence.
 *
 * Failures are swallowed. A dropped beat costs at most one interval of credit,
 * and an error toast over a background timer would be noise - the visible
 * failure modes (submit, run, save) already report themselves.
 */
export function useSessionHeartbeat(sessionId: string | null, active: boolean) {
    // Held in a ref so the effect below doesn't re-subscribe on every beat.
    const inFlight = useRef(false);

    useEffect(() => {
        if (!sessionId || !active) return;

        let cancelled = false;

        async function beat() {
            // Skip if the tab is hidden or a previous beat is still running -
            // a slow request must not queue up behind itself.
            if (document.visibilityState !== "visible") return;
            if (inFlight.current) return;
            inFlight.current = true;
            try {
                await apiFetch(`/api/sessions/${sessionId}/heartbeat`, {
                    method: "POST",
                });
            } catch {
                // See above - a missed beat is self-correcting.
            } finally {
                if (!cancelled) inFlight.current = false;
            }
        }

        void beat();
        const timer = setInterval(beat, HEARTBEAT_INTERVAL_SECONDS * 1000);

        // Re-anchor on return so the away stretch is capped once, immediately,
        // rather than sitting until the next interval fires.
        function onVisibility() {
            if (document.visibilityState === "visible") void beat();
        }
        document.addEventListener("visibilitychange", onVisibility);

        return () => {
            cancelled = true;
            clearInterval(timer);
            document.removeEventListener("visibilitychange", onVisibility);
        };
    }, [sessionId, active]);
}
