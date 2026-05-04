"use client";

import { useEffect, useState } from "react";
import { useArenaStore, type LockedHint } from "@/store/arena";
import type { ChallengeDefinition } from "@/types/challenge";
import type { DebugSessionResponse } from "@/types/session";

const AUTOSAVE_DEBOUNCE_MS = 800;

/** Shape of the GET /api/challenges/[slug] response. */
interface ChallengeApiResponse {
  meta: ChallengeDefinition["meta"];
  description: string;
  files: ChallengeDefinition["files"];
  testFiles: ChallengeDefinition["testFiles"];
  hints: LockedHint[];
}

export interface UseSessionResult {
  loading: boolean;
  error: string | null;
  /** True while a PATCH is in flight. */
  saving: boolean;
}

/**
 * Loads the challenge + active session into the arena store and wires
 * debounced autosave from store dirty marks back to PATCH /api/sessions/[id].
 *
 * Resets the store on unmount so navigating between arena pages doesn't leak
 * state from the previous challenge.
 */
export function useSession(slug: string): UseSessionResult {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // ----- load -----
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const [chRes, sessRes] = await Promise.all([
          fetch(`/api/challenges/${encodeURIComponent(slug)}`),
          fetch("/api/sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ challengeSlug: slug }),
          }),
        ]);

        if (chRes.status === 404) throw new Error("Challenge not found");
        if (!chRes.ok)
          throw new Error(`Failed to load challenge (${chRes.status})`);
        if (sessRes.status === 401) throw new Error("Not authenticated");
        if (!sessRes.ok)
          throw new Error(`Failed to load session (${sessRes.status})`);

        const challengeApi = (await chRes.json()) as ChallengeApiResponse;
        const session = (await sessRes.json()) as DebugSessionResponse;

        if (cancelled) return;

        const { initialize, setLockedHints } = useArenaStore.getState();
        initialize({
          challenge: {
            meta: challengeApi.meta,
            description: challengeApi.description,
            files: challengeApi.files,
            testFiles: challengeApi.testFiles,
            hints: [], // hint content fetched lazily via /sessions/[id]/hint
          },
          session,
        });
        setLockedHints(challengeApi.hints);
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Unknown error");
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  // ----- reset on unmount -----
  useEffect(() => {
    return () => {
      useArenaStore.getState().reset();
    };
  }, []);

  // ----- autosave -----
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let inFlight = false;

    const flush = async () => {
      timer = null;
      if (inFlight) return; // current save will reschedule on completion

      const state = useArenaStore.getState();
      if (!state.sessionId) return;
      if (Object.keys(state.dirtyFiles).length === 0) return;

      const snapshot = { ...state.files };
      inFlight = true;
      setSaving(true);
      try {
        const res = await fetch(`/api/sessions/${state.sessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileState: snapshot }),
        });
        if (res.ok) {
          useArenaStore.getState().markSavedSnapshot(snapshot);
        }
      } catch {
        // Network error — leave marks intact; next change will retry.
      } finally {
        inFlight = false;
        setSaving(false);
        // If anything is still dirty (user typed during the save), reschedule.
        if (
          Object.keys(useArenaStore.getState().dirtyFiles).length > 0
        ) {
          schedule();
        }
      }
    };

    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(flush, AUTOSAVE_DEBOUNCE_MS);
    };

    const unsubscribe = useArenaStore.subscribe((state, prev) => {
      if (state.files === prev.files) return;
      if (Object.keys(state.dirtyFiles).length === 0) return;
      schedule();
    });

    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, []);

  return { loading, error, saving };
}
