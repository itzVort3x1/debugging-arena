"use client";

import { useArenaStore } from "@/store/arena";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { FileIcon, LockIcon } from "@/components/ui/icons";

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
      <EmptyState className="bg-vscode-sidebar p-4 text-xs">
        No challenge loaded
      </EmptyState>
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
