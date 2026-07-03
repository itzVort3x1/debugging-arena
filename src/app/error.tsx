"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * App-level error boundary. Catches render/data errors in any route that
 * doesn't define its own, showing a themed fallback with a retry.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-vscode-bg px-6 text-vscode-fg">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-6rem] h-[24rem] w-[24rem] -translate-x-1/2 rounded-full bg-vscode-error/10 blur-3xl"
      />
      <div className="relative flex max-w-md flex-col items-center text-center">
        <p className="font-mono text-sm text-vscode-error">
          Uncaught exception
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-vscode-fg">
          Something broke on our end.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-vscode-fg-muted">
          An unexpected error stopped this page from rendering. You can retry,
          or head back to the challenge list.
        </p>

        <div className="mt-8 flex items-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-md bg-vscode-accent px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-vscode-accent/20 transition-all hover:bg-vscode-accent-hover hover:shadow-vscode-accent/40"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-md border border-vscode-border bg-vscode-bg-elevated px-5 py-2.5 text-sm font-medium text-vscode-fg transition-colors hover:bg-vscode-tab-hover"
          >
            Back to challenges
          </Link>
        </div>
      </div>
    </div>
  );
}
