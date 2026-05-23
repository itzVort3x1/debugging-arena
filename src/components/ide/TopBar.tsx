"use client";

import Link from "next/link";
import { useArenaStore } from "@/store/arena";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { RunButton } from "./RunButton";

const DIFFICULTY_TONE = {
  easy: "success",
  medium: "warning",
  hard: "error",
} as const;

interface TopBarProps {
  /** Optional slot rendered to the left of the action buttons. */
  leftExtra?: React.ReactNode;
}

export function TopBar({ leftExtra }: TopBarProps) {
  const challenge = useArenaStore((s) => s.challenge);

  return (
    <header className="flex h-11 shrink-0 items-center justify-between border-b border-vscode-border bg-vscode-titlebar px-3">
      <div className="flex min-w-0 items-center gap-3">
        <Link
          href="/"
          className="shrink-0 text-xs text-vscode-fg-muted transition-colors hover:text-vscode-fg"
        >
          ← All challenges
        </Link>
        {challenge ? (
          <>
            <span className="text-vscode-border-subtle">|</span>
            <span className="truncate text-sm font-medium text-vscode-fg">
              {challenge.meta.title}
            </span>
            <Badge tone={DIFFICULTY_TONE[challenge.meta.difficulty]} size="sm">
              {challenge.meta.difficulty}
            </Badge>
            {leftExtra}
          </>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <RunButton />
        <Button
          size="sm"
          variant="secondary"
          disabled
          title="Submit unlocks in Phase 6"
        >
          Submit
        </Button>
      </div>
    </header>
  );
}
