"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";

interface Scene {
  filename: string;
  footer: string;
  body: ReactNode;
}

const scenes: Scene[] = [
  {
    filename: "duplicate-chat-messages — pnpm test",
    footer: "Hint 1 / 4 available · −5 pts",
    body: (
      <>
        <span className="text-vscode-fg-muted">$ </span>
        <span className="text-vscode-fg">pnpm test</span>
        {"\n\n"}
        <span className="text-vscode-fg-muted"> FAIL </span>
        <span className="text-vscode-fg">tests/challenge.test.ts</span>
        {"\n"}
        <span className="text-vscode-error">
          {"  ✕ "}deduplicates on reconnect (412 ms)
        </span>
        {"\n"}
        <span className="text-vscode-error">
          {"  ✕ "}preserves order under load (308 ms)
        </span>
        {"\n\n"}
        <span className="text-vscode-fg-muted">
          {"   "}● deduplicates on reconnect
        </span>
        {"\n"}
        <span className="text-vscode-fg-muted">{"     "}expected: 1 message</span>
        {"\n"}
        <span className="text-vscode-fg-muted">
          {"     "}received: 4 messages
        </span>
        {"\n\n"}
        <span className="text-vscode-warning">
          {"   "}→ likely culprit: src/chat-server.ts:42
        </span>
      </>
    ),
  },
  {
    filename: "src/chat-server.ts — fixing",
    footer: "Editing · 1 file dirty",
    body: (
      <>
        <span className="text-vscode-fg-subtle">39 │ </span>
        <span className="text-vscode-fg">{"socket.on(\"reconnect\", () => {"}</span>
        {"\n"}
        <span className="text-vscode-fg-subtle">40 │ </span>
        <span className="text-vscode-fg">{"  for (const m of pending) {"}</span>
        {"\n"}
        <span className="bg-vscode-error/15 text-vscode-error">
          {"41 - "}
          {"    emit(\"message\", m);"}
        </span>
        {"\n"}
        <span className="bg-vscode-success/15 text-vscode-success">
          {"41 + "}
          {"    if (!seen.has(m.id)) {"}
        </span>
        {"\n"}
        <span className="bg-vscode-success/15 text-vscode-success">
          {"42 + "}
          {"      seen.add(m.id);"}
        </span>
        {"\n"}
        <span className="bg-vscode-success/15 text-vscode-success">
          {"43 + "}
          {"      emit(\"message\", m);"}
        </span>
        {"\n"}
        <span className="bg-vscode-success/15 text-vscode-success">
          {"44 + "}
          {"    }"}
        </span>
        {"\n"}
        <span className="text-vscode-fg-subtle">45 │ </span>
        <span className="text-vscode-fg">{"  }"}</span>
        {"\n"}
        <span className="text-vscode-fg-subtle">46 │ </span>
        <span className="text-vscode-fg">{"});"}</span>
      </>
    ),
  },
  {
    filename: "duplicate-chat-messages — pnpm test",
    footer: "All green · ready to submit",
    body: (
      <>
        <span className="text-vscode-fg-muted">$ </span>
        <span className="text-vscode-fg">pnpm test</span>
        {"\n\n"}
        <span className="bg-vscode-success/30 px-1 text-vscode-success">
          {" PASS "}
        </span>
        <span className="text-vscode-fg"> tests/challenge.test.ts</span>
        {"\n"}
        <span className="text-vscode-success">
          {"  ✓ "}deduplicates on reconnect (38 ms)
        </span>
        {"\n"}
        <span className="text-vscode-success">
          {"  ✓ "}preserves order under load (51 ms)
        </span>
        {"\n\n"}
        <span className="text-vscode-fg-muted">Test Suites: </span>
        <span className="text-vscode-success">1 passed</span>
        <span className="text-vscode-fg-muted">, 1 total</span>
        {"\n"}
        <span className="text-vscode-fg-muted">Tests:       </span>
        <span className="text-vscode-success">2 passed</span>
        <span className="text-vscode-fg-muted">, 2 total</span>
        {"\n"}
        <span className="text-vscode-fg-muted">Time:        </span>
        <span className="text-vscode-fg">0.92 s</span>
      </>
    ),
  },
  {
    filename: "postmortem.md — AI summary",
    footer: "Score: 84 / 100 · 2 hints used",
    body: (
      <>
        <span className="text-vscode-info"># Postmortem</span>
        {"\n\n"}
        <span className="text-vscode-fg">Root cause</span>
        {"\n"}
        <span className="text-vscode-fg-muted">
          On every reconnect, all pending messages were
        </span>
        {"\n"}
        <span className="text-vscode-fg-muted">
          re-emitted unconditionally. Clients had no way to
        </span>
        {"\n"}
        <span className="text-vscode-fg-muted">
          tell the difference from new messages, so any user
        </span>
        {"\n"}
        <span className="text-vscode-fg-muted">
          on flaky wifi saw N copies of each line.
        </span>
        {"\n\n"}
        <span className="text-vscode-fg">Fix</span>
        {"\n"}
        <span className="text-vscode-fg-muted">
          Track seen message IDs in a Set; emit only on
        </span>
        {"\n"}
        <span className="text-vscode-fg-muted">first sight.</span>
        {"\n\n"}
        <span className="text-vscode-warning">→ </span>
        <span className="text-vscode-fg-muted">
          Add idempotency keys on all broadcast paths.
        </span>
      </>
    ),
  },
];

const ROTATE_MS = 4200;

export function TerminalCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % scenes.length);
    }, ROTATE_MS);
    return () => clearInterval(t);
  }, [paused]);

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="overflow-hidden rounded-xl border border-vscode-border bg-vscode-panel shadow-2xl shadow-black/60">
        {/* Title bar */}
        <div className="flex items-center gap-2 border-b border-vscode-border bg-vscode-bg-elevated px-3 py-2 text-xs">
          <span className="h-2.5 w-2.5 rounded-full bg-vscode-error/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-vscode-warning/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-vscode-success/80" />
          <span className="ml-2 truncate text-vscode-fg-muted">
            {scenes[index].filename}
          </span>
        </div>

        {/* Body — stacked scenes, opacity-faded */}
        <div className="relative min-h-[280px]">
          {scenes.map((scene, i) => (
            <pre
              key={i}
              className={`absolute inset-0 overflow-x-auto p-4 text-[12px] font-mono leading-relaxed transition-opacity duration-700 ${
                i === index ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
              aria-hidden={i !== index}
            >
              <code>{scene.body}</code>
            </pre>
          ))}
        </div>

        {/* Footer + dots */}
        <div className="flex items-center justify-between border-t border-vscode-border bg-vscode-bg-elevated px-3 py-2 text-[11px] text-vscode-fg-muted">
          <span className="truncate">{scenes[index].footer}</span>
          <div className="flex gap-1.5">
            {scenes.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show scene ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === index
                    ? "w-5 bg-vscode-accent"
                    : "w-1.5 bg-vscode-fg-subtle/50 hover:bg-vscode-fg-muted"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* glow under the terminal */}
      <div
        aria-hidden
        className="absolute inset-x-8 -bottom-6 h-12 rounded-full bg-vscode-accent/20 blur-2xl"
      />
    </div>
  );
}
