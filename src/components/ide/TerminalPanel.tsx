"use client";

import { useEffect, useRef } from "react";
import { useArenaStore } from "@/store/arena";
import { ChevronDownIcon } from "@/components/ui/icons";

export function TerminalPanel() {
  const lines = useArenaStore((s) => s.terminalLines);
  const isRunning = useArenaStore((s) => s.isRunning);
  const clearTerminal = useArenaStore((s) => s.clearTerminal);
  const toggleTerminal = useArenaStore((s) => s.toggleTerminal);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines.length, isRunning]);

  return (
    <div className="flex h-full flex-col bg-vscode-panel">
      <header className="flex h-7 shrink-0 items-center justify-between border-b border-vscode-border-subtle bg-vscode-bg-elevated px-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-vscode-fg-muted">
            Terminal
          </span>
          {isRunning ? (
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-vscode-accent" />
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={clearTerminal}
            disabled={lines.length === 0 || isRunning}
            className="text-[11px] text-vscode-fg-muted transition-colors hover:text-vscode-fg disabled:opacity-40 disabled:hover:text-vscode-fg-muted"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={toggleTerminal}
            aria-label="Hide terminal"
            className="text-vscode-fg-muted transition-colors hover:text-vscode-fg"
          >
            <ChevronDownIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-2 font-mono text-[12px] leading-relaxed text-vscode-fg"
      >
        {lines.length === 0 && !isRunning ? (
          <p className="italic text-vscode-fg-subtle">
            Press <span className="font-semibold">Run tests</span> to execute.
          </p>
        ) : (
          lines.map((line, i) => (
            <pre
              key={i}
              className="whitespace-pre-wrap break-words text-vscode-fg"
            >
              {line === "" ? " " : line}
            </pre>
          ))
        )}
      </div>
    </div>
  );
}
