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

/**
 * Stub. Phase 5 wires the real test runner via SSE. For now, this
 * fakes a short run so we can verify the terminal panel + running state
 * indicator behave correctly.
 */
export function RunButton() {
  const isRunning = useArenaStore((s) => s.isRunning);
  const setRunning = useArenaStore((s) => s.setRunning);
  const appendTerminalLine = useArenaStore((s) => s.appendTerminalLine);
  const clearTerminal = useArenaStore((s) => s.clearTerminal);
  const setTerminalOpen = useArenaStore((s) => s.setTerminalOpen);

  async function handleRun() {
    if (isRunning) return;
    setTerminalOpen(true);
    clearTerminal();
    setRunning(true);
    appendTerminalLine("$ pnpm test");
    appendTerminalLine("");
    appendTerminalLine("Running tests...");
    await new Promise((r) => setTimeout(r, 1200));
    appendTerminalLine("");
    appendTerminalLine(
      "[stub] Phase 5 will stream real runner output here."
    );
    setRunning(false);
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
