import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getChallenge } from "@/lib/challenges/registry";
import { ArenaPageClient } from "./ArenaPageClient";

interface ArenaPageProps {
  params: { slug: string };
}

export function generateMetadata({ params }: ArenaPageProps): Metadata {
  const challenge = getChallenge(params.slug);
  if (!challenge) return { title: "Challenge" };
  return {
    title: challenge.meta.title,
    description: challenge.meta.issueContext,
  };
}

export default async function ArenaPage({ params }: ArenaPageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    const callbackUrl = `/challenges/${params.slug}/arena`;
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  const challenge = getChallenge(params.slug);
  if (!challenge) notFound();

  return <ArenaPageClient challenge={challenge} />;
}
