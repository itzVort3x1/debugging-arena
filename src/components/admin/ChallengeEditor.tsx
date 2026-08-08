"use client";

import { useState } from "react";
import { CodeEditor } from "@/components/ide/CodeEditor";
import { languageFromPath } from "@/lib/challenges/loader";
import { ChallengeEditorToolbar } from "./ChallengeEditorToolbar";
import { ChallengeFileTree } from "./ChallengeFileTree";
import { ChallengeHistoryPanel } from "./ChallengeHistoryPanel";
import { ValidationSummary } from "./ValidationSummary";
import {
    useChallengeDraft,
    type ChallengeStatus,
    type ChallengeTree,
} from "./useChallengeDraft";

/**
 * The admin challenge editor: a file tree, Monaco, and the save actions.
 *
 * Composition only - every piece of state and every server call lives in
 * `useChallengeDraft`, and each region is its own presentational component.
 */
export interface ChallengeEditorProps {
    slug: string;
    title: string;
    initialTree: ChallengeTree;
    initialStatus: ChallengeStatus;
    version: number;
}

export function ChallengeEditor({
    slug,
    title,
    initialTree,
    initialStatus,
    version,
}: ChallengeEditorProps) {
    const draft = useChallengeDraft({
        slug,
        initialTree,
        initialStatus,
        initialVersion: version,
    });
    const [historyOpen, setHistoryOpen] = useState(false);

    return (
        <div className="flex h-[calc(100vh-3.25rem)] flex-col">
            <ChallengeEditorToolbar
                title={title}
                slug={slug}
                version={draft.version}
                status={draft.status}
                dirty={draft.dirty}
                busy={draft.busy}
                historyOpen={historyOpen}
                onToggleHistory={() => setHistoryOpen((open) => !open)}
                onValidate={draft.validate}
                onSave={draft.save}
            />

            <ValidationSummary errors={draft.errors} notice={draft.notice} />

            <div className="flex min-h-0 flex-1">
                <ChallengeFileTree
                    paths={draft.paths}
                    activePath={draft.activePath}
                    onSelect={draft.selectFile}
                    onAdd={draft.addFile}
                    onDelete={draft.deleteFile}
                />

                <div className="min-w-0 flex-1">
                    {draft.activePath ? (
                        <CodeEditor
                            key={draft.activePath}
                            value={draft.tree[draft.activePath] ?? ""}
                            language={languageFromPath(draft.activePath)}
                            path={`${slug}/${draft.activePath}`}
                            onChange={(next) =>
                                draft.setFile(draft.activePath, next)
                            }
                        />
                    ) : (
                        <div className="flex h-full items-center justify-center text-xs text-vscode-fg-muted">
                            No file selected
                        </div>
                    )}
                </div>

                {historyOpen ? (
                    <ChallengeHistoryPanel
                        slug={slug}
                        currentTree={draft.tree}
                        onLoad={draft.loadTree}
                        onClose={() => setHistoryOpen(false)}
                    />
                ) : null}
            </div>
        </div>
    );
}
