import { prisma } from "@/lib/prisma";

/** Per-challenge progress for a signed-in user, keyed by slug. */
export interface ChallengeProgress {
    status: "IN_PROGRESS" | "SUBMITTED";
    score: number | null;
    sessionId: string;
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
