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

/**
 * Stack labels naming a test harness rather than something the user works in.
 *
 * The dashboard tallies each solved challenge's `stack` labels, so a challenge
 * tagged `["Python", "pytest"]` reported pytest as its own language sitting
 * beside Python - and solving one challenge looked like two.
 *
 * Deliberately filtered here rather than removed from the challenge's `stack`:
 * on a challenge card, knowing the suite is pytest is worth showing. It is only
 * the per-language tally that shouldn't count a runner as a language.
 *
 * Matched case-insensitively; entries must be lowercase.
 */
const TEST_FRAMEWORKS = new Set([
    "jest",
    "vitest",
    "mocha",
    "chai",
    "jasmine",
    "supertest",
    "testing library",
    "react testing library",
    "playwright",
    "cypress",
    "pytest",
    "unittest",
    "nose",
    "junit",
    "testng",
    "rspec",
    "minitest",
    "go test",
    "cargo test",
]);

/** True when a stack label names a test framework - see {@link TEST_FRAMEWORKS}. */
export function isTestFramework(label: string): boolean {
    return TEST_FRAMEWORKS.has(label.trim().toLowerCase());
}
