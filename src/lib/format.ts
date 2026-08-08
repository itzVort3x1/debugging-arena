/**
 * Human-friendly formatting helpers shared across result + dashboard views.
 */

/**
 * Seconds → compact duration, at most two units.
 *
 * 45 → "45s", 90 → "1m 30s", 120 → "2m", 5000 → "1h 23m", 200000 → "2d 7h".
 *
 * Rolls up into hours and days rather than counting minutes forever: a long
 * session used to render as "20075m 45s", which is technically true and
 * unreadable. The smaller unit is dropped when it's zero.
 */
export function formatDuration(seconds: number | null): string {
    if (seconds === null) return "-";
    if (seconds < 0) return "-";
    if (seconds < 60) return `${seconds}s`;

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
        const s = seconds % 60;
        return s === 0 ? `${minutes}m` : `${minutes}m ${s}s`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
        const m = minutes % 60;
        return m === 0 ? `${hours}h` : `${hours}h ${m}m`;
    }

    const days = Math.floor(hours / 24);
    const h = hours % 24;
    return h === 0 ? `${days}d` : `${days}d ${h}h`;
}

/** A past Date → coarse "time ago" label, e.g. "just now", "5m ago", "3d ago". */
export function formatRelativeTime(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    return `${Math.floor(months / 12)}y ago`;
}

/** A Date → "member since" style month + year, e.g. "July 2026". */
export function formatMonthYear(date: Date): string {
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}
