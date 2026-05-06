"use client";

import { useMemo } from "react";
import { ChevronDown, File as FileIcon, Lock } from "lucide-react";
import { useArenaStore } from "@/store/arena";
import { cn } from "@/lib/utils";
import type { ChallengeFile } from "@/types/challenge";

interface TreeFolder {
  type: "folder";
  name: string;
  path: string;
  children: TreeNode[];
}
interface TreeFile {
  type: "file";
  name: string;
  file: ChallengeFile;
}
type TreeNode = TreeFolder | TreeFile;

/** Build a nested folder/file tree from a flat list of files keyed by path. */
function buildTree(files: ChallengeFile[]): TreeNode[] {
  const root: TreeFolder = {
    type: "folder",
    name: "",
    path: "",
    children: [],
  };

  const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path));

  for (const file of sorted) {
    const parts = file.path.split("/");
    let cursor: TreeFolder = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const segment = parts[i];
      const segPath = parts.slice(0, i + 1).join("/");
      let next = cursor.children.find(
        (c): c is TreeFolder => c.type === "folder" && c.name === segment
      );
      if (!next) {
        next = { type: "folder", name: segment, path: segPath, children: [] };
        cursor.children.push(next);
      }
      cursor = next;
    }
    cursor.children.push({
      type: "file",
      name: parts[parts.length - 1],
      file,
    });
  }

  // Folders before files within each level.
  const orderNodes = (nodes: TreeNode[]): TreeNode[] => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (const n of nodes) {
      if (n.type === "folder") orderNodes(n.children);
    }
    return nodes;
  };

  return orderNodes(root.children);
}

interface NodeRowProps {
  node: TreeNode;
  depth: number;
}

function FileRow({ node, depth }: { node: TreeFile; depth: number }) {
  const activeTab = useArenaStore((s) => s.activeTab);
  const dirty = useArenaStore((s) => !!s.dirtyFiles[node.file.path]);
  const openFile = useArenaStore((s) => s.openFile);
  const isActive = activeTab === node.file.path;

  return (
    <button
      type="button"
      onClick={() => openFile(node.file.path)}
      className={cn(
        "flex w-full items-center gap-1.5 px-2 py-0.5 text-left text-xs",
        "hover:bg-vscode-tab-hover",
        isActive ? "bg-vscode-tab-active text-vscode-fg" : "text-vscode-fg-muted"
      )}
      style={{ paddingLeft: 8 + depth * 12 }}
      title={node.file.path}
    >
      {node.file.readOnly ? (
        <Lock size={12} className="shrink-0 text-vscode-fg-muted" />
      ) : (
        <FileIcon size={12} className="shrink-0 text-vscode-fg-muted" />
      )}
      <span className="truncate">{node.name}</span>
      {dirty && (
        <span
          aria-label="Unsaved changes"
          className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-vscode-fg"
        />
      )}
    </button>
  );
}

function FolderRow({ node, depth }: { node: TreeFolder; depth: number }) {
  // Always-expanded folders keep this simple; the tree is shallow (2 levels).
  return (
    <div>
      <div
        className="flex items-center gap-1 px-2 py-0.5 text-xs uppercase tracking-wide text-vscode-fg-muted"
        style={{ paddingLeft: 8 + depth * 12 }}
      >
        <ChevronDown size={12} />
        <span className="truncate">{node.name}</span>
      </div>
      <div>
        {node.children.map((child) => (
          <NodeRow
            key={child.type === "folder" ? `f:${child.path}` : `x:${child.file.path}`}
            node={child}
            depth={depth + 1}
          />
        ))}
      </div>
    </div>
  );
}

function NodeRow({ node, depth }: NodeRowProps) {
  return node.type === "folder" ? (
    <FolderRow node={node} depth={depth} />
  ) : (
    <FileRow node={node} depth={depth} />
  );
}

export function FileExplorer() {
  const challenge = useArenaStore((s) => s.challenge);

  const tree = useMemo(() => {
    if (!challenge) return [];
    return buildTree([...challenge.files, ...challenge.testFiles]);
  }, [challenge]);

  if (!challenge) {
    return (
      <div className="p-3 text-xs text-vscode-fg-muted">Loading files…</div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-vscode-fg-muted">
        Explorer
      </div>
      <div className="flex-1 overflow-y-auto pb-2">
        {tree.map((node) => (
          <NodeRow
            key={node.type === "folder" ? `f:${node.path}` : `x:${node.file.path}`}
            node={node}
            depth={0}
          />
        ))}
      </div>
    </div>
  );
}

