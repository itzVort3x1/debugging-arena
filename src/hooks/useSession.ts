"use client";

import { useEffect, useState } from "react";
import { useArenaStore } from "@/store/arena";
import type { DebugSessionResponse } from "@/types/session";

interface UseSessionResult {
    session: DebugSessionResponse | null;
    isLoading: boolean;
    error: string | null;
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

    useEffect(() => {
        if (!challengeSlug) return;
        let cancelled = false;

        async function load(slug: string) {
            setIsLoading(true);
            setError(null);
            try {
                const res = await fetch("/api/sessions", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ challengeSlug: slug }),
                });
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    throw new Error(
                        body.error ?? `Request failed: ${res.status}`,
                    );
                }
                const data: DebugSessionResponse = await res.json();
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
    }, [challengeSlug, setSession]);

    return { session, isLoading, error };
}
