"use client";

import { signOut } from "next-auth/react";

interface SignOutButtonProps {
  className?: string;
  children?: React.ReactNode;
}

export function SignOutButton({ className, children }: SignOutButtonProps) {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className={
        className ??
        "rounded-md border border-transparent px-3.5 py-1.5 text-sm font-medium text-vscode-fg-muted transition-all hover:border-vscode-border hover:bg-vscode-bg-elevated hover:text-vscode-fg"
      }
    >
      {children ?? "Sign out"}
    </button>
  );
}
