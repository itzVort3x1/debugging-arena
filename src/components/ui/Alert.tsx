import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AlertCircleIcon } from "./icons";

type AlertTone = "error" | "warning" | "info" | "success";

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
    tone?: AlertTone;
    /**
     * Leading icon. Defaults to a circle-exclamation glyph; pass `null` to
     * render no icon, or a node to override it.
     */
    icon?: ReactNode | null;
}

const toneClasses: Record<AlertTone, string> = {
    error: "border-vscode-error/40 bg-vscode-error/10 text-vscode-error",
    warning:
        "border-vscode-warning/40 bg-vscode-warning/10 text-vscode-warning",
    info: "border-vscode-info/40 bg-vscode-info/10 text-vscode-info",
    success:
        "border-vscode-success/40 bg-vscode-success/10 text-vscode-success",
};

/**
 * Inline status banner - the tinted, bordered box used for form errors and
 * similar feedback. Tone drives the color; the same shape as {@link Badge}
 * but block-level.
 */
export function Alert({
    tone = "error",
    icon,
    className,
    children,
    ...rest
}: AlertProps) {
    const iconNode =
        icon === undefined ? (
            <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
        ) : (
            icon
        );

    return (
        <div
            role="alert"
            className={cn(
                "flex items-start gap-2 rounded-md border px-3 py-2 text-sm",
                toneClasses[tone],
                className,
            )}
            {...rest}
        >
            {iconNode}
            <span>{children}</span>
        </div>
    );
}
