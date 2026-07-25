"use client";

import { useCallback, useState } from "react";
import { useArenaStore } from "@/store/arena";
import { apiFetch } from "@/lib/api-client";
import type { DebugSessionResponse } from "@/types/session";

interface UseLanguageSwitchResult {
    /** The language the current session is in, or null before it resolves. */
    currentLanguage: string | null;
    /** Switch the workspace to `language`. No-op if already there or busy. */
    switchTo: (language: string) => void;
    /** True while a switch is in flight. */
    switching: boolean;
    /** Last switch error, or null. */
    error: string | null;
}

/**
 * Drives the arena language switcher. On switch it:
 *   1. flushes the current buffer to its session (best-effort autosave),
 *   2. resolves the session for the target language (resume or create), and
 *   3. swaps the challenge variant + session in the store via loadVariant.
 *
 * Reveal state is shared per (user, challenge), so the target session already
 * reflects any hints/solution seen in the previous language.
 */
export function useLanguageSwitch(): UseLanguageSwitchResult {
    const session = useArenaStore((s) => s.session);
    const variants = useArenaStore((s) => s.variants);
    const loadVariant = useArenaStore((s) => s.loadVariant);

    const [switching, setSwitching] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const switchTo = useCallback(
        async (language: string) => {
            if (!session || switching) return;
            if (language === session.language) return;
            const target = variants?.[language as keyof typeof variants];
            if (!target) return;

            setSwitching(true);
            setError(null);
            try {
                // Flush the current language's buffer first so switching back
                // resumes exactly where the user left off. A submitted session
                // is locked (PATCH 409s) - that's fine, nothing to save.
                const snapshot = useArenaStore.getState().fileContents;
                try {
                    await apiFetch(`/api/sessions/${session.id}`, {
                        method: "PATCH",
                        json: { fileState: snapshot },
                    });
                } catch {
                    // Best-effort: a locked/submitted session can't be saved.
                }

                const next = await apiFetch<DebugSessionResponse>(
                    "/api/sessions",
                    {
                        method: "POST",
                        json: {
                            challengeSlug: session.challengeSlug,
                            language,
                        },
                        fallbackError: "Failed to switch language",
                    },
                );
                loadVariant(target, next);
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Failed to switch language",
                );
            } finally {
                setSwitching(false);
            }
        },
        [session, switching, variants, loadVariant],
    );

    return {
        currentLanguage: session?.language ?? null,
        switchTo,
        switching,
        error,
    };
}
