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

interface FileRowProps {
  path: string;
  active: boolean;
  readOnly?: boolean;
  onClick: () => void;
}

function FileRow({ path, active, readOnly, onClick }: FileRowProps) {
  const filename = path.split("/").pop() ?? path;
  return (
    <button
      type="button"
      onClick={onClick}
      title={path}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-1 text-left text-xs",
        active
          ? "bg-vscode-selection text-vscode-fg"
          : "text-vscode-fg-muted hover:bg-vscode-tab-hover hover:text-vscode-fg"
      )}
    >
      <FileIcon className="h-3.5 w-3.5 shrink-0 text-vscode-info" />
      <span className="truncate">{filename}</span>
      {readOnly ? (
        <LockIcon className="ml-auto h-3 w-3 shrink-0 text-vscode-fg-subtle" />
      ) : null}
    </button>
  );
}

interface SectionProps {
  label: string;
  children: React.ReactNode;
}

function Section({ label, children }: SectionProps) {
  return (
    <div className="mb-2">
      <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-vscode-fg-subtle">
        {label}
      </div>
      <div>{children}</div>
    </div>
  );
}

export function FileExplorer() {
  const challenge = useArenaStore((s) => s.challenge);
  const activeFile = useArenaStore((s) => s.activeFile);
  const openFile = useArenaStore((s) => s.openFile);

  if (!challenge) {
    return (
      <div className="flex h-full items-center justify-center bg-vscode-sidebar p-4 text-xs text-vscode-fg-subtle">
        No challenge loaded
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-vscode-sidebar">
      <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-vscode-fg-muted">
        Explorer
      </div>
      <div className="flex-1 overflow-y-auto">
        <Section label="Files">
          {challenge.files.map((f) => (
            <FileRow
              key={f.path}
              path={f.path}
              active={f.path === activeFile}
              onClick={() => openFile(f.path)}
            />
          ))}
        </Section>
        {challenge.testFiles.length > 0 ? (
          <Section label="Tests (read-only)">
            {challenge.testFiles.map((f) => (
              <FileRow
                key={f.path}
                path={f.path}
                active={f.path === activeFile}
                readOnly
                onClick={() => openFile(f.path)}
              />
            ))}
          </Section>
        ) : null}
      </div>
    </div>
  );
}
