import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

/**
 * Bare text input styled to match the app's form controls. Owns only the
 * visual shell - callers pass `value`/`onChange`/`type`/etc. as native input
 * props. See {@link FormField} for the labelled composition and
 * {@link PasswordInput} for the reveal-toggle variant.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
    { className, ...rest },
    ref,
) {
    return (
        <input
            ref={ref}
            className={cn(
                "w-full rounded-md border border-vscode-border bg-vscode-bg px-3 py-2 text-sm text-vscode-fg placeholder:text-vscode-fg-subtle transition-colors",
                "focus:border-vscode-accent focus:outline-none focus:ring-2 focus:ring-vscode-accent/30",
                className,
            )}
            {...rest}
        />
    );
});
