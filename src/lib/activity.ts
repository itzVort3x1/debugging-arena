import { prisma } from "@/lib/prisma";

/** Local `YYYY-MM-DD` key for a date (day-granularity bucket). */
export function dayKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

export interface ActivityCalendar {
    /** Map of `YYYY-MM-DD` → number of activity events that day. */
    counts: Record<string, number>;
    /** Total events across the window. */
    total: number;
}

/**
 * Per-day activity for the GitHub-style contribution graph. Each session
 * contributes an event on the day it was started, plus another on the day it
 * was completed (a solve). TestRun history isn't persisted yet, so sessions are
 * the best available signal.
 */
export async function loadActivityCalendar(
    userId: string,
    days = 371,
): Promise<ActivityCalendar> {
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - (days - 1));

    const sessions = await prisma.debugSession.findMany({
        where: { userId, startedAt: { gte: since } },
        select: { startedAt: true, completedAt: true },
    });

    const counts: Record<string, number> = {};
    let total = 0;
    const bump = (d: Date | null) => {
        if (!d || d < since) return;
        const key = dayKey(d);
        counts[key] = (counts[key] ?? 0) + 1;
        total++;
    };
    for (const s of sessions) {
        bump(s.startedAt);
        bump(s.completedAt);
    }

    return { counts, total };
}
