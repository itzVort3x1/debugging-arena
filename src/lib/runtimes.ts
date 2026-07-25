import type { Runtime } from "../../challenges/_schema";

/**
 * Human-readable label for a challenge runtime, shown on the language switcher,
 * the status bar, and dashboard cards. Keyed by the `Runtime` string a session
 * stores in `language`.
 */
export const RUNTIME_LABEL: Record<Runtime, string> = {
    node: "TypeScript",
    python: "Python",
    go: "Go",
    rust: "Rust",
};

/** Label for a runtime string, falling back to the raw value if unknown. */
export function runtimeLabel(language: string): string {
    return RUNTIME_LABEL[language as Runtime] ?? language;
}
