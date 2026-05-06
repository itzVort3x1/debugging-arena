"use client";

import { useMemo } from "react";
import { Lock, X } from "lucide-react";
import { useArenaStore } from "@/store/arena";
import { cn } from "@/lib/utils";

/**
 * VSCode-style tab bar across the top of the editor.
 *
 * Dirty marker pattern: when a file has unsaved changes we show a dot in the
 * close-button slot, swapping to an X on hover. The X click stops propagation
 * so it doesn't also activate the tab.
 */
export function TabBar() {
  const openTabs = useArenaStore((s) => s.openTabs);
  const activeTab = useArenaStore((s) => s.activeTab);
  const dirtyFiles = useArenaStore((s) => s.dirtyFiles);
  const challenge = useArenaStore((s) => s.challenge);
  const setActiveTab = useArenaStore((s) => s.setActiveTab);
  const closeTab = useArenaStore((s) => s.closeTab);

  const fileMeta = useMemo(() => {
    const map = new Map<string, { readOnly: boolean; name: string }>();
    if (!challenge) return map;
    for (const f of [...challenge.files, ...challenge.testFiles]) {
      map.set(f.path, {
        readOnly: f.readOnly,
        name: f.path.split("/").pop() ?? f.path,
      });
    }
    return map;
  }, [challenge]);

  if (openTabs.length === 0) {
    return <div className="h-9 border-b border-vscode-border bg-vscode-panel" />;
  }

  return (
    <div className="flex h-9 items-stretch overflow-x-auto border-b border-vscode-border bg-vscode-panel">
      {openTabs.map((path) => {
        const meta = fileMeta.get(path);
        const isActive = activeTab === path;
        const isDirty = !!dirtyFiles[path];
        const isReadOnly = meta?.readOnly ?? false;

        return (
          <div
            key={path}
            role="tab"
            aria-selected={isActive}
            onClick={() => setActiveTab(path)}
            className={cn(
              "group flex cursor-pointer items-center gap-2 border-r border-vscode-border px-3 text-xs",
              isActive
                ? "bg-vscode-tab-active text-vscode-fg"
                : "bg-vscode-tab-inactive text-vscode-fg-muted hover:bg-vscode-tab-hover"
            )}
            title={path}
          >
            {isReadOnly && <Lock size={11} className="shrink-0" />}
            <span className={cn("truncate", isReadOnly && "italic")}>
              {meta?.name ?? path}
            </span>
            <button
              type="button"
              aria-label={`Close ${path}`}
              onClick={(e) => {
                e.stopPropagation();
                closeTab(path);
              }}
              className="ml-1 flex h-4 w-4 items-center justify-center rounded hover:bg-vscode-bg-elevated"
            >
              {isDirty ? (
                <>
                  <span className="block h-1.5 w-1.5 rounded-full bg-vscode-fg group-hover:hidden" />
                  <X size={12} className="hidden group-hover:block" />
                </>
              ) : (
                <X size={12} className="opacity-0 group-hover:opacity-100" />
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}
