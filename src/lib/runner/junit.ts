import type { TestCounts } from "./languages/types";

/**
 * Parse a JUnit XML report into normalized test counts.
 *
 * JUnit XML is the shared wire format for non-jest frameworks: pytest emits it
 * natively (`--junitxml`), and go/rust/java all have adapters that do too. So
 * every future runner can reuse this instead of hand-parsing its framework's
 * bespoke output. We only need the aggregate `<testsuite>` attributes, so this
 * reads them with a focused regex rather than pulling in a full XML parser
 * (the app ships none, and the report shape here is simple and well-defined).
 */
export function parseJUnitCounts(xml: string): TestCounts {
    let tests = 0;
    let failures = 0;
    let errors = 0;
    let skipped = 0;

    // Each opening `<testsuite ...>` tag carries the per-suite totals. The
    // `\s` after the name means the `<testsuites>` wrapper (which carries no
    // counts in pytest's output) is not matched, so nothing is double-counted.
    const suiteTag = /<testsuite\s[^>]*>/g;
    let match: RegExpExecArray | null;
    while ((match = suiteTag.exec(xml)) !== null) {
        const tag = match[0];
        tests += readAttr(tag, "tests");
        failures += readAttr(tag, "failures");
        errors += readAttr(tag, "errors");
        skipped += readAttr(tag, "skipped");
    }

    const failed = failures + errors;
    return {
        total: tests,
        failed,
        // Skipped tests are neither passed nor failed, but still count toward
        // the total — so passed is the remainder after both.
        passed: Math.max(0, tests - failed - skipped),
    };
}

function readAttr(tag: string, name: string): number {
    const m = tag.match(new RegExp(`\\b${name}="(\\d+)"`));
    return m ? parseInt(m[1], 10) : 0;
}
