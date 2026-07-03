import Link from "next/link";
import type { ChallengeDefinition } from "../../../../../../challenges/_schema";
import type { DebugSessionResponse } from "@/types/session";
import type { ScoreBreakdown } from "@/lib/scoring";

interface ResultViewProps {
    challenge: ChallengeDefinition;
    session: DebugSessionResponse;
    breakdown: ScoreBreakdown;
}

function formatDuration(seconds: number | null): string {
    if (seconds === null) return "-";
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

function scoreTone(score: number): {
    text: string;
    ring: string;
    glow: string;
} {
    if (score >= 80)
        return {
            text: "text-vscode-success",
            ring: "border-vscode-success/40",
            glow: "bg-vscode-success/10",
        };
    if (score >= 50)
        return {
            text: "text-vscode-warning",
            ring: "border-vscode-warning/40",
            glow: "bg-vscode-warning/10",
        };
    return {
        text: "text-vscode-error",
        ring: "border-vscode-error/40",
        glow: "bg-vscode-error/10",
    };
}

/** One signed adjustment row in the breakdown ledger. */
function LedgerRow({
    label,
    value,
    muted,
}: {
    label: string;
    value: number;
    muted?: boolean;
}) {
    const sign = value > 0 ? "+" : value < 0 ? "−" : "";
    const magnitude = Math.abs(value);
    const valueTone =
        value > 0
            ? "text-vscode-success"
            : value < 0
              ? "text-vscode-error"
              : "text-vscode-fg-muted";
    return (
        <div className="flex items-center justify-between py-2 text-sm">
            <span className={muted ? "text-vscode-fg-muted" : "text-vscode-fg"}>
                {label}
            </span>
            <span className={`font-mono tabular-nums ${valueTone}`}>
                {sign}
                {magnitude}
            </span>
        </div>
    );
}

function StatTile({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg border border-vscode-border bg-vscode-bg-elevated/60 p-4">
            <div className="text-xs uppercase tracking-wide text-vscode-fg-subtle">
                {label}
            </div>
            <div className="mt-1 text-lg font-semibold text-vscode-fg">
                {value}
            </div>
        </div>
    );
}

export function ResultView({ challenge, session, breakdown }: ResultViewProps) {
    const score = session.score ?? breakdown.score;
    const tone = scoreTone(score);
    const passed = session.lastRunPassed ?? 0;
    const total = session.lastRunTotal ?? 0;

    return (
        <div className="relative min-h-screen overflow-hidden bg-vscode-bg text-vscode-fg">
            <div
                aria-hidden
                className={`pointer-events-none absolute left-1/2 top-[-8rem] h-[26rem] w-[26rem] -translate-x-1/2 rounded-full blur-3xl ${tone.glow}`}
            />

            <div className="relative mx-auto max-w-3xl px-6 py-16">
                <Link
                    href="/"
                    className="text-sm text-vscode-fg-muted transition-colors hover:text-vscode-fg"
                >
                    ← All challenges
                </Link>

                <div className="mt-8 flex flex-col items-center text-center">
                    <div className="inline-flex items-center gap-2 rounded-full border border-vscode-success/30 bg-vscode-success/10 px-3 py-1 text-xs font-medium text-vscode-success">
                        <CheckIcon />
                        Solved &amp; submitted
                    </div>

                    <h1 className="mt-5 text-3xl font-bold tracking-tight text-vscode-fg sm:text-4xl">
                        {challenge.meta.title}
                    </h1>

                    <div
                        className={`mt-8 flex h-40 w-40 flex-col items-center justify-center rounded-full border-4 ${tone.ring}`}
                    >
                        <span
                            className={`text-5xl font-bold tabular-nums ${tone.text}`}
                        >
                            {score}
                        </span>
                        <span className="text-sm text-vscode-fg-subtle">
                            / 100
                        </span>
                    </div>
                </div>

                {/* Score breakdown ledger */}
                <div className="mt-10 rounded-xl border border-vscode-border bg-vscode-bg-elevated/40 p-6">
                    <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-vscode-fg-subtle">
                        How your score was calculated
                    </h2>
                    <div className="divide-y divide-vscode-border-subtle">
                        <LedgerRow label="Base score" value={breakdown.base} />
                        <LedgerRow
                            label={`Hints revealed (${session.revealedHintLevels.length})`}
                            value={-breakdown.hintPenalty}
                            muted
                        />
                        <LedgerRow
                            label={`Test runs (${session.attemptsCount})`}
                            value={-breakdown.attemptPenalty}
                            muted
                        />
                        <LedgerRow
                            label="Time adjustment"
                            value={breakdown.timeAdjustment}
                            muted
                        />
                        {breakdown.solutionForfeit ? (
                            <div className="flex items-center justify-between py-2 text-sm">
                                <span className="text-vscode-error">
                                    Solution revealed
                                </span>
                                <span className="font-mono tabular-nums text-vscode-error">
                                    score forfeited
                                </span>
                            </div>
                        ) : null}
                    </div>
                    <div className="mt-2 flex items-center justify-between border-t border-vscode-border pt-3">
                        <span className="text-sm font-semibold text-vscode-fg">
                            Final score
                        </span>
                        <span
                            className={`font-mono text-lg font-bold tabular-nums ${tone.text}`}
                        >
                            {score}
                        </span>
                    </div>
                </div>

                {/* Stats */}
                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <StatTile
                        label="Time"
                        value={formatDuration(session.timeTaken)}
                    />
                    <StatTile
                        label="Test runs"
                        value={String(session.attemptsCount)}
                    />
                    <StatTile
                        label="Hints"
                        value={String(session.revealedHintLevels.length)}
                    />
                    <StatTile
                        label="Tests"
                        value={total > 0 ? `${passed}/${total}` : "-"}
                    />
                </div>

                {/* Postmortem placeholder - Phase 7 */}
                <div className="mt-6 rounded-xl border border-dashed border-vscode-border bg-vscode-bg-elevated/20 p-6">
                    <div className="flex items-start gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-vscode-border bg-vscode-bg-elevated text-vscode-accent">
                            <SparkIcon />
                        </div>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-sm font-semibold text-vscode-fg">
                                    AI postmortem
                                </h2>
                                <span className="inline-flex items-center rounded-full border border-vscode-accent/30 bg-vscode-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-vscode-accent">
                                    Coming soon
                                </span>
                            </div>
                            <p className="mt-1.5 text-sm leading-relaxed text-vscode-fg-muted">
                                Soon you&apos;ll get an AI-generated write-up of
                                this fix — root cause, blast radius, and how to
                                stop it happening again.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                    <Link
                        href={`/challenges/${challenge.meta.slug}/arena`}
                        className="inline-flex items-center gap-2 rounded-md border border-vscode-border bg-vscode-bg-elevated px-5 py-2.5 text-sm font-medium text-vscode-fg transition-colors hover:bg-vscode-tab-hover"
                    >
                        Try again
                    </Link>
                    <Link
                        href="/#challenges"
                        className="inline-flex items-center gap-2 rounded-md bg-vscode-accent px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-vscode-accent/20 transition-all hover:bg-vscode-accent-hover hover:shadow-vscode-accent/40"
                    >
                        Next challenge
                    </Link>
                </div>
            </div>
        </div>
    );
}

function CheckIcon() {
    return (
        <svg
            aria-hidden
            viewBox="0 0 20 20"
            fill="none"
            className="h-3.5 w-3.5"
        >
            <path
                d="M4 10.5l3.5 3.5L16 6"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function SparkIcon() {
    return (
        <svg
            aria-hidden
            viewBox="0 0 20 20"
            fill="none"
            className="h-5 w-5"
        >
            <path
                d="M10 2.5l1.6 4.3 4.3 1.6-4.3 1.6L10 14.3 8.4 10l-4.3-1.6L8.4 6.8 10 2.5z"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinejoin="round"
            />
            <path
                d="M15.5 12.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8z"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinejoin="round"
            />
        </svg>
    );
}
