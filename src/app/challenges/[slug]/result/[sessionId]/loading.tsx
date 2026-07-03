export default function ResultLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-vscode-bg text-vscode-fg-muted">
      <div className="flex flex-col items-center gap-3">
        <span
          aria-hidden
          className="h-8 w-8 animate-spin rounded-full border-2 border-vscode-border border-t-vscode-accent"
        />
        <p className="text-sm">Loading result…</p>
      </div>
    </div>
  );
}
