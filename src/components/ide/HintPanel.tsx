"use client";

import { useState } from "react";
import { Lightbulb, Lock } from "lucide-react";
import { useArenaStore } from "@/store/arena";
import { Button } from "@/components/ui/Button";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import { cn } from "@/lib/utils";
import type { HintLevelNumber } from "@/types/challenge";

interface RevealResponse {
  content: string;
}

/**
 * Four hint tiles, gated so each level unlocks only after the previous one.
 * Reveal calls POST /api/sessions/[id]/hint — that endpoint lands in Phase 6,
 * so a 404 here is acceptable for now.
 */
export function HintPanel() {
  const sessionId = useArenaStore((s) => s.sessionId);
  const hints = useArenaStore((s) => s.hints);
  const revealHint = useArenaStore((s) => s.revealHint);

  const [pendingLevel, setPendingLevel] = useState<HintLevelNumber | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The next reveal-able level is the lowest locked level whose predecessor
  // (if any) is already revealed.
  const sorted = [...hints].sort((a, b) => a.level - b.level);
  const nextLevel: HintLevelNumber | null = (() => {
    for (let i = 0; i < sorted.length; i++) {
      const h = sorted[i];
      if (h.content !== null) continue;
      const prev = sorted[i - 1];
      if (!prev || prev.content !== null) return h.level;
      return null;
    }
    return null;
  })();

  const handleReveal = async (level: HintLevelNumber) => {
    if (!sessionId) return;
    setPendingLevel(level);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/hint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level }),
      });
      if (!res.ok) throw new Error(`Failed to reveal hint (${res.status})`);
      const data = (await res.json()) as RevealResponse;
      revealHint(level, data.content);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setPendingLevel(null);
    }
  };

  if (sorted.length === 0) {
    return (
      <div className="p-4 text-sm text-vscode-fg-muted">
        No hints available for this challenge.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="border-b border-vscode-border p-4">
        <h3 className="text-sm font-semibold text-vscode-fg">Hints</h3>
        <p className="mt-1 text-xs text-vscode-fg-muted">
          Each hint reduces your final score. Unlock them in order.
        </p>
      </div>

      <div className="flex-1 space-y-3 p-4">
        {sorted.map((hint) => {
          const revealed = hint.content !== null;
          const canReveal = !revealed && nextLevel === hint.level;
          const isPending = pendingLevel === hint.level;

          return (
            <div
              key={hint.level}
              className={cn(
                "rounded border p-3",
                revealed
                  ? "border-vscode-accent/40 bg-vscode-accent/5"
                  : "border-vscode-border bg-vscode-bg-elevated"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  {revealed ? (
                    <Lightbulb
                      size={14}
                      className="shrink-0 text-vscode-accent"
                    />
                  ) : (
                    <Lock
                      size={14}
                      className="shrink-0 text-vscode-fg-muted"
                    />
                  )}
                  <span className="text-xs font-semibold uppercase tracking-wide text-vscode-fg-muted">
                    Level {hint.level}
                  </span>
                  <span className="text-sm text-vscode-fg">{hint.title}</span>
                </div>
                <span className="shrink-0 text-xs text-vscode-error">
                  −{hint.penaltyPoints} pts
                </span>
              </div>

              {revealed ? (
                <div className="mt-3">
                  <MarkdownRenderer content={hint.content ?? ""} />
                </div>
              ) : (
                <div className="mt-3">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!canReveal || isPending}
                    loading={isPending}
                    onClick={() => handleReveal(hint.level)}
                  >
                    {canReveal ? "Reveal hint" : "Locked"}
                  </Button>
                </div>
              )}
            </div>
          );
        })}

        {error && (
          <p className="text-xs text-vscode-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
