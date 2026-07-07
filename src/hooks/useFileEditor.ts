"use client";

import { useCallback, useEffect, useRef } from "react";
import { useArenaStore } from "@/store/arena";
import { apiFetch } from "@/lib/api-client";

const AUTOSAVE_DEBOUNCE_MS = 1500;

interface UseFileEditorResult {
  activeFile: string | null;
  /** Live editor contents for the active file, or "" if none open. */
  content: string;
  /** Whether the active file is read-only (test file, etc.). */
  isReadOnly: boolean;
  /** Monaco language id for the active file. */
  language: string;
  /** Update the active file's contents; triggers debounced autosave. */
  setContent: (next: string) => void;
}

/**
 * Bridges the active Monaco buffer with the arena store and the
 * sessions PATCH endpoint. Calls to `setContent` write to the store
 * immediately and schedule a debounced flush of the full `fileContents`
 * map to the server.
 */
export function useFileEditor(): UseFileEditorResult {
  const activeFile = useArenaStore((s) => s.activeFile);
  const fileContents = useArenaStore((s) => s.fileContents);
  const setFileContent = useArenaStore((s) => s.setFileContent);
  const session = useArenaStore((s) => s.session);
  const challenge = useArenaStore((s) => s.challenge);
  const setSaveStatus = useArenaStore((s) => s.setSaveStatus);
  const markSaved = useArenaStore((s) => s.markSaved);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflightRef = useRef<AbortController | null>(null);

  // Look up file metadata from the challenge spec. Test files are read-only
  // and never appear in challenge.files, so we check both lists.
  const fileMeta =
    challenge?.files.find((f) => f.path === activeFile) ??
    challenge?.testFiles.find((f) => f.path === activeFile) ??
    null;

  const content = activeFile ? fileContents[activeFile] ?? "" : "";
  // A file is read-only if the spec says so, OR the session is no longer
  // editable (submitted). The whole workspace freezes on submit.
  const sessionLocked = !!session && session.status !== "IN_PROGRESS";
  const isReadOnly = (fileMeta?.readOnly ?? false) || sessionLocked;
  const language = fileMeta?.language ?? "plaintext";

  const flush = useCallback(async () => {
    if (!session) return;
    const snapshot = useArenaStore.getState().fileContents;

    inflightRef.current?.abort();
    const ctrl = new AbortController();
    inflightRef.current = ctrl;

    setSaveStatus("saving");
    try {
      await apiFetch(`/api/sessions/${session.id}`, {
        method: "PATCH",
        json: { fileState: snapshot },
        signal: ctrl.signal,
        fallbackError: `Save failed`,
      });
      markSaved();
    } catch (err) {
      if (ctrl.signal.aborted) return;
      setSaveStatus(
        "error",
        err instanceof Error ? err.message : "Save failed"
      );
    }
  }, [session, setSaveStatus, markSaved]);

  const setContent = useCallback(
    (next: string) => {
      if (!activeFile || isReadOnly) return;
      setFileContent(activeFile, next);

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(flush, AUTOSAVE_DEBOUNCE_MS);
    },
    [activeFile, isReadOnly, setFileContent, flush]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      inflightRef.current?.abort();
    };
  }, []);

  return { activeFile, content, isReadOnly, language, setContent };
}
