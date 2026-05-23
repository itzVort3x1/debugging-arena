"use client";

import { useState } from "react";
import { useArenaStore } from "@/store/arena";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";

/**
 * Reveals progressive hints with score penalties. The reveal state is
 * local — hint-use tracking and score adjustments land in Phase 6 once
 * the server-side scoring contract exists.
 */
export function HintPanel() {
  const challenge = useArenaStore((s) => s.challenge);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());

  if (!challenge) {
    return (
      <div className="flex h-full items-center justify-center bg-vscode-bg-elevated p-6 text-sm text-vscode-fg-subtle">
        No challenge loaded
      </div>
    );
  }

  const totalPenalty = challenge.hints
    .filter((h) => revealed.has(h.level))
    .reduce((sum, h) => sum + h.penaltyPoints, 0);

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
                    onClick={() =>
                      setRevealed((prev) => {
                        const next = new Set(prev);
                        next.add(h.level);
                        return next;
                      })
                    }
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
