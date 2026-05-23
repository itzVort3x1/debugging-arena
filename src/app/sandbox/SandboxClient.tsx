"use client";

import { useEffect, useState } from "react";
import type { ChallengeDefinition } from "../../../challenges/_schema";
import { useArenaStore } from "@/store/arena";
import { CodeEditor } from "@/components/ide/CodeEditor";
import { TabBar } from "@/components/ide/TabBar";
import { FileExplorer } from "@/components/ide/FileExplorer";
import { ProblemPanel } from "@/components/ide/ProblemPanel";
import { HintPanel } from "@/components/ide/HintPanel";
import { TopBar } from "@/components/ide/TopBar";
import { TerminalPanel } from "@/components/ide/TerminalPanel";
import { StatusBar } from "@/components/ide/StatusBar";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

type RightPane = "problem" | "hints";

interface SandboxClientProps {
  challenge: ChallengeDefinition;
}

/**
 * Temporary sandbox that mocks the arena layout so we can verify the
 * Phase-4 panels in isolation. Hydrates the store with a real challenge
 * and a fake fileState (no /api/sessions call). Replaced by the real
 * /challenges/[slug]/arena route in PR 4.6.
 *
 * The save status here is faked on edit so the StatusBar indicator has
 * something to display — real autosave wiring is PR 4.6.
 */
export function SandboxClient({ challenge }: SandboxClientProps) {
  const setChallenge = useArenaStore((s) => s.setChallenge);
  const setSession = useArenaStore((s) => s.setSession);
  const activeFile = useArenaStore((s) => s.activeFile);
  const fileContents = useArenaStore((s) => s.fileContents);
  const setFileContent = useArenaStore((s) => s.setFileContent);
  const setSaveStatus = useArenaStore((s) => s.setSaveStatus);
  const markSaved = useArenaStore((s) => s.markSaved);
  const terminalOpen = useArenaStore((s) => s.terminalOpen);
  const reset = useArenaStore((s) => s.reset);

  const [rightPane, setRightPane] = useState<RightPane>("problem");

  useEffect(() => {
    setChallenge(challenge);
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
    return () => reset();
  }, [challenge, setChallenge, setSession, reset]);

  const activeFileMeta = activeFile
    ? challenge.files.find((f) => f.path === activeFile) ??
      challenge.testFiles.find((f) => f.path === activeFile) ??
      null
    : null;
  const isReadOnly = activeFileMeta?.readOnly ?? false;
  const language = activeFileMeta?.language ?? "plaintext";
  const content = activeFile ? fileContents[activeFile] ?? "" : "";

  function handleEdit(next: string) {
    if (!activeFile || isReadOnly) return;
    setFileContent(activeFile, next);
    setSaveStatus("saving");
    // Fake autosave so StatusBar shows live transitions in the sandbox.
    window.setTimeout(() => markSaved(), 600);
  }

  return (
    <div className="flex h-screen flex-col bg-vscode-bg text-vscode-fg">
      <TopBar
        leftExtra={
          <Badge tone="warning" size="sm">
            SANDBOX
          </Badge>
        }
      />

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
                onChange={handleEdit}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-vscode-fg-subtle">
                Open a file from the explorer
              </div>
            )}
          </div>
          {terminalOpen ? (
            <div className="h-48 shrink-0 border-t border-vscode-border">
              <TerminalPanel />
            </div>
          ) : null}
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

      <StatusBar />
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
