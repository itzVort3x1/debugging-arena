import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getChallenge, getChallengeMeta } from "@/lib/challenges/registry";
import { getPinnedChallenge } from "@/lib/challenges/pinned";
import { toClientChallenge } from "@/lib/challenges/client-view";
import { loadSharedReveals, serializeSession } from "@/lib/sessions";
import type { Runtime } from "../../../../../../challenges/_schema";
import { computeScore } from "@/lib/scoring";
import { ResultView } from "./ResultView";

interface ResultPageProps {
    params: { slug: string; sessionId: string };
}

// Intentionally generic - the score is owner-only and must not leak into
// public link previews. The page itself is auth-gated for the real data.
export async function generateMetadata({
    params,
}: ResultPageProps): Promise<Metadata> {
    const meta = await getChallengeMeta(params.slug);
    const title = meta ? `${meta.title} - Result` : "Result";
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
    });
    // 404 (not 403) on a foreign or mismatched session - don't leak ids.
    if (!row || row.userId !== auth.user.id) notFound();
    if (row.challengeSlug !== params.slug) notFound();

    // The pinned snapshot, so the result page explains the attempt against the
    // content it was actually scored on. This matters more here than elsewhere:
    // the breakdown below is recomputed from the challenge, so resolving live
    // content would let a later edit change the explanation of an already
    // persisted score.
    const challenge =
        row.challengeVersion != null
            ? ((await getPinnedChallenge(
                  row.challengeSlug,
                  row.challengeVersion,
                  row.language as Runtime,
              )) ?? (await getChallenge(row.challengeSlug)))
            : await getChallenge(row.challengeSlug);
    if (!challenge) notFound();

    if (row.status !== "SUBMITTED") {
        redirect(`/challenges/${params.slug}/arena`);
    }

    const shared = await loadSharedReveals(row.userId, row.challengeSlug);
    const session = serializeSession(row, shared);
    // Recompute the breakdown for display. Inputs are server-authoritative
    // and deterministic, so this matches the score persisted at submit time.
    const breakdown = computeScore({
        challenge,
        revealedHintLevels: session.revealedHintLevels,
        attemptsCount: session.attemptsCount,
        timeTaken: session.timeTaken,
        solutionRevealed: session.solutionRevealed,
    });

    // `breakdown` above is computed from the full definition server-side; the
    // client only ever needs meta here, so it gets the stripped view. Without
    // this the result page would hand over the solution for a challenge the
    // user may still have an unsubmitted session on in another language.
    return (
        <ResultView
            challenge={toClientChallenge(challenge, shared)}
            session={session}
            breakdown={breakdown}
        />
    );
}
