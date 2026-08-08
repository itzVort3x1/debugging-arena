import type { Difficulty, Runtime } from "../../../challenges/_schema";
import type { ChallengeTree } from "./store/tree";

/**
 * Starter content for a new challenge.
 *
 * A blank tree would fail validation immediately and leave an author guessing
 * at the layout, so a new challenge starts as a complete, working example: a
 * deliberately buggy module, a test that catches the bug, and placeholder
 * prose. It validates as-is, which means it can be published the moment the
 * author has replaced the content - and it demonstrates the file layout, which
 * is otherwise only documented in `loader.ts`.
 *
 * Import paths here mirror how the runner materializes a sandbox: files under
 * `files/` land at the root, tests land under `tests/`, so a test reaches its
 * source as `../src/challenge` (Node) or a bare module name (Python, which
 * runs with the sandbox root on `sys.path`).
 */

/** Slugs that would collide with a static route under /admin or /api/admin. */
const RESERVED_SLUGS = new Set(["new", "revalidate"]);

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Why this slug is unusable, or null when it's fine. */
export function slugError(slug: string): string | null {
    if (!slug) return "Slug is required.";
    if (slug.length > 64) return "Slug must be 64 characters or fewer.";
    if (!SLUG_PATTERN.test(slug)) {
        return "Slug must be lowercase letters, digits and single hyphens (e.g. payment-retry-bug).";
    }
    if (RESERVED_SLUGS.has(slug)) {
        return `"${slug}" is reserved and cannot be used as a slug.`;
    }
    return null;
}

export interface ScaffoldInput {
    slug: string;
    title: string;
    difficulty: Difficulty;
    runtime: Runtime;
}

const NODE_FILES = {
    "files/src/challenge.ts": `/**
 * TODO: replace this with the module under test.
 *
 * The bug should be plausible and subtle - something a reviewer could miss,
 * not an obvious typo.
 */
export function totalAfterDiscount(amount: number, percentOff: number): number {
    // BUG: subtracts the percentage itself rather than that share of the amount.
    return amount - percentOff;
}
`,
    "files/playground.ts": `import { totalAfterDiscount } from "./src/challenge";

// Scratch space - run this file to poke at the code while you debug.
console.log(totalAfterDiscount(100, 20));
`,
    "tests/challenge.test.ts": `import { totalAfterDiscount } from "../src/challenge";

describe("totalAfterDiscount", () => {
    it("takes the given percentage off the amount", () => {
        expect(totalAfterDiscount(100, 20)).toBe(80);
    });

    it("handles a zero discount", () => {
        expect(totalAfterDiscount(50, 0)).toBe(50);
    });
});
`,
};

const PYTHON_FILES = {
    "files/challenge.py": `"""TODO: replace this with the module under test.

The bug should be plausible and subtle - something a reviewer could miss,
not an obvious typo.
"""


def total_after_discount(amount, percent_off):
    # BUG: subtracts the percentage itself rather than that share of the amount.
    return amount - percent_off
`,
    "tests/test_challenge.py": `from challenge import total_after_discount


def test_takes_percentage_off_the_amount():
    assert total_after_discount(100, 20) == 80


def test_handles_zero_discount():
    assert total_after_discount(50, 0) == 50
`,
};

const STACK_BY_RUNTIME: Partial<Record<Runtime, string[]>> = {
    node: ["Node.js", "TypeScript"],
    python: ["Python", "pytest"],
};

function descriptionFor(title: string): string {
    return `# ${title}

TODO: describe the symptom the way a bug report would - what the user sees,
not what the fix is.

## Steps to reproduce

1. TODO
2. TODO

## Expected

TODO

## Actual

TODO
`;
}

function hintsFor(): string {
    return (
        JSON.stringify(
            {
                hints: [
                    {
                        level: 1,
                        title: "Where to look",
                        content:
                            "TODO: point at the right file without naming the bug.",
                        penaltyPoints: 5,
                    },
                    {
                        level: 2,
                        title: "Narrow it down",
                        content: "TODO: name the function, still not the bug.",
                        penaltyPoints: 10,
                    },
                    {
                        level: 3,
                        title: "The bug",
                        content: "TODO: describe what is wrong.",
                        penaltyPoints: 20,
                    },
                    {
                        level: 4,
                        title: "The fix",
                        content: "TODO: describe the change that fixes it.",
                        penaltyPoints: 35,
                    },
                ],
            },
            null,
            2,
        ) + "\n"
    );
}

/**
 * Build a complete, valid challenge tree. The result passes
 * `validateChallengeTree`, so a newly created challenge is never born broken.
 */
export function buildScaffold({
    slug,
    title,
    difficulty,
    runtime,
}: ScaffoldInput): ChallengeTree {
    const meta = {
        slug,
        title,
        difficulty,
        tags: [runtime],
        timeLimit: 900,
        stack: STACK_BY_RUNTIME[runtime] ?? [runtime],
        issueContext: "TODO: one-line summary, like a Jira issue title",
        runtime,
    };

    return {
        "meta.json": JSON.stringify(meta, null, 2) + "\n",
        "description.md": descriptionFor(title),
        "hints.json": hintsFor(),
        "solution.md": `# Solution\n\nTODO: the worked explanation, shown only after every hint is revealed.\n`,
        ...(runtime === "python" ? PYTHON_FILES : NODE_FILES),
    };
}
