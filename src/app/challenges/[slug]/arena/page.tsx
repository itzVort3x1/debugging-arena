import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getChallengeMeta,
  getChallengeVariants,
} from "@/lib/challenges/registry";
import { getPinnedChallengeVariants } from "@/lib/challenges/pinned";
import { prisma } from "@/lib/prisma";
import type { Runtime } from "../../../../../challenges/_schema";
import { ArenaPageClient } from "./ArenaPageClient";

interface ArenaPageProps {
  params: { slug: string };
  searchParams: { language?: string };
}

export async function generateMetadata({
  params,
}: ArenaPageProps): Promise<Metadata> {
  const meta = await getChallengeMeta(params.slug);
  if (!meta) return { title: "Challenge" };
  return {
    title: meta.title,
    description: meta.issueContext,
  };
}

export default async function ArenaPage({
  params,
  searchParams,
}: ArenaPageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    const callbackUrl = `/challenges/${params.slug}/arena`;
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  // Serve the pinned snapshot when an attempt is already underway, so the
  // description, hints and read-only test files the page renders match what the
  // session's run/submit routes execute against. Without this the server would
  // hold the line on content while the page around it silently moved.
  //
  // The pin is challenge-wide rather than per-language, so any in-progress
  // session for this challenge identifies it. On a first visit there is no
  // session yet and live content is correct — the session created moments later
  // pins whatever it was served.
  const inProgress = await prisma.debugSession.findFirst({
    where: {
      userId: session.user.id,
      challengeSlug: params.slug,
      status: "IN_PROGRESS",
      challengeVersion: { not: null },
    },
    orderBy: { startedAt: "desc" },
    select: { challengeVersion: true },
  });

  const challenge =
    inProgress?.challengeVersion != null
      ? ((await getPinnedChallengeVariants(
          params.slug,
          inProgress.challengeVersion,
        )) ?? (await getChallengeVariants(params.slug)))
      : await getChallengeVariants(params.slug);
  if (!challenge) notFound();

  // Resolve the starting language: an explicit `?language=` (used by dashboard
  // resume links) when it's one the challenge offers, else the default.
  const requested = searchParams.language as Runtime | undefined;
  const initialLanguage =
    requested && challenge.languages.includes(requested)
      ? requested
      : challenge.defaultLanguage;

  return (
    <ArenaPageClient
      variants={challenge.variants}
      initialLanguage={initialLanguage}
    />
  );
}
