import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAllChallengeMeta } from "@/lib/challenges/registry";
import type { ChallengeMeta, Difficulty } from "@/types/challenge";
import { TerminalCarousel } from "@/components/TerminalCarousel";
import { SignOutButton } from "@/components/SignOutButton";

interface SessionUser {
    name: string | null;
    email: string | null;
}

/** Per-challenge progress for the signed-in user, keyed by slug. */
interface ChallengeProgress {
    status: "IN_PROGRESS" | "SUBMITTED";
    score: number | null;
    sessionId: string;
}

/**
 * Best session per challenge for the given user: a SUBMITTED session
 * (highest score wins) outranks an in-progress one. Drives the card badges.
 */
async function loadProgress(
    userId: string,
): Promise<Record<string, ChallengeProgress>> {
    const sessions = await prisma.debugSession.findMany({
        where: { userId, status: { in: ["IN_PROGRESS", "SUBMITTED"] } },
        select: {
            challengeSlug: true,
            status: true,
            score: true,
            startedAt: true,
            id: true,
        },
        orderBy: { startedAt: "desc" },
    });

    const map: Record<string, ChallengeProgress> = {};
    for (const s of sessions) {
        const existing = map[s.challengeSlug];
        const candidate: ChallengeProgress = {
            status: s.status as "IN_PROGRESS" | "SUBMITTED",
            score: s.score,
            sessionId: s.id,
        };
        if (!existing) {
            map[s.challengeSlug] = candidate;
            continue;
        }
        // Prefer a submitted session; among submitted, the higher score.
        const better =
            (candidate.status === "SUBMITTED" &&
                existing.status !== "SUBMITTED") ||
            (candidate.status === "SUBMITTED" &&
                existing.status === "SUBMITTED" &&
                (candidate.score ?? 0) > (existing.score ?? 0));
        if (better) map[s.challengeSlug] = candidate;
    }
    return map;
}

export default async function HomePage() {
    const challenges = getAllChallengeMeta();
    const session = await getServerSession(authOptions);
    const user: SessionUser | null = session?.user
        ? {
              name: session.user.name ?? null,
              email: session.user.email ?? null,
          }
        : null;

    const progress = session?.user?.id
        ? await loadProgress(session.user.id)
        : {};

    return (
        <div className="relative min-h-screen overflow-hidden bg-vscode-bg text-vscode-fg">
            {/* Ambient glows */}
            <div
                aria-hidden
                className="pointer-events-none absolute -left-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-vscode-accent/10 blur-3xl"
            />
            <div
                aria-hidden
                className="pointer-events-none absolute right-[-10rem] top-[20rem] h-[24rem] w-[24rem] rounded-full bg-vscode-info/10 blur-3xl"
            />
            <div
                aria-hidden
                className="pointer-events-none absolute bottom-[-8rem] left-1/3 h-[20rem] w-[20rem] rounded-full bg-vscode-success/5 blur-3xl"
            />

            <div className="relative mx-auto max-w-6xl px-6">
                <TopNav user={user} />
                <Hero user={user} />
                <HowItWorks />
                <FeaturedChallenges
                    challenges={challenges}
                    authed={!!user}
                    progress={progress}
                />
                {!user && <ComparisonStrip />}
                {!user && <FinalCTA />}
                <Footer />
            </div>
        </div>
    );
}

// ---------------------- nav ----------------------

function TopNav({ user }: { user: SessionUser | null }) {
    return (
        <header className="flex h-16 items-center justify-between">
            <Link
                href="/"
                className="flex items-center gap-2 text-sm font-semibold text-vscode-fg"
            >
                <BugIcon />
                Debugging Arena
            </Link>
            <nav className="flex items-center gap-2 text-sm">
                {user ? <AuthedNav user={user} /> : <AnonNav />}
            </nav>
        </header>
    );
}

function AnonNav() {
    return (
        <>
            <Link
                href="/login"
                className="rounded-md border border-transparent px-3.5 py-1.5 text-sm font-medium text-vscode-fg-muted transition-all hover:border-vscode-border hover:bg-vscode-bg-elevated hover:text-vscode-fg"
            >
                Sign in
            </Link>
            <Link
                href="/register"
                className="group relative inline-flex items-center gap-1.5 rounded-md bg-vscode-accent px-4 py-1.5 text-sm font-semibold text-white shadow-md shadow-vscode-accent/30 ring-1 ring-inset ring-white/10 transition-all hover:bg-vscode-accent-hover hover:shadow-lg hover:shadow-vscode-accent/50"
            >
                Get started
                <NavArrowIcon />
            </Link>
        </>
    );
}

function AuthedNav({ user }: { user: SessionUser }) {
    const label = user.name ?? user.email ?? "Account";
    return (
        <>
            <Link
                href="#challenges"
                className="hidden rounded-md border border-transparent px-3.5 py-1.5 text-sm font-medium text-vscode-fg-muted transition-all hover:border-vscode-border hover:bg-vscode-bg-elevated hover:text-vscode-fg sm:inline-flex"
            >
                Challenges
            </Link>
            <div className="inline-flex items-center gap-2 rounded-md border border-vscode-border bg-vscode-bg-elevated px-3 py-1.5">
                <Avatar label={label} />
                <span className="hidden max-w-[160px] truncate text-xs text-vscode-fg sm:inline">
                    {label}
                </span>
            </div>
            <SignOutButton />
        </>
    );
}

function Avatar({ label }: { label: string }) {
    const initials = label
        .split(/[\s@.]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((s) => s[0]?.toUpperCase() ?? "")
        .join("");
    return (
        <span
            aria-hidden
            className="flex h-5 w-5 items-center justify-center rounded-full bg-vscode-accent/20 text-[10px] font-semibold text-vscode-accent"
        >
            {initials || "?"}
        </span>
    );
}

function NavArrowIcon() {
    return (
        <svg
            aria-hidden
            viewBox="0 0 16 16"
            fill="none"
            className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
        >
            <path
                d="M3 8h9m0 0l-3-3m3 3l-3 3"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

// ---------------------- hero ----------------------

function Hero({ user }: { user: SessionUser | null }) {
    const firstName = user?.name?.split(" ")[0] ?? null;

    return (
        <section className="grid gap-10 py-16 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:py-24">
            <div>
                {user ? (
                    <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-vscode-accent/30 bg-vscode-accent/10 px-3 py-1 text-xs text-vscode-accent">
                        <span className="h-2 w-2 rounded-full bg-vscode-accent" />
                        Signed in
                    </div>
                ) : (
                    <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-vscode-border bg-vscode-bg-elevated px-3 py-1 text-xs text-vscode-fg-muted">
                        <span className="h-2 w-2 rounded-full bg-vscode-success" />
                        Now in beta · 3 challenges live
                    </div>
                )}

                {user ? (
                    <h1 className="text-5xl font-bold leading-[1.05] tracking-tight text-vscode-fg sm:text-6xl">
                        Welcome back
                        {firstName ? (
                            <>
                                ,{" "}
                                <span className="text-vscode-accent">
                                    {firstName}
                                </span>
                            </>
                        ) : null}
                        .
                    </h1>
                ) : (
                    <h1 className="text-5xl font-bold leading-[1.05] tracking-tight text-vscode-fg sm:text-6xl">
                        Practice debugging,{" "}
                        <span className="text-vscode-accent">
                            not algorithms.
                        </span>
                    </h1>
                )}

                <p className="mt-6 max-w-xl text-lg leading-relaxed text-vscode-fg-muted">
                    {user
                        ? "Pick a broken codebase, run the failing tests, ship the fix. Your sessions and postmortems live in your account."
                        : "Real production-style codebases with real bugs. Reproduce the issue, read the stack trace, find the broken line, ship the fix. Then read your AI-generated postmortem."}
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-3">
                    {user ? (
                        <Link
                            href="#challenges"
                            className="group inline-flex items-center gap-2 rounded-md bg-vscode-accent px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-vscode-accent/20 transition-all hover:bg-vscode-accent-hover hover:shadow-vscode-accent/40"
                        >
                            Pick a challenge
                            <ArrowIcon />
                        </Link>
                    ) : (
                        <>
                            <Link
                                href="/register"
                                className="group inline-flex items-center gap-2 rounded-md bg-vscode-accent px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-vscode-accent/20 transition-all hover:bg-vscode-accent-hover hover:shadow-vscode-accent/40"
                            >
                                Start debugging - it&apos;s free
                                <ArrowIcon />
                            </Link>
                            <Link
                                href="/login"
                                className="inline-flex items-center gap-2 rounded-md border border-vscode-border bg-vscode-bg-elevated px-5 py-3 text-sm font-medium text-vscode-fg transition-colors hover:bg-vscode-tab-hover"
                            >
                                I already have an account
                            </Link>
                        </>
                    )}
                </div>

                {!user && (
                    <p className="mt-6 text-xs text-vscode-fg-subtle">
                        No credit card. No leetcode. Just bugs.
                    </p>
                )}
            </div>

            <TerminalCarousel />
        </section>
    );
}

// ---------------------- how it works ----------------------

function HowItWorks() {
    const steps = [
        {
            n: "01",
            title: "Pick a broken codebase",
            desc: "Race conditions, memory leaks, broken retries. Each challenge is a self-contained sandbox with a real test suite.",
        },
        {
            n: "02",
            title: "Reproduce in the browser IDE",
            desc: "Run the failing tests, read the stack, edit files, iterate. No setup - Monaco + a real Jest runner in your tab.",
        },
        {
            n: "03",
            title: "Ship the fix, read the postmortem",
            desc: "All tests green → submit. Get an AI write-up explaining root cause, blast radius, and how to prevent it.",
        },
    ];

    return (
        <section className="py-16">
            <div className="mb-12 max-w-2xl">
                <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-vscode-accent">
                    How it works
                </p>
                <h2 className="text-3xl font-bold tracking-tight text-vscode-fg sm:text-4xl">
                    Find the bug. Fix the bug. Done.
                </h2>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {steps.map((s) => (
                    <div
                        key={s.n}
                        className="relative overflow-hidden rounded-xl border border-vscode-border bg-vscode-bg-elevated/60 p-6"
                    >
                        <div className="mb-3 font-mono text-3xl font-bold text-vscode-accent/60">
                            {s.n}
                        </div>
                        <h3 className="mb-2 text-lg font-semibold text-vscode-fg">
                            {s.title}
                        </h3>
                        <p className="text-sm leading-relaxed text-vscode-fg-muted">
                            {s.desc}
                        </p>
                    </div>
                ))}
            </div>
        </section>
    );
}

// ---------------------- featured challenges ----------------------

function FeaturedChallenges({
    challenges,
    authed,
    progress,
}: {
    challenges: ChallengeMeta[];
    authed: boolean;
    progress: Record<string, ChallengeProgress>;
}) {
    return (
        <section id="challenges" className="scroll-mt-8 py-16">
            <div className="mb-12 flex items-end justify-between gap-6">
                <div className="max-w-2xl">
                    <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-vscode-accent">
                        {authed ? "Choose your bug" : "Featured challenges"}
                    </p>
                    <h2 className="text-3xl font-bold tracking-tight text-vscode-fg sm:text-4xl">
                        {authed
                            ? "What do you want to break (then fix) today?"
                            : "Bugs that actually happen."}
                    </h2>
                </div>
                <p className="hidden text-sm text-vscode-fg-muted sm:block">
                    {challenges.length} available
                </p>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
                {challenges.map((c) => (
                    <ChallengeCard
                        key={c.slug}
                        meta={c}
                        progress={progress[c.slug]}
                    />
                ))}
            </div>
        </section>
    );
}

function ChallengeCard({
    meta,
    progress,
}: {
    meta: ChallengeMeta;
    progress?: ChallengeProgress;
}) {
    const solved = progress?.status === "SUBMITTED";
    // Solved cards deep-link to their result; otherwise open the arena.
    const href =
        solved && progress
            ? `/challenges/${meta.slug}/result/${progress.sessionId}`
            : `/challenges/${meta.slug}/arena`;

    return (
        <Link
            href={href}
            className="group flex h-full flex-col overflow-hidden rounded-xl border border-vscode-border bg-vscode-bg-elevated/60 p-6 transition-all hover:-translate-y-0.5 hover:border-vscode-accent/60 hover:shadow-lg hover:shadow-vscode-accent/10"
        >
            <div className="mb-3 flex items-center justify-between">
                <DifficultyBadge level={meta.difficulty} />
                {progress ? (
                    <ProgressBadge progress={progress} />
                ) : (
                    <span className="text-xs text-vscode-fg-subtle">
                        ~{Math.round(meta.timeLimit / 60)} min
                    </span>
                )}
            </div>

            <h3 className="mb-2 text-lg font-semibold text-vscode-fg group-hover:text-vscode-accent">
                {meta.title}
            </h3>

            <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-vscode-fg-muted">
                {meta.issueContext}
            </p>

            <div className="mt-auto flex flex-wrap gap-1.5">
                {meta.stack.slice(0, 3).map((s) => (
                    <span
                        key={s}
                        className="rounded-full border border-vscode-border bg-vscode-bg px-2 py-0.5 text-[10px] uppercase tracking-wide text-vscode-fg-muted"
                    >
                        {s}
                    </span>
                ))}
            </div>
        </Link>
    );
}

function ProgressBadge({ progress }: { progress: ChallengeProgress }) {
    if (progress.status === "SUBMITTED") {
        return (
            <span className="inline-flex items-center gap-1 rounded-full border border-vscode-success/30 bg-vscode-success/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-vscode-success">
                <svg
                    aria-hidden
                    viewBox="0 0 20 20"
                    fill="none"
                    className="h-3 w-3"
                >
                    <path
                        d="M4 10.5l3.5 3.5L16 6"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
                Solved
                {typeof progress.score === "number"
                    ? ` · ${progress.score}`
                    : ""}
            </span>
        );
    }
    return (
        <span className="inline-flex items-center rounded-full border border-vscode-accent/30 bg-vscode-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-vscode-accent">
            Resume
        </span>
    );
}

const difficultyStyle: Record<Difficulty, string> = {
    easy: "bg-vscode-success/15 text-vscode-success border-vscode-success/30",
    medium: "bg-vscode-warning/15 text-vscode-warning border-vscode-warning/30",
    hard: "bg-vscode-error/15 text-vscode-error border-vscode-error/30",
};

function DifficultyBadge({ level }: { level: Difficulty }) {
    return (
        <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${difficultyStyle[level]}`}
        >
            {level}
        </span>
    );
}

// ---------------------- comparison strip ----------------------

function ComparisonStrip() {
    return (
        <section className="my-12 grid gap-4 rounded-2xl border border-vscode-border bg-vscode-bg-elevated/40 p-8 md:grid-cols-2 md:p-12">
            <div>
                <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-vscode-fg-subtle">
                    Leetcode prep
                </p>
                <ul className="space-y-2 text-sm text-vscode-fg-muted">
                    <li className="flex items-start gap-2">
                        <CrossIcon /> Solve a contrived puzzle in 30 minutes
                    </li>
                    <li className="flex items-start gap-2">
                        <CrossIcon /> Memorize patterns you&apos;ll never use
                    </li>
                    <li className="flex items-start gap-2">
                        <CrossIcon /> Zero overlap with what senior engineers
                        actually do
                    </li>
                </ul>
            </div>
            <div>
                <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-vscode-accent">
                    Debugging Arena
                </p>
                <ul className="space-y-2 text-sm text-vscode-fg">
                    <li className="flex items-start gap-2">
                        <CheckSmIcon /> Read code you didn&apos;t write
                    </li>
                    <li className="flex items-start gap-2">
                        <CheckSmIcon /> Reproduce a real failure from a real
                        test
                    </li>
                    <li className="flex items-start gap-2">
                        <CheckSmIcon /> Practice the thing you do every single
                        day at work
                    </li>
                </ul>
            </div>
        </section>
    );
}

// ---------------------- final CTA + footer ----------------------

function FinalCTA() {
    return (
        <section className="my-20 overflow-hidden rounded-2xl border border-vscode-border bg-gradient-to-br from-vscode-bg-elevated to-vscode-panel p-10 text-center md:p-16">
            <h2 className="text-3xl font-bold tracking-tight text-vscode-fg sm:text-4xl">
                Ready to fix something broken?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-base text-vscode-fg-muted">
                Sign up, pick a challenge, and start debugging in under a
                minute.
            </p>
            <Link
                href="/register"
                className="mt-8 inline-flex items-center gap-2 rounded-md bg-vscode-accent px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-vscode-accent/30 transition-all hover:bg-vscode-accent-hover hover:shadow-vscode-accent/50"
            >
                Create your account
                <ArrowIcon />
            </Link>
        </section>
    );
}

function Footer() {
    return (
        <footer className="flex flex-col items-center justify-between gap-4 border-t border-vscode-border py-8 text-xs text-vscode-fg-subtle md:flex-row">
            <div className="flex items-center gap-2">
                <BugIcon />
                Debugging Arena
            </div>
            <div>Built to make you a better engineer, one bug at a time.</div>
        </footer>
    );
}

// ---------------------- icons ----------------------

function BugIcon() {
    return (
        <svg
            aria-hidden
            viewBox="0 0 20 20"
            fill="none"
            className="h-4 w-4 text-vscode-accent"
        >
            <path
                d="M10 4a3 3 0 0 0-3 3v1h6V7a3 3 0 0 0-3-3z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
            />
            <rect
                x="6"
                y="8"
                width="8"
                height="8"
                rx="4"
                stroke="currentColor"
                strokeWidth="1.5"
            />
            <path
                d="M3 10h3M14 10h3M3 14h3M14 14h3M10 16v1"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
            />
        </svg>
    );
}

function ArrowIcon() {
    return (
        <svg
            aria-hidden
            viewBox="0 0 20 20"
            fill="none"
            className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
        >
            <path
                d="M4 10h12m0 0l-4-4m4 4l-4 4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function CheckSmIcon() {
    return (
        <svg
            aria-hidden
            viewBox="0 0 20 20"
            fill="none"
            className="mt-0.5 h-4 w-4 shrink-0 text-vscode-success"
        >
            <path
                d="M4 10.5l3.5 3.5L16 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function CrossIcon() {
    return (
        <svg
            aria-hidden
            viewBox="0 0 20 20"
            fill="none"
            className="mt-0.5 h-4 w-4 shrink-0 text-vscode-fg-subtle"
        >
            <path
                d="M5 5l10 10M15 5L5 15"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
            />
        </svg>
    );
}
