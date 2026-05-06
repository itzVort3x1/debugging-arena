"use client";

import { useArenaStore } from "@/store/arena";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import type { Difficulty } from "@/types/challenge";

const difficultyTone: Record<Difficulty, BadgeTone> = {
  easy: "success",
  medium: "warning",
  hard: "error",
};

export function ProblemPanel() {
  const challenge = useArenaStore((s) => s.challenge);

  if (!challenge) {
    return (
      <div className="p-4 text-sm text-vscode-fg-muted">Loading problem…</div>
    );
  }

  const { meta, description } = challenge;

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="space-y-3 border-b border-vscode-border p-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-base font-semibold text-vscode-fg">
            {meta.title}
          </h2>
          <Badge tone={difficultyTone[meta.difficulty]}>
            {meta.difficulty}
          </Badge>
        </div>

        {meta.stack.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {meta.stack.map((s) => (
              <Badge key={s} tone="info">
                {s}
              </Badge>
            ))}
          </div>
        )}

        <p className="text-xs italic text-vscode-fg-muted">
          {meta.issueContext}
        </p>
      </div>

      <div className="flex-1 p-4">
        <MarkdownRenderer content={description} />
      </div>
    </div>
  );
}
