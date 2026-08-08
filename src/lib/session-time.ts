/**
 * How a session's elapsed time is measured.
 *
 * Not `completedAt - startedAt`: that is wall clock since the row was created,
 * so a challenge opened once and finished days later reads as a multi-day
 * session and takes the over-the-limit scoring penalty for time nobody spent.
 *
 * Instead the arena beats a heartbeat while its tab is visible. Each beat
 * credits the time since the previous beat, capped at {@link MAX_CREDIT_SECONDS}
 * so a gap - tab hidden, laptop shut, browser closed - contributes at most one
 * interval instead of the whole absence. `activeSeconds` banks the total;
 * `resumedAt` marks the current visit so the stretch after the last beat is
 * still counted at submit.
 */

/** Seconds between heartbeats while the arena tab is visible. */
export const HEARTBEAT_INTERVAL_SECONDS = 30;

/**
 * Most a single beat (or the final stretch at submit) may credit.
 *
 * Twice the interval: generous enough that an ordinary late tick - a busy main
 * thread, a throttled timer - still credits its full gap, while an absence of
 * any real length is truncated to about one interval.
 */
export const MAX_CREDIT_SECONDS = HEARTBEAT_INTERVAL_SECONDS * 2;

/**
 * Seconds to credit for the stretch ending at `now`.
 *
 * `resumedAt` null means no visit is open (nothing has beaten yet), which
 * credits nothing. Negative gaps - clock skew, a `resumedAt` in the future -
 * also credit nothing rather than subtracting banked time.
 */
export function creditForStretch(
    resumedAt: Date | null,
    now: Date = new Date(),
): number {
    if (!resumedAt) return 0;
    const elapsed = Math.floor((now.getTime() - resumedAt.getTime()) / 1000);
    if (elapsed <= 0) return 0;
    return Math.min(elapsed, MAX_CREDIT_SECONDS);
}

/**
 * A session's total working time: what is banked, plus the open stretch.
 *
 * This is the value stamped into `timeTaken` at submit and fed to scoring.
 */
export function totalActiveSeconds(
    session: { activeSeconds: number; resumedAt: Date | null },
    now: Date = new Date(),
): number {
    return session.activeSeconds + creditForStretch(session.resumedAt, now);
}
