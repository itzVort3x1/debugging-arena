"use client";

import { cn } from "@/lib/utils";

/**
 * The editable file list for a challenge: select, add, delete.
 *
 * Purely presentational — it takes paths and callbacks and holds no state, so
 * the same list backs editing an existing challenge and authoring a new one.
 * Distinct from `ide/FileExplorer`, which reads the arena store and splits
 * files from read-only tests; here every file is editable, including
 * `meta.json` and the tests themselves.
 */
export interface ChallengeFileTreeProps {
  paths: string[];
  activePath: string;
  onSelect: (path: string) => void;
  onAdd: (path: string) => void;
  onDelete: (path: string) => void;
}

export function ChallengeFileTree({
  paths,
  activePath,
  onSelect,
  onAdd,
  onDelete,
}: ChallengeFileTreeProps) {
  const promptAdd = () => {
    const raw = window.prompt(
      "New file path, relative to the challenge root (e.g. files/src/util.ts)",
    );
    const path = raw?.trim();
    if (path) onAdd(path);
  };

  const confirmDelete = (path: string) => {
    if (window.confirm(`Delete "${path}"?`)) onDelete(path);
  };

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-vscode-border bg-vscode-sidebar">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-vscode-fg-muted">
          Files
        </span>
        <button
          type="button"
          onClick={promptAdd}
          className="text-xs text-vscode-fg-muted hover:text-vscode-fg"
          title="Add a file"
        >
          + Add
        </button>
      </div>
      <div className="flex-1 overflow-y-auto pb-2">
        {paths.map((path) => (
          <div
            key={path}
            className={cn(
              "group flex items-center gap-1 pr-2",
              path === activePath
                ? "bg-vscode-selection"
                : "hover:bg-vscode-tab-hover",
            )}
          >
            <button
              type="button"
              onClick={() => onSelect(path)}
              title={path}
              className={cn(
                "flex-1 truncate px-3 py-1 text-left text-xs",
                path === activePath ? "text-vscode-fg" : "text-vscode-fg-muted",
              )}
            >
              {path}
            </button>
            <button
              type="button"
              onClick={() => confirmDelete(path)}
              title={`Delete ${path}`}
              className="invisible text-xs text-vscode-fg-subtle hover:text-vscode-error group-hover:visible"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </aside>
  );
}
