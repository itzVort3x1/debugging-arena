import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getChallenge, getAllChallengeMeta } from "@/lib/challenges/registry";
import { loadDashboard, type DashboardSession } from "@/lib/dashboard";
import type { Difficulty } from "@/types/challenge";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import {
    formatDuration,
    formatMonthYear,
    formatRelativeTime,
} from "@/lib/format";
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

    const [user, data] = await Promise.all([
        prisma.user.findUnique({
            where: { id: session.user.id },
            select: { name: true, email: true, createdAt: true },
        }),
        loadDashboard(session.user.id),
    ]);

    const name = user?.name ?? session.user.name ?? null;
    const email = user?.email ?? session.user.email ?? null;
    const label = displayName({ name, email });
    const totalChallenges = getAllChallengeMeta().length;

    return (
        <div className="min-h-screen bg-vscode-bg text-vscode-fg">
            <div className="mx-auto max-w-5xl px-6 py-10">
                <TopBar />
                <IdentityHeader
                    label={label}
                    name={name}
                    email={email}
                    createdAt={user?.createdAt ?? null}
                />
                <StatStrip
                    solvedCount={data.stats.solvedCount}
                    totalChallenges={totalChallenges}
                    avgScore={data.stats.avgScore}
                    totalTimeSeconds={data.stats.totalTimeSeconds}
                />

                <ContinueSection sessions={data.inProgress} />
                <SolvedSection sessions={data.solved} />
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

function IdentityHeader({
    label,
    name,
    email,
    createdAt,
}: {
    label: string;
    name: string | null;
    email: string | null;
    createdAt: Date | null;
}) {
    return (
        <header className="flex items-center gap-4">
            <Avatar label={label} size="lg" />
            <div className="min-w-0">
                <h1 className="truncate text-2xl font-bold tracking-tight text-vscode-fg">
                    {name ?? email ?? "Your dashboard"}
                </h1>
                <p className="mt-0.5 truncate text-sm text-vscode-fg-muted">
                    {name && email ? email : null}
                    {createdAt ? (
                        <span className="text-vscode-fg-subtle">
                            {name && email ? " · " : ""}
                            Member since {formatMonthYear(createdAt)}
                        </span>
                    ) : null}
                </p>
            </div>
        </header>
    );
}

// ---------------------- stat strip ----------------------

function StatStrip({
    solvedCount,
    totalChallenges,
    avgScore,
    totalTimeSeconds,
}: {
    solvedCount: number;
    totalChallenges: number;
    avgScore: number | null;
    totalTimeSeconds: number;
}) {
    const stats = [
        { label: "Solved", value: `${solvedCount} / ${totalChallenges}` },
        { label: "Avg score", value: avgScore === null ? "-" : `${avgScore}` },
        {
            label: "Time debugging",
            value:
                totalTimeSeconds > 0 ? formatDuration(totalTimeSeconds) : "-",
        },
    ];
    return (
        <div className="mt-6 grid grid-cols-3 gap-3">
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
        <section className="mt-12">
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
                        <SessionCard key={s.sessionId} session={s} kind="resume" />
                    ))}
                </div>
            )}
        </section>
    );
}

function SolvedSection({ sessions }: { sessions: DashboardSession[] }) {
    return (
        <section className="mt-12">
            <SectionHeading title="Solved" count={sessions.length} />
            {sessions.length === 0 ? (
                <Card className="border-vscode-border">
                    <EmptyState className="h-auto py-8">
                        Nothing solved yet — your wins will show up here.
                    </EmptyState>
                </Card>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                    {sessions.map((s) => (
                        <SessionCard key={s.sessionId} session={s} kind="solved" />
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
                            <span>{formatRelativeTime(session.completedAt)}</span>
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
