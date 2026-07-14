import { cn } from "@/lib/utils";

/**
 * A small "Coming soon" placeholder pill for features that are stubbed in the
 * UI but not yet implemented. Presentational and generic — drop it into any
 * card whose feature isn't wired up yet.
 */
export function ComingSoon({ className }: { className?: string }) {
    return (
        <span
            className={cn(
                "inline-flex items-center rounded-full border border-vscode-border bg-vscode-bg-elevated/60 px-2.5 py-1 text-xs font-medium text-vscode-fg-subtle",
                className,
            )}
        >
            Coming soon
        </span>
    );
}
