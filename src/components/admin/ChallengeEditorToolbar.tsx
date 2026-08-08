"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ChallengeStatusBadge } from "./ChallengeStatusBadge";
import type { ChallengeStatus, DraftBusy } from "./useChallengeDraft";

/**
 * Identity and actions for the challenge being edited.
 *
 * Each save button is disabled when it would be a no-op for the current
 * status: republishing unchanged content would bump the version and write an
 * identical snapshot, and re-saving an unchanged draft would do nothing at all.
 *
 * The asymmetry is deliberate. "Save draft" stays live on a published,
 * unchanged challenge because there it means unpublish - the only way to take
 * a challenge offline. "Publish" stays live on an unchanged draft because
 * there it means go live.
 */
export interface ChallengeEditorToolbarProps {
    title: string;
    slug: string;
    version: number;
    status: ChallengeStatus;
    dirty: boolean;
    busy: DraftBusy;
    historyOpen: boolean;
    onToggleHistory: () => void;
    onValidate: () => void;
    onSave: (status: ChallengeStatus) => void;
}

export function ChallengeEditorToolbar({
    title,
    slug,
    version,
    status,
    dirty,
    busy,
    historyOpen,
    onToggleHistory,
    onValidate,
    onSave,
}: ChallengeEditorToolbarProps) {
    const publishIsNoop = status === "PUBLISHED" && !dirty;
    const draftIsNoop = status === "DRAFT" && !dirty;

    return (
        <div className="flex flex-wrap items-center gap-3 border-b border-vscode-border px-4 py-2">
            <div className="min-w-0">
                <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">
                        {title}
                    </span>
                    <ChallengeStatusBadge status={status} />
                    {dirty ? (
                        <Badge size="sm" tone="warning">
                            Unsaved
                        </Badge>
                    ) : null}
                </div>
                <div className="text-[11px] text-vscode-fg-subtle">
                    {/* Version 0 means nothing has been published yet, and "v0" would
              read as a real version rather than the absence of one. */}
                    {slug} · {version > 0 ? `v${version}` : "not published yet"}
                </div>
            </div>

            <div className="ml-auto flex items-center gap-2">
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={onToggleHistory}
                    aria-pressed={historyOpen}
                    title="Published version history"
                >
                    History
                </Button>
                <Button
                    size="sm"
                    variant="ghost"
                    loading={busy === "validate"}
                    disabled={busy !== null}
                    onClick={onValidate}
                >
                    Validate
                </Button>
                <Button
                    size="sm"
                    variant="secondary"
                    loading={busy === "draft"}
                    disabled={busy !== null || draftIsNoop}
                    title={
                        draftIsNoop
                            ? "No unsaved changes"
                            : status === "PUBLISHED"
                              ? "Save as a draft - this unpublishes the challenge"
                              : undefined
                    }
                    onClick={() => onSave("DRAFT")}
                >
                    Save draft
                </Button>
                <Button
                    size="sm"
                    loading={busy === "publish"}
                    disabled={busy !== null || publishIsNoop}
                    title={
                        publishIsNoop
                            ? "Already published, with no unsaved changes"
                            : undefined
                    }
                    onClick={() => onSave("PUBLISHED")}
                >
                    Publish
                </Button>
            </div>
        </div>
    );
}
