"use client";

import { useArenaStore } from "@/store/arena";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import { Badge } from "@/components/ui/Badge";

const DIFFICULTY_TONE = {
  easy: "success",
  medium: "warning",
  hard: "error",
} as const;

export function ProblemPanel() {
  const challenge = useArenaStore((s) => s.challenge);

  if (!challenge) {
    return (
      <div className="flex h-full items-center justify-center bg-vscode-bg-elevated p-6 text-sm text-vscode-fg-subtle">
        No challenge loaded
      </div>
    );
  }

  const { meta, description } = challenge;

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-vscode-bg-elevated">
      <header className="border-b border-vscode-border-subtle bg-vscode-sidebar px-5 py-4">
        <h2 className="mb-2 text-base font-semibold text-vscode-fg">
          {meta.title}
        </h2>
        <div className="mb-3 flex flex-wrap gap-1.5">
          <Badge tone={DIFFICULTY_TONE[meta.difficulty]} size="sm">
            {meta.difficulty}
          </Badge>
          {meta.stack.map((s) => (
            <Badge key={s} tone="info" size="sm">
              {s}
            </Badge>
          ))}
          {meta.tags.map((t) => (
            <Badge key={t} tone="neutral" size="sm">
              {t}
            </Badge>
          ))}
        </div>
        <p className="border-l-2 border-vscode-accent/60 pl-3 text-xs italic text-vscode-fg-muted">
          {meta.issueContext}
        </p>
      </header>
      <div className="px-5 py-4">
        <MarkdownRenderer content={description} />
      </div>
    </div>
  );
}
