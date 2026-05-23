"use client";

import { useEffect, useState } from "react";
import type { ChallengeDefinition } from "../../../challenges/_schema";
import { useArenaStore } from "@/store/arena";
import { CodeEditor } from "@/components/ide/CodeEditor";
import { TabBar } from "@/components/ide/TabBar";
import { FileExplorer } from "@/components/ide/FileExplorer";
import { ProblemPanel } from "@/components/ide/ProblemPanel";
import { HintPanel } from "@/components/ide/HintPanel";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

type RightPane = "problem" | "hints";

interface SandboxClientProps {
  challenge: ChallengeDefinition;
}

/**
 * Temporary sandbox that mocks the arena layout so we can verify the
 * Phase-4 side panels in isolation. Hydrates the store with a real
 * challenge and a fake fileState (no /api/sessions call). Replaced by
 * the real /challenges/[slug]/arena route in PR 4.6.
 */
export function SandboxClient({ challenge }: SandboxClientProps) {
  const setChallenge = useArenaStore((s) => s.setChallenge);
  const setSession = useArenaStore((s) => s.setSession);
  const activeFile = useArenaStore((s) => s.activeFile);
  const fileContents = useArenaStore((s) => s.fileContents);
  const setFileContent = useArenaStore((s) => s.setFileContent);
  const reset = useArenaStore((s) => s.reset);

  const [rightPane, setRightPane] = useState<RightPane>("problem");

  useEffect(() => {
    setChallenge(challenge);

    // Build a fake fileState from the challenge's editable files so the
    // store behaves as if a session had hydrated.
    const fileState: Record<string, string> = {};
    for (const f of challenge.files) fileState[f.path] = f.content;
    for (const f of challenge.testFiles) fileState[f.path] = f.content;

    setSession({
      id: "sandbox",
      userId: "sandbox",
      challengeSlug: challenge.meta.slug,
      status: "IN_PROGRESS",
      startedAt: new Date().toISOString(),
      completedAt: null,
      hintsUsed: 0,
      attemptsCount: 0,
      timeTaken: null,
      score: null,
      fileState,
    });

    return () => {
      reset();
    };
  }, [challenge, setChallenge, setSession, reset]);

  const activeFileMeta = activeFile
    ? challenge.files.find((f) => f.path === activeFile) ??
      challenge.testFiles.find((f) => f.path === activeFile) ??
      null
    : null;
  const isReadOnly = activeFileMeta?.readOnly ?? false;
  const language = activeFileMeta?.language ?? "plaintext";
  const content = activeFile ? fileContents[activeFile] ?? "" : "";

  return (
    <div className="flex h-screen flex-col bg-vscode-bg text-vscode-fg">
      <header className="flex h-9 items-center justify-between border-b border-vscode-border bg-vscode-titlebar px-3">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium">
            Sandbox — Phase 4 side panels
          </span>
          <Badge tone="warning" size="sm">
            TEMP — delete in PR 4.6
          </Badge>
        </div>
        <span className="font-mono text-[11px] text-vscode-fg-muted">
          {challenge.meta.slug}
        </span>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-56 shrink-0 border-r border-vscode-border">
          <FileExplorer />
        </aside>

        <section className="flex flex-1 flex-col overflow-hidden">
          <TabBar />
          <div className="flex-1 overflow-hidden">
            {activeFile ? (
              <CodeEditor
                value={content}
                language={language}
                path={activeFile}
                readOnly={isReadOnly}
                onChange={(next) => setFileContent(activeFile, next)}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-vscode-fg-subtle">
                Open a file from the explorer
              </div>
            )}
          </div>
        </section>

        <aside className="flex w-96 shrink-0 flex-col border-l border-vscode-border">
          <div className="flex h-9 shrink-0 items-stretch border-b border-vscode-border bg-vscode-bg-elevated">
            <PaneTab
              active={rightPane === "problem"}
              onClick={() => setRightPane("problem")}
            >
              Problem
            </PaneTab>
            <PaneTab
              active={rightPane === "hints"}
              onClick={() => setRightPane("hints")}
            >
              Hints
            </PaneTab>
          </div>
          <div className="flex-1 overflow-hidden">
            {rightPane === "problem" ? <ProblemPanel /> : <HintPanel />}
          </div>
        </aside>
      </div>
    </div>
  );
}

interface PaneTabProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function PaneTab({ active, onClick, children }: PaneTabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative px-4 text-xs font-medium",
        active
          ? "bg-vscode-bg-elevated text-vscode-fg"
          : "text-vscode-fg-muted hover:bg-vscode-tab-hover hover:text-vscode-fg"
      )}
    >
      {children}
      {active ? (
        <span className="absolute inset-x-0 top-0 h-0.5 bg-vscode-accent" />
      ) : null}
    </button>
  );
}
