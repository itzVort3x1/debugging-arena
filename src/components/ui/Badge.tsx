import * as React from "react";
import { cn } from "@/lib/utils";

export type BadgeTone =
  | "default"
  | "success"
  | "error"
  | "warning"
  | "info"
  | "accent";

const toneClass: Record<BadgeTone, string> = {
  default:
    "bg-vscode-bg-elevated text-vscode-fg-muted border border-vscode-border",
  success:
    "bg-vscode-success/15 text-vscode-success border border-vscode-success/30",
  error:
    "bg-vscode-error/15 text-vscode-error border border-vscode-error/30",
  warning:
    "bg-vscode-warning/15 text-vscode-warning border border-vscode-warning/30",
  info: "bg-vscode-info/15 text-vscode-info border border-vscode-info/30",
  accent:
    "bg-vscode-accent/15 text-vscode-accent border border-vscode-accent/30",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export function Badge({ className, tone = "default", ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium",
        toneClass[tone],
        className
      )}
      {...rest}
    />
  );
}
