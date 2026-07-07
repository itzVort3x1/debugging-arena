"use client";

import { useArenaStore } from "@/store/arena";
import { Button } from "@/components/ui/Button";
import { PlayIcon } from "@/components/ui/icons";
import { useRunAction } from "./useRunAction";
import type { DebugSessionResponse } from "@/types/session";

interface ResultPayload {
    passed: number;
    failed: number;
    total: number;
    exitCode: number | null;
    durationMs: number;
    session: DebugSessionResponse;
}

export function RunButton() {
    const { pending, locked, runningElsewhere, start } = useRunAction();
    const fileContents = useArenaStore((s) => s.fileContents);
    const mergeSessionMeta = useArenaStore((s) => s.mergeSessionMeta);

    function handleRun() {
        start({
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
    }

    return (
        <Button
            size="sm"
            variant="primary"
            loading={pending}
            disabled={locked || runningElsewhere}
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
