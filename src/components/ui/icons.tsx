import { cn } from "@/lib/utils";

/**
 * Shared SVG icon set. Each icon is a pure glyph that takes a `className`
 * for sizing and color (via `currentColor`) - callers own layout, the
 * module owns geometry. Consolidates icons that were previously redefined
 * inline across the IDE panels and auth forms.
 */
export interface IconProps {
    className?: string;
}

/* -------------------------------------------------------------------------- */
/* File / explorer                                                            */
/* -------------------------------------------------------------------------- */

export function FileIcon({ className }: IconProps) {
    return (
        <svg
            viewBox="0 0 16 16"
            fill="currentColor"
            className={className}
            aria-hidden="true"
        >
            <path d="M3 1.5A1.5 1.5 0 0 1 4.5 0h5L13 3.5v11A1.5 1.5 0 0 1 11.5 16h-7A1.5 1.5 0 0 1 3 14.5v-13ZM9 1H4.5a.5.5 0 0 0-.5.5v13a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 .5-.5V4H9.5A.5.5 0 0 1 9 3.5V1Zm1 .707V3h1.293L10 1.707Z" />
        </svg>
    );
}

/** Filled padlock - used for read-only file affordances. */
export function LockIcon({ className }: IconProps) {
    return (
        <svg
            viewBox="0 0 16 16"
            fill="currentColor"
            className={className}
            aria-hidden="true"
        >
            <path d="M5 6V4a3 3 0 1 1 6 0v2h.5A1.5 1.5 0 0 1 13 7.5v6a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 3 13.5v-6A1.5 1.5 0 0 1 4.5 6H5Zm1 0h4V4a2 2 0 1 0-4 0v2Z" />
        </svg>
    );
}

/** Outlined padlock - used for locked/gated content (e.g. the solution). */
export function LockOutlineIcon({ className }: IconProps) {
    return (
        <svg
            aria-hidden
            viewBox="0 0 16 16"
            fill="none"
            className={className}
        >
            <rect
                x="3.5"
                y="7"
                width="9"
                height="6.5"
                rx="1"
                stroke="currentColor"
                strokeWidth="1.3"
            />
            <path
                d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
            />
        </svg>
    );
}

/* -------------------------------------------------------------------------- */
/* Status / feedback                                                          */
/* -------------------------------------------------------------------------- */

export function CheckIcon({ className }: IconProps) {
    return (
        <svg
            aria-hidden
            viewBox="0 0 20 20"
            fill="none"
            className={className}
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

/** An X - used both as a "close" affordance and a fail indicator. */
export function CloseIcon({ className }: IconProps) {
    return (
        <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            className={className}
            aria-hidden="true"
        >
            <path d="m4 4 8 8M12 4l-8 8" />
        </svg>
    );
}

/** Small filled dot - unmet checklist marker. */
export function DotIcon({ className }: IconProps) {
    return (
        <svg
            aria-hidden
            viewBox="0 0 20 20"
            fill="none"
            className={className}
        >
            <circle cx="10" cy="10" r="2" fill="currentColor" />
        </svg>
    );
}

/** Circle-with-exclamation - inline error/alert glyph. */
export function AlertCircleIcon({ className }: IconProps) {
    return (
        <svg
            aria-hidden
            viewBox="0 0 20 20"
            fill="none"
            className={className}
        >
            <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" />
            <path
                d="M10 6v4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
            />
            <circle cx="10" cy="13.5" r="1" fill="currentColor" />
        </svg>
    );
}

/** Circular spinner glyph. `animate-spin` is always applied. */
export function SpinnerIcon({ className }: IconProps) {
    return (
        <svg
            aria-hidden
            viewBox="0 0 24 24"
            fill="none"
            className={cn("animate-spin", className)}
        >
            <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
                opacity="0.25"
            />
            <path
                d="M22 12a10 10 0 0 1-10 10"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
            />
        </svg>
    );
}

/* -------------------------------------------------------------------------- */
/* Terminal / run                                                             */
/* -------------------------------------------------------------------------- */

export function TerminalIcon({ className }: IconProps) {
    return (
        <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden="true"
        >
            <path d="m3 5 3 3-3 3M8 11h5" />
        </svg>
    );
}

export function ChevronDownIcon({ className }: IconProps) {
    return (
        <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden="true"
        >
            <path d="m4 6 4 4 4-4" />
        </svg>
    );
}

/** Filled play triangle - run the test suite. */
export function PlayIcon({ className }: IconProps) {
    return (
        <svg
            viewBox="0 0 16 16"
            fill="currentColor"
            className={className}
            aria-hidden="true"
        >
            <path d="M4 3.5v9a.5.5 0 0 0 .77.42l7-4.5a.5.5 0 0 0 0-.84l-7-4.5A.5.5 0 0 0 4 3.5Z" />
        </svg>
    );
}

/** Document with a play glyph - run a single file. */
export function RunFileIcon({ className }: IconProps) {
    return (
        <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden="true"
        >
            <path d="M9 1.5H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h5" />
            <path d="M9 1.5 12.5 5H9z" />
            <path d="m10.5 8.5 3 2-3 2z" fill="currentColor" stroke="none" />
        </svg>
    );
}

/* -------------------------------------------------------------------------- */
/* Auth forms                                                                 */
/* -------------------------------------------------------------------------- */

export function EyeIcon({ className }: IconProps) {
    return (
        <svg aria-hidden viewBox="0 0 20 20" fill="none" className={className}>
            <path
                d="M1.5 10S4.5 4 10 4s8.5 6 8.5 6-3 6-8.5 6S1.5 10 1.5 10z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <circle
                cx="10"
                cy="10"
                r="2.5"
                stroke="currentColor"
                strokeWidth="1.5"
            />
        </svg>
    );
}

export function EyeOffIcon({ className }: IconProps) {
    return (
        <svg aria-hidden viewBox="0 0 20 20" fill="none" className={className}>
            <path
                d="M3 3l14 14"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
            />
            <path
                d="M8.2 5.3A8 8 0 0 1 10 5c4.5 0 7.5 5 7.5 5a13 13 0 0 1-2.2 2.7M12 12.5a3 3 0 0 1-4-4M2.5 10S5 5.5 9 5.1m3 5a3 3 0 0 0-3-3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

/** Right-pointing arrow - call-to-action affordance on buttons. */
export function ArrowIcon({ className }: IconProps) {
    return (
        <svg aria-hidden viewBox="0 0 20 20" fill="none" className={className}>
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

/** Left-pointing chevron - "back to" navigation links. */
export function ChevronLeftIcon({ className }: IconProps) {
    return (
        <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden="true"
        >
            <path d="M10 3L5 8l5 5" />
        </svg>
    );
}

/* -------------------------------------------------------------------------- */
/* Account / navigation                                                       */
/* -------------------------------------------------------------------------- */

/** Four panes - the dashboard link in the account menu. */
export function DashboardIcon({ className }: IconProps) {
    return (
        <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className={className}
            aria-hidden="true"
        >
            <rect x="2" y="2" width="5" height="5" rx="1" />
            <rect x="9" y="2" width="5" height="5" rx="1" />
            <rect x="2" y="9" width="5" height="5" rx="1" />
            <rect x="9" y="9" width="5" height="5" rx="1" />
        </svg>
    );
}

/** Document with a pencil - the admin challenge-editor link. */
export function EditChallengesIcon({ className }: IconProps) {
    return (
        <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden="true"
        >
            <path d="M8.5 13H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v3.5M4.5 5.5h5M4.5 8h3" />
            <path d="M13.6 8.9a1.2 1.2 0 0 1 1.7 1.7L12 14l-2 .5.5-2 3.1-3.6z" />
        </svg>
    );
}

/** Door with an out-arrow - sign out. */
export function SignOutIcon({ className }: IconProps) {
    return (
        <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden="true"
        >
            <path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3M10 11l3-3-3-3M13 8H6" />
        </svg>
    );
}

/** Camera body with a lens - the avatar upload affordance. */
export function CameraIcon({ className }: IconProps) {
    return (
        <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinejoin="round"
            className={className}
            aria-hidden="true"
        >
            <path d="M2 5.5A1.5 1.5 0 013.5 4h1l.8-1.2A1 1 0 016.1 2.3h3.8a1 1 0 01.8.5L11.5 4h1A1.5 1.5 0 0114 5.5v6A1.5 1.5 0 0112.5 13h-9A1.5 1.5 0 012 11.5v-6z" />
            <circle cx="8" cy="8.5" r="2" />
        </svg>
    );
}

/* -------------------------------------------------------------------------- */
/* Marketing / illustrative                                                   */
/* -------------------------------------------------------------------------- */

/** The product's bug - wordmark glyph in the nav, footer, and 404. */
export function BugIcon({ className }: IconProps) {
    return (
        <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className={className}
            aria-hidden="true"
        >
            <path d="M10 4a3 3 0 0 0-3 3v1h6V7a3 3 0 0 0-3-3z" strokeLinejoin="round" />
            <rect x="6" y="8" width="8" height="8" rx="4" />
            <path
                d="M3 10h3M14 10h3M3 14h3M14 14h3M10 16v1"
                strokeLinecap="round"
            />
        </svg>
    );
}

/** Desktop monitor - the "open on a larger screen" notice. */
export function MonitorIcon({ className }: IconProps) {
    return (
        <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className={className}
            aria-hidden="true"
        >
            <rect x="2.5" y="4" width="15" height="10" rx="1.5" />
            <path d="M7 17h6M10 14v3" strokeLinecap="round" />
        </svg>
    );
}

/** Magnifying glass - inspecting/searching. */
export function MagnifierIcon({ className }: IconProps) {
    return (
        <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className={className}
            aria-hidden="true"
        >
            <circle cx="7" cy="7" r="4.5" />
            <path d="M10.5 10.5 14 14" strokeLinecap="round" />
        </svg>
    );
}

/** A single four-point star. See {@link SparklesIcon} for the larger pair. */
export function SparkIcon({ className }: IconProps) {
    return (
        <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
            className={className}
            aria-hidden="true"
        >
            <path d="M8 1.5 9.6 6 14 7.5 9.6 9 8 13.5 6.4 9 2 7.5 6.4 6 8 1.5Z" />
        </svg>
    );
}

/**
 * A large star with a small companion - the AI postmortem heading. Distinct
 * from {@link SparkIcon}, which is one star sized for inline use.
 */
export function SparklesIcon({ className }: IconProps) {
    return (
        <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeLinejoin="round"
            className={className}
            aria-hidden="true"
        >
            <path
                d="M10 2.5l1.6 4.3 4.3 1.6-4.3 1.6L10 14.3 8.4 10l-4.3-1.6L8.4 6.8 10 2.5z"
                strokeWidth="1.4"
            />
            <path
                d="M15.5 12.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8z"
                strokeWidth="1.2"
            />
        </svg>
    );
}

/** Stacked layers - "knows this codebase". */
export function StackIcon({ className }: IconProps) {
    return (
        <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
            className={className}
            aria-hidden="true"
        >
            <path d="M8 1.5 14.5 5 8 8.5 1.5 5 8 1.5ZM2 8l6 3.25L14 8M2 11l6 3.25L14 11" />
        </svg>
    );
}

/* -------------------------------------------------------------------------- */
/* Mascot                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Bugsy: a rounded beetle with antennae and a friendly pair of eyes.
 *
 * Not a UI glyph like the rest of this module, but it is drawn in both the
 * arena's Bugsy panel and the marketing page, and one 40-line SVG in two places
 * drifts. Uses a 48-unit box rather than the 16/20 the glyphs use - it carries
 * detail they don't.
 */
export function BugsyMascot({ className }: IconProps) {
    return (
        <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden>
            {/* antennae */}
            <path
                d="M18 13c-1.5-3-3.5-4.5-6-5M30 13c1.5-3 3.5-4.5 6-5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
            />
            <circle cx="11.5" cy="7.5" r="2" fill="currentColor" />
            <circle cx="36.5" cy="7.5" r="2" fill="currentColor" />

            {/* legs */}
            <path
                d="M13 24H6M13 31l-6 4M13 18l-6-4M35 24h7M35 31l6 4M35 18l6-4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
            />

            {/* shell */}
            <rect
                x="13"
                y="12"
                width="22"
                height="28"
                rx="11"
                fill="currentColor"
                fillOpacity="0.18"
                stroke="currentColor"
                strokeWidth="2"
            />
            <path
                d="M24 12v28"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeOpacity="0.5"
            />

            {/* eyes */}
            <circle cx="20" cy="21" r="1.75" fill="currentColor" />
            <circle cx="28" cy="21" r="1.75" fill="currentColor" />
        </svg>
    );
}
