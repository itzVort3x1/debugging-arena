"use client";

import { useCallback, useMemo, useState } from "react";
import { ApiError, apiFetch } from "@/lib/api-client";

export type ChallengeStatus = "DRAFT" | "PUBLISHED";
export type ChallengeTree = Record<string, string>;

/** Which action is in flight, so each button drives only its own spinner. */
export type DraftBusy = null | "validate" | "draft" | "publish";

interface SaveResponse {
  ok: true;
  version: number;
  status: ChallengeStatus;
  errors: string[];
}

export interface ChallengeDraft {
  tree: ChallengeTree;
  /** Paths in the order the loader itself produces (sorted). */
  paths: string[];
  activePath: string;
  status: ChallengeStatus;
  version: number;
  /** The working tree differs from what was last persisted. */
  dirty: boolean;
  busy: DraftBusy;
  errors: string[] | null;
  notice: string | null;

  selectFile: (path: string) => void;
  setFile: (path: string, content: string) => void;
  addFile: (path: string) => void;
  deleteFile: (path: string) => void;
  validate: () => Promise<void>;
  save: (status: ChallengeStatus) => Promise<void>;
}

export interface UseChallengeDraftOptions {
  slug: string;
  initialTree: ChallengeTree;
  initialStatus: ChallengeStatus;
  initialVersion: number;
}

/** Sorted paths, matching the order the loader itself produces. */
function sortedPaths(tree: ChallengeTree): string[] {
  return Object.keys(tree).sort((a, b) => a.localeCompare(b));
}

/** Same file set with the same contents. */
function sameTree(a: ChallengeTree, b: ChallengeTree): boolean {
  const aKeys = Object.keys(a);
  if (aKeys.length !== Object.keys(b).length) return false;
  return aKeys.every((path) => a[path] === b[path]);
}

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * All the state and server calls behind the admin challenge editor, kept out of
 * the components that render it. The editor is then pure composition, and the
 * same state machine can back the "create challenge" flow without dragging its
 * layout along.
 */
export function useChallengeDraft({
  slug,
  initialTree,
  initialStatus,
  initialVersion,
}: UseChallengeDraftOptions): ChallengeDraft {
  const [tree, setTree] = useState<ChallengeTree>(initialTree);
  /** The tree as last persisted; `dirty` is measured against this. */
  const [savedTree, setSavedTree] = useState<ChallengeTree>(initialTree);
  const [status, setStatus] = useState<ChallengeStatus>(initialStatus);
  const [version, setVersion] = useState(initialVersion);
  const [activePath, setActivePath] = useState<string>(
    () => sortedPaths(initialTree)[0] ?? "",
  );
  const [busy, setBusy] = useState<DraftBusy>(null);
  const [errors, setErrors] = useState<string[] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const paths = useMemo(() => sortedPaths(tree), [tree]);

  // Compared against the saved tree rather than tracked with a flag, so editing
  // a file and undoing the edit correctly reads as "no changes".
  const dirty = useMemo(() => !sameTree(tree, savedTree), [tree, savedTree]);

  const setFile = useCallback((path: string, content: string) => {
    setTree((prev) => ({ ...prev, [path]: content }));
    setNotice(null);
  }, []);

  const addFile = useCallback((path: string) => {
    setTree((prev) => (prev[path] !== undefined ? prev : { ...prev, [path]: "" }));
    setActivePath(path);
  }, []);

  const deleteFile = useCallback(
    (path: string) => {
      setTree((prev) => {
        const next = { ...prev };
        delete next[path];
        if (path === activePath) setActivePath(sortedPaths(next)[0] ?? "");
        return next;
      });
    },
    [activePath],
  );

  const validate = useCallback(async () => {
    setBusy("validate");
    setNotice(null);
    try {
      const res = await apiFetch<{ ok: boolean; errors: string[] }>(
        `/api/admin/challenges/${slug}/validate`,
        { method: "POST", json: { content: tree } },
      );
      setErrors(res.errors);
      if (res.ok) setNotice("Valid — this challenge would publish cleanly.");
    } catch (err) {
      setErrors([messageOf(err)]);
    } finally {
      setBusy(null);
    }
  }, [slug, tree]);

  const save = useCallback(
    async (nextStatus: ChallengeStatus) => {
      setBusy(nextStatus === "PUBLISHED" ? "publish" : "draft");
      setNotice(null);
      try {
        const res = await apiFetch<SaveResponse>(
          `/api/admin/challenges/${slug}`,
          { method: "PUT", json: { content: tree, status: nextStatus } },
        );
        setStatus(res.status);
        setVersion(res.version);
        setErrors(res.errors);
        setSavedTree(tree);
        setNotice(
          nextStatus === "PUBLISHED"
            ? `Published as v${res.version}. Live in the arena.`
            : res.errors.length > 0
              ? "Draft saved — still has problems to fix before publishing."
              : "Draft saved.",
        );
      } catch (err) {
        // A refused publish returns its reasons in the error body.
        const body = err instanceof ApiError ? err.body : undefined;
        const detail = (body as { errors?: string[] } | undefined)?.errors;
        setErrors(detail?.length ? detail : [messageOf(err)]);
      } finally {
        setBusy(null);
      }
    },
    [slug, tree],
  );

  return {
    tree,
    paths,
    activePath,
    status,
    version,
    dirty,
    busy,
    errors,
    notice,
    selectFile: setActivePath,
    setFile,
    addFile,
    deleteFile,
    validate,
    save,
  };
}
