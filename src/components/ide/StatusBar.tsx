"use client";

import { useEffect, useState } from "react";
import { useArenaStore } from "@/store/arena";
import { CheckIcon, CloseIcon, TerminalIcon } from "@/components/ui/icons";

function TestRunBadge() {
    const session = useArenaStore((s) => s.session);
    const isRunning = useArenaStore((s) => s.isRunning);

    if (isRunning) {
        return (
            <span className="flex items-center gap-1 text-white/80">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                Running tests…
            </span>
        );
    }

    // Be strict: only render the pass/fail badge if all three counts are
    // real numbers. undefined slips past `=== null`, so an unmigrated DB
    // or a session row from before the migration would otherwise render
    // a phantom green badge.
    const total = session?.lastRunTotal;
    const passed = session?.lastRunPassed;
    const failed = session?.lastRunFailed;
    if (
        !session ||
        typeof total !== "number" ||
        typeof passed !== "number" ||
        typeof failed !== "number" ||
        total === 0
    ) {
        return <span className="text-white/60">Not run</span>;
    }

    const lastRunPassed = passed;
    const lastRunFailed = failed;
    const lastRunTotal = total;
    const allGreen = lastRunPassed === lastRunTotal && lastRunFailed === 0;
    return (
        <span
            className={`flex items-center gap-1 ${
                allGreen ? "text-vscode-success" : "text-vscode-error"
            }`}
            title={
                session.lastRunAt
                    ? `Last run ${new Date(session.lastRunAt).toLocaleString()}`
                    : undefined
            }
        >
            {allGreen ? (
                <CheckIcon className="h-3.5 w-3.5" />
            ) : (
                <CloseIcon className="h-3.5 w-3.5" />
            )}
            {lastRunPassed}/{lastRunTotal} passing
        </span>
    );
}

function formatAgo(ms: number): string {
    const s = Math.max(1, Math.round(ms / 1000));
    if (s < 60) return `${s}s ago`;
    const m = Math.round(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.round(m / 60);
    return `${h}h ago`;
}

function SaveIndicator() {
    const status = useArenaStore((s) => s.saveStatus);
    const error = useArenaStore((s) => s.saveError);
    const lastSavedAt = useArenaStore((s) => s.lastSavedAt);

    // Tick once per 10s so "Saved Xs ago" stays current without re-rendering
    // on every keystroke.
    const [, setTick] = useState(0);
    useEffect(() => {
        if (status !== "saved") return;
        const id = setInterval(() => setTick((n) => n + 1), 10_000);
        return () => clearInterval(id);
    }, [status]);

    if (status === "saving") {
        return <span className="text-white/80">Saving…</span>;
    }
    if (status === "error") {
        return (
            <span
                className="text-vscode-warning"
                title={error ?? "Save failed"}
            >
                Save failed
            </span>
        );
    }
    if (status === "saved" && lastSavedAt) {
        return (
            <span className="text-white/80">
                Saved · {formatAgo(Date.now() - lastSavedAt)}
            </span>
        );
    }
    return <span className="text-white/60">Not saved yet</span>;
}

export function StatusBar() {
    const activeFile = useArenaStore((s) => s.activeFile);
    const challenge = useArenaStore((s) => s.challenge);
    const terminalOpen = useArenaStore((s) => s.terminalOpen);
    const toggleTerminal = useArenaStore((s) => s.toggleTerminal);

    const fileMeta = activeFile
        ? (challenge?.files.find((f) => f.path === activeFile) ??
          challenge?.testFiles.find((f) => f.path === activeFile) ??
          null)
        : null;

    return (
        <div className="flex h-6 shrink-0 items-center justify-between bg-vscode-statusbar px-3 text-[11px] text-white">
            <div className="flex min-w-0 items-center gap-4">
                <button
                    type="button"
                    onClick={toggleTerminal}
                    className="flex items-center gap-1 transition-opacity hover:opacity-80"
                    aria-label={
                        terminalOpen ? "Hide terminal" : "Show terminal"
                    }
                >
                    <TerminalIcon className="h-3.5 w-3.5" />
                    <span>Terminal</span>
                </button>
                <span className="truncate text-white/80">
                    {activeFile ?? "No file selected"}
                </span>
            </div>
            <div className="flex shrink-0 items-center gap-4">
                <TestRunBadge />
                <SaveIndicator />
                <span className="text-white/80">
                    {fileMeta?.language ?? "-"}
                </span>
            </div>
        </div>
    );
}
