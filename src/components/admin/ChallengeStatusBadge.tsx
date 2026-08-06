import { Badge, type BadgeProps } from "@/components/ui/Badge";

/**
 * DRAFT / PUBLISHED as a badge. Shared by the admin list and the editor
 * toolbar so the two never drift on wording or colour.
 */
export interface ChallengeStatusBadgeProps {
  status: string;
  size?: BadgeProps["size"];
}

export function ChallengeStatusBadge({
  status,
  size = "sm",
}: ChallengeStatusBadgeProps) {
  const published = status === "PUBLISHED";
  return (
    <Badge size={size} tone={published ? "success" : "neutral"}>
      {published ? "Published" : "Draft"}
    </Badge>
  );
}
