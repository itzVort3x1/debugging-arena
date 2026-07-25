"use client";

import { useArenaStore } from "@/store/arena";
import { useLanguageSwitch } from "@/hooks/useLanguageSwitch";
import { runtimeLabel } from "@/lib/runtimes";
import { cn } from "@/lib/utils";

/**
 * Segmented control for switching the language a challenge is solved in.
 * Renders nothing for single-language challenges, so existing challenges are
 * visually unchanged. Order follows `challenge.meta.languages`.
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
            <div
                role="tablist"
                aria-label="Solve in language"
                className="flex items-center gap-0.5 rounded-md border border-vscode-border bg-vscode-bg-elevated p-0.5"
            >
                {languages.map((lang) => {
                    const active = lang === currentLanguage;
                    return (
                        <button
                            key={lang}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            disabled={disabled || active}
                            onClick={() => switchTo(lang)}
                            className={cn(
                                "rounded px-2 py-0.5 text-xs font-medium transition-colors",
                                active
                                    ? "bg-vscode-accent text-white"
                                    : "text-vscode-fg-muted hover:bg-vscode-tab-hover hover:text-vscode-fg",
                                disabled && !active && "opacity-50",
                            )}
                            title={
                                active
                                    ? `Solving in ${runtimeLabel(lang)}`
                                    : `Switch to ${runtimeLabel(lang)}`
                            }
                        >
                            {runtimeLabel(lang)}
                        </button>
                    );
                })}
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
