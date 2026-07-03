"use client";

import Editor, { type Monaco } from "@monaco-editor/react";
import { Spinner } from "@/components/ui/Spinner";

/**
 * Monaco's in-browser TS worker type-checks each open file in isolation,
 * so a challenge's cross-file imports (e.g. `./types`) resolve to nothing
 * and surface a spurious "Cannot find module" error. The real test runner
 * materializes the whole sandbox, so those modules DO exist - silence just
 * the module-resolution codes and keep every other diagnostic intact.
 *
 *   2307 - Cannot find module '...' or its type declarations
 *   2792 - Cannot find module '...' (did you mean to set moduleResolution?)
 */
const MODULE_RESOLUTION_CODES = [2307, 2792];

function configureMonaco(monaco: Monaco) {
    for (const defaults of [
        monaco.languages.typescript.typescriptDefaults,
        monaco.languages.typescript.javascriptDefaults,
    ]) {
        defaults.setDiagnosticsOptions({
            ...defaults.getDiagnosticsOptions(),
            diagnosticCodesToIgnore: MODULE_RESOLUTION_CODES,
        });
    }
}

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
 * loaded from the CDN (no webpack plugin) - see notes in CLAUDE.md /
 * project memory about why the monaco-editor-webpack-plugin is *not*
 * wired into next.config.mjs.
 *
 * No store coupling on purpose - the arena hooks feed it value/onChange
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
            beforeMount={configureMonaco}
            onChange={(next) => onChange?.(next ?? "")}
            loading={
                <div className="flex h-full items-center justify-center bg-vscode-bg text-vscode-fg-muted">
                    <Spinner size="md" />
                </div>
            }
            options={{
                readOnly,
                fontFamily: "Menlo, Monaco, Consolas, 'Courier New', monospace",
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
