"use client";

import { useArenaStore } from "@/store/arena";
import { useLanguageSwitch } from "@/hooks/useLanguageSwitch";
import { runtimeLabel } from "@/lib/runtimes";
import { ChevronDownIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

/**
 * Dropdown for switching the language a challenge is solved in. Renders nothing
 * for single-language challenges, so existing challenges are visually
 * unchanged. Option order follows `challenge.meta.languages`, so it scales to
 * any number of languages a challenge offers.
 */
export function LanguageSwitcher() {
    const challenge = useArenaStore((s) => s.challenge);
    const isRunning = useArenaStore((s) => s.isRunning);
    const { currentLanguage, switchTo, switching, error } = useLanguageSwitch();

    const languages = challenge?.meta.languages ?? [];
    if (languages.length <= 1) return null;

    const disabled = switching || isRunning;

    return (
        <div className="flex items-center gap-2">
            <div className="relative">
                <select
                    aria-label="Solve in language"
                    value={currentLanguage ?? languages[0]}
                    disabled={disabled}
                    onChange={(e) => switchTo(e.target.value)}
                    className={cn(
                        "appearance-none rounded-md border border-vscode-border bg-vscode-bg-elevated",
                        "py-1 pl-2.5 pr-7 text-xs font-medium text-vscode-fg",
                        "transition-colors hover:border-vscode-border-subtle",
                        "focus:border-vscode-accent focus:outline-none",
                        disabled && "cursor-not-allowed opacity-60",
                    )}
                    title={
                        currentLanguage
                            ? `Solving in ${runtimeLabel(currentLanguage)}`
                            : "Select a language"
                    }
                >
                    {languages.map((lang) => (
                        <option key={lang} value={lang}>
                            {runtimeLabel(lang)}
                        </option>
                    ))}
                </select>
                <ChevronDownIcon className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-vscode-fg-muted" />
            </div>
            {switching ? (
                <span className="text-xs text-vscode-fg-subtle">Switching…</span>
            ) : error ? (
                <span className="text-xs text-vscode-error" title={error}>
                    Switch failed
                </span>
            ) : null}
        </div>
    );
}
