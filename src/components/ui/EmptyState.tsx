import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type EmptyStateProps = HTMLAttributes<HTMLDivElement>;

/**
 * Centered muted placeholder for an empty panel ("No challenge loaded",
 * "No files open", ...). Defaults to filling its parent; override the
 * background / padding / text size via `className` per call site.
 */
export function EmptyState({ className, children, ...rest }: EmptyStateProps) {
    return (
        <div
            className={cn(
                "flex h-full items-center justify-center p-6 text-sm text-vscode-fg-subtle",
                className,
            )}
            {...rest}
        >
            {children}
        </div>
    );
}
