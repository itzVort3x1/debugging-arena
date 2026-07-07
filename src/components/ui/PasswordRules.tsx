import { cn } from "@/lib/utils";
import { CheckIcon, DotIcon } from "./icons";

/**
 * The client-side password policy. Kept in one place so the live checklist
 * and any "is this valid yet" gate agree. Mirrors the server's zod rules in
 * the register route - the server remains the source of truth on submit.
 */
export const passwordRules: ReadonlyArray<{
    label: string;
    test: (password: string) => boolean;
}> = [
    { label: "At least 8 characters", test: (p) => p.length >= 8 },
    { label: "One uppercase letter", test: (p) => /[A-Z]/.test(p) },
    { label: "One number", test: (p) => /[0-9]/.test(p) },
    { label: "One symbol", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

/** Whether `password` satisfies every rule. */
export function isPasswordValid(password: string): boolean {
    return passwordRules.every((r) => r.test(password));
}

export interface PasswordRulesProps {
    password: string;
    className?: string;
}

/**
 * Live checklist of {@link passwordRules}, each row lit green once its rule
 * is met.
 */
export function PasswordRules({ password, className }: PasswordRulesProps) {
    return (
        <ul
            className={cn(
                "grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs",
                className,
            )}
        >
            {passwordRules.map((rule) => {
                const met = rule.test(password);
                return (
                    <li
                        key={rule.label}
                        className={cn(
                            "flex items-center gap-1.5",
                            met
                                ? "text-vscode-success"
                                : "text-vscode-fg-subtle",
                        )}
                    >
                        {met ? (
                            <CheckIcon className="h-3.5 w-3.5 shrink-0" />
                        ) : (
                            <DotIcon className="h-3.5 w-3.5 shrink-0" />
                        )}
                        {rule.label}
                    </li>
                );
            })}
        </ul>
    );
}
