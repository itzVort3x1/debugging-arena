import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type CardProps = HTMLAttributes<HTMLDivElement>;

/**
 * A bordered surface panel. Defaults to the subtle border used by the hint
 * cards; pass a `border-*` utility in `className` to override (e.g. the
 * solution card uses the stronger `border-vscode-border`).
 */
export function Card({ className, children, ...rest }: CardProps) {
    return (
        <div
            className={cn(
                "rounded-md border border-vscode-border-subtle bg-vscode-bg p-3",
                className,
            )}
            {...rest}
        >
            {children}
        </div>
    );
}
