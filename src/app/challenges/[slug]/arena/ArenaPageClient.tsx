"use client";

import { useEffect } from "react";
import Link from "next/link";
import type {
    ClientChallengeDefinition,
    Runtime,
} from "../../../../../challenges/_schema";
import { useArenaStore } from "@/store/arena";
import { useSession } from "@/hooks/useSession";
import { ArenaLayout } from "@/components/ide/ArenaLayout";
import { ArenaSkeleton } from "@/components/ide/ArenaSkeleton";
import { MonitorIcon } from "@/components/ui/icons";
import { Button } from "@/components/ui/Button";
import { CenteredScreen } from "@/components/ui/CenteredScreen";

interface ArenaPageClientProps {
    /**
     * Every language variant of the challenge, keyed by runtime. Client-safe:
     * hint bodies and the solution are withheld until revealed (see
     * `toClientChallenge`).
     */
    variants: Partial<Record<Runtime, ClientChallengeDefinition>>;
    /** Language the workspace opens in (validated server-side). */
    initialLanguage: Runtime;
}

/**
 * Hydrates the store with the challenge variants (passed from the server) and
 * resolves the user's session for the initial language via /api/sessions.
 * Renders ArenaLayout once both are in place. The language switcher then swaps
 * variants client-side (see useLanguageSwitch).
 */
export function ArenaPageClient({
    variants,
    initialLanguage,
}: ArenaPageClientProps) {
    const setChallenge = useArenaStore((s) => s.setChallenge);
    const setVariants = useArenaStore((s) => s.setVariants);
    const reset = useArenaStore((s) => s.reset);

    const challenge = variants[initialLanguage]!;

    // Challenge + variants have to be in the store before useSession triggers
    // setSession, so the first open tab seeds from the editable file list.
    useEffect(() => {
        setVariants(variants);
        setChallenge(challenge);
        return () => reset();
    }, [variants, challenge, setVariants, setChallenge, reset]);

    const { session, isLoading, error, reload } = useSession(
        challenge.meta.slug,
        initialLanguage,
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

    // The same skeleton the route's loading.tsx shows, so the handover from the
    // server wait to this one is invisible rather than a spinner swap.
    if (isLoading || !sessionMatchesCurrent) {
        return <ArenaSkeleton />;
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
                    <MonitorIcon className="h-6 w-6" />
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
