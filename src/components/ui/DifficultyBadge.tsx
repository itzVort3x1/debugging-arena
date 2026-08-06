import { Badge, type BadgeProps } from "./Badge";

/**
 * A challenge's difficulty as a toned badge.
 *
 * The easy/medium/hard -> tone mapping had been copied into every view that
 * renders it (the arena top bar, the problem panel, the admin list); this is
 * the single definition.
 *
 * `level` is a plain string because callers get it from both the typed
 * `ChallengeMeta` and untyped database columns; anything unrecognized falls
 * back to a neutral tone rather than crashing.
 */
const DIFFICULTY_TONE: Record<string, BadgeProps["tone"]> = {
  easy: "success",
  medium: "warning",
  hard: "error",
};

export interface DifficultyBadgeProps {
  level: string;
  size?: BadgeProps["size"];
  className?: string;
}

export function DifficultyBadge({
  level,
  size = "sm",
  className,
}: DifficultyBadgeProps) {
  return (
    <Badge tone={DIFFICULTY_TONE[level] ?? "neutral"} size={size} className={className}>
      {level}
    </Badge>
  );
}
