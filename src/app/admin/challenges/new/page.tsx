import { NewChallengeForm } from "@/components/admin/NewChallengeForm";
import { SUPPORTED_RUNTIMES } from "@/lib/runner/languages/registry";

export const dynamic = "force-dynamic";

/**
 * The runtime list is resolved here rather than in the form so the runner
 * registry (which pulls in the executor modules) stays out of the client
 * bundle.
 */
export default function NewChallengePage() {
  return <NewChallengeForm runtimes={SUPPORTED_RUNTIMES} />;
}
