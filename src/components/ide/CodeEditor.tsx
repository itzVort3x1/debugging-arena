"use client";

import Editor from "@monaco-editor/react";
import { Spinner } from "@/components/ui/Spinner";

export interface CodeEditorProps {
  value: string;
  language: string;
  /** Used by Monaco to keep a separate model (and undo stack) per file. */
  path?: string;
  readOnly?: boolean;
  onChange?: (next: string) => void;
}

/**
 * Thin presentational wrapper around @monaco-editor/react. Workers are
 * loaded from the CDN (no webpack plugin) — see notes in CLAUDE.md /
 * project memory about why the monaco-editor-webpack-plugin is *not*
 * wired into next.config.mjs.
 *
 * No store coupling on purpose — the arena hooks feed it value/onChange
 * so this component can be tested in isolation under /sandbox.
 */
export function CodeEditor({
  value,
  language,
  path,
  readOnly = false,
  onChange,
}: CodeEditorProps) {
  return (
    <Editor
      value={value}
      language={language}
      path={path}
      theme="vs-dark"
      onChange={(next) => onChange?.(next ?? "")}
      loading={
        <div className="flex h-full items-center justify-center bg-vscode-bg text-vscode-fg-muted">
          <Spinner size="md" />
        </div>
      }
      options={{
        readOnly,
        fontFamily:
          "Menlo, Monaco, Consolas, 'Courier New', monospace",
        fontSize: 13,
        lineHeight: 20,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        wordWrap: "on",
        automaticLayout: true,
        tabSize: 2,
        lineNumbers: "on",
        renderLineHighlight: "all",
        roundedSelection: false,
        smoothScrolling: true,
        cursorBlinking: "smooth",
        padding: { top: 12, bottom: 12 },
        scrollbar: {
          verticalScrollbarSize: 10,
          horizontalScrollbarSize: 10,
        },
        // Render hover/suggestion/parameter-hint widgets as fixed-position
        // overlays so they aren't clipped by overflow:hidden ancestors.
        fixedOverflowWidgets: true,
        hover: { enabled: true, above: false },
      }}
    />
  );
}
