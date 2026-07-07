"use client";

import { useCallback, useEffect, useState } from "react";
import { useArenaStore } from "@/store/arena";
import { apiFetch } from "@/lib/api-client";
import type { DebugSessionResponse } from "@/types/session";

interface UseSessionResult {
    session: DebugSessionResponse | null;
    isLoading: boolean;
    error: string | null;
    /** Re-run the session fetch (e.g. from a "Try again" button). */
    reload: () => void;
}

/**
 * Resolves the user's DebugSession for a challenge by POSTing to
 * /api/sessions. The endpoint is idempotent - it resumes the latest
 * IN_PROGRESS session or creates a new one. The hydrated session is
 * written into the arena store.
 *
 * Assumes the caller has already populated the challenge in the store so
 * setSession can seed the first open tab from the editable file list.
 */
export function useSession(challengeSlug: string | null): UseSessionResult {
    const session = useArenaStore((s) => s.session);
    const setSession = useArenaStore((s) => s.setSession);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [reloadCount, setReloadCount] = useState(0);

    const reload = useCallback(() => setReloadCount((n) => n + 1), []);

    useEffect(() => {
        if (!challengeSlug) return;
        let cancelled = false;

        async function load(slug: string) {
            setIsLoading(true);
            setError(null);
            try {
                const data = await apiFetch<DebugSessionResponse>(
                    "/api/sessions",
                    { method: "POST", json: { challengeSlug: slug } },
                );
                if (!cancelled) setSession(data);
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : "Failed to load session",
                    );
                }
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        }

        load(challengeSlug);
        return () => {
            cancelled = true;
        };
    }, [challengeSlug, setSession, reloadCount]);

    return { session, isLoading, error, reload };
}
