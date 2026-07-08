"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { SignOutButton } from "@/components/SignOutButton";
import { displayName, type DisplayUser } from "@/lib/user";

/**
 * The signed-in user's nav chip, upgraded to a dropdown. Clicking the name
 * opens a menu with a link to the dashboard and the sign-out action. Closes
 * on outside click or Escape.
 */
export function DashboardMenu({ user }: { user: DisplayUser }) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const label = displayName(user);

    useEffect(() => {
        if (!open) return;
        function onPointerDown(e: MouseEvent) {
            if (!containerRef.current?.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        function onKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") setOpen(false);
        }
        document.addEventListener("mousedown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("mousedown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [open]);

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={open}
                className="inline-flex items-center gap-2 rounded-md border border-vscode-border bg-vscode-bg-elevated px-3 py-1.5 transition-colors hover:bg-vscode-tab-hover"
            >
                <Avatar label={label} />
                <span className="hidden max-w-[160px] truncate text-xs text-vscode-fg sm:inline">
                    {label}
                </span>
                <Chevron open={open} />
            </button>

            {open ? (
                <div
                    role="menu"
                    className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-md border border-vscode-border bg-vscode-bg-elevated shadow-lg shadow-black/20"
                >
                    <div className="flex items-center gap-2.5 border-b border-vscode-border px-3 py-2.5">
                        <Avatar label={label} size="md" />
                        <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-vscode-fg">
                                {user.name ?? user.email ?? "Account"}
                            </div>
                            {user.name && user.email ? (
                                <div className="truncate text-xs text-vscode-fg-subtle">
                                    {user.email}
                                </div>
                            ) : null}
                        </div>
                    </div>

                    <div className="p-1">
                        <Link
                            href="/dashboard"
                            role="menuitem"
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-2 rounded-sm px-3 py-2 text-sm text-vscode-fg transition-colors hover:bg-vscode-tab-hover"
                        >
                            <DashboardIcon />
                            Dashboard
                        </Link>
                        <SignOutButton className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm text-vscode-fg transition-colors hover:bg-vscode-tab-hover">
                            <SignOutIcon />
                            Sign out
                        </SignOutButton>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

function Chevron({ open }: { open: boolean }) {
    return (
        <svg
            aria-hidden
            viewBox="0 0 16 16"
            fill="none"
            className={`h-3 w-3 text-vscode-fg-muted transition-transform ${
                open ? "rotate-180" : ""
            }`}
        >
            <path
                d="M4 6l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function DashboardIcon() {
    return (
        <svg
            aria-hidden
            viewBox="0 0 16 16"
            fill="none"
            className="h-4 w-4 text-vscode-fg-muted"
        >
            <rect
                x="2"
                y="2"
                width="5"
                height="5"
                rx="1"
                stroke="currentColor"
                strokeWidth="1.5"
            />
            <rect
                x="9"
                y="2"
                width="5"
                height="5"
                rx="1"
                stroke="currentColor"
                strokeWidth="1.5"
            />
            <rect
                x="2"
                y="9"
                width="5"
                height="5"
                rx="1"
                stroke="currentColor"
                strokeWidth="1.5"
            />
            <rect
                x="9"
                y="9"
                width="5"
                height="5"
                rx="1"
                stroke="currentColor"
                strokeWidth="1.5"
            />
        </svg>
    );
}

function SignOutIcon() {
    return (
        <svg
            aria-hidden
            viewBox="0 0 16 16"
            fill="none"
            className="h-4 w-4 text-vscode-fg-muted"
        >
            <path
                d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3M10 11l3-3-3-3M13 8H6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}
