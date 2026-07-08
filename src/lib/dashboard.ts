import { prisma } from "@/lib/prisma";

/** Per-challenge progress for a signed-in user, keyed by slug. */
export interface ChallengeProgress {
    status: "IN_PROGRESS" | "SUBMITTED";
    score: number | null;
    sessionId: string;
}

/** A single challenge session surfaced on the dashboard's resume/solved lists. */
export interface DashboardSession {
    slug: string;
    sessionId: string;
    startedAt: Date;
    completedAt: Date | null;
    score: number | null;
    timeTaken: number | null;
    lastRunPassed: number | null;
    lastRunTotal: number | null;
}

export interface DashboardStats {
    /** Distinct challenges with at least one submitted session. */
    solvedCount: number;
    /** Mean score across best solved sessions, or null if none solved. */
    avgScore: number | null;
    /** Sum of timeTaken across solved sessions, in seconds. */
    totalTimeSeconds: number;
    /** Challenges actively in progress (and not yet solved). */
    inProgressCount: number;
}

export interface DashboardData {
    /** Most recent in-progress session per challenge, excluding solved ones. */
    inProgress: DashboardSession[];
    /** Best (highest-score) submitted session per challenge. */
    solved: DashboardSession[];
    stats: DashboardStats;
}

/**
 * Best session per challenge for the given user: a SUBMITTED session
 * (highest score wins) outranks an in-progress one. Drives the home-page
 * card badges, and will back the dashboard's solved/resume lists.
 */
export async function loadBestProgress(
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

/**
 * Everything the dashboard's resume + solved lists and summary strip need,
 * in a single query. Sessions are reduced to one row per challenge:
 *   - solved: the highest-score SUBMITTED session
 *   - inProgress: the most recent IN_PROGRESS session, unless the challenge
 *     is already solved (a solved challenge drops out of "continue")
 */
export async function loadDashboard(userId: string): Promise<DashboardData> {
    const sessions = await prisma.debugSession.findMany({
        where: { userId, status: { in: ["IN_PROGRESS", "SUBMITTED"] } },
        select: {
            id: true,
            challengeSlug: true,
            status: true,
            startedAt: true,
            completedAt: true,
            score: true,
            timeTaken: true,
            lastRunPassed: true,
            lastRunTotal: true,
        },
        orderBy: { startedAt: "desc" },
    });

    const toSession = (s: (typeof sessions)[number]): DashboardSession => ({
        slug: s.challengeSlug,
        sessionId: s.id,
        startedAt: s.startedAt,
        completedAt: s.completedAt,
        score: s.score,
        timeTaken: s.timeTaken,
        lastRunPassed: s.lastRunPassed,
        lastRunTotal: s.lastRunTotal,
    });

    // Best submitted session per challenge (highest score wins).
    const solvedMap = new Map<string, DashboardSession>();
    // Most recent in-progress session per challenge (rows are startedAt desc,
    // so the first one seen is the newest).
    const inProgressMap = new Map<string, DashboardSession>();

    for (const s of sessions) {
        if (s.status === "SUBMITTED") {
            const existing = solvedMap.get(s.challengeSlug);
            if (!existing || (s.score ?? 0) > (existing.score ?? 0)) {
                solvedMap.set(s.challengeSlug, toSession(s));
            }
        } else if (!inProgressMap.has(s.challengeSlug)) {
            inProgressMap.set(s.challengeSlug, toSession(s));
        }
    }

    // A solved challenge shouldn't also appear under "continue".
    const inProgress = Array.from(inProgressMap.values()).filter(
        (s) => !solvedMap.has(s.slug),
    );
    const solved = Array.from(solvedMap.values()).sort(
        (a, b) =>
            (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0),
    );

    const scores = solved
        .map((s) => s.score)
        .filter((n): n is number => n !== null);
    const avgScore =
        scores.length > 0
            ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
            : null;
    const totalTimeSeconds = solved.reduce((sum, s) => sum + (s.timeTaken ?? 0), 0);

    return {
        inProgress,
        solved,
        stats: {
            solvedCount: solved.length,
            avgScore,
            totalTimeSeconds,
            inProgressCount: inProgress.length,
        },
    };
}
