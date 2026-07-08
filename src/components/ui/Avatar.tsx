import { cn } from "@/lib/utils";

type AvatarSize = "sm" | "md" | "lg";

/** size → [box dims, text size] */
const sizeClasses: Record<AvatarSize, string> = {
    sm: "h-5 w-5 text-[10px]",
    md: "h-8 w-8 text-xs",
    lg: "h-12 w-12 text-sm",
};

/** Up to two initials from a label ("Ada Lovelace" → "AL", email → first letters). */
export function initialsFrom(label: string): string {
    return (
        label
            .split(/[\s@.]+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((s) => s[0]?.toUpperCase() ?? "")
            .join("") || "?"
    );
}

export interface AvatarProps {
    label: string;
    size?: AvatarSize;
    className?: string;
}

/**
 * Small circular avatar showing initials derived from a label (name, or email
 * as a fallback). Purely presentational; `size` scales it from the nav chip
 * (`sm`) up to the dashboard identity header (`lg`).
 */
export function Avatar({ label, size = "sm", className }: AvatarProps) {
    return (
        <span
            aria-hidden
            className={cn(
                "flex shrink-0 items-center justify-center rounded-full bg-vscode-accent/20 font-semibold text-vscode-accent",
                sizeClasses[size],
                className,
            )}
        >
            {initialsFrom(label)}
        </span>
    );
}
