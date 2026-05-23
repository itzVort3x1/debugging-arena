"use client";

import { useArenaStore } from "@/store/arena";
import { cn } from "@/lib/utils";

function FileIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 1.5A1.5 1.5 0 0 1 4.5 0h5L13 3.5v11A1.5 1.5 0 0 1 11.5 16h-7A1.5 1.5 0 0 1 3 14.5v-13ZM9 1H4.5a.5.5 0 0 0-.5.5v13a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 .5-.5V4H9.5A.5.5 0 0 1 9 3.5V1Zm1 .707V3h1.293L10 1.707Z" />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M5 6V4a3 3 0 1 1 6 0v2h.5A1.5 1.5 0 0 1 13 7.5v6a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 3 13.5v-6A1.5 1.5 0 0 1 4.5 6H5Zm1 0h4V4a2 2 0 1 0-4 0v2Z" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m4 4 8 8M12 4l-8 8" />
    </svg>
  );
}

export function TabBar() {
  const openTabs = useArenaStore((s) => s.openTabs);
  const activeFile = useArenaStore((s) => s.activeFile);
  const setActiveFile = useArenaStore((s) => s.setActiveFile);
  const closeTab = useArenaStore((s) => s.closeTab);
  const challenge = useArenaStore((s) => s.challenge);

  if (openTabs.length === 0) {
    return (
      <div className="flex h-9 items-center border-b border-vscode-border bg-vscode-bg-elevated px-3 text-xs text-vscode-fg-subtle">
        No files open
      </div>
    );
  }

  return (
    <div className="flex h-9 items-stretch overflow-x-auto border-b border-vscode-border bg-vscode-bg-elevated">
      {openTabs.map((path) => {
        const isActive = path === activeFile;
        const filename = path.split("/").pop() ?? path;
        const file =
          challenge?.files.find((f) => f.path === path) ??
          challenge?.testFiles.find((f) => f.path === path);
        const readOnly = file?.readOnly ?? false;
        return (
          <div
            key={path}
            role="tab"
            aria-selected={isActive}
            onClick={() => setActiveFile(path)}
            className={cn(
              "group relative flex shrink-0 cursor-pointer items-center gap-2 border-r border-vscode-border-subtle px-3 text-xs",
              isActive
                ? "bg-vscode-tab-active text-vscode-fg"
                : "bg-vscode-tab-inactive text-vscode-fg-muted hover:bg-vscode-tab-hover"
            )}
          >
            <FileIcon className="h-3.5 w-3.5 shrink-0 text-vscode-info" />
            <span className="truncate" title={path}>
              {filename}
            </span>
            {readOnly ? (
              <LockIcon className="h-3 w-3 shrink-0 text-vscode-fg-subtle" />
            ) : null}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                closeTab(path);
              }}
              aria-label={`Close ${filename}`}
              className={cn(
                "ml-1 rounded p-0.5 hover:bg-vscode-tab-hover",
                isActive
                  ? "opacity-70 hover:opacity-100"
                  : "opacity-0 group-hover:opacity-100"
              )}
            >
              <CloseIcon className="h-3 w-3" />
            </button>
            {isActive ? (
              <span className="absolute inset-x-0 top-0 h-0.5 bg-vscode-accent" />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
