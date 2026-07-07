"use client";

import { forwardRef, useState } from "react";
import { Input, type InputProps } from "./Input";
import { EyeIcon, EyeOffIcon } from "./icons";

/**
 * Password input with a show/hide toggle. Wraps {@link Input} and manages
 * only the reveal state locally; the value stays controlled by the caller.
 * The `type` is fixed to password/text, so it is omitted from the props.
 */
export type PasswordInputProps = Omit<InputProps, "type">;

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
    function PasswordInput({ className, ...rest }, ref) {
        const [revealed, setRevealed] = useState(false);

        return (
            <div className="relative">
                <Input
                    ref={ref}
                    type={revealed ? "text" : "password"}
                    className={`pr-10 ${className ?? ""}`}
                    {...rest}
                />
                <button
                    type="button"
                    onClick={() => setRevealed((v) => !v)}
                    aria-label={revealed ? "Hide password" : "Show password"}
                    aria-pressed={revealed}
                    tabIndex={-1}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-vscode-fg-muted transition-colors hover:text-vscode-fg"
                >
                    {revealed ? (
                        <EyeOffIcon className="h-4 w-4" />
                    ) : (
                        <EyeIcon className="h-4 w-4" />
                    )}
                </button>
            </div>
        );
    },
);
