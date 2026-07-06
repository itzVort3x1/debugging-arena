"use client";

import { useState } from "react";
import { useArenaStore } from "@/store/arena";
import { useFileEditor } from "@/hooks/useFileEditor";
import { CodeEditor } from "./CodeEditor";
import { TabBar } from "./TabBar";
import { FileExplorer } from "./FileExplorer";
import { ProblemPanel } from "./ProblemPanel";
import { HintPanel } from "./HintPanel";
import { TopBar } from "./TopBar";
import { TerminalDock } from "./TerminalDock";
import { StatusBar } from "./StatusBar";
import { cn } from "@/lib/utils";

type RightPane = "problem" | "hints";

/**
 * The real arena layout. Assumes the store has already been hydrated by
 * the parent (challenge + session). Pulls editor state from
 * `useFileEditor`, which also handles debounced autosave.
 */
export function ArenaLayout() {
  const terminalOpen = useArenaStore((s) => s.terminalOpen);
  const [rightPane, setRightPane] = useState<RightPane>("problem");
  const editor = useFileEditor();

  return (
    <div className="flex h-screen flex-col bg-vscode-bg text-vscode-fg">
      <TopBar />

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-56 shrink-0 border-r border-vscode-border">
          <FileExplorer />
        </aside>

        <section className="flex flex-1 flex-col overflow-hidden">
          <TabBar />
          <div className="min-h-0 flex-1 overflow-hidden">
            {editor.activeFile ? (
              <CodeEditor
                value={editor.content}
                language={editor.language}
                path={editor.activeFile}
                readOnly={editor.isReadOnly}
                onChange={editor.setContent}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-vscode-fg-subtle">
                Open a file from the explorer
              </div>
            )}
          </div>
          {terminalOpen ? <TerminalDock /> : null}
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
