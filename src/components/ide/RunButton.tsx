"use client";

import { useEffect, useRef } from "react";
import { useArenaStore } from "@/store/arena";
import { Button } from "@/components/ui/Button";
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

const ANSI_CSI_RE = /\x1b\[[0-9;]*[A-Za-z]/g;
function stripAnsi(s: string): string {
  return s.replace(ANSI_CSI_RE, "");
}

interface ResultPayload {
  passed: number;
  failed: number;
  total: number;
  exitCode: number | null;
  durationMs: number;
  session: DebugSessionResponse;
}

interface SSEFrame {
  event: string;
  data: unknown;
}

/** Parse one SSE frame (already split on the \n\n boundary). */
function parseFrame(frame: string): SSEFrame | null {
  let event = "message";
  const dataLines: string[] = [];
  for (const line of frame.split("\n")) {
    if (line.startsWith("event: ")) event = line.slice(7);
    else if (line.startsWith("data: ")) dataLines.push(line.slice(6));
  }
  if (dataLines.length === 0) return null;
  try {
    return { event, data: JSON.parse(dataLines.join("\n")) };
  } catch {
    return null;
  }
}

export function RunButton() {
  const isRunning = useArenaStore((s) => s.isRunning);
  const setRunning = useArenaStore((s) => s.setRunning);
  const appendTerminalLine = useArenaStore((s) => s.appendTerminalLine);
  const clearTerminal = useArenaStore((s) => s.clearTerminal);
  const setTerminalOpen = useArenaStore((s) => s.setTerminalOpen);
  const session = useArenaStore((s) => s.session);
  const fileContents = useArenaStore((s) => s.fileContents);
  const mergeSessionMeta = useArenaStore((s) => s.mergeSessionMeta);

  const abortRef = useRef<AbortController | null>(null);

  // If the component unmounts mid-run (navigation), cancel the fetch so
  // the server kills the jest child.
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  async function handleRun() {
    if (isRunning || !session) return;
    setTerminalOpen(true);
    clearTerminal();
    setRunning(true);
    appendTerminalLine("$ pnpm test");
    appendTerminalLine("");

    const controller = new AbortController();
    abortRef.current = controller;

    // Per-stream line buffers — chunks don't align with line boundaries.
    let stdoutBuf = "";
    let stderrBuf = "";
    function flushBuf(buf: string, chunk: string): string {
      buf += chunk.replace(/\r\n/g, "\n");
      const lines = buf.split("\n");
      const tail = lines.pop() ?? "";
      for (const line of lines) appendTerminalLine(stripAnsi(line));
      return tail;
    }

    try {
      const res = await fetch(`/api/sessions/${session.id}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileState: fileContents }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const body = await res
          .json()
          .catch(() => ({ error: `Run failed: ${res.status}` }));
        throw new Error(body.error ?? `Run failed: ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalResult: ResultPayload | null = null;
      let sawError: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let boundary;
        while ((boundary = buffer.indexOf("\n\n")) !== -1) {
          const frame = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          const parsed = parseFrame(frame);
          if (!parsed) continue;

          if (parsed.event === "stdout") {
            stdoutBuf = flushBuf(
              stdoutBuf,
              (parsed.data as { chunk: string }).chunk
            );
          } else if (parsed.event === "stderr") {
            stderrBuf = flushBuf(
              stderrBuf,
              (parsed.data as { chunk: string }).chunk
            );
          } else if (parsed.event === "result") {
            finalResult = parsed.data as ResultPayload;
          } else if (parsed.event === "error") {
            sawError = (parsed.data as { message: string }).message;
          }
        }
      }

      // Drain partial trailing lines.
      if (stdoutBuf) appendTerminalLine(stripAnsi(stdoutBuf));
      if (stderrBuf) appendTerminalLine(stripAnsi(stderrBuf));

      appendTerminalLine("");
      if (sawError) {
        appendTerminalLine(`Error: ${sawError}`);
      } else if (finalResult) {
        mergeSessionMeta(finalResult.session);
        appendTerminalLine(
          `${finalResult.passed}/${finalResult.total} tests passed · exit ${
            finalResult.exitCode ?? "—"
          } · ${(finalResult.durationMs / 1000).toFixed(1)}s`
        );
      } else {
        appendTerminalLine("Run ended without a result event.");
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        appendTerminalLine("");
        appendTerminalLine("Run cancelled.");
      } else {
        appendTerminalLine("");
        appendTerminalLine(
          `Error: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    } finally {
      abortRef.current = null;
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
