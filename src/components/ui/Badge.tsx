import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type BadgeTone =
  | "neutral"
  | "accent"
  | "success"
  | "warning"
  | "error"
  | "info";
type BadgeSize = "sm" | "md";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  size?: BadgeSize;
  icon?: ReactNode;
}

const toneClasses: Record<BadgeTone, string> = {
  neutral:
    "bg-vscode-bg-elevated text-vscode-fg-muted border-vscode-border-subtle",
  accent: "bg-vscode-accent/15 text-vscode-accent border-vscode-accent/30",
  success:
    "bg-vscode-success/15 text-vscode-success border-vscode-success/30",
  warning:
    "bg-vscode-warning/15 text-vscode-warning border-vscode-warning/30",
  error: "bg-vscode-error/15 text-vscode-error border-vscode-error/30",
  info: "bg-vscode-info/15 text-vscode-info border-vscode-info/30",
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: "h-5 px-1.5 text-[10px] gap-1",
  md: "h-6 px-2 text-xs gap-1.5",
};

export function Badge({
  tone = "neutral",
  size = "md",
  icon,
  className,
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center whitespace-nowrap rounded-full border font-medium",
        toneClasses[tone],
        sizeClasses[size],
        className
      )}
      {...rest}
    >
      {icon ? <span className="inline-flex shrink-0">{icon}</span> : null}
      {children}
    </span>
  );
}
