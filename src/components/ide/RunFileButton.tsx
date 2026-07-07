"use client";

import { useArenaStore } from "@/store/arena";
import { Button } from "@/components/ui/Button";
import { RunFileIcon } from "@/components/ui/icons";
import { useRunAction } from "./useRunAction";

interface FileResultPayload {
    exitCode: number | null;
    durationMs: number;
}

const RUNNABLE_RE = /\.(ts|tsx|js|mjs|cjs)$/;

export function RunFileButton() {
    const { pending, locked, runningElsewhere, start } = useRunAction();
    const challenge = useArenaStore((s) => s.challenge);
    const fileContents = useArenaStore((s) => s.fileContents);
    const activeFile = useArenaStore((s) => s.activeFile);

    // Only editable challenge files can be executed (the API rejects test
    // files and arbitrary paths), and only runnable script extensions.
    const isRunnable =
        !!activeFile &&
        !!challenge?.files.some((f) => f.path === activeFile) &&
        RUNNABLE_RE.test(activeFile);

    const disabled = locked || !isRunnable || runningElsewhere;

    function handleRunFile() {
        if (!isRunnable || !activeFile) return;
        start({
            body: {
                mode: "file",
                entryPath: activeFile,
                fileState: fileContents,
            },
            header: `$ ts-node ${activeFile}`,
            onResult: (data) => {
                const r = data as FileResultPayload;
                return [
                    `exit ${r.exitCode ?? "-"} · ${(
                        r.durationMs / 1000
                    ).toFixed(1)}s`,
                ];
            },
        });
    }

    const title = locked
        ? "Session submitted - read only"
        : !isRunnable
          ? "Open an editable .ts/.js file to run it"
          : `Run ${activeFile}`;

    return (
        <Button
            size="sm"
            variant="secondary"
            loading={pending}
            disabled={disabled}
            title={title}
            onClick={handleRunFile}
            leftIcon={
                pending ? undefined : <RunFileIcon className="h-3.5 w-3.5" />
            }
        >
            {pending ? "Running" : "Run file"}
        </Button>
    );
}
