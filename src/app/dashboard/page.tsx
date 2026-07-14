import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getChallenge, getAllChallengeMeta } from "@/lib/challenges/registry";
import { loadDashboard, type DashboardSession } from "@/lib/dashboard";
import { loadActivityCalendar } from "@/lib/activity";
import type { Difficulty } from "@/types/challenge";
import {
    ProgressRing,
    type DifficultyProgress,
} from "@/components/dashboard/ProgressRing";
import { ProfileSidebar } from "@/components/dashboard/ProfileSidebar";
import { SidebarSection } from "@/components/dashboard/SidebarSection";
import { StatCountList } from "@/components/dashboard/StatCountList";
import { BadgesCard } from "@/components/dashboard/BadgesCard";
import { ContributionGraph } from "@/components/dashboard/ContributionGraph";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDuration, formatRelativeTime } from "@/lib/format";
import { displayName } from "@/lib/user";

export const metadata: Metadata = {
    title: "Dashboard",
    robots: { index: false, follow: false },
};

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect(`/login?callbackUrl=${encodeURIComponent("/dashboard")}`);
    }

    const [user, data, activity] = await Promise.all([
        prisma.user.findUnique({
            where: { id: session.user.id },
            select: { name: true, email: true, createdAt: true },
        }),
        loadDashboard(session.user.id),
        loadActivityCalendar(session.user.id),
    ]);

    const name = user?.name ?? session.user.name ?? null;
    const email = user?.email ?? session.user.email ?? null;
    const label = displayName({ name, email });

    // Per-difficulty totals from the registry; solved counts from the user's
    // best sessions. Order (easy/medium/hard) is enforced by ProgressRing.
    const order: Difficulty[] = ["easy", "medium", "hard"];
    const totals: Record<Difficulty, number> = { easy: 0, medium: 0, hard: 0 };
    for (const m of getAllChallengeMeta()) totals[m.difficulty]++;
    const solvedByDiff: Record<Difficulty, number> = {
        easy: 0,
        medium: 0,
        hard: 0,
    };
    for (const s of data.solved) {
        const c = getChallenge(s.slug);
        if (c) solvedByDiff[c.meta.difficulty]++;
    }
    const byDifficulty: DifficultyProgress[] = order.map((difficulty) => ({
        difficulty,
        solved: solvedByDiff[difficulty],
        total: totals[difficulty],
    }));
    const totalChallenges = getAllChallengeMeta().length;

    // Tech-stack breakdown across solved challenges (LeetCode's "Languages"
    // panel analog). A challenge can contribute several stack labels.
    const languageCounts = new Map<string, number>();
    for (const s of data.solved) {
        const c = getChallenge(s.slug);
        if (!c) continue;
        for (const tech of c.meta.stack) {
            languageCounts.set(tech, (languageCounts.get(tech) ?? 0) + 1);
        }
    }
    const languages = Array.from(languageCounts, ([label, count]) => ({
        label,
        count,
    })).sort((a, b) => b.count - a.count);

    const headerName = name ?? email ?? "Your dashboard";
    const username = name ? email : null;

    return (
        <div className="min-h-screen bg-vscode-bg text-vscode-fg">
            <div className="mx-auto max-w-6xl px-6 py-10">
                <TopBar />
                <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
                    <ProfileSidebar
                        label={label}
                        name={headerName}
                        username={username}
                    >
                        <SidebarSection title="Languages">
                            <StatCountList
                                items={languages}
                                unit="solved"
                                emptyLabel="Solve a challenge to see your stack."
                            />
                        </SidebarSection>
                    </ProfileSidebar>

                    <div className="flex flex-col gap-8">
                        <div className="grid gap-6 xl:grid-cols-2">
                            <div className="rounded-lg border border-vscode-border bg-vscode-bg-elevated/40 px-6 py-6">
                                <ProgressRing
                                    solved={data.stats.solvedCount}
                                    total={totalChallenges}
                                    attempting={data.stats.inProgressCount}
                                    byDifficulty={byDifficulty}
                                />
                            </div>
                            <BadgesCard />
                        </div>
                        <div className="rounded-lg border border-vscode-border bg-vscode-bg-elevated/40 px-6 py-6">
                            <ContributionGraph
                                counts={activity.counts}
                                total={activity.total}
                                unit="submission"
                            />
                        </div>
                        <StatStrip
                            avgScore={data.stats.avgScore}
                            totalTimeSeconds={data.stats.totalTimeSeconds}
                        />
                        <ContinueSection sessions={data.inProgress} />
                        <SolvedSection sessions={data.solved} />
                    </div>
                </div>
            </div>
        </div>
    );
}

// ---------------------- header ----------------------

function TopBar() {
    return (
        <div className="mb-8 flex items-center justify-between">
            <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-sm text-vscode-fg-muted transition-colors hover:text-vscode-fg"
            >
                <BackArrow />
                Back to home
            </Link>
        </div>
    );
}

// ---------------------- stat strip ----------------------

function StatStrip({
    avgScore,
    totalTimeSeconds,
}: {
    avgScore: number | null;
    totalTimeSeconds: number;
}) {
    const stats = [
        { label: "Avg score", value: avgScore === null ? "-" : `${avgScore}` },
        {
            label: "Time debugging",
            value:
                totalTimeSeconds > 0 ? formatDuration(totalTimeSeconds) : "-",
        },
    ];
    return (
        <div className="grid grid-cols-2 gap-3">
            {stats.map((s) => (
                <div
                    key={s.label}
                    className="rounded-lg border border-vscode-border bg-vscode-bg-elevated/60 px-4 py-3"
                >
                    <div className="text-xl font-semibold text-vscode-fg">
                        {s.value}
                    </div>
                    <div className="mt-0.5 text-xs uppercase tracking-wide text-vscode-fg-subtle">
                        {s.label}
                    </div>
                </div>
            ))}
        </div>
    );
}

// ---------------------- continue / solved ----------------------

function ContinueSection({ sessions }: { sessions: DashboardSession[] }) {
    return (
        <section>
            <SectionHeading
                title="Continue where you left off"
                count={sessions.length}
            />
            {sessions.length === 0 ? (
                <Card className="border-vscode-border">
                    <EmptyState className="h-auto flex-col gap-2 py-8 text-center">
                        <span>No sessions in progress.</span>
                        <Link
                            href="/#challenges"
                            className="text-vscode-accent hover:underline"
                        >
                            Pick a challenge →
                        </Link>
                    </EmptyState>
                </Card>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                    {sessions.map((s) => (
                        <SessionCard
                            key={s.sessionId}
                            session={s}
                            kind="resume"
                        />
                    ))}
                </div>
            )}
        </section>
    );
}

function SolvedSection({ sessions }: { sessions: DashboardSession[] }) {
    return (
        <section>
            <SectionHeading title="Solved" count={sessions.length} />
            {sessions.length === 0 ? (
                <Card className="border-vscode-border">
                    <EmptyState className="h-auto py-8">
                        Nothing solved yet - your wins will show up here.
                    </EmptyState>
                </Card>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                    {sessions.map((s) => (
                        <SessionCard
                            key={s.sessionId}
                            session={s}
                            kind="solved"
                        />
                    ))}
                </div>
            )}
        </section>
    );
}

function SectionHeading({ title, count }: { title: string; count: number }) {
    return (
        <div className="mb-4 flex items-center gap-3">
            <h2 className="text-lg font-semibold text-vscode-fg">{title}</h2>
            {count > 0 ? (
                <span className="text-xs text-vscode-fg-subtle">{count}</span>
            ) : null}
        </div>
    );
}

// ---------------------- session card ----------------------

const difficultyTone: Record<Difficulty, "success" | "warning" | "error"> = {
    easy: "success",
    medium: "warning",
    hard: "error",
};

function SessionCard({
    session,
    kind,
}: {
    session: DashboardSession;
    kind: "resume" | "solved";
}) {
    const challenge = getChallenge(session.slug);
    // A session for a challenge that's since been removed from the registry.
    if (!challenge) return null;
    const { title, difficulty } = challenge.meta;

    const href =
        kind === "solved"
            ? `/challenges/${session.slug}/result/${session.sessionId}`
            : `/challenges/${session.slug}/arena`;

    return (
        <Link
            href={href}
            className="group flex flex-col rounded-lg border border-vscode-border bg-vscode-bg-elevated/60 p-4 transition-all hover:-translate-y-0.5 hover:border-vscode-accent/60 hover:shadow-lg hover:shadow-vscode-accent/10"
        >
            <div className="mb-2 flex items-center justify-between gap-2">
                <Badge tone={difficultyTone[difficulty]} size="sm">
                    {difficulty}
                </Badge>
                {kind === "solved" ? (
                    <span className="text-sm font-semibold text-vscode-accent">
                        {typeof session.score === "number"
                            ? `${session.score} pts`
                            : "Submitted"}
                    </span>
                ) : (
                    <RunBadge
                        passed={session.lastRunPassed}
                        total={session.lastRunTotal}
                    />
                )}
            </div>

            <h3 className="text-sm font-semibold text-vscode-fg group-hover:text-vscode-accent">
                {title}
            </h3>

            <div className="mt-3 flex items-center gap-3 text-xs text-vscode-fg-subtle">
                {kind === "solved" ? (
                    <>
                        <span>{formatDuration(session.timeTaken)}</span>
                        {session.completedAt ? (
                            <span>
                                {formatRelativeTime(session.completedAt)}
                            </span>
                        ) : null}
                    </>
                ) : (
                    <span>Started {formatRelativeTime(session.startedAt)}</span>
                )}
            </div>
        </Link>
    );
}

function RunBadge({
    passed,
    total,
}: {
    passed: number | null;
    total: number | null;
}) {
    if (passed === null || total === null) {
        return <span className="text-xs text-vscode-fg-subtle">Not run</span>;
    }
    const allGreen = total > 0 && passed === total;
    return (
        <span
            className={
                allGreen
                    ? "text-xs font-medium text-vscode-success"
                    : "text-xs font-medium text-vscode-warning"
            }
        >
            {passed}/{total} passing
        </span>
    );
}

function BackArrow() {
    return (
        <svg
            aria-hidden
            viewBox="0 0 16 16"
            fill="none"
            className="h-3.5 w-3.5"
        >
            <path
                d="M10 3L5 8l5 5"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}
