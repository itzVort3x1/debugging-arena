import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type CenteredScreenProps = HTMLAttributes<HTMLDivElement>;

/**
 * Full-viewport centered container for whole-page states - the arena's
 * loading, error, and small-screen notices all sit inside one of these.
 */
export function CenteredScreen({
    className,
    children,
    ...rest
}: CenteredScreenProps) {
    return (
        <div
            className={cn(
                "flex h-screen items-center justify-center bg-vscode-bg p-6 text-vscode-fg",
                className,
            )}
            {...rest}
        >
            {children}
        </div>
    );
}
