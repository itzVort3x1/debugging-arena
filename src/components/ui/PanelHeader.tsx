import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface PanelHeaderProps {
    title: string;
    /** Node rendered opposite the title (e.g. a Badge). */
    action?: ReactNode;
    /** Muted line under the title. */
    subtitle?: ReactNode;
    /** Extra content below the subtitle (e.g. an inline error). */
    children?: ReactNode;
    className?: string;
}

/**
 * The sticky header block for a side panel: a title row with an optional
 * trailing action, an optional subtitle, and room for extra content beneath
 * (used by the hint panel for its penalty badge + error line).
 */
export function PanelHeader({
    title,
    action,
    subtitle,
    children,
    className,
}: PanelHeaderProps) {
    return (
        <header
            className={cn(
                "border-b border-vscode-border-subtle bg-vscode-sidebar px-5 py-4",
                className,
            )}
        >
            <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-vscode-fg">
                    {title}
                </h2>
                {action}
            </div>
            {subtitle ? (
                <p className="mt-1 text-xs text-vscode-fg-muted">{subtitle}</p>
            ) : null}
            {children}
        </header>
    );
}
