"use client";

import { useState } from "react";
import { useArenaStore } from "@/store/arena";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import type { DebugSessionResponse } from "@/types/session";

/**
 * Reveals progressive hints with score penalties. Reveal state is
 * server-authoritative: the levels live on `session.revealedHintLevels`
 * (persisted via POST /api/sessions/:id/hints), so they survive reloads
 * and feed scoring at submit time.
 */
export function HintPanel() {
  const challenge = useArenaStore((s) => s.challenge);
  const session = useArenaStore((s) => s.session);
  const mergeSessionMeta = useArenaStore((s) => s.mergeSessionMeta);

  const [pendingLevel, setPendingLevel] = useState<number | null>(null);
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
      setError(err instanceof Error ? err.message : "Failed to reveal hint");
    } finally {
      setPendingLevel(null);
    }
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-vscode-bg-elevated">
      <header className="border-b border-vscode-border-subtle bg-vscode-sidebar px-5 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-vscode-fg">Hints</h2>
          {revealed.size > 0 ? (
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
                      — {h.title}
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
                    disabled={pendingLevel !== null || !session}
                    onClick={() => reveal(h.level)}
                  >
                    Reveal hint
                  </Button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
