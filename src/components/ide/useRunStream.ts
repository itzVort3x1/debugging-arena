"use client";

import { useEffect, useRef } from "react";
import { useArenaStore } from "@/store/arena";

const ANSI_CSI_RE = /\x1b\[[0-9;]*[A-Za-z]/g;
function stripAnsi(s: string): string {
    return s.replace(ANSI_CSI_RE, "");
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

export interface RunStreamOptions {
    /** Request body POSTed to /api/sessions/[id]/run. */
    body: unknown;
    /** Command echo printed before streaming, e.g. "$ pnpm test". */
    header: string;
    /**
     * Called with the `result` event payload once streaming ends cleanly.
     * Returns the summary line(s) to append to the terminal.
     */
    onResult?: (data: unknown) => string[];
}

/**
 * Shared driver for the SSE run endpoint. Owns the isRunning flag, terminal
 * lifecycle, abort-on-unmount, SSE frame parsing, and per-stream line
 * buffering (chunks don't align to line boundaries). Callers supply the
 * request body, the command echo, and how to summarize the final result -
 * everything mode-specific lives there, not here.
 */
export function useRunStream() {
    const isRunning = useArenaStore((s) => s.isRunning);
    const setRunning = useArenaStore((s) => s.setRunning);
    const appendTerminalLine = useArenaStore((s) => s.appendTerminalLine);
    const clearTerminal = useArenaStore((s) => s.clearTerminal);
    const setTerminalOpen = useArenaStore((s) => s.setTerminalOpen);
    const session = useArenaStore((s) => s.session);

    const abortRef = useRef<AbortController | null>(null);

    // If the component unmounts mid-run (navigation), cancel the fetch so the
    // server kills the child process.
    useEffect(() => {
        return () => abortRef.current?.abort();
    }, []);

    async function run(options: RunStreamOptions): Promise<void> {
        if (isRunning || !session) return;
        setTerminalOpen(true);
        clearTerminal();
        setRunning(true);
        appendTerminalLine(options.header);
        appendTerminalLine("");

        const controller = new AbortController();
        abortRef.current = controller;

        // Per-stream line buffers - chunks don't align with line boundaries.
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
                body: JSON.stringify(options.body),
                signal: controller.signal,
            });
            if (!res.ok || !res.body) {
                const errBody = await res
                    .json()
                    .catch(() => ({ error: `Run failed: ${res.status}` }));
                throw new Error(errBody.error ?? `Run failed: ${res.status}`);
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            let finalResult: unknown = null;
            let sawResult = false;
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
                            (parsed.data as { chunk: string }).chunk,
                        );
                    } else if (parsed.event === "stderr") {
                        stderrBuf = flushBuf(
                            stderrBuf,
                            (parsed.data as { chunk: string }).chunk,
                        );
                    } else if (parsed.event === "result") {
                        finalResult = parsed.data;
                        sawResult = true;
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
            } else if (sawResult) {
                for (const line of options.onResult?.(finalResult) ?? []) {
                    appendTerminalLine(line);
                }
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
                    `Error: ${err instanceof Error ? err.message : String(err)}`,
                );
            }
        } finally {
            abortRef.current = null;
            setRunning(false);
        }
    }

    return { run, isRunning };
}
