"use client";

import { useArenaStore } from "@/store/arena";
import { Button } from "@/components/ui/Button";

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

interface RunResponse {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  passed: number;
  failed: number;
  total: number;
  durationMs: number;
}

export function RunButton() {
  const isRunning = useArenaStore((s) => s.isRunning);
  const setRunning = useArenaStore((s) => s.setRunning);
  const appendTerminalLine = useArenaStore((s) => s.appendTerminalLine);
  const clearTerminal = useArenaStore((s) => s.clearTerminal);
  const setTerminalOpen = useArenaStore((s) => s.setTerminalOpen);
  const session = useArenaStore((s) => s.session);
  const fileContents = useArenaStore((s) => s.fileContents);

  async function handleRun() {
    if (isRunning || !session) return;
    setTerminalOpen(true);
    clearTerminal();
    setRunning(true);
    appendTerminalLine("$ pnpm test");
    appendTerminalLine("");

    try {
      const res = await fetch(`/api/sessions/${session.id}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileState: fileContents }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Run failed: ${res.status}`);
      }
      const result = (await res.json()) as RunResponse;

      // Jest writes its human-readable reporter to stderr; stdout is
      // empty when --json --outputFile is used. Show stderr first.
      const combined = [result.stderr, result.stdout]
        .filter((s) => s.length > 0)
        .join("\n");
      for (const line of combined.split("\n")) appendTerminalLine(line);

      appendTerminalLine("");
      appendTerminalLine(
        `${result.passed}/${result.total} tests passed · exit ${
          result.exitCode ?? "—"
        } · ${(result.durationMs / 1000).toFixed(1)}s`
      );
    } catch (err) {
      appendTerminalLine("");
      appendTerminalLine(
        `Error: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      setRunning(false);
    }
  }

  return (
    <Button
      size="sm"
      variant="primary"
      loading={isRunning}
      onClick={handleRun}
      leftIcon={isRunning ? undefined : <PlayIcon className="h-3.5 w-3.5" />}
    >
      {isRunning ? "Running" : "Run tests"}
    </Button>
  );
}
