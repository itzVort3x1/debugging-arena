import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getChallenge } from "@/lib/challenges/registry";
import { serializeSession } from "@/lib/sessions";
import { computeScore } from "@/lib/scoring";
import { ResultView } from "./ResultView";

interface ResultPageProps {
    params: { slug: string; sessionId: string };
}

// Intentionally generic - the score is owner-only and must not leak into
// public link previews. The page itself is auth-gated for the real data.
export function generateMetadata({ params }: ResultPageProps): Metadata {
    const challenge = getChallenge(params.slug);
    const title = challenge ? `${challenge.meta.title} - Result` : "Result";
    return {
        title,
        robots: { index: false, follow: false },
    };
}

/**
 * Post-submission result screen. Server-rendered from the persisted
 * session so a shared/bookmarked URL always reflects the finalized score.
 * Only the owner can view it, and only once the session is SUBMITTED -
 * an in-progress session bounces back to the arena.
 */
export default async function ResultPage({ params }: ResultPageProps) {
    const auth = await getServerSession(authOptions);
    if (!auth?.user?.id) {
        const cb = `/challenges/${params.slug}/result/${params.sessionId}`;
        redirect(`/login?callbackUrl=${encodeURIComponent(cb)}`);
    }

    const row = await prisma.debugSession.findUnique({
        where: { id: params.sessionId },
        include: { hintRequests: { select: { level: true } } },
    });
    // 404 (not 403) on a foreign or mismatched session - don't leak ids.
    if (!row || row.userId !== auth.user.id) notFound();
    if (row.challengeSlug !== params.slug) notFound();

    const challenge = getChallenge(row.challengeSlug);
    if (!challenge) notFound();

    if (row.status !== "SUBMITTED") {
        redirect(`/challenges/${params.slug}/arena`);
    }

    const session = serializeSession(row);
    // Recompute the breakdown for display. Inputs are server-authoritative
    // and deterministic, so this matches the score persisted at submit time.
    const breakdown = computeScore({
        challenge,
        revealedHintLevels: session.revealedHintLevels,
        attemptsCount: session.attemptsCount,
        timeTaken: session.timeTaken,
    });

    return (
        <ResultView
            challenge={challenge}
            session={session}
            breakdown={breakdown}
        />
    );
}
