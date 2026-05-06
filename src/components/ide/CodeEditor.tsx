"use client";

import Editor from "@monaco-editor/react";
import { useFileEditor } from "@/hooks/useFileEditor";
import { Spinner } from "@/components/ui/Spinner";

/**
 * Monaco editor bound to the active tab in the arena store.
 *
 * `<Editor path={...} defaultValue={...}>` keeps one Monaco model per path,
 * which preserves cursor position and undo history when switching tabs.
 * We pass `defaultValue` (not `value`) so re-renders don't reset undo state;
 * edits flow back into the store via `onChange -> handleChange`.
 */
export function CodeEditor() {
  const {
    activeTab,
    activeContent,
    activeLanguage,
    activeReadOnly,
    handleChange,
  } = useFileEditor();

  if (!activeTab) {
    return (
      <div className="flex h-full w-full items-center justify-center text-vscode-fg-muted text-sm">
        Open a file from the explorer to start editing.
      </div>
    );
  }

  return (
    <Editor
      height="100%"
      width="100%"
      theme="vs-dark"
      path={activeTab}
      defaultValue={activeContent}
      defaultLanguage={activeLanguage}
      loading={
        <div className="flex h-full w-full items-center justify-center">
          <Spinner size={20} />
        </div>
      }
      onChange={(value) => handleChange(activeTab, value)}
      options={{
        readOnly: activeReadOnly,
        fontSize: 13,
        fontFamily: "Menlo, Monaco, Consolas, 'Courier New', monospace",
        minimap: { enabled: false },
        automaticLayout: true,
        tabSize: 2,
        scrollBeyondLastLine: false,
        renderLineHighlight: "all",
        smoothScrolling: true,
        cursorBlinking: "smooth",
        wordWrap: "off",
      }}
    />
  );
}
