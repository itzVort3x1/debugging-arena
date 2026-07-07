"use client";

import { useEffect } from "react";
import Link from "next/link";
import type { ChallengeDefinition } from "../../../../../challenges/_schema";
import { useArenaStore } from "@/store/arena";
import { useSession } from "@/hooks/useSession";
import { ArenaLayout } from "@/components/ide/ArenaLayout";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { CenteredScreen } from "@/components/ui/CenteredScreen";

interface ArenaPageClientProps {
    challenge: ChallengeDefinition;
}

/**
 * Hydrates the store with the challenge (passed from the server) and
 * resolves the user's session via /api/sessions. Renders ArenaLayout
 * once both are in place.
 */
export function ArenaPageClient({ challenge }: ArenaPageClientProps) {
    const setChallenge = useArenaStore((s) => s.setChallenge);
    const reset = useArenaStore((s) => s.reset);

    // Challenge has to be in the store before useSession triggers
    // setSession, so the first open tab seeds from the editable file list.
    useEffect(() => {
        setChallenge(challenge);
        return () => reset();
    }, [challenge, setChallenge, reset]);

    const { session, isLoading, error, reload } = useSession(
        challenge.meta.slug,
    );

    if (error) {
        return (
            <CenteredScreen>
                <div className="max-w-md text-center">
                    <h1 className="mb-2 text-lg font-semibold text-vscode-error">
                        Couldn&apos;t start the session
                    </h1>
                    <p className="mb-6 text-sm text-vscode-fg-muted">{error}</p>
                    <div className="flex items-center justify-center gap-2">
                        <Button variant="primary" size="sm" onClick={reload}>
                            Try again
                        </Button>
                        <Link href="/">
                            <Button variant="secondary" size="sm">
                                Back to challenges
                            </Button>
                        </Link>
                    </div>
                </div>
            </CenteredScreen>
        );
    }

    // Guard against the cross-challenge stale render. When navigating from
    // A → B, the page component is reused; for one frame the store still
    // holds A's session before the effect cleanup runs reset(). Treat that
    // window as "still loading" so A's lastRun badge can't leak onto B.
    const sessionMatchesCurrent =
        session !== null && session.challengeSlug === challenge.meta.slug;

    if (isLoading || !sessionMatchesCurrent) {
        return (
            <CenteredScreen>
                <div className="flex flex-col items-center gap-3 text-vscode-fg-muted">
                    <Spinner size="lg" />
                    <p className="text-sm">Loading {challenge.meta.title}…</p>
                </div>
            </CenteredScreen>
        );
    }

    // The full IDE (two side panels + editor + terminal) needs real width.
    // Below `lg` we show a notice instead of a cramped, unusable layout.
    return (
        <>
            <div className="lg:hidden">
                <SmallScreenNotice title={challenge.meta.title} />
            </div>
            <div className="hidden h-screen lg:block">
                <ArenaLayout />
            </div>
        </>
    );
}

function SmallScreenNotice({ title }: { title: string }) {
    return (
        <CenteredScreen>
            <div className="max-w-sm text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-vscode-border bg-vscode-bg-elevated text-vscode-accent">
                    <svg
                        aria-hidden
                        viewBox="0 0 20 20"
                        fill="none"
                        className="h-6 w-6"
                    >
                        <rect
                            x="2.5"
                            y="4"
                            width="15"
                            height="10"
                            rx="1.5"
                            stroke="currentColor"
                            strokeWidth="1.5"
                        />
                        <path
                            d="M7 17h6M10 14v3"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                        />
                    </svg>
                </div>
                <h1 className="mb-2 text-lg font-semibold text-vscode-fg">
                    Open on a larger screen
                </h1>
                <p className="mb-6 text-sm text-vscode-fg-muted">
                    The {title} arena packs a code editor, terminal, and panels
                    side-by-side - it needs a laptop or desktop to be usable.
                    Your progress is saved, so pick up where you left off from a
                    bigger screen.
                </p>
                <Link href="/">
                    <Button variant="secondary" size="sm">
                        Back to challenges
                    </Button>
                </Link>
            </div>
        </CenteredScreen>
    );
}
