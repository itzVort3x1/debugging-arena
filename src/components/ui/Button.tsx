import * as React from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "./Spinner";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const variantClass: Record<ButtonVariant, string> = {
  primary: "bg-vscode-accent hover:bg-vscode-accent-hover text-white",
  secondary:
    "bg-vscode-bg-elevated hover:bg-vscode-tab-hover text-vscode-fg border border-vscode-border",
  ghost: "hover:bg-vscode-tab-hover text-vscode-fg",
  danger: "bg-vscode-error/90 hover:bg-vscode-error text-white",
};

const sizeClass: Record<ButtonSize, string> = {
  sm: "px-2 py-1 text-xs",
  md: "px-3 py-1.5 text-sm",
  lg: "px-4 py-2 text-base",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      children,
      ...rest
    },
    ref
  ) {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 rounded font-medium transition-colors",
          "focus:outline-none focus:ring-1 focus:ring-vscode-accent",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          variantClass[variant],
          sizeClass[size],
          className
        )}
        {...rest}
      >
        {loading && <Spinner size={size === "sm" ? 12 : 14} />}
        {children}
      </button>
    );
  }
);
