"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { apiFetch } from "@/lib/api-client";
import { summarizeTreeChange, treesMatch } from "@/lib/challenges/tree-diff";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ChallengeTree } from "./useChallengeDraft";

/**
 * Published history for a challenge, with the option to load an old version
 * back into the editor.
 *
 * Loading is not a write. The old content becomes the working copy and the
 * author saves or publishes it through the normal path, which appends a new
 * version rather than rewriting history - so the record of what was live at
 * any point stays intact.
 */
export interface ChallengeHistoryPanelProps {
    slug: string;
    /** The editor's working tree, to describe what a load would change. */
    currentTree: ChallengeTree;
    onLoad: (tree: ChallengeTree, notice: string) => void;
    onClose: () => void;
}

interface VersionSummary {
    version: number;
    createdAt: string;
    note: string | null;
    authorEmail: string | null;
}

interface VersionDetail extends VersionSummary {
    content: ChallengeTree;
}

function ChangeSummary({
    current,
    snapshot,
}: {
    current: ChallengeTree;
    snapshot: ChallengeTree;
}) {
    if (treesMatch(current, snapshot)) {
        return (
            <p className="text-[11px] text-vscode-fg-subtle">
                Identical to what is in the editor now.
            </p>
        );
    }

    // Described as "loading this would do X to the editor", so `from` is the
    // current tree and `to` is the snapshot.
    const { added, removed, modified } = summarizeTreeChange(current, snapshot);
    const groups: [string, string[]][] = [
        ["Restores", added],
        ["Removes", removed],
        ["Changes", modified],
    ];

    return (
        <div className="space-y-1">
            {groups.map(([label, paths]) =>
                paths.length === 0 ? null : (
                    <div key={label} className="text-[11px]">
                        <span className="text-vscode-fg-muted">
                            {label} {paths.length}:
                        </span>{" "}
                        <span className="text-vscode-fg-subtle">
                            {paths.join(", ")}
                        </span>
                    </div>
                ),
            )}
        </div>
    );
}

export function ChallengeHistoryPanel({
    slug,
    currentTree,
    onLoad,
    onClose,
}: ChallengeHistoryPanelProps) {
    const [versions, setVersions] = useState<VersionSummary[] | null>(null);
    const [selected, setSelected] = useState<VersionDetail | null>(null);
    const [loadingVersion, setLoadingVersion] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        apiFetch<{ versions: VersionSummary[] }>(
            `/api/admin/challenges/${slug}/versions`,
        )
            .then((res) => {
                if (!cancelled) setVersions(res.versions);
            })
            .catch((err: unknown) => {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : String(err));
                    setVersions([]);
                }
            });
        return () => {
            cancelled = true;
        };
    }, [slug]);

    const openVersion = useCallback(
        async (version: number) => {
            if (selected?.version === version) {
                setSelected(null);
                return;
            }
            setLoadingVersion(version);
            setError(null);
            try {
                const res = await apiFetch<{ version: VersionDetail }>(
                    `/api/admin/challenges/${slug}/versions/${version}`,
                );
                setSelected(res.version);
            } catch (err) {
                setError(err instanceof Error ? err.message : String(err));
            } finally {
                setLoadingVersion(null);
            }
        },
        [slug, selected],
    );

    return (
        <aside className="flex w-80 shrink-0 flex-col border-l border-vscode-border bg-vscode-sidebar">
            <div className="flex items-center justify-between px-3 py-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-vscode-fg-muted">
                    History
                </span>
                <button
                    type="button"
                    onClick={onClose}
                    title="Close history"
                    className="text-xs text-vscode-fg-subtle hover:text-vscode-fg"
                >
                    ×
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 pb-3">
                {error ? (
                    <p className="mb-2 text-[11px] text-vscode-error">
                        {error}
                    </p>
                ) : null}

                {versions === null ? (
                    <div className="flex justify-center py-6">
                        <Spinner size="sm" />
                    </div>
                ) : versions.length === 0 ? (
                    <EmptyState className="p-4 text-xs">
                        No published versions yet. History records each publish.
                    </EmptyState>
                ) : (
                    <ul className="space-y-1">
                        {versions.map((v) => {
                            const isOpen = selected?.version === v.version;
                            return (
                                <li
                                    key={v.version}
                                    className={cn(
                                        "rounded border border-transparent",
                                        isOpen &&
                                            "border-vscode-border bg-vscode-bg-elevated",
                                    )}
                                >
                                    <button
                                        type="button"
                                        onClick={() =>
                                            void openVersion(v.version)
                                        }
                                        className="flex w-full items-center gap-2 px-2 py-1.5 text-left"
                                    >
                                        <Badge
                                            size="sm"
                                            tone={isOpen ? "accent" : "neutral"}
                                        >
                                            v{v.version}
                                        </Badge>
                                        <span className="min-w-0 flex-1 truncate text-[11px] text-vscode-fg-muted">
                                            {formatRelativeTime(
                                                new Date(v.createdAt),
                                            )}
                                            {v.authorEmail
                                                ? ` · ${v.authorEmail}`
                                                : ""}
                                        </span>
                                        {loadingVersion === v.version ? (
                                            <Spinner size="sm" />
                                        ) : null}
                                    </button>

                                    {isOpen && selected ? (
                                        <div className="space-y-2 border-t border-vscode-border-subtle px-2 py-2">
                                            {selected.note ? (
                                                <p className="text-[11px] text-vscode-fg-muted">
                                                    {selected.note}
                                                </p>
                                            ) : null}
                                            <ChangeSummary
                                                current={currentTree}
                                                snapshot={selected.content}
                                            />
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                className="w-full"
                                                disabled={treesMatch(
                                                    currentTree,
                                                    selected.content,
                                                )}
                                                onClick={() =>
                                                    onLoad(
                                                        selected.content,
                                                        `Loaded v${selected.version} into the editor. Save or publish to apply it.`,
                                                    )
                                                }
                                            >
                                                Load into editor
                                            </Button>
                                        </div>
                                    ) : null}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </aside>
    );
}
