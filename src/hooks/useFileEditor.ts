"use client";

import { useCallback, useMemo } from "react";
import { useArenaStore } from "@/store/arena";
import type { ChallengeFile } from "@/types/challenge";

/**
 * Thin Monaco-friendly view over the arena store.
 *
 * Monaco's `<Editor path={...} defaultValue={...}>` API maintains one model
 * per `path`, which already preserves cursor position and undo history per
 * tab. This hook provides:
 *   - the active tab's content / language / read-only flag
 *   - lookup helpers for sibling files (test files, other editable files)
 *   - an onChange wrapper that pipes Monaco's edits into the store
 */
export function useFileEditor() {
  const setFileContent = useArenaStore((s) => s.setFileContent);
  const challenge = useArenaStore((s) => s.challenge);
  const files = useArenaStore((s) => s.files);
  const activeTab = useArenaStore((s) => s.activeTab);

  const allFiles = useMemo<ChallengeFile[]>(() => {
    if (!challenge) return [];
    return [...challenge.files, ...challenge.testFiles];
  }, [challenge]);

  const findFile = useCallback(
    (path: string) => allFiles.find((f) => f.path === path),
    [allFiles]
  );

  const getLanguage = useCallback(
    (path: string): string => findFile(path)?.language ?? "plaintext",
    [findFile]
  );

  const isReadOnly = useCallback(
    (path: string): boolean => findFile(path)?.readOnly ?? false,
    [findFile]
  );

  /**
   * Returns the current content for `path`. Editable files come from the live
   * store (user edits + autosave). Read-only test files come from the
   * challenge definition.
   */
  const getContent = useCallback(
    (path: string): string => {
      if (path in files) return files[path];
      return findFile(path)?.content ?? "";
    },
    [files, findFile]
  );

  const handleChange = useCallback(
    (path: string, value: string | undefined) => {
      if (value === undefined) return;
      setFileContent(path, value);
    },
    [setFileContent]
  );

  const activeContent = activeTab ? getContent(activeTab) : "";
  const activeLanguage = activeTab ? getLanguage(activeTab) : "plaintext";
  const activeReadOnly = activeTab ? isReadOnly(activeTab) : false;

  return {
    activeTab,
    activeContent,
    activeLanguage,
    activeReadOnly,
    allFiles,
    getContent,
    getLanguage,
    isReadOnly,
    handleChange,
  };
}
