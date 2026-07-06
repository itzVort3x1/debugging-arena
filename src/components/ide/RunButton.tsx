"use client";

import { useState } from "react";
import { useArenaStore } from "@/store/arena";
import { Button } from "@/components/ui/Button";
import { useRunStream } from "./useRunStream";
import type { DebugSessionResponse } from "@/types/session";

function PlayIcon({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 16 16"
            fill="currentColor"
            className={className}
            aria-hidden="true"
        >
            <path d="M4 3.5v9a.5.5 0 0 0 .77.42l7-4.5a.5.5 0 0 0 0-.84l-7-4.5A.5.5 0 0 0 4 3.5Z" />
        </svg>
    );
}

interface ResultPayload {
    passed: number;
    failed: number;
    total: number;
    exitCode: number | null;
    durationMs: number;
    session: DebugSessionResponse;
}

export function RunButton() {
    const { run, isRunning } = useRunStream();
    const session = useArenaStore((s) => s.session);
    const fileContents = useArenaStore((s) => s.fileContents);
    const mergeSessionMeta = useArenaStore((s) => s.mergeSessionMeta);

    // Local so only this button spins; a run started elsewhere just disables it.
    const [pending, setPending] = useState(false);
    const locked = !!session && session.status !== "IN_PROGRESS";

    async function handleRun() {
        if (isRunning || !session || locked) return;
        setPending(true);
        try {
            await run({
                body: { fileState: fileContents },
                header: "$ pnpm test",
                onResult: (data) => {
                    const r = data as ResultPayload;
                    mergeSessionMeta(r.session);
                    return [
                        `${r.passed}/${r.total} tests passed · exit ${
                            r.exitCode ?? "-"
                        } · ${(r.durationMs / 1000).toFixed(1)}s`,
                    ];
                },
            });
        } finally {
            setPending(false);
        }
    }

    return (
        <Button
            size="sm"
            variant="primary"
            loading={pending}
            disabled={locked || (isRunning && !pending)}
            title={locked ? "Session submitted - read only" : undefined}
            onClick={handleRun}
            leftIcon={
                pending ? undefined : <PlayIcon className="h-3.5 w-3.5" />
            }
        >
            {pending ? "Running" : "Run tests"}
        </Button>
    );
}
