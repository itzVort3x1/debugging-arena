import type { ReactNode } from "react";

/**
 * A titled block for the profile sidebar (e.g. "Languages"). Generic wrapper so
 * new sidebar panels stay visually consistent — heading, optional trailing
 * action, then arbitrary content.
 */
export function SidebarSection({
    title,
    action,
    children,
}: {
    title: string;
    action?: ReactNode;
    children: ReactNode;
}) {
    return (
        <section className="border-t border-vscode-border-subtle pt-5">
            <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-vscode-fg">
                    {title}
                </h2>
                {action}
            </div>
            {children}
        </section>
    );
}
