"use client";

import { useState } from "react";
import { useArenaStore } from "@/store/arena";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import { LockOutlineIcon } from "@/components/ui/icons";
import type { DebugSessionResponse } from "@/types/session";

/**
 * Reveals progressive hints with score penalties, plus a final full
 * solution that unlocks only after every hint is revealed and forfeits the
 * score. Reveal state is server-authoritative: the levels live on
 * `session.revealedHintLevels` and `session.solutionRevealed` (persisted via
 * the /hints and /solution endpoints), so they survive reloads and feed
 * scoring at submit time.
 */
export function HintPanel() {
    const challenge = useArenaStore((s) => s.challenge);
    const session = useArenaStore((s) => s.session);
    const mergeSessionMeta = useArenaStore((s) => s.mergeSessionMeta);

    const [pendingLevel, setPendingLevel] = useState<number | null>(null);
    const [pendingSolution, setPendingSolution] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!challenge) {
        return (
            <div className="flex h-full items-center justify-center bg-vscode-bg-elevated p-6 text-sm text-vscode-fg-subtle">
                No challenge loaded
            </div>
        );
    }

    const revealed = new Set(session?.revealedHintLevels ?? []);
    const totalPenalty = challenge.hints
        .filter((h) => revealed.has(h.level))
        .reduce((sum, h) => sum + h.penaltyPoints, 0);

    const solutionRevealed = session?.solutionRevealed ?? false;
    const allHintsRevealed =
        challenge.hints.length > 0 &&
        challenge.hints.every((h) => revealed.has(h.level));
    const busy = pendingLevel !== null || pendingSolution;

    async function reveal(level: number) {
        if (!session) return;
        setPendingLevel(level);
        setError(null);
        try {
            const res = await fetch(`/api/sessions/${session.id}/hints`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ level }),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error ?? `Failed: ${res.status}`);
            }
            const updated: DebugSessionResponse = await res.json();
            mergeSessionMeta(updated);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to reveal hint",
            );
        } finally {
            setPendingLevel(null);
        }
    }

    async function revealSolution() {
        if (!session) return;
        setPendingSolution(true);
        setError(null);
        try {
            const res = await fetch(`/api/sessions/${session.id}/solution`, {
                method: "POST",
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error ?? `Failed: ${res.status}`);
            }
            const updated: DebugSessionResponse = await res.json();
            mergeSessionMeta(updated);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to reveal solution",
            );
        } finally {
            setPendingSolution(false);
        }
    }

    return (
        <div className="flex h-full flex-col overflow-y-auto bg-vscode-bg-elevated">
            <header className="border-b border-vscode-border-subtle bg-vscode-sidebar px-5 py-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-vscode-fg">
                        Hints
                    </h2>
                    {solutionRevealed ? (
                        <Badge tone="error" size="sm">
                            Score forfeited
                        </Badge>
                    ) : revealed.size > 0 ? (
                        <Badge tone="warning" size="sm">
                            −{totalPenalty} pts so far
                        </Badge>
                    ) : null}
                </div>
                <p className="mt-1 text-xs text-vscode-fg-muted">
                    Each hint reduces your final score.
                </p>
                {error ? (
                    <p className="mt-2 text-xs text-vscode-error">{error}</p>
                ) : null}
            </header>

            <div className="space-y-3 px-5 py-4">
                {challenge.hints.length === 0 ? (
                    <p className="text-xs italic text-vscode-fg-subtle">
                        No hints available for this challenge.
                    </p>
                ) : (
                    challenge.hints.map((h) => {
                        const isRevealed = revealed.has(h.level);
                        return (
                            <div
                                key={h.level}
                                className="rounded-md border border-vscode-border-subtle bg-vscode-bg p-3"
                            >
                                <div className="mb-2 flex items-center justify-between gap-2">
                                    <div className="flex min-w-0 items-center gap-2">
                                        <span className="shrink-0 text-xs font-semibold text-vscode-fg">
                                            Level {h.level}
                                        </span>
                                        <span className="truncate text-xs text-vscode-fg-muted">
                                            - {h.title}
                                        </span>
                                    </div>
                                    <Badge tone="warning" size="sm">
                                        −{h.penaltyPoints} pts
                                    </Badge>
                                </div>
                                {isRevealed ? (
                                    <MarkdownRenderer content={h.content} />
                                ) : (
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        loading={pendingLevel === h.level}
                                        disabled={busy || !session}
                                        onClick={() => reveal(h.level)}
                                    >
                                        Reveal hint
                                    </Button>
                                )}
                            </div>
                        );
                    })
                )}

                {challenge.solution ? (
                    <SolutionCard
                        solution={challenge.solution}
                        revealed={solutionRevealed}
                        unlocked={allHintsRevealed}
                        pending={pendingSolution}
                        disabled={busy || !session}
                        onReveal={revealSolution}
                    />
                ) : null}
            </div>
        </div>
    );
}

interface SolutionCardProps {
    solution: string;
    revealed: boolean;
    unlocked: boolean;
    pending: boolean;
    disabled: boolean;
    onReveal: () => void;
}

function SolutionCard({
    solution,
    revealed,
    unlocked,
    pending,
    disabled,
    onReveal,
}: SolutionCardProps) {
    return (
        <div className="mt-2 rounded-md border border-vscode-border bg-vscode-bg p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                    {!revealed && !unlocked ? (
                        <LockOutlineIcon className="h-3.5 w-3.5 shrink-0 text-vscode-fg-subtle" />
                    ) : null}
                    <span className="shrink-0 text-xs font-semibold text-vscode-fg">
                        Solution
                    </span>
                </div>
                <Badge tone={revealed ? "error" : "neutral"} size="sm">
                    {revealed ? "0 pts" : "sets score to 0"}
                </Badge>
            </div>

            {revealed ? (
                <MarkdownRenderer content={solution} />
            ) : unlocked ? (
                <div className="space-y-2">
                    <p className="text-xs text-vscode-fg-muted">
                        Reveals the full worked fix. This{" "}
                        <span className="text-vscode-error">
                            forfeits your score for this challenge
                        </span>{" "}
                        - it can&apos;t be undone.
                    </p>
                    <Button
                        size="sm"
                        variant="danger"
                        loading={pending}
                        disabled={disabled}
                        onClick={onReveal}
                    >
                        Reveal solution
                    </Button>
                </div>
            ) : (
                <p className="text-xs italic text-vscode-fg-subtle">
                    Reveal every hint above to unlock the full solution.
                </p>
            )}
        </div>
    );
}
