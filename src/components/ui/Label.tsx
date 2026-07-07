import { type LabelHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
    /** Optional muted hint rendered opposite the label (e.g. "optional"). */
    hint?: string;
}

/**
 * Form label with an optional trailing hint. Renders the label/hint header
 * row used above every field.
 */
export function Label({ hint, className, children, ...rest }: LabelProps) {
    return (
        <div className="mb-1.5 flex items-baseline justify-between">
            <label
                className={cn(
                    "text-sm font-medium text-vscode-fg",
                    className,
                )}
                {...rest}
            >
                {children}
            </label>
            {hint ? (
                <span className="text-xs text-vscode-fg-subtle">{hint}</span>
            ) : null}
        </div>
    );
}
