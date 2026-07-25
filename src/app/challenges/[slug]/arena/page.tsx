import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getChallengeMeta,
  getChallengeVariants,
} from "@/lib/challenges/registry";
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

  const challenge = await getChallengeVariants(params.slug);
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
