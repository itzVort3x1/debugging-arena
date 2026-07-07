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
