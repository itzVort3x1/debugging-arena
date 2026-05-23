"use client";

import { useState } from "react";
import { CodeEditor } from "@/components/ide/CodeEditor";
import { Badge } from "@/components/ui/Badge";

const STARTER = `// Sandbox — verifying Monaco loads cleanly.
// Edit anything. If typing works and the theme renders, we're good.

function fibonacci(n: number): number {
    if (n < 2) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}

const result = fibonacci(10);
console.log("fib(10) =", result);
`;

export default function SandboxPage() {
    const [code, setCode] = useState(STARTER);

    return (
        <div className="flex h-screen flex-col bg-vscode-bg text-vscode-fg">
            <header className="flex items-center justify-between border-b border-vscode-border bg-vscode-titlebar px-4 py-2">
                <div className="flex items-center gap-3">
                    <h1 className="text-sm font-medium">
                        Sandbox — CodeEditor in isolation
                    </h1>
                    <Badge tone="warning" size="sm">
                        TEMP — delete in PR 4.6
                    </Badge>
                </div>
                <span className="font-mono text-xs text-vscode-fg-muted">
                    {code.length} chars
                </span>
            </header>
            <main className="flex-1 overflow-hidden">
                <CodeEditor
                    value={code}
                    language="typescript"
                    path="sandbox.ts"
                    onChange={setCode}
                />
            </main>
        </div>
    );
}
