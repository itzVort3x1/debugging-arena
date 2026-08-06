import { notFound } from "next/navigation";
import { ChallengeEditor } from "@/components/admin/ChallengeEditor";
import { getChallengeForAdmin } from "@/lib/challenges/admin";

export const dynamic = "force-dynamic";

export default async function AdminChallengePage({
  params,
}: {
  params: { slug: string };
}) {
  const challenge = await getChallengeForAdmin(params.slug);
  if (!challenge) notFound();

  return (
    <ChallengeEditor
      slug={challenge.slug}
      title={challenge.title}
      initialTree={challenge.content}
      initialStatus={challenge.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT"}
      version={challenge.version}
    />
  );
}
